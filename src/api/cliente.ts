import type { CodigoError, DetalleValidacion, ErrorApiCuerpo } from './tipos';

/** Error tipado de la API. `estado` 0 significa que no hubo respuesta (error de red). */
export class ApiError extends Error {
  readonly estado: number;
  readonly codigo: CodigoError | 'RED' | 'DESCONOCIDO';
  readonly detalles: DetalleValidacion[];
  readonly ruta?: string;
  readonly fecha?: string;

  constructor(datos: {
    estado: number;
    codigo: ApiError['codigo'];
    mensaje: string;
    detalles?: DetalleValidacion[];
    ruta?: string;
    fecha?: string;
  }) {
    super(datos.mensaje);
    this.name = 'ApiError';
    this.estado = datos.estado;
    this.codigo = datos.codigo;
    this.detalles = datos.detalles ?? [];
    this.ruta = datos.ruta;
    this.fecha = datos.fecha;
  }
}

export function esApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** El servicio de MongoDB no respondió: se degrada solo la sección que depende de él. */
export function esNoDisponible(e: unknown): boolean {
  return esApiError(e) && e.estado === 503;
}

export function esNoEncontrado(e: unknown): boolean {
  return esApiError(e) && e.estado === 404;
}

type ValorQuery = string | number | boolean | null | undefined;

export interface OpcionesSolicitud {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, ValorQuery>;
  cuerpo?: unknown;
  /** No disparar el manejo global de 401 (en el login, credenciales incorrectas no son "sesión vencida"). */
  sin401Global?: boolean;
  signal?: AbortSignal;
}

export interface RespuestaApi<T> {
  datos: T;
  estado: number;
}

interface Configuracion {
  obtenerToken: () => string | null;
  alNoAutenticado: () => void;
}

const config: Configuracion = {
  obtenerToken: () => null,
  alNoAutenticado: () => {},
};

/** La sesión se registra aquí para que el cliente no dependa de React. */
export function configurarCliente(parcial: Partial<Configuracion>): void {
  Object.assign(config, parcial);
}

export function baseApi(): string {
  const base = import.meta.env.VITE_API_URL || '/api/v1';
  return base.replace(/\/+$/, '');
}

/**
 * Arma la URL con URLSearchParams: así el `+` de una zona horaria viaja como `%2B`
 * y los valores vacíos no se envían.
 */
export function construirUrl(ruta: string, query?: Record<string, ValorQuery>): string {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(query ?? {})) {
    if (valor === undefined || valor === null || valor === '') continue;
    params.append(clave, String(valor));
  }
  const qs = params.toString();
  return `${baseApi()}${ruta}${qs ? `?${qs}` : ''}`;
}

function esCuerpoError(x: unknown): x is ErrorApiCuerpo {
  return typeof x === 'object' && x !== null && 'codigo' in x && 'estado' in x && 'mensaje' in x;
}

async function leerJson(respuesta: Response): Promise<unknown> {
  const texto = await respuesta.text();
  if (!texto) return undefined;
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}

/** Único punto de salida hacia la API. Cualquier fallo se lanza como ApiError. */
export async function solicitar<T>(ruta: string, opciones: OpcionesSolicitud = {}): Promise<RespuestaApi<T>> {
  const { metodo = 'GET', query, cuerpo, sin401Global, signal } = opciones;
  const cabeceras: Record<string, string> = { Accept: 'application/json' };
  const token = config.obtenerToken();
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';

  let respuesta: Response;
  try {
    respuesta = await fetch(construirUrl(ruta, query), {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError({ estado: 0, codigo: 'RED', mensaje: 'No se pudo conectar con el servidor' });
  }

  const json = await leerJson(respuesta);

  if (!respuesta.ok) {
    if (respuesta.status === 401 && !sin401Global) config.alNoAutenticado();
    if (esCuerpoError(json)) {
      throw new ApiError({
        estado: respuesta.status,
        codigo: json.codigo,
        mensaje: json.mensaje,
        detalles: json.detalles,
        ruta: json.ruta,
        fecha: json.fecha,
      });
    }
    throw new ApiError({
      estado: respuesta.status,
      codigo: 'DESCONOCIDO',
      mensaje: `Respuesta inesperada del servidor (${respuesta.status})`,
    });
  }

  return { datos: json as T, estado: respuesta.status };
}

/** Atajo cuando solo interesa el cuerpo. */
export async function pedir<T>(ruta: string, opciones?: OpcionesSolicitud): Promise<T> {
  return (await solicitar<T>(ruta, opciones)).datos;
}

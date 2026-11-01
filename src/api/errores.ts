import { esApiError } from './cliente';
import type { ApiError } from './cliente';

type Codigo = ApiError['codigo'];

const POR_CODIGO: Record<Codigo, string> = {
  VALIDACION: 'Revisa los datos del formulario.',
  NO_AUTENTICADO: 'Tu sesión no es válida. Inicia sesión de nuevo.',
  PROHIBIDO: 'No tienes permiso para hacer esto.',
  NO_ENCONTRADO: 'No encontramos lo que buscas.',
  SOLAPAMIENTO_ESCENARIO: 'Ese escenario ya tiene un evento en ese horario.',
  ENTRADAS_AGOTADAS: 'No quedan suficientes entradas para tu selección. Reduce las cantidades e inténtalo de nuevo.',
  TRANSICION_INVALIDA: 'Esa acción no está permitida en el estado actual.',
  CUPO_INSUFICIENTE: 'El cupo no puede quedar por debajo de las entradas ya vendidas.',
  COLA_INACTIVA: 'Este evento no tiene la cola de reserva activa.',
  COLA_REQUERIDA: 'Para comprar en este evento necesitas un turno admitido en la cola de reserva.',
  DUPLICADO: 'Ese dato ya existe.',
  ERROR_INTERNO: 'Ocurrió un error en el servidor. Inténtalo más tarde.',
  RED: 'No se pudo conectar con el servidor. Revisa tu conexión.',
  DESCONOCIDO: 'Ocurrió un error inesperado. Inténtalo más tarde.',
};

const POR_ESTADO: Record<number, string> = {
  401: POR_CODIGO.NO_AUTENTICADO,
  403: POR_CODIGO.PROHIBIDO,
  404: POR_CODIGO.NO_ENCONTRADO,
  422: POR_CODIGO.VALIDACION,
  503: 'Este servicio no está disponible en este momento.',
};

export type MensajesPropios = Partial<Record<Codigo, string>>;

/**
 * Traduce un error a un mensaje amigable en español. `propios` permite que una pantalla
 * dé un texto más específico para un código (p. ej. "Ya reseñaste este evento").
 * Nunca devuelve trazas ni JSON del servidor.
 */
export function mensajeDeError(e: unknown, propios: MensajesPropios = {}): string {
  if (!esApiError(e)) return POR_CODIGO.DESCONOCIDO;
  const propio = propios[e.codigo];
  if (propio) return propio;
  if (e.estado === 503) return POR_ESTADO[503];
  if (e.codigo === 'DESCONOCIDO' && POR_ESTADO[e.estado]) return POR_ESTADO[e.estado];
  return POR_CODIGO[e.codigo] ?? POR_CODIGO.DESCONOCIDO;
}

/** Errores de validación del servidor por campo (solo 422). */
export function erroresDeCampos(e: unknown): Record<string, string> {
  if (!esApiError(e) || e.estado !== 422) return {};
  return Object.fromEntries(e.detalles.map((d) => [d.campo, d.mensaje]));
}

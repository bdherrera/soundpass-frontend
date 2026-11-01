import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, configurarCliente, construirUrl, pedir, solicitar } from '../src/api/cliente';
import { erroresDeCampos, mensajeDeError } from '../src/api/errores';
import { listarEventos } from '../src/api/servicios/eventos';
import { errorApi, simularFetch } from './utilidades';

describe('cliente HTTP', () => {
  const alNoAutenticado = vi.fn();

  beforeEach(() => {
    alNoAutenticado.mockReset();
    configurarCliente({ obtenerToken: () => 'abc', alNoAutenticado });
  });

  it('usa la base de VITE_API_URL y envía el token Bearer', async () => {
    const f = simularFetch(() => ({ estado: 200, cuerpo: { ok: true } }));
    await pedir('/eventos');
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toBe('http://api.test/api/v1/eventos');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('codifica el + de la zona horaria como %2B y omite filtros vacíos', async () => {
    const f = simularFetch(() => ({ estado: 200, cuerpo: { contenido: [] } }));
    await listarEventos({ desde: '2026-11-01T00:00:00+01:00', ciudad: '', pagina: 0 });
    const url = String(f.mock.calls[0][0]);
    expect(url).toContain('desde=2026-11-01T00%3A00%3A00%2B01%3A00');
    expect(url).not.toContain('ciudad');
    expect(url).toContain('pagina=0');
    expect(construirUrl('/x', { a: 'b c' })).toBe('http://api.test/api/v1/x?a=b+c');
  });

  it('convierte una respuesta de error en ApiError con los campos de la API', async () => {
    simularFetch(() => errorApi(409, 'ENTRADAS_AGOTADAS', 'Sin entradas'));
    const error = await pedir('/ordenes', { metodo: 'POST', cuerpo: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ estado: 409, codigo: 'ENTRADAS_AGOTADAS', ruta: '/api/v1/x' });
    expect(mensajeDeError(error)).toMatch(/No quedan suficientes entradas/);
  });

  it('expone los campos inválidos de un 422', async () => {
    simularFetch(() => errorApi(422, 'VALIDACION', 'Datos inválidos', [{ campo: 'capacidad', mensaje: 'debe ser mayor que 0' }]));
    const error = await pedir('/escenarios', { metodo: 'POST', cuerpo: {} }).catch((e) => e);
    expect(erroresDeCampos(error)).toEqual({ capacidad: 'debe ser mayor que 0' });
  });

  it('un 401 dispara el cierre de sesión global, salvo que se pida lo contrario', async () => {
    simularFetch(() => errorApi(401, 'NO_AUTENTICADO'));
    await pedir('/ordenes/mias').catch(() => {});
    expect(alNoAutenticado).toHaveBeenCalledTimes(1);
    await pedir('/auth/login', { metodo: 'POST', cuerpo: {}, sin401Global: true }).catch(() => {});
    expect(alNoAutenticado).toHaveBeenCalledTimes(1);
  });

  it('distingue error de red y respuestas sin cuerpo de error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const red = await pedir('/eventos').catch((e) => e);
    expect(red).toMatchObject({ estado: 0, codigo: 'RED' });
    expect(mensajeDeError(red)).toMatch(/No se pudo conectar/);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>stack</html>', { status: 502 })));
    const raro = await pedir('/eventos').catch((e) => e);
    expect(raro).toMatchObject({ estado: 502, codigo: 'DESCONOCIDO' });
    expect(mensajeDeError(raro)).not.toContain('stack');
  });

  it('503 se traduce como servicio no disponible y 403 como sin permiso', () => {
    const e503 = new ApiError({ estado: 503, codigo: 'ERROR_INTERNO', mensaje: 'Mongo caído' });
    const e403 = new ApiError({ estado: 403, codigo: 'PROHIBIDO', mensaje: 'Forbidden' });
    expect(mensajeDeError(e503)).toMatch(/no está disponible/);
    expect(mensajeDeError(e403)).toBe('No tienes permiso para hacer esto.');
    expect(mensajeDeError(e403, { PROHIBIDO: 'Propio' })).toBe('Propio');
  });

  it('devuelve el estado HTTP para distinguir 200 de 201', async () => {
    simularFetch(() => ({ estado: 201, cuerpo: { idOrden: 1 } }));
    const r = await solicitar('/ordenes', { metodo: 'POST', cuerpo: {} });
    expect(r.estado).toBe(201);
  });

  it('acepta 204 sin cuerpo', async () => {
    simularFetch(() => ({ estado: 204 }));
    await expect(pedir('/artistas/1', { metodo: 'DELETE' })).resolves.toBeUndefined();
  });
});

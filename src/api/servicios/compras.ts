import { pedir, solicitar } from '../cliente';
import type { CompraSolicitud, Orden, Pagina, ParametrosPagina } from '../tipos';

export interface ResultadoCompra {
  orden: Orden;
  /** 201 = orden creada; 200 = la clave de idempotencia ya existía y se devuelve la orden original. */
  creada: boolean;
}

export async function comprarEntradas(datos: CompraSolicitud): Promise<ResultadoCompra> {
  const { datos: orden, estado } = await solicitar<Orden>('/ordenes', { metodo: 'POST', cuerpo: datos });
  return { orden, creada: estado === 201 };
}

export const listarMisOrdenes = (params: ParametrosPagina = {}) =>
  pedir<Pagina<Orden>>('/ordenes/mias', { query: { ...params } });
export const obtenerMiOrden = (id: number) => pedir<Orden>(`/ordenes/${id}`);
export const cancelarOrden = (id: number) => pedir<Orden>(`/ordenes/${id}/cancelacion`, { metodo: 'POST' });

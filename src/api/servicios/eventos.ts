import { pedir } from '../cliente';
import type {
  ArtistaEnEvento,
  DetalleEvento,
  DetalleEventoEntrada,
  Disponibilidad,
  EstadoEvento,
  Evento,
  EventoDetalle,
  EventoEntrada,
  Pagina,
  ParametrosPagina,
  ResumenVentas,
  TipoEntrada,
  TipoEntradaEntrada,
} from '../tipos';

export interface FiltrosEventos extends ParametrosPagina {
  /** ISO-8601 con zona horaria */
  desde?: string;
  hasta?: string;
  ciudad?: string;
  idArtista?: number;
}

export const listarEventos = (filtros: FiltrosEventos = {}) =>
  pedir<Pagina<Evento>>('/eventos', { query: { ...filtros } });
export const obtenerEvento = (id: number) => pedir<EventoDetalle>(`/eventos/${id}`);
export const crearEvento = (datos: EventoEntrada) => pedir<Evento>('/eventos', { metodo: 'POST', cuerpo: datos });
export const actualizarEvento = (id: number, datos: EventoEntrada) =>
  pedir<Evento>(`/eventos/${id}`, { metodo: 'PUT', cuerpo: datos });
export const cambiarEstadoEvento = (id: number, estado: EstadoEvento) =>
  pedir<Evento>(`/eventos/${id}/estado`, { metodo: 'PATCH', cuerpo: { estado } });

export const asignarArtistaAEvento = (idEvento: number, idArtista: number, ordenPresentacion: number) =>
  pedir<ArtistaEnEvento>(`/eventos/${idEvento}/artistas/${idArtista}`, {
    metodo: 'PUT',
    cuerpo: { ordenPresentacion },
  });
export const quitarArtistaDeEvento = (idEvento: number, idArtista: number) =>
  pedir<void>(`/eventos/${idEvento}/artistas/${idArtista}`, { metodo: 'DELETE' });

export const listarTiposEntrada = (idEvento: number) => pedir<TipoEntrada[]>(`/eventos/${idEvento}/tipos-entrada`);
export const crearTipoEntrada = (idEvento: number, datos: TipoEntradaEntrada) =>
  pedir<TipoEntrada>(`/eventos/${idEvento}/tipos-entrada`, { metodo: 'POST', cuerpo: datos });
export const actualizarTipoEntrada = (idTipoEntrada: number, datos: TipoEntradaEntrada) =>
  pedir<TipoEntrada>(`/tipos-entrada/${idTipoEntrada}`, { metodo: 'PUT', cuerpo: datos });

export const consultarDisponibilidad = (idEvento: number) =>
  pedir<Disponibilidad[]>(`/eventos/${idEvento}/disponibilidad`);
export const resumenVentasEvento = (idEvento: number) => pedir<ResumenVentas[]>(`/eventos/${idEvento}/ventas`);

export const obtenerDetalleEvento = (idEvento: number) => pedir<DetalleEvento>(`/eventos/${idEvento}/detalle`);
export const guardarDetalleEvento = (idEvento: number, datos: DetalleEventoEntrada) =>
  pedir<DetalleEvento>(`/eventos/${idEvento}/detalle`, { metodo: 'PUT', cuerpo: datos });

/** Ciclo de estados del evento (DECISIONES.md, T05). FINALIZADO no tiene salida. */
export const TRANSICIONES_EVENTO: Record<EstadoEvento, EstadoEvento[]> = {
  BORRADOR: ['PUBLICADO', 'CANCELADO'],
  PUBLICADO: ['CANCELADO', 'FINALIZADO'],
  CANCELADO: ['BORRADOR'],
  FINALIZADO: [],
};

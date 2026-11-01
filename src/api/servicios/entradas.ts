import { pedir } from '../cliente';
import type {
  Asistente,
  AsistenteEntrada,
  CheckinRespuesta,
  Entrada,
  EstadoEntrada,
  Pagina,
  ParametrosPagina,
} from '../tipos';

export interface FiltrosEntradas extends ParametrosPagina {
  estado?: EstadoEntrada;
}

export const listarMisEntradas = (filtros: FiltrosEntradas = {}) =>
  pedir<Pagina<Entrada>>('/entradas/mias', { query: { ...filtros } });
export const registrarAsistente = (idEntrada: number, datos: AsistenteEntrada) =>
  pedir<Asistente>(`/entradas/${idEntrada}/asistente`, { metodo: 'PUT', cuerpo: datos });

export const hacerCheckin = (codigo: string) =>
  pedir<CheckinRespuesta>('/checkins', { metodo: 'POST', cuerpo: { codigo } });

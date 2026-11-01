import { pedir } from '../cliente';
import type { LogEntrada, NivelLog, Pagina, ParametrosPagina, Resena, ResenaEntrada, ResumenResenas } from '../tipos';

export const listarResenas = (idEvento: number, params: ParametrosPagina = {}) =>
  pedir<Pagina<Resena>>(`/eventos/${idEvento}/resenas`, { query: { ...params } });
export const resumenResenas = (idEvento: number) => pedir<ResumenResenas>(`/eventos/${idEvento}/resenas/resumen`);
export const crearResena = (idEvento: number, datos: ResenaEntrada) =>
  pedir<Resena>(`/eventos/${idEvento}/resenas`, { metodo: 'POST', cuerpo: datos });

export interface FiltrosLogs {
  nivel?: NivelLog;
  desde?: string;
  hasta?: string;
  limite?: number;
}

export const consultarLogs = (filtros: FiltrosLogs = {}) => pedir<LogEntrada[]>('/logs', { query: { ...filtros } });

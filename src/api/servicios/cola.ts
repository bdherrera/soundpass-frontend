import { pedir } from '../cliente';
import type { ColaConfig, ColaEstado, Turno } from '../tipos';

export const estadoCola = (idEvento: number) => pedir<ColaEstado>(`/eventos/${idEvento}/cola`);
export const configurarCola = (idEvento: number, datos: ColaConfig) =>
  pedir<ColaEstado>(`/eventos/${idEvento}/cola`, { metodo: 'PUT', cuerpo: datos });

export const unirseACola = (idEvento: number) => pedir<Turno>(`/eventos/${idEvento}/cola/turnos`, { metodo: 'POST' });
export const miTurno = (idEvento: number) => pedir<Turno>(`/eventos/${idEvento}/cola/turnos/mio`);
export const salirDeCola = (idEvento: number) =>
  pedir<void>(`/eventos/${idEvento}/cola/turnos/mio`, { metodo: 'DELETE' });

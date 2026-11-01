// No hay endpoint para listar eventos BORRADOR/CANCELADO/FINALIZADO (NOTAS_API.md): el panel recuerda en
// sessionStorage los eventos que el ADMIN creó o abrió en esta pestaña.
import type { Evento } from '../../api/tipos';

const CLAVE = 'soundpass.admin.eventos';
const MAX = 20;

export interface EventoReciente {
  idEvento: number;
  nombre: string;
  estado: Evento['estado'];
}

export function leerRecientes(): EventoReciente[] {
  try {
    const x: unknown = JSON.parse(sessionStorage.getItem(CLAVE) ?? '[]');
    return Array.isArray(x) ? (x as EventoReciente[]) : [];
  } catch {
    return [];
  }
}

export function recordarEvento(e: Pick<Evento, 'idEvento' | 'nombre' | 'estado'>): void {
  const lista = [{ idEvento: e.idEvento, nombre: e.nombre, estado: e.estado }, ...leerRecientes().filter((r) => r.idEvento !== e.idEvento)];
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, MAX)));
  } catch {
    // Sin sessionStorage simplemente no se recuerda.
  }
}

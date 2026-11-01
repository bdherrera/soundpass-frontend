import { QueryClient } from '@tanstack/react-query';
import { esApiError } from './cliente';

/** Solo se reintentan errores de red y 5xx (menos 503, que es MongoDB caído y degrada la sección). */
export function debeReintentar(intentos: number, error: unknown): boolean {
  if (intentos >= 2) return false;
  if (!esApiError(error)) return false;
  return error.estado === 0 || (error.estado >= 500 && error.estado !== 503);
}

export function crearClienteQuery(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: debeReintentar, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

/** Claves de caché por recurso. */
export const claves = {
  eventos: (filtros: object) => ['eventos', filtros] as const,
  evento: (id: number) => ['evento', id] as const,
  disponibilidad: (id: number) => ['evento', id, 'disponibilidad'] as const,
  detalleEvento: (id: number) => ['evento', id, 'detalle'] as const,
  tiposEntrada: (id: number) => ['evento', id, 'tipos'] as const,
  ventas: (id: number) => ['evento', id, 'ventas'] as const,
  cola: (id: number) => ['evento', id, 'cola'] as const,
  turno: (id: number) => ['evento', id, 'turno'] as const,
  resenas: (id: number, pagina: number) => ['evento', id, 'resenas', pagina] as const,
  resumenResenas: (id: number) => ['evento', id, 'resenas', 'resumen'] as const,
  artistas: (filtros: object) => ['artistas', filtros] as const,
  artista: (id: number) => ['artista', id] as const,
  perfilArtista: (id: number) => ['artista', id, 'perfil'] as const,
  escenarios: (filtros: object) => ['escenarios', filtros] as const,
  escenario: (id: number) => ['escenario', id] as const,
  misOrdenes: (pagina: number) => ['ordenes', pagina] as const,
  orden: (id: number) => ['orden', id] as const,
  misEntradas: (filtros: object) => ['entradas', filtros] as const,
  logs: (filtros: object) => ['logs', filtros] as const,
};

import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { vi } from 'vitest';
import type { TokenRespuesta } from '../src/api/tipos';

export interface RespuestaSimulada {
  estado: number;
  cuerpo?: unknown;
}

/** Sustituye fetch por un manejador que recibe (método, url, cuerpo) y devuelve la respuesta. */
export function simularFetch(manejador: (metodo: string, url: URL, cuerpo: unknown) => RespuestaSimulada) {
  const espia = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(entrada));
    const cuerpo = init?.body ? JSON.parse(String(init.body)) : undefined;
    const r = manejador(init?.method ?? 'GET', url, cuerpo);
    return new Response(r.cuerpo === undefined ? null : JSON.stringify(r.cuerpo), {
      status: r.estado,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', espia);
  return espia;
}

export function errorApi(estado: number, codigo: string, mensaje = 'x', detalles?: unknown) {
  return { estado, cuerpo: { estado, codigo, mensaje, fecha: '2026-10-28T10:00:00Z', ruta: '/api/v1/x', detalles } };
}

export function tokenDePrueba(rol: 'USUARIO' | 'ADMIN' = 'USUARIO'): TokenRespuesta {
  return {
    token: `token-${rol}`,
    tipo: 'Bearer',
    expiraEn: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    usuario: { idUsuario: 1, nombre: 'Ana', correo: 'ana@correo.co', rol },
  };
}

export function renderizarRutas(rutas: RouteObject[], inicial: string, extra?: (el: ReactElement) => ReactElement) {
  const clienteQuery = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const enrutador = createMemoryRouter(rutas, { initialEntries: [inicial] });
  const arbol = (
    <QueryClientProvider client={clienteQuery}>
      <RouterProvider router={enrutador} />
    </QueryClientProvider>
  );
  return { ...render(extra ? extra(arbol) : arbol), enrutador, clienteQuery };
}

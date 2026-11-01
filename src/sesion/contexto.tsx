import { useEffect, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { alVencerSesion, obtenerSesion, suscribir, tieneRol } from './sesion';
import type { Rol } from '../api/tipos';

export function useSesion() {
  const sesion = useSyncExternalStore(suscribir, obtenerSesion, obtenerSesion);
  return {
    sesion,
    usuario: sesion?.usuario ?? null,
    autenticado: sesion !== null,
    tieneRol: (rol: Rol) => tieneRol(sesion?.usuario, rol),
  };
}

export function rutaConDestino(pathname: string, search: string, hash = ''): string {
  return `/login?${new URLSearchParams({ destino: `${pathname}${search}${hash}` }).toString()}`;
}

/**
 * Montado dentro del Router: cuando la sesión vence o llega un 401, borra la caché de datos
 * del usuario y lleva a /login conservando la ruta de destino.
 */
export function VigilanteSesion() {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const clienteQuery = useQueryClient();

  useEffect(
    () =>
      alVencerSesion(() => {
        clienteQuery.clear();
        if (ubicacion.pathname === '/login') return;
        navegar(rutaConDestino(ubicacion.pathname, ubicacion.search, ubicacion.hash), {
          replace: true,
          state: { sesionVencida: true },
        });
      }),
    [navegar, ubicacion, clienteQuery],
  );

  return null;
}

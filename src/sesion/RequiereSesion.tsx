import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { rutaConDestino, useSesion } from './contexto';
import type { Rol } from '../api/tipos';
import { SinPermiso } from '../componentes/SinPermiso';

/**
 * Guard de rutas por rol. Solo oculta: quien decide es el backend (un 403 se muestra como "No tienes permiso").
 */
export function RequiereSesion({ rol = 'USUARIO', children }: { rol?: Rol; children: ReactNode }) {
  const { autenticado, tieneRol } = useSesion();
  const ubicacion = useLocation();

  if (!autenticado) {
    return <Navigate to={rutaConDestino(ubicacion.pathname, ubicacion.search, ubicacion.hash)} replace />;
  }
  if (!tieneRol(rol)) return <SinPermiso />;
  return <>{children}</>;
}

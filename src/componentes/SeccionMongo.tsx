import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { esNoDisponible, esNoEncontrado } from '../api/cliente';
import { mensajeDeError } from '../api/errores';
import { Aviso, Cargando, SeccionNoDisponible } from './ui';

/**
 * Sección alimentada por MongoDB. Un 503 la oculta con un aviso discreto y un 404 (no hay documento)
 * muestra `sinDatos`; el resto de la página sigue funcionando.
 */
export function SeccionMongo<T>({
  consulta,
  que,
  sinDatos = null,
  children,
}: {
  consulta: UseQueryResult<T>;
  que: string;
  sinDatos?: ReactNode;
  children: (datos: T) => ReactNode;
}) {
  if (consulta.isPending) return <Cargando texto={`Cargando ${que.toLowerCase()}…`} />;
  if (consulta.isError) {
    if (esNoDisponible(consulta.error)) return <SeccionNoDisponible que={que} />;
    if (esNoEncontrado(consulta.error)) return <>{sinDatos}</>;
    return <Aviso tipo="error">{mensajeDeError(consulta.error)}</Aviso>;
  }
  return <>{children(consulta.data)}</>;
}

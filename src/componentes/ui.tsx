import { forwardRef, useId } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { mensajeDeError } from '../api/errores';
import type { MensajesPropios } from '../api/errores';

const enfoque =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600';

type Variante = 'primario' | 'secundario' | 'peligro' | 'enlace';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-marca-700 text-white hover:bg-marca-800 disabled:bg-slate-400',
  secundario: 'bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 disabled:text-slate-400',
  peligro: 'bg-red-700 text-white hover:bg-red-800 disabled:bg-slate-400',
  enlace: 'text-marca-700 underline-offset-2 hover:underline disabled:text-slate-400',
};

export function Boton({
  variante = 'primario',
  cargando = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; cargando?: boolean }) {
  const base = variante === 'enlace' ? 'px-1 py-1' : 'rounded-lg px-4 py-2 font-medium shadow-sm';
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`${base} ${VARIANTES[variante]} ${enfoque} inline-flex min-h-[2.75rem] items-center justify-center gap-2 text-sm disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {cargando && <Spinner pequeno />}
      {children}
    </button>
  );
}

export const claseControl = `block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm placeholder:text-slate-400 aria-[invalid=true]:border-red-600 ${enfoque}`;

interface PropsCampo {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  className?: string;
}

/** Envuelve un control con su etiqueta y mensajes, enlazados con aria-describedby. */
function ConEtiqueta({
  id,
  etiqueta,
  error,
  ayuda,
  className = '',
  children,
}: PropsCampo & { id: string; children: ReactNode }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {etiqueta}
      </label>
      {children}
      {ayuda && !error && (
        <p id={`${id}-ayuda`} className="text-xs text-slate-600">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, ayuda?: string) {
  return error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined;
}

export const Campo = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & PropsCampo>(
  function Campo({ etiqueta, error, ayuda, className, id, ...props }, ref) {
    const generado = useId();
    const idReal = id ?? generado;
    return (
      <ConEtiqueta id={idReal} etiqueta={etiqueta} error={error} ayuda={ayuda} className={className}>
        <input
          ref={ref}
          id={idReal}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(idReal, error, ayuda)}
          className={claseControl}
          {...props}
        />
      </ConEtiqueta>
    );
  },
);

export const AreaTexto = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & PropsCampo>(
  function AreaTexto({ etiqueta, error, ayuda, className, id, ...props }, ref) {
    const generado = useId();
    const idReal = id ?? generado;
    return (
      <ConEtiqueta id={idReal} etiqueta={etiqueta} error={error} ayuda={ayuda} className={className}>
        <textarea
          ref={ref}
          id={idReal}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(idReal, error, ayuda)}
          className={claseControl}
          rows={4}
          {...props}
        />
      </ConEtiqueta>
    );
  },
);

export const Selector = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & PropsCampo>(
  function Selector({ etiqueta, error, ayuda, className, id, children, ...props }, ref) {
    const generado = useId();
    const idReal = id ?? generado;
    return (
      <ConEtiqueta id={idReal} etiqueta={etiqueta} error={error} ayuda={ayuda} className={className}>
        <select
          ref={ref}
          id={idReal}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(idReal, error, ayuda)}
          className={claseControl}
          {...props}
        >
          {children}
        </select>
      </ConEtiqueta>
    );
  },
);

type TipoAviso = 'info' | 'exito' | 'alerta' | 'error';

const AVISOS: Record<TipoAviso, string> = {
  info: 'border-sky-300 bg-sky-50 text-sky-900',
  exito: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  alerta: 'border-amber-300 bg-amber-50 text-amber-900',
  error: 'border-red-300 bg-red-50 text-red-900',
};

export function Aviso({ tipo = 'info', titulo, children }: { tipo?: TipoAviso; titulo?: string; children?: ReactNode }) {
  return (
    <div
      role={tipo === 'error' || tipo === 'alerta' ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 text-sm ${AVISOS[tipo]}`}
    >
      {titulo && <p className="font-semibold">{titulo}</p>}
      {children && <div className={titulo ? 'mt-1' : ''}>{children}</div>}
    </div>
  );
}

/** Aviso discreto para secciones que dependen de MongoDB y respondieron 503. */
export function SeccionNoDisponible({ que }: { que: string }) {
  return (
    <p role="status" className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
      {que} no está disponible en este momento.
    </p>
  );
}

export function Spinner({ pequeno = false }: { pequeno?: boolean }) {
  const t = pequeno ? 'h-4 w-4' : 'h-6 w-6';
  return (
    <span
      aria-hidden="true"
      className={`${t} inline-block animate-spin rounded-full border-2 border-current border-r-transparent`}
    />
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-8 text-slate-600">
      <Spinner />
      <span>{texto}</span>
    </div>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-600">{children}</p>;
}

/**
 * Estados de carga, error y vacío para una consulta de TanStack Query.
 * `vacio` decide si los datos cuentan como lista vacía.
 */
export function EstadoConsulta<T>({
  consulta,
  vacio,
  textoVacio = 'No hay resultados.',
  mensajes,
  children,
}: {
  consulta: UseQueryResult<T>;
  vacio?: (datos: T) => boolean;
  textoVacio?: ReactNode;
  mensajes?: MensajesPropios;
  children: (datos: T) => ReactNode;
}) {
  if (consulta.isPending) return <Cargando />;
  if (consulta.isError) {
    return (
      <Aviso tipo="error">
        <p>{mensajeDeError(consulta.error, mensajes)}</p>
        <Boton variante="enlace" onClick={() => consulta.refetch()}>
          Reintentar
        </Boton>
      </Aviso>
    );
  }
  if (vacio?.(consulta.data)) return <Vacio>{textoVacio}</Vacio>;
  return <>{children(consulta.data)}</>;
}

/** Paginación según el objeto `Pagina` de la API (páginas desde 0). */
export function Paginacion({
  pagina,
  totalPaginas,
  totalElementos,
  alCambiar,
}: {
  pagina: number;
  totalPaginas: number;
  totalElementos?: number;
  alCambiar: (p: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  return (
    <nav aria-label="Paginación" className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <Boton variante="secundario" disabled={pagina <= 0} onClick={() => alCambiar(pagina - 1)}>
        ← Anterior
      </Boton>
      <span className="text-sm text-slate-700" aria-live="polite">
        Página {pagina + 1} de {totalPaginas}
        {totalElementos !== undefined && ` · ${totalElementos} en total`}
      </span>
      <Boton variante="secundario" disabled={pagina >= totalPaginas - 1} onClick={() => alCambiar(pagina + 1)}>
        Siguiente →
      </Boton>
    </nav>
  );
}

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6 ${className}`}>{children}</section>;
}

export function Titulo({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{children}</h1>
      {extra}
    </div>
  );
}

const INSIGNIAS: Record<string, string> = {
  PUBLICADO: 'bg-emerald-100 text-emerald-900',
  BORRADOR: 'bg-slate-200 text-slate-800',
  CANCELADO: 'bg-red-100 text-red-900',
  CANCELADA: 'bg-red-100 text-red-900',
  FINALIZADO: 'bg-indigo-100 text-indigo-900',
  PAGADA: 'bg-emerald-100 text-emerald-900',
  PENDIENTE: 'bg-amber-100 text-amber-900',
  REEMBOLSADA: 'bg-sky-100 text-sky-900',
  VENDIDA: 'bg-emerald-100 text-emerald-900',
  USADA: 'bg-indigo-100 text-indigo-900',
  DISPONIBLE: 'bg-slate-200 text-slate-800',
  ESPERANDO: 'bg-amber-100 text-amber-900',
  ADMITIDO: 'bg-emerald-100 text-emerald-900',
  COMPLETADO: 'bg-indigo-100 text-indigo-900',
  EXPIRADO: 'bg-red-100 text-red-900',
  ERROR: 'bg-red-100 text-red-900',
  WARN: 'bg-amber-100 text-amber-900',
  INFO: 'bg-sky-100 text-sky-900',
};

export function Insignia({ valor }: { valor: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${INSIGNIAS[valor] ?? 'bg-slate-200 text-slate-800'}`}>
      {valor}
    </span>
  );
}

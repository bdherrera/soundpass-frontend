import type { Rol, TokenRespuesta, Usuario } from '../api/tipos';

/**
 * Sesión en memoria con copia en sessionStorage (sobrevive a recargar la pestaña, no a cerrarla).
 * El JWT dura 60 minutos y no se puede revocar: al vencer `expiraEn` se limpia sola.
 */
export interface Sesion {
  token: string;
  expiraEn: string;
  usuario: Usuario;
}

export type MotivoCierre = 'usuario' | 'vencida';

const CLAVE = 'soundpass.sesion';

let actual: Sesion | null = null;
let temporizador: ReturnType<typeof setTimeout> | undefined;
const oyentes = new Set<() => void>();
const oyentesVencida = new Set<() => void>();

function emitir() {
  oyentes.forEach((o) => o());
}

function guardar(s: Sesion | null) {
  try {
    if (s) sessionStorage.setItem(CLAVE, JSON.stringify(s));
    else sessionStorage.removeItem(CLAVE);
  } catch {
    // sessionStorage puede no estar disponible (modo privado); la sesión queda solo en memoria.
  }
}

function programarVencimiento(s: Sesion) {
  clearTimeout(temporizador);
  const restante = new Date(s.expiraEn).getTime() - Date.now();
  // setTimeout no admite más de ~24,8 días; el token dura 60 min, así que basta con acotar.
  temporizador = setTimeout(() => cerrarSesion('vencida'), Math.min(Math.max(restante, 0), 2 ** 31 - 1));
}

function esValida(s: unknown): s is Sesion {
  if (typeof s !== 'object' || s === null) return false;
  const x = s as Partial<Sesion>;
  return (
    typeof x.token === 'string' &&
    typeof x.expiraEn === 'string' &&
    !!x.usuario &&
    new Date(x.expiraEn).getTime() > Date.now()
  );
}

/** Carga la sesión guardada; se llama una vez al arrancar. */
export function restaurarSesion(): void {
  try {
    const crudo = sessionStorage.getItem(CLAVE);
    const s: unknown = crudo ? JSON.parse(crudo) : null;
    if (esValida(s)) {
      actual = s;
      programarVencimiento(s);
    } else {
      actual = null;
      clearTimeout(temporizador);
      if (crudo) sessionStorage.removeItem(CLAVE);
    }
  } catch {
    actual = null;
  }
  emitir();
}

export function iniciarSesionLocal(r: TokenRespuesta): void {
  actual = { token: r.token, expiraEn: r.expiraEn, usuario: r.usuario };
  guardar(actual);
  programarVencimiento(actual);
  emitir();
}

export function cerrarSesion(motivo: MotivoCierre = 'usuario'): void {
  const habia = actual !== null;
  clearTimeout(temporizador);
  actual = null;
  guardar(null);
  emitir();
  if (motivo === 'vencida' && habia) oyentesVencida.forEach((o) => o());
}

export function obtenerSesion(): Sesion | null {
  return actual;
}

export function obtenerToken(): string | null {
  return actual?.token ?? null;
}

export function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

/** Avisa cuando la sesión se pierde sin que el usuario la cierre (401 o vencimiento). */
export function alVencerSesion(oyente: () => void): () => void {
  oyentesVencida.add(oyente);
  return () => oyentesVencida.delete(oyente);
}

/** ADMIN también puede usar todo lo de USUARIO (x-acceso: USUARIO = rol USUARIO o ADMIN). */
export function tieneRol(usuario: Usuario | null | undefined, rol: Rol): boolean {
  if (!usuario) return false;
  return rol === 'USUARIO' ? true : usuario.rol === 'ADMIN';
}

/** Solo se aceptan destinos internos para no abrir una redirección a otro sitio. */
export function destinoSeguro(destino: string | null | undefined): string {
  if (!destino || !destino.startsWith('/') || destino.startsWith('//') || destino.startsWith('/\\')) return '/';
  return destino;
}

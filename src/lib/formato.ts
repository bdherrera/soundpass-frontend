const LOCALE = 'es-CO';

const fmtFechaHora = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
const fmtFecha = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'full' });
const fmtHora = new Intl.DateTimeFormat(LOCALE, { timeStyle: 'short' });
const fmtMoneda = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'COP', maximumFractionDigits: 2 });

export const fechaHora = (iso: string | null | undefined) => (iso ? fmtFechaHora.format(new Date(iso)) : '—');
export const fechaLarga = (iso: string) => fmtFecha.format(new Date(iso));
export const hora = (iso: string) => fmtHora.format(new Date(iso));
export const moneda = (valor: number) => fmtMoneda.format(valor);

export const nombreCompleto = (p: { nombre?: string | null; apellido?: string | null }) =>
  [p.nombre, p.apellido].map((s) => s?.trim()).filter(Boolean).join(' ');

function dosDigitos(n: number) {
  return String(Math.abs(n)).padStart(2, '0');
}

/** Desfase local como `-05:00` / `+01:00`. */
export function desfaseLocal(fecha: Date): string {
  const minutos = -fecha.getTimezoneOffset();
  const signo = minutos >= 0 ? '+' : '-';
  return `${signo}${dosDigitos(Math.trunc(minutos / 60))}:${dosDigitos(minutos % 60)}`;
}

/**
 * Convierte el valor de un `<input type="datetime-local">` (o `date`) a ISO-8601 con la zona del navegador,
 * p. ej. `2026-11-20T20:00:00-05:00`. El `+` de zonas positivas lo codifica después URLSearchParams.
 */
export function localAIso(valor: string): string {
  if (!valor) return '';
  const completo = valor.length === 10 ? `${valor}T00:00` : valor;
  const fecha = new Date(completo);
  if (Number.isNaN(fecha.getTime())) return '';
  const [d, t] = completo.split('T');
  const hms = t.length === 5 ? `${t}:00` : t;
  return `${d}T${hms}${desfaseLocal(fecha)}`;
}

/** Inverso de localAIso: ISO del servidor a valor para `<input type="datetime-local">`. */
export function isoALocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return '';
  return `${f.getFullYear()}-${dosDigitos(f.getMonth() + 1)}-${dosDigitos(f.getDate())}T${dosDigitos(
    f.getHours(),
  )}:${dosDigitos(f.getMinutes())}`;
}

/** UUID v4 para claves de idempotencia. `crypto.randomUUID` solo existe en contextos seguros. */
export function nuevoUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Las imágenes de galería y medios son rutas relativas de texto (`artistas/12/foto1.jpg`);
 * se resuelven contra VITE_MEDIA_URL. Si ya es absoluta (http/https) se respeta.
 */
export function urlMedio(ruta: string): string {
  if (/^https?:\/\//i.test(ruta)) return ruta;
  const base = import.meta.env.VITE_MEDIA_URL || '/media/';
  const baseAbs = new URL(base.endsWith('/') ? base : `${base}/`, window.location.origin);
  return new URL(ruta.replace(/^\/+/, ''), baseAbs).toString();
}

export function esVideo(ruta: string): boolean {
  return /\.(mp4|webm|ogg|mov)$/i.test(ruta);
}

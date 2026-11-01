// Conversión entre listas de la API y áreas de texto de una línea por elemento.

export const deLineas = (xs?: string[]) => (xs ?? []).join('\n');

export const aLineas = (texto: string) =>
  texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

export const deRedes = (redes?: Record<string, string>) =>
  Object.entries(redes ?? {})
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

/** `red: valor` por línea. Se corta en el primer ":" para admitir URLs como valor. */
export function aRedes(texto: string): { redes: Record<string, string>; errores: string[] } {
  const redes: Record<string, string> = {};
  const errores: string[] = [];
  aLineas(texto).forEach((linea, i) => {
    const pos = linea.indexOf(':');
    const clave = pos > 0 ? linea.slice(0, pos).trim() : '';
    const valor = pos > 0 ? linea.slice(pos + 1).trim() : '';
    if (!clave || !valor) errores.push(String(i + 1));
    else redes[clave] = valor;
  });
  return { redes, errores };
}

/** Misma regla que `RutaRelativa` del backend: sin "/" ni "\" inicial, sin ":" y sin "..". */
export const esRutaRelativa = (r: string) => !/^[/\\]/.test(r) && !r.includes(':') && !r.includes('..');

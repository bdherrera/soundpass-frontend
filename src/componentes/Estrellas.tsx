/** Calificación de 0 a 5 en estrellas, con texto accesible. */
export function Estrellas({ valor }: { valor: number }) {
  const llenas = Math.round(valor);
  return (
    <span role="img" aria-label={`${valor.toFixed(1)} de 5 estrellas`} className="text-amber-500">
      {'★'.repeat(llenas)}
      <span className="text-slate-300">{'★'.repeat(5 - llenas)}</span>
    </span>
  );
}

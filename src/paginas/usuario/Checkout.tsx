import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { claves } from '../../api/consultas';
import { consultarDisponibilidad } from '../../api/servicios/eventos';
import { comprarEntradas } from '../../api/servicios/compras';
import type { ResultadoCompra } from '../../api/servicios/compras';
import { esApiError } from '../../api/cliente';
import { mensajeDeError } from '../../api/errores';
import type { Disponibilidad, LineaCompra } from '../../api/tipos';
import { Aviso, Boton, EstadoConsulta, Tarjeta } from '../../componentes/ui';
import { moneda } from '../../lib/formato';
import { useClaveIdempotencia } from '../../lib/idempotencia';

type Paso = 'elegir' | 'confirmar';

const MAX_POR_TIPO = 10;

function lineasDe(cantidades: Record<number, number>): LineaCompra[] {
  return Object.entries(cantidades)
    .filter(([, c]) => c > 0)
    .map(([id, cantidad]) => ({ idTipoEntrada: Number(id), cantidad }));
}

export function Checkout({ idEvento, alComprar }: { idEvento: number; alComprar?: () => void }) {
  const clienteQuery = useQueryClient();
  const { clave, nuevaCompra } = useClaveIdempotencia(idEvento);
  const [paso, setPaso] = useState<Paso>('elegir');
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [resultado, setResultado] = useState<ResultadoCompra | null>(null);

  const disponibilidad = useQuery({
    queryKey: claves.disponibilidad(idEvento),
    queryFn: () => consultarDisponibilidad(idEvento),
  });

  const compra = useMutation({
    mutationFn: (lineas: LineaCompra[]) => comprarEntradas({ claveIdempotencia: clave, lineas }),
    onSuccess: (r) => {
      setResultado(r);
      clienteQuery.invalidateQueries({ queryKey: claves.disponibilidad(idEvento) });
      clienteQuery.invalidateQueries({ queryKey: claves.turno(idEvento) });
      clienteQuery.invalidateQueries({ queryKey: ['ordenes'] });
      clienteQuery.invalidateQueries({ queryKey: ['entradas'] });
      alComprar?.();
    },
  });

  const tipos = useMemo(() => disponibilidad.data ?? [], [disponibilidad.data]);
  const lineas = lineasDe(cantidades);
  const total = lineas.reduce((s, l) => s + l.cantidad * (tipos.find((t) => t.idTipoEntrada === l.idTipoEntrada)?.precio ?? 0), 0);

  const cambiar = (t: Disponibilidad, valor: number) => {
    const tope = Math.min(t.disponibles, MAX_POR_TIPO);
    const c = Math.max(0, Math.min(tope, Number.isFinite(valor) ? Math.trunc(valor) : 0));
    setCantidades((prev) => ({ ...prev, [t.idTipoEntrada]: c }));
  };

  const volverAElegir = () => {
    compra.reset();
    setPaso('elegir');
    disponibilidad.refetch();
  };

  const otraCompra = () => {
    nuevaCompra();
    compra.reset();
    setResultado(null);
    setCantidades({});
    setPaso('elegir');
  };

  if (resultado) {
    const { orden, creada } = resultado;
    return (
      <Tarjeta>
        <Aviso tipo={creada ? 'exito' : 'info'} titulo={creada ? '¡Compra confirmada!' : 'Esta compra ya estaba registrada'}>
          {creada
            ? `Se creó la orden #${orden.idOrden}.`
            : `No se cobró de nuevo: te mostramos la orden #${orden.idOrden} que ya existía para esta compra.`}
        </Aviso>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-slate-600">Estado</dt>
          <dd className="font-medium">{orden.estado}</dd>
          <dt className="text-slate-600">Total</dt>
          <dd className="font-semibold">{moneda(orden.total)}</dd>
        </dl>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to={`/mis-ordenes/${orden.idOrden}`} className="font-medium text-marca-700 underline">
            Ver la orden
          </Link>
          <Link to="/mis-entradas" className="font-medium text-marca-700 underline">
            Ver mis entradas
          </Link>
          <Boton variante="enlace" onClick={otraCompra}>
            Hacer otra compra
          </Boton>
        </div>
      </Tarjeta>
    );
  }

  const error = compra.error;
  const agotadas = esApiError(error) && error.codigo === 'ENTRADAS_AGOTADAS';
  const colaRequerida = esApiError(error) && error.codigo === 'COLA_REQUERIDA';
  const detallesValidacion = esApiError(error) && error.estado === 422 ? error.detalles : [];

  return (
    <Tarjeta>
      <EstadoConsulta consulta={disponibilidad} vacio={(d) => d.length === 0} textoVacio="Este evento no tiene entradas a la venta.">
        {() =>
          paso === 'elegir' ? (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (lineas.length > 0) setPaso('confirmar');
              }}
              aria-label="Elegir entradas"
            >
              <h2 className="mb-4 text-lg font-semibold">Elige tus entradas</h2>
              <ul className="space-y-4">
                {tipos.map((t) => {
                  const idCampo = `cantidad-${t.idTipoEntrada}`;
                  return (
                    <li key={t.idTipoEntrada} className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <label htmlFor={idCampo} className="font-medium">
                          {t.nombre}
                        </label>
                        <p className="text-sm text-slate-600">
                          {moneda(t.precio)} · {t.disponibles === 0 ? 'Agotado' : `${t.disponibles} disponibles`}
                        </p>
                      </div>
                      <input
                        id={idCampo}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={Math.min(t.disponibles, MAX_POR_TIPO)}
                        disabled={t.disponibles === 0}
                        value={cantidades[t.idTipoEntrada] ?? 0}
                        onChange={(e) => cambiar(t, e.target.valueAsNumber)}
                        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-marca-600 disabled:bg-slate-100"
                      />
                    </li>
                  );
                })}
              </ul>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <p className="text-lg">
                  Total: <strong>{moneda(total)}</strong>
                </p>
                <Boton type="submit" disabled={lineas.length === 0}>
                  Continuar
                </Boton>
              </div>
              {lineas.length === 0 && <p className="mt-2 text-sm text-slate-600">Elige al menos una entrada.</p>}
            </form>
          ) : (
            <div>
              <h2 className="mb-4 text-lg font-semibold">Confirma tu compra</h2>
              <table className="w-full text-sm">
                <caption className="sr-only">Resumen de la compra</caption>
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th scope="col" className="py-2">Tipo</th>
                    <th scope="col" className="py-2 text-right">Cantidad</th>
                    <th scope="col" className="py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l) => {
                    const t = tipos.find((x) => x.idTipoEntrada === l.idTipoEntrada);
                    return (
                      <tr key={l.idTipoEntrada} className="border-b border-slate-100">
                        <td className="py-2">{t?.nombre}</td>
                        <td className="py-2 text-right">{l.cantidad}</td>
                        <td className="py-2 text-right">{moneda(l.cantidad * (t?.precio ?? 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={2} className="py-2 text-right">Total</th>
                    <td className="py-2 text-right font-semibold">{moneda(total)}</td>
                  </tr>
                </tfoot>
              </table>
              <p className="mt-2 text-xs text-slate-600">
                El precio final queda registrado en la orden al momento de la compra.
              </p>

              {error && (
                <div className="mt-4">
                  <Aviso tipo="error" titulo="No se pudo completar la compra">
                    <p>
                      {mensajeDeError(error, {
                        NO_ENCONTRADO: 'El evento o alguno de los tipos de entrada ya no está a la venta.',
                      })}
                    </p>
                    {detallesValidacion.length > 0 && (
                      <ul className="mt-1 list-disc pl-5">
                        {detallesValidacion.map((d) => (
                          <li key={d.campo}>
                            {d.campo}: {d.mensaje}
                          </li>
                        ))}
                      </ul>
                    )}
                    {colaRequerida && (
                      <Link to={`/eventos/${idEvento}/cola`} className="mt-2 inline-block font-medium underline">
                        Ir a la cola de reserva
                      </Link>
                    )}
                  </Aviso>
                </div>
              )}

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <Boton variante="secundario" onClick={volverAElegir} disabled={compra.isPending}>
                  {agotadas ? 'Volver y reducir cantidades' : 'Cambiar cantidades'}
                </Boton>
                {!agotadas && !colaRequerida && (
                  <Boton cargando={compra.isPending} onClick={() => compra.mutate(lineas)}>
                    {error ? 'Reintentar' : 'Confirmar compra'}
                  </Boton>
                )}
              </div>
            </div>
          )
        }
      </EstadoConsulta>
    </Tarjeta>
  );
}

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { claves } from '../../api/consultas';
import { cancelarOrden, obtenerMiOrden } from '../../api/servicios/compras';
import { listarMisEntradas } from '../../api/servicios/entradas';
import { mensajeDeError } from '../../api/errores';
import type { Entrada } from '../../api/tipos';
import { Aviso, Boton, EstadoConsulta, Insignia, Tarjeta, Titulo } from '../../componentes/ui';
import { fechaHora, moneda } from '../../lib/formato';

/**
 * El detalle de compra solo trae `idTipoEntrada`; los nombres del tipo y del evento se toman de las
 * entradas del usuario de esa orden (NOTAS_API.md).
 */
async function entradasDeOrden(idOrden: number): Promise<Entrada[]> {
  const todas: Entrada[] = [];
  for (let pagina = 0; pagina < 10; pagina++) {
    const p = await listarMisEntradas({ pagina, tamano: 100 });
    todas.push(...p.contenido.filter((e) => e.idOrden === idOrden));
    if (pagina >= p.totalPaginas - 1) break;
  }
  return todas;
}

export default function DetalleOrden() {
  const id = Number(useParams().idOrden);
  const clienteQuery = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);

  const orden = useQuery({ queryKey: claves.orden(id), queryFn: () => obtenerMiOrden(id) });
  const entradas = useQuery({ queryKey: ['entradas', 'orden', id], queryFn: () => entradasDeOrden(id) });

  const cancelar = useMutation({
    mutationFn: () => cancelarOrden(id),
    onSuccess: (o) => {
      clienteQuery.setQueryData(claves.orden(id), o);
      clienteQuery.invalidateQueries({ queryKey: ['ordenes'] });
      clienteQuery.invalidateQueries({ queryKey: ['entradas'] });
      setConfirmando(false);
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/mis-ordenes" className="text-sm text-marca-700 underline">
        ← Mis órdenes
      </Link>
      <EstadoConsulta consulta={orden} mensajes={{ NO_ENCONTRADO: 'Esta orden no existe.' }}>
        {(o) => {
          const nombres = new Map((entradas.data ?? []).map((e) => [e.idTipoEntrada, e]));
          const cancelable = o.estado === 'PAGADA' || o.estado === 'PENDIENTE';
          return (
            <>
              <Titulo extra={<Insignia valor={o.estado} />}>Orden #{o.idOrden}</Titulo>
              <p className="-mt-4 mb-6 text-slate-700">{fechaHora(o.fecha)}</p>

              {cancelar.isSuccess && (
                <div className="mb-4">
                  <Aviso tipo="exito">
                    La orden quedó {o.estado === 'REEMBOLSADA' ? 'reembolsada' : 'cancelada'}. Sus entradas fueron
                    canceladas y no vuelven a la venta.
                  </Aviso>
                </div>
              )}

              <Tarjeta>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[28rem] text-sm">
                    <caption className="sr-only">Líneas de la orden</caption>
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th scope="col" className="py-2">Entrada</th>
                        <th scope="col" className="py-2 text-right">Precio unitario</th>
                        <th scope="col" className="py-2 text-right">Cantidad</th>
                        <th scope="col" className="py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.detalles.map((d) => {
                        const ref = nombres.get(d.idTipoEntrada);
                        return (
                          <tr key={d.idTipoEntrada} className="border-b border-slate-100">
                            <td className="py-2">
                              <span className="font-medium">{ref?.tipoEntrada ?? `Tipo #${d.idTipoEntrada}`}</span>
                              {ref?.evento && (
                                <Link to={`/eventos/${ref.idEvento}`} className="block text-xs text-marca-700 underline">
                                  {ref.evento}
                                </Link>
                              )}
                            </td>
                            <td className="py-2 text-right">{moneda(d.precioUnitario)}</td>
                            <td className="py-2 text-right">{d.cantidad}</td>
                            <td className="py-2 text-right">{moneda(d.subtotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th scope="row" colSpan={3} className="py-3 text-right">Total</th>
                        <td className="py-3 text-right text-base font-semibold">{moneda(o.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-600">Los precios son los vigentes al momento de la compra.</p>
              </Tarjeta>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/mis-entradas" className="font-medium text-marca-700 underline">
                  Ver mis entradas
                </Link>
                {cancelable && !confirmando && (
                  <Boton variante="peligro" onClick={() => setConfirmando(true)}>
                    Cancelar orden
                  </Boton>
                )}
              </div>

              {cancelable && confirmando && (
                <div className="mt-4">
                  <Aviso tipo="alerta" titulo="¿Cancelar esta orden?">
                    <p>
                      {o.estado === 'PAGADA' ? 'Se te reembolsará el total' : 'La orden se cancelará'} y tus entradas
                      quedarán canceladas. Las entradas canceladas no vuelven al inventario.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Boton variante="peligro" cargando={cancelar.isPending} onClick={() => cancelar.mutate()}>
                        Sí, cancelar
                      </Boton>
                      <Boton variante="secundario" onClick={() => setConfirmando(false)}>
                        No, conservarla
                      </Boton>
                    </div>
                  </Aviso>
                </div>
              )}
              {cancelar.error && (
                <div className="mt-4">
                  <Aviso tipo="error">
                    {mensajeDeError(cancelar.error, {
                      TRANSICION_INVALIDA: 'No se puede cancelar: alguna entrada ya se usó o la orden ya estaba cancelada.',
                    })}
                  </Aviso>
                </div>
              )}
            </>
          );
        }}
      </EstadoConsulta>
    </div>
  );
}

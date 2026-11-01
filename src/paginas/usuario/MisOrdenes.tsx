import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { claves } from '../../api/consultas';
import { listarMisOrdenes } from '../../api/servicios/compras';
import { EstadoConsulta, Insignia, Paginacion, Titulo } from '../../componentes/ui';
import { fechaHora, moneda } from '../../lib/formato';

export default function MisOrdenes() {
  const [params, setParams] = useSearchParams();
  const pagina = Math.max(0, Number(params.get('pagina') ?? 0) || 0);
  const ordenes = useQuery({
    queryKey: claves.misOrdenes(pagina),
    queryFn: () => listarMisOrdenes({ pagina, tamano: 10 }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <Titulo>Mis órdenes</Titulo>
      <EstadoConsulta
        consulta={ordenes}
        vacio={(p) => p.contenido.length === 0}
        textoVacio={
          <>
            Aún no tienes órdenes.{' '}
            <Link to="/" className="font-medium text-marca-700 underline">
              Explora los eventos
            </Link>
          </>
        }
      >
        {(p) => (
          <>
            <ul className="space-y-3">
              {p.contenido.map((o) => (
                <li key={o.idOrden}>
                  <Link
                    to={`/mis-ordenes/${o.idOrden}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-marca-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600"
                  >
                    <div>
                      <p className="font-semibold">Orden #{o.idOrden}</p>
                      <p className="text-sm text-slate-600">
                        {fechaHora(o.fecha)} · {o.detalles.reduce((s, d) => s + d.cantidad, 0)} entradas
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Insignia valor={o.estado} />
                      <span className="font-semibold">{moneda(o.total)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Paginacion
              pagina={p.pagina}
              totalPaginas={p.totalPaginas}
              totalElementos={p.totalElementos}
              alCambiar={(n) => setParams({ pagina: String(n) })}
            />
          </>
        )}
      </EstadoConsulta>
    </>
  );
}

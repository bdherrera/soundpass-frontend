import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { claves } from '../../api/consultas';
import { listarEventos } from '../../api/servicios/eventos';
import type { FiltrosEventos } from '../../api/servicios/eventos';
import { listarArtistas } from '../../api/servicios/catalogo';
import { Boton, Campo, EstadoConsulta, Insignia, Paginacion, Selector, Titulo } from '../../componentes/ui';
import { fechaHora, localAIso } from '../../lib/formato';

const TAMANO = 12;

/** Filtros del catálogo en la URL (fechas como YYYY-MM-DD) para poder compartir y volver atrás. */
function leerFiltros(p: URLSearchParams) {
  return {
    desde: p.get('desde') ?? '',
    hasta: p.get('hasta') ?? '',
    ciudad: p.get('ciudad') ?? '',
    idArtista: p.get('idArtista') ?? '',
    pagina: Math.max(0, Number(p.get('pagina') ?? 0) || 0),
  };
}

function filtrosParaApi(f: ReturnType<typeof leerFiltros>): FiltrosEventos {
  // `hasta` es exclusivo en la API: para incluir el día elegido se envía el día siguiente a las 00:00.
  let hasta: string | undefined;
  if (f.hasta) {
    const d = new Date(`${f.hasta}T00:00`);
    d.setDate(d.getDate() + 1);
    const siguiente = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    hasta = localAIso(siguiente);
  }
  return {
    desde: f.desde ? localAIso(f.desde) : undefined,
    hasta,
    ciudad: f.ciudad.trim() || undefined,
    idArtista: f.idArtista ? Number(f.idArtista) : undefined,
    pagina: f.pagina,
    tamano: TAMANO,
  };
}

export default function Catalogo() {
  const [params, setParams] = useSearchParams();
  const filtros = leerFiltros(params);
  const [borrador, setBorrador] = useState(filtros);
  const filtrosApi = filtrosParaApi(filtros);

  const eventos = useQuery({
    queryKey: claves.eventos(filtrosApi),
    queryFn: () => listarEventos(filtrosApi),
    placeholderData: keepPreviousData,
  });
  const artistas = useQuery({
    queryKey: claves.artistas({ tamano: 100 }),
    queryFn: () => listarArtistas({ tamano: 100 }),
    staleTime: 5 * 60_000,
  });

  const aplicar = (e: FormEvent) => {
    e.preventDefault();
    const nuevos = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...borrador, pagina: '' })) if (v) nuevos.set(k, String(v));
    setParams(nuevos);
  };

  const irAPagina = (p: number) => {
    const nuevos = new URLSearchParams(params);
    nuevos.set('pagina', String(p));
    setParams(nuevos);
    window.scrollTo({ top: 0 });
  };

  const fechaInvalida = borrador.desde && borrador.hasta && borrador.hasta < borrador.desde;

  return (
    <>
      <Titulo>Próximos eventos</Titulo>

      <form onSubmit={aplicar} className="mb-8 grid gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-5" aria-label="Filtros de eventos">
        <Campo etiqueta="Desde" type="date" value={borrador.desde} onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })} />
        <Campo
          etiqueta="Hasta"
          type="date"
          value={borrador.hasta}
          min={borrador.desde || undefined}
          error={fechaInvalida ? 'Debe ser igual o posterior a "Desde"' : undefined}
          onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })}
        />
        <Campo etiqueta="Ciudad" value={borrador.ciudad} onChange={(e) => setBorrador({ ...borrador, ciudad: e.target.value })} />
        <Selector
          etiqueta="Artista"
          value={borrador.idArtista}
          onChange={(e) => setBorrador({ ...borrador, idArtista: e.target.value })}
          disabled={artistas.isPending}
        >
          <option value="">Todos</option>
          {artistas.data?.contenido.map((a) => (
            <option key={a.idArtista} value={a.idArtista}>
              {a.nombreArtistico}
            </option>
          ))}
        </Selector>
        <div className="flex items-end gap-2">
          <Boton type="submit" disabled={!!fechaInvalida} className="flex-1">
            Filtrar
          </Boton>
          <Boton
            variante="secundario"
            onClick={() => {
              const vacio = { desde: '', hasta: '', ciudad: '', idArtista: '', pagina: 0 };
              setBorrador(vacio);
              setParams(new URLSearchParams());
            }}
          >
            Limpiar
          </Boton>
        </div>
      </form>

      <EstadoConsulta
        consulta={eventos}
        vacio={(p) => p.contenido.length === 0}
        textoVacio="No hay eventos publicados con esos filtros."
      >
        {(pagina) => (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy={eventos.isFetching}>
              {pagina.contenido.map((ev) => (
                <li key={ev.idEvento}>
                  <Link
                    to={`/eventos/${ev.idEvento}`}
                    className="block h-full rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-marca-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600"
                  >
                    <p className="text-sm font-medium text-marca-700">{fechaHora(ev.fechaInicio)}</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">{ev.nombre}</h2>
                    <div className="mt-3">
                      <Insignia valor={ev.estado} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Paginacion
              pagina={pagina.pagina}
              totalPaginas={pagina.totalPaginas}
              totalElementos={pagina.totalElementos}
              alCambiar={irAPagina}
            />
          </>
        )}
      </EstadoConsulta>
    </>
  );
}

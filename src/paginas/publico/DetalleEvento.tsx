import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { claves } from '../../api/consultas';
import { consultarDisponibilidad, obtenerDetalleEvento, obtenerEvento } from '../../api/servicios/eventos';
import { listarResenas, resumenResenas } from '../../api/servicios/contenido';
import { estadoCola } from '../../api/servicios/cola';
import { esNoDisponible } from '../../api/cliente';
import { Aviso, Cargando, EstadoConsulta, Insignia, Paginacion, Tarjeta, Vacio } from '../../componentes/ui';
import { SeccionMongo } from '../../componentes/SeccionMongo';
import { Galeria } from '../../componentes/Galeria';
import { Estrellas } from '../../componentes/Estrellas';
import { FormularioResena } from '../usuario/FormularioResena';
import { fechaHora, fechaLarga, hora, moneda } from '../../lib/formato';
import { useSesion } from '../../sesion/contexto';

export default function DetalleEvento() {
  const id = Number(useParams().idEvento);
  const { autenticado } = useSesion();
  const [paginaResenas, setPaginaResenas] = useState(0);

  const evento = useQuery({ queryKey: claves.evento(id), queryFn: () => obtenerEvento(id) });
  const disponibilidad = useQuery({ queryKey: claves.disponibilidad(id), queryFn: () => consultarDisponibilidad(id) });
  const detalle = useQuery({ queryKey: claves.detalleEvento(id), queryFn: () => obtenerDetalleEvento(id) });
  const resumen = useQuery({ queryKey: claves.resumenResenas(id), queryFn: () => resumenResenas(id) });
  const resenas = useQuery({
    queryKey: claves.resenas(id, paginaResenas),
    queryFn: () => listarResenas(id, { pagina: paginaResenas, tamano: 5 }),
  });
  const cola = useQuery({ queryKey: claves.cola(id), queryFn: () => estadoCola(id) });

  if (!Number.isInteger(id)) return <Vacio>Evento no válido.</Vacio>;

  return (
    <EstadoConsulta consulta={evento} mensajes={{ NO_ENCONTRADO: 'Este evento no existe o no está publicado.' }}>
      {(ev) => {
        const artistas = [...(ev.artistas ?? [])].sort((a, b) => a.ordenPresentacion - b.ordenPresentacion);
        const vendible = ev.estado === 'PUBLICADO';
        // Si MongoDB no responde, la API permite comprar sin cola.
        const conCola = cola.data?.habilitada === true;
        const destinoCompra = conCola ? `/eventos/${id}/cola` : `/eventos/${id}/compra`;

        return (
          <article className="space-y-6">
            <header className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <Insignia valor={ev.estado} />
                <span className="text-sm text-slate-600">
                  {fechaLarga(ev.fechaInicio)} · {hora(ev.fechaInicio)} – {hora(ev.fechaFin)}
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{ev.nombre}</h1>
              {ev.escenario && (
                <p className="text-slate-700">
                  {ev.escenario.nombre} · {ev.escenario.ciudad}
                  {ev.escenario.direccion && ` · ${ev.escenario.direccion}`}
                </p>
              )}
            </header>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <Tarjeta>
                  <h2 className="mb-3 text-lg font-semibold">Sobre el evento</h2>
                  <SeccionMongo consulta={detalle} que="La información ampliada" sinDatos={<p className="text-slate-600">Sin descripción por ahora.</p>}>
                    {(d) => (
                      <div className="space-y-4">
                        {d.descripcion && <p className="whitespace-pre-line text-slate-800">{d.descripcion}</p>}
                        {!!d.etiquetas?.length && (
                          <ul className="flex flex-wrap gap-2" aria-label="Etiquetas">
                            {d.etiquetas.map((t) => (
                              <li key={t} className="rounded-full bg-marca-100 px-3 py-1 text-xs font-medium text-marca-800">
                                {t}
                              </li>
                            ))}
                          </ul>
                        )}
                        {d.politicas && (
                          <div>
                            <h3 className="font-medium">Políticas</h3>
                            <p className="whitespace-pre-line text-sm text-slate-700">{d.politicas}</p>
                          </div>
                        )}
                        <Galeria rutas={d.medios ?? []} titulo="Medios del evento" />
                      </div>
                    )}
                  </SeccionMongo>
                </Tarjeta>

                <Tarjeta>
                  <h2 className="mb-3 text-lg font-semibold">Artistas</h2>
                  {artistas.length === 0 ? (
                    <p className="text-slate-600">Aún no hay artistas confirmados.</p>
                  ) : (
                    <ol className="divide-y divide-slate-200">
                      {artistas.map((a) => (
                        <li key={a.idArtista} className="flex items-center gap-3 py-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-marca-100 text-sm font-bold text-marca-800" aria-label={`Orden ${a.ordenPresentacion}`}>
                            {a.ordenPresentacion}
                          </span>
                          <Link to={`/artistas/${a.idArtista}`} className="font-medium text-marca-700 underline-offset-2 hover:underline">
                            {a.nombreArtistico}
                          </Link>
                        </li>
                      ))}
                    </ol>
                  )}
                </Tarjeta>

                <Tarjeta>
                  <h2 className="mb-3 text-lg font-semibold">Reseñas</h2>
                  <div className="space-y-4">
                    <SeccionMongo consulta={resumen} que="El resumen de reseñas">
                      {(r) =>
                        r.total > 0 ? (
                          <p className="flex items-center gap-2">
                            <Estrellas valor={r.promedio} />
                            <span className="font-semibold">{r.promedio.toFixed(1)}</span>
                            <span className="text-sm text-slate-600">({r.total} {r.total === 1 ? 'reseña' : 'reseñas'})</span>
                          </p>
                        ) : null
                      }
                    </SeccionMongo>
                    {autenticado && !esNoDisponible(resenas.error) && <FormularioResena idEvento={id} />}
                    <SeccionMongo consulta={resenas} que="La sección de reseñas">
                      {(p) =>
                        p.contenido.length === 0 ? (
                          <p className="text-slate-600">Todavía no hay reseñas.</p>
                        ) : (
                          <>
                            <ul className="space-y-4">
                              {p.contenido.map((r) => (
                                <li key={r.id} className="border-b border-slate-100 pb-3 last:border-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Estrellas valor={r.calificacion} />
                                    <span className="font-medium">{r.nombreUsuario}</span>
                                    <time className="text-xs text-slate-600" dateTime={r.fecha}>
                                      {fechaHora(r.fecha)}
                                    </time>
                                  </div>
                                  {r.comentario && <p className="mt-1 whitespace-pre-line text-slate-800">{r.comentario}</p>}
                                </li>
                              ))}
                            </ul>
                            <Paginacion pagina={p.pagina} totalPaginas={p.totalPaginas} alCambiar={setPaginaResenas} />
                          </>
                        )
                      }
                    </SeccionMongo>
                  </div>
                </Tarjeta>
              </div>

              <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                <Tarjeta>
                  <h2 className="mb-3 text-lg font-semibold">Entradas</h2>
                  <EstadoConsulta consulta={disponibilidad} vacio={(d) => d.length === 0} textoVacio="Aún no hay entradas a la venta.">
                    {(tipos) => (
                      <ul className="space-y-3">
                        {tipos.map((t) => (
                          <li key={t.idTipoEntrada} className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{t.nombre}</p>
                              <p className={`text-sm ${t.disponibles === 0 ? 'text-red-700' : 'text-slate-600'}`}>
                                {t.disponibles === 0 ? 'Agotado' : `${t.disponibles} de ${t.cupo} disponibles`}
                              </p>
                            </div>
                            <p className="font-semibold">{moneda(t.precio)}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </EstadoConsulta>
                  {vendible && (disponibilidad.data?.some((t) => t.disponibles > 0) ?? false) && (
                    <div className="mt-4 space-y-2">
                      {cola.isPending ? (
                        <Cargando texto="Comprobando la cola…" />
                      ) : (
                        <Link
                          to={destinoCompra}
                          className="flex min-h-[2.75rem] w-full items-center justify-center rounded-lg bg-marca-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-marca-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600"
                        >
                          {conCola ? 'Entrar a la cola' : 'Comprar entradas'}
                        </Link>
                      )}
                      {conCola && cola.data && (
                        <p className="text-xs text-slate-600">
                          Este evento usa cola de reserva: {cola.data.enEspera} en espera, {cola.data.enCompra} comprando.
                        </p>
                      )}
                    </div>
                  )}
                  {!vendible && <Aviso tipo="info">Este evento no tiene venta abierta.</Aviso>}
                </Tarjeta>
              </aside>
            </div>
          </article>
        );
      }}
    </EstadoConsulta>
  );
}

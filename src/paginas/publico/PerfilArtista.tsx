import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { claves } from '../../api/consultas';
import { obtenerArtista, obtenerPerfilArtista } from '../../api/servicios/catalogo';
import { listarEventos } from '../../api/servicios/eventos';
import { EstadoConsulta, Tarjeta } from '../../componentes/ui';
import { SeccionMongo } from '../../componentes/SeccionMongo';
import { Galeria } from '../../componentes/Galeria';
import { fechaHora } from '../../lib/formato';

/** Un enlace solo se vuelve <a> si es http(s): evita `javascript:` y similares guardados en el perfil. */
function enlaceSeguro(valor: string): string | null {
  try {
    const u = new URL(valor);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export default function PerfilArtista() {
  const id = Number(useParams().idArtista);
  const artista = useQuery({ queryKey: claves.artista(id), queryFn: () => obtenerArtista(id) });
  const perfil = useQuery({ queryKey: claves.perfilArtista(id), queryFn: () => obtenerPerfilArtista(id) });
  const eventos = useQuery({
    queryKey: claves.eventos({ idArtista: id, tamano: 10 }),
    queryFn: () => listarEventos({ idArtista: id, tamano: 10 }),
  });

  return (
    <EstadoConsulta consulta={artista} mensajes={{ NO_ENCONTRADO: 'Este artista no existe o no está activo.' }}>
      {(a) => (
        <article className="space-y-6">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">{a.nombreArtistico}</h1>
            <p className="text-slate-700">{[a.genero, a.pais].filter(Boolean).join(' · ')}</p>
          </header>

          <SeccionMongo consulta={perfil} que="El perfil del artista" sinDatos={<p className="text-slate-600">Este artista aún no tiene perfil ampliado.</p>}>
            {(p) => (
              <div className="grid gap-6 lg:grid-cols-3">
                <Tarjeta className="lg:col-span-2">
                  <h2 className="mb-2 text-lg font-semibold">Biografía</h2>
                  <p className="whitespace-pre-line text-slate-800">{p.biografia || 'Sin biografía.'}</p>
                  {!!p.galeria?.length && (
                    <>
                      <h2 className="mb-2 mt-6 text-lg font-semibold">Galería</h2>
                      <Galeria rutas={p.galeria} titulo={`Foto de ${a.nombreArtistico}`} />
                    </>
                  )}
                </Tarjeta>
                <Tarjeta>
                  {p.redes && Object.keys(p.redes).length > 0 && (
                    <>
                      <h2 className="mb-2 text-lg font-semibold">Redes</h2>
                      <ul className="mb-4 space-y-1">
                        {Object.entries(p.redes).map(([red, valor]) => {
                          const url = enlaceSeguro(valor);
                          return (
                            <li key={red}>
                              <span className="font-medium capitalize">{red}:</span>{' '}
                              {url ? (
                                <a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-marca-700 underline">
                                  {valor}
                                </a>
                              ) : (
                                <span className="break-all">{valor}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                  {!!p.enlaces?.length && (
                    <>
                      <h2 className="mb-2 text-lg font-semibold">Enlaces</h2>
                      <ul className="space-y-1">
                        {p.enlaces.map((e) => {
                          const url = enlaceSeguro(e);
                          return (
                            <li key={e} className="break-all">
                              {url ? (
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-marca-700 underline">
                                  {e}
                                </a>
                              ) : (
                                e
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </Tarjeta>
              </div>
            )}
          </SeccionMongo>

          <Tarjeta>
            <h2 className="mb-3 text-lg font-semibold">Próximos eventos</h2>
            <EstadoConsulta consulta={eventos} vacio={(p) => p.contenido.length === 0} textoVacio="No tiene eventos publicados.">
              {(p) => (
                <ul className="divide-y divide-slate-200">
                  {p.contenido.map((ev) => (
                    <li key={ev.idEvento} className="py-2">
                      <Link to={`/eventos/${ev.idEvento}`} className="font-medium text-marca-700 hover:underline">
                        {ev.nombre}
                      </Link>
                      <span className="ml-2 text-sm text-slate-600">{fechaHora(ev.fechaInicio)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </EstadoConsulta>
          </Tarjeta>
        </article>
      )}
    </EstadoConsulta>
  );
}

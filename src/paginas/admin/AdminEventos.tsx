import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { claves } from '../../api/consultas';
import { listarEventos } from '../../api/servicios/eventos';
import { Boton, Campo, EstadoConsulta, Insignia, Paginacion, Tarjeta, Titulo } from '../../componentes/ui';
import { fechaHora } from '../../lib/formato';
import { FormularioEvento } from './FormularioEvento';
import { leerRecientes, recordarEvento } from './recientes';

export default function AdminEventos() {
  const navegar = useNavigate();
  const [pagina, setPagina] = useState(0);
  const [creando, setCreando] = useState(false);
  const [idAbrir, setIdAbrir] = useState('');
  const recientes = leerRecientes();
  const filtros = { pagina, tamano: 20 };
  const eventos = useQuery({ queryKey: claves.eventos(filtros), queryFn: () => listarEventos(filtros), placeholderData: keepPreviousData });

  return (
    <>
      <Titulo extra={<Boton onClick={() => setCreando((c) => !c)}>{creando ? 'Cerrar' : 'Nuevo evento'}</Boton>}>Eventos</Titulo>

      {creando && (
        <Tarjeta className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">Nuevo evento</h2>
          <FormularioEvento
            alGuardar={(e) => {
              recordarEvento(e);
              navegar(`/admin/eventos/${e.idEvento}`);
            }}
          />
        </Tarjeta>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Tarjeta>
          <h2 className="mb-2 text-lg font-semibold">Abrir por número</h2>
          <p className="mb-3 text-sm text-slate-600">
            La API solo lista eventos publicados; los borradores, cancelados y finalizados se abren por su número.
          </p>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (Number(idAbrir) > 0) navegar(`/admin/eventos/${Number(idAbrir)}`);
            }}
          >
            <Campo etiqueta="Número de evento" type="number" min={1} inputMode="numeric" value={idAbrir} onChange={(e) => setIdAbrir(e.target.value)} className="flex-1" />
            <Boton type="submit" variante="secundario" disabled={!(Number(idAbrir) > 0)}>
              Abrir
            </Boton>
          </form>
        </Tarjeta>
        <Tarjeta>
          <h2 className="mb-2 text-lg font-semibold">Vistos en esta sesión</h2>
          {recientes.length === 0 ? (
            <p className="text-sm text-slate-600">Aún no has abierto eventos.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recientes.map((r) => (
                <li key={r.idEvento} className="flex items-center justify-between gap-2 py-1.5">
                  <Link to={`/admin/eventos/${r.idEvento}`} className="text-marca-700 hover:underline">
                    #{r.idEvento} · {r.nombre}
                  </Link>
                  <Insignia valor={r.estado} />
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Publicados</h2>
      <EstadoConsulta consulta={eventos} vacio={(p) => p.contenido.length === 0} textoVacio="No hay eventos publicados.">
        {(p) => (
          <>
            <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <table className="w-full min-w-[36rem] text-sm">
                <caption className="sr-only">Eventos publicados</caption>
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-2">#</th>
                    <th scope="col" className="px-4 py-2">Nombre</th>
                    <th scope="col" className="px-4 py-2">Inicio</th>
                    <th scope="col" className="px-4 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {p.contenido.map((e) => (
                    <tr key={e.idEvento} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-slate-600">{e.idEvento}</td>
                      <td className="px-4 py-2">
                        <Link to={`/admin/eventos/${e.idEvento}`} className="font-medium text-marca-700 hover:underline">
                          {e.nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{fechaHora(e.fechaInicio)}</td>
                      <td className="px-4 py-2">
                        <Insignia valor={e.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion pagina={p.pagina} totalPaginas={p.totalPaginas} totalElementos={p.totalElementos} alCambiar={setPagina} />
          </>
        )}
      </EstadoConsulta>
    </>
  );
}

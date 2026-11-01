import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { claves } from '../../api/consultas';
import {
  asignarArtistaAEvento,
  cambiarEstadoEvento,
  obtenerEvento,
  quitarArtistaDeEvento,
  TRANSICIONES_EVENTO,
} from '../../api/servicios/eventos';
import { listarArtistas } from '../../api/servicios/catalogo';
import { mensajeDeError } from '../../api/errores';
import type { EstadoEvento, EventoDetalle } from '../../api/tipos';
import { Aviso, Boton, Campo, EstadoConsulta, Insignia, Selector, Tarjeta, Titulo } from '../../componentes/ui';
import { fechaHora } from '../../lib/formato';
import { FormularioEvento, MENSAJE_SOLAPAMIENTO } from './FormularioEvento';
import { recordarEvento } from './recientes';
import { SeccionCola, SeccionDetalleEvento, SeccionTiposEntrada, SeccionVentas } from './SeccionesEvento';

const ACCION: Record<EstadoEvento, string> = {
  PUBLICADO: 'Publicar',
  CANCELADO: 'Cancelar evento',
  FINALIZADO: 'Marcar como finalizado',
  BORRADOR: 'Reactivar como borrador',
};

function SeccionEstado({ evento }: { evento: EventoDetalle }) {
  const clienteQuery = useQueryClient();
  const cambiar = useMutation({
    mutationFn: (estado: EstadoEvento) => cambiarEstadoEvento(evento.idEvento, estado),
    onSuccess: () => {
      clienteQuery.invalidateQueries({ queryKey: claves.evento(evento.idEvento) });
      clienteQuery.invalidateQueries({ queryKey: ['eventos'] });
    },
  });
  const opciones = TRANSICIONES_EVENTO[evento.estado];

  return (
    <Tarjeta>
      <h2 className="mb-3 text-lg font-semibold">Estado</h2>
      <p className="mb-3">
        Estado actual: <Insignia valor={evento.estado} />
      </p>
      {opciones.length === 0 ? (
        <p className="text-sm text-slate-600">Un evento finalizado ya no cambia de estado.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {opciones.map((e) => (
            <Boton
              key={e}
              variante={e === 'CANCELADO' ? 'peligro' : e === 'PUBLICADO' ? 'primario' : 'secundario'}
              cargando={cambiar.isPending && cambiar.variables === e}
              disabled={cambiar.isPending}
              onClick={() => cambiar.mutate(e)}
            >
              {ACCION[e]}
            </Boton>
          ))}
        </div>
      )}
      {evento.estado === 'CANCELADO' && (
        <p className="mt-2 text-xs text-slate-600">Cancelar no reembolsa las órdenes ya vendidas.</p>
      )}
      {cambiar.error && (
        <div className="mt-3">
          <Aviso tipo="error">
            {mensajeDeError(cambiar.error, {
              SOLAPAMIENTO_ESCENARIO: MENSAJE_SOLAPAMIENTO,
              TRANSICION_INVALIDA: 'Ese cambio de estado no está permitido.',
            })}
          </Aviso>
        </div>
      )}
    </Tarjeta>
  );
}

function SeccionArtistas({ evento }: { evento: EventoDetalle }) {
  const clienteQuery = useQueryClient();
  const asignados = [...(evento.artistas ?? [])].sort((a, b) => a.ordenPresentacion - b.ordenPresentacion);
  const [idArtista, setIdArtista] = useState('');
  const [orden, setOrden] = useState(String(asignados.length + 1));
  const artistas = useQuery({ queryKey: claves.artistas({ tamano: 100 }), queryFn: () => listarArtistas({ tamano: 100 }) });
  const refrescar = () => clienteQuery.invalidateQueries({ queryKey: claves.evento(evento.idEvento) });

  const asignar = useMutation({
    mutationFn: (v: { idArtista: number; orden: number }) => asignarArtistaAEvento(evento.idEvento, v.idArtista, v.orden),
    onSuccess: () => {
      setIdArtista('');
      refrescar();
    },
  });
  const quitar = useMutation({
    mutationFn: (id: number) => quitarArtistaDeEvento(evento.idEvento, id),
    onSuccess: refrescar,
  });
  const error = asignar.error ?? quitar.error;

  useEffect(() => setOrden(String(asignados.length + 1)), [asignados.length]);

  return (
    <Tarjeta>
      <h2 className="mb-3 text-lg font-semibold">Artistas</h2>
      {asignados.length === 0 ? (
        <p className="mb-3 text-sm text-slate-600">Sin artistas asignados.</p>
      ) : (
        <ol className="mb-4 divide-y divide-slate-100">
          {asignados.map((a) => (
            <li key={a.idArtista} className="flex flex-wrap items-center gap-2 py-2">
              <label className="sr-only" htmlFor={`orden-${a.idArtista}`}>
                Orden de {a.nombreArtistico}
              </label>
              <input
                key={a.ordenPresentacion}
                id={`orden-${a.idArtista}`}
                type="number"
                min={1}
                defaultValue={a.ordenPresentacion}
                className="w-16 rounded border border-slate-300 px-2 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-marca-600"
                onBlur={(e) => {
                  const n = e.target.valueAsNumber;
                  if (Number.isInteger(n) && n >= 1 && n !== a.ordenPresentacion) asignar.mutate({ idArtista: a.idArtista, orden: n });
                }}
              />
              <span className="flex-1 font-medium">{a.nombreArtistico}</span>
              <Boton
                variante="enlace"
                className="!text-red-700"
                aria-label={`Quitar a ${a.nombreArtistico}`}
                cargando={quitar.isPending && quitar.variables === a.idArtista}
                onClick={() => quitar.mutate(a.idArtista)}
              >
                Quitar
              </Boton>
            </li>
          ))}
        </ol>
      )}
      <form
        className="grid gap-3 sm:grid-cols-[1fr_6rem_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (idArtista && Number(orden) >= 1) asignar.mutate({ idArtista: Number(idArtista), orden: Number(orden) });
        }}
      >
        <Selector etiqueta="Artista" value={idArtista} onChange={(e) => setIdArtista(e.target.value)} disabled={artistas.isPending}>
          <option value="">Elige un artista</option>
          {artistas.data?.contenido
            .filter((a) => !asignados.some((x) => x.idArtista === a.idArtista))
            .map((a) => (
              <option key={a.idArtista} value={a.idArtista}>
                {a.nombreArtistico}
              </option>
            ))}
        </Selector>
        <Campo etiqueta="Orden" type="number" min={1} value={orden} onChange={(e) => setOrden(e.target.value)} />
        <Boton type="submit" disabled={!idArtista || !(Number(orden) >= 1)} cargando={asignar.isPending && !quitar.isPending}>
          Asignar
        </Boton>
      </form>
      {error && (
        <div className="mt-3">
          <Aviso tipo="error">{mensajeDeError(error)}</Aviso>
        </div>
      )}
    </Tarjeta>
  );
}

export default function AdminEvento() {
  const id = Number(useParams().idEvento);
  const clienteQuery = useQueryClient();
  const [editando, setEditando] = useState(false);
  const evento = useQuery({ queryKey: claves.evento(id), queryFn: () => obtenerEvento(id) });

  useEffect(() => {
    if (evento.data) recordarEvento(evento.data);
  }, [evento.data]);

  return (
    <div className="space-y-6">
      <Link to="/admin/eventos" className="text-sm text-marca-700 underline">
        ← Eventos
      </Link>
      <EstadoConsulta consulta={evento} mensajes={{ NO_ENCONTRADO: 'No existe un evento con ese número.' }}>
        {(ev) => (
          <>
            <Titulo extra={<Insignia valor={ev.estado} />}>
              #{ev.idEvento} · {ev.nombre}
            </Titulo>

            <div className="grid gap-6 lg:grid-cols-2">
              <Tarjeta>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Datos</h2>
                  <Boton variante="enlace" onClick={() => setEditando((x) => !x)}>
                    {editando ? 'Cerrar' : 'Editar'}
                  </Boton>
                </div>
                {editando ? (
                  <FormularioEvento
                    evento={ev}
                    alGuardar={() => {
                      setEditando(false);
                      clienteQuery.invalidateQueries({ queryKey: claves.evento(id) });
                      clienteQuery.invalidateQueries({ queryKey: ['eventos'] });
                    }}
                  />
                ) : (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt className="text-slate-600">Escenario</dt>
                    <dd>{ev.escenario ? `${ev.escenario.nombre} · ${ev.escenario.ciudad}` : `#${ev.idEscenario}`}</dd>
                    <dt className="text-slate-600">Inicio</dt>
                    <dd>{fechaHora(ev.fechaInicio)}</dd>
                    <dt className="text-slate-600">Fin</dt>
                    <dd>{fechaHora(ev.fechaFin)}</dd>
                  </dl>
                )}
              </Tarjeta>
              <SeccionEstado evento={ev} />
              <SeccionArtistas evento={ev} />
              <SeccionTiposEntrada idEvento={id} />
              <SeccionCola idEvento={id} />
              <SeccionVentas idEvento={id} />
            </div>
            <SeccionDetalleEvento idEvento={id} />
          </>
        )}
      </EstadoConsulta>
    </div>
  );
}

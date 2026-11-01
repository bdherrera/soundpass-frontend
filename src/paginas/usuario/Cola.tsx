import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { claves } from '../../api/consultas';
import { estadoCola, miTurno, salirDeCola, unirseACola } from '../../api/servicios/cola';
import { obtenerEvento } from '../../api/servicios/eventos';
import { esApiError, esNoDisponible, esNoEncontrado } from '../../api/cliente';
import { mensajeDeError } from '../../api/errores';
import type { Turno } from '../../api/tipos';
import { Aviso, Boton, Cargando, Insignia, Tarjeta, Titulo } from '../../componentes/ui';
import { Checkout } from './Checkout';

const INTERVALO_MS = 3000;
const ACTIVOS: Turno['estado'][] = ['ESPERANDO', 'ADMITIDO'];

const MENSAJES_COLA = {
  COLA_INACTIVA: 'Este evento ya no usa cola de reserva: puedes comprar directamente.',
  COLA_REQUERIDA: 'Necesitas un turno admitido para comprar. Entra a la cola y espera tu turno.',
};

function useRestante(expiraEn: string | null | undefined) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!expiraEn) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiraEn]);
  if (!expiraEn) return null;
  return Math.max(0, Math.floor((new Date(expiraEn).getTime() - ahora) / 1000));
}

function mmss(segundos: number) {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}

export default function Cola() {
  const id = Number(useParams().idEvento);
  const navegar = useNavigate();
  const clienteQuery = useQueryClient();
  const [compro, setCompro] = useState(false);

  const evento = useQuery({ queryKey: claves.evento(id), queryFn: () => obtenerEvento(id) });
  const cola = useQuery({ queryKey: claves.cola(id), queryFn: () => estadoCola(id), refetchInterval: INTERVALO_MS * 2 });
  const turno = useQuery({
    queryKey: claves.turno(id),
    queryFn: () => miTurno(id),
    // Polling solo mientras el turno sigue vivo y no se ha comprado.
    refetchInterval: (q) => (!compro && q.state.data && ACTIVOS.includes(q.state.data.estado) ? INTERVALO_MS : false),
    refetchIntervalInBackground: false,
  });

  const entrar = useMutation({
    mutationFn: () => unirseACola(id),
    onSuccess: (t) => clienteQuery.setQueryData(claves.turno(id), t),
  });
  const salir = useMutation({
    mutationFn: () => salirDeCola(id),
    onSuccess: () => {
      clienteQuery.removeQueries({ queryKey: claves.turno(id) });
      navegar(`/eventos/${id}`);
    },
  });

  const t = turno.data;
  const restante = useRestante(t?.estado === 'ADMITIDO' ? t.expiraEn : null);
  const vencidoEnCliente = t?.estado === 'ADMITIDO' && restante === 0;

  // Al llegar a 0 se pregunta al servidor: él decide si el turno venció.
  useEffect(() => {
    if (vencidoEnCliente) turno.refetch();
  }, [vencidoEnCliente]); // eslint-disable-line react-hooks/exhaustive-deps

  const sinTurno = esNoEncontrado(turno.error) || !t || !ACTIVOS.includes(t.estado);
  const colaCaida = esNoDisponible(cola.error) || esNoDisponible(turno.error) || esNoDisponible(entrar.error);
  const colaInactiva = cola.data?.habilitada === false || (esApiError(entrar.error) && entrar.error.codigo === 'COLA_INACTIVA');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to={`/eventos/${id}`} className="text-sm text-marca-700 underline">
        ← Volver al evento
      </Link>
      <Titulo>Cola de reserva</Titulo>
      {evento.data && <p className="-mt-4 text-slate-700">{evento.data.nombre}</p>}

      {colaCaida && (
        <Aviso tipo="alerta" titulo="La cola no está disponible">
          <p>En este momento no podemos consultar la cola; la compra está abierta sin turno.</p>
          <Link to={`/eventos/${id}/compra`} className="mt-1 inline-block font-medium underline">
            Ir a comprar
          </Link>
        </Aviso>
      )}

      {!colaCaida && colaInactiva && (
        <Aviso tipo="info">
          <p>{MENSAJES_COLA.COLA_INACTIVA}</p>
          <Link to={`/eventos/${id}/compra`} className="mt-1 inline-block font-medium underline">
            Comprar entradas
          </Link>
        </Aviso>
      )}

      {!colaCaida && !colaInactiva && (
        <Tarjeta>
          {turno.isPending ? (
            <Cargando texto="Consultando tu turno…" />
          ) : sinTurno ? (
            <div className="space-y-4">
              {t?.estado === 'EXPIRADO' && (
                <Aviso tipo="alerta" titulo="Tu turno venció">
                  Se acabó el tiempo para comprar. Puedes volver a entrar a la cola.
                </Aviso>
              )}
              {t?.estado === 'COMPLETADO' && <Aviso tipo="exito">Ya completaste tu compra con este turno.</Aviso>}
              {t?.estado === 'CANCELADO' && <Aviso tipo="info">Saliste de la cola.</Aviso>}
              {cola.data && (
                <p className="text-sm text-slate-700">
                  Ahora mismo hay {cola.data.enEspera} personas esperando y {cola.data.enCompra} comprando.
                </p>
              )}
              {entrar.error && !colaInactiva && (
                <Aviso tipo="error">{mensajeDeError(entrar.error, MENSAJES_COLA)}</Aviso>
              )}
              {turno.error && !esNoEncontrado(turno.error) && <Aviso tipo="error">{mensajeDeError(turno.error)}</Aviso>}
              <Boton cargando={entrar.isPending} onClick={() => entrar.mutate()}>
                Entrar a la cola
              </Boton>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3" aria-live="polite">
                <Insignia valor={t.estado} />
                {t.estado === 'ESPERANDO' && (
                  <p>
                    {t.posicion > 0 ? (
                      <>
                        Hay <strong>{t.posicion}</strong> {t.posicion === 1 ? 'turno' : 'turnos'} antes que el tuyo.
                      </>
                    ) : (
                      'Eres el siguiente.'
                    )}
                  </p>
                )}
                {t.estado === 'ADMITIDO' && restante !== null && (
                  <p>
                    ¡Es tu turno! Te quedan <strong>{mmss(restante)}</strong> para comprar.
                  </p>
                )}
              </div>
              {t.estado === 'ESPERANDO' && (
                <p className="text-sm text-slate-600">
                  Turno #{t.turno}. Esta pantalla se actualiza sola; no cierres la pestaña.
                </p>
              )}
              {t.estado === 'ADMITIDO' && restante !== null && restante <= 60 && restante > 0 && (
                <Aviso tipo="alerta">Tu turno está por vencer.</Aviso>
              )}
              <Boton variante="secundario" cargando={salir.isPending} onClick={() => salir.mutate()}>
                Salir de la cola
              </Boton>
              {salir.error && <Aviso tipo="error">{mensajeDeError(salir.error)}</Aviso>}
            </div>
          )}
        </Tarjeta>
      )}

      {/* Tras comprar, el turno pasa a COMPLETADO: se mantiene el checkout para mostrar el resultado. */}
      {(compro || (t?.estado === 'ADMITIDO' && !vencidoEnCliente)) && !colaCaida && (
        <Checkout idEvento={id} alComprar={() => setCompro(true)} />
      )}
    </div>
  );
}

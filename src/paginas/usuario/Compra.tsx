import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { claves } from '../../api/consultas';
import { obtenerEvento } from '../../api/servicios/eventos';
import { estadoCola, miTurno } from '../../api/servicios/cola';
import { Cargando, EstadoConsulta, Titulo } from '../../componentes/ui';
import { Checkout } from './Checkout';
import { fechaHora } from '../../lib/formato';

export default function Compra() {
  const id = Number(useParams().idEvento);
  const evento = useQuery({ queryKey: claves.evento(id), queryFn: () => obtenerEvento(id) });
  const cola = useQuery({ queryKey: claves.cola(id), queryFn: () => estadoCola(id) });
  const conCola = cola.data?.habilitada === true;
  const turno = useQuery({ queryKey: claves.turno(id), queryFn: () => miTurno(id), enabled: conCola });
  const [compro, setCompro] = useState(false);

  if (cola.isPending || (conCola && turno.isPending)) return <Cargando />;
  // Con cola habilitada solo se compra con turno ADMITIDO; si MongoDB falla (error en `cola`) se compra sin cola.
  // Tras comprar, el turno pasa a COMPLETADO y no se redirige para no perder el resultado.
  if (conCola && !compro && turno.data?.estado !== 'ADMITIDO') return <Navigate to={`/eventos/${id}/cola`} replace />;

  return (
    <EstadoConsulta consulta={evento}>
      {(ev) => (
        <div className="mx-auto max-w-2xl">
          <Link to={`/eventos/${id}`} className="text-sm text-marca-700 underline">
            ← Volver al evento
          </Link>
          <Titulo>Comprar entradas</Titulo>
          <p className="-mt-4 mb-6 text-slate-700">
            {ev.nombre} · {fechaHora(ev.fechaInicio)}
          </p>
          <Checkout idEvento={id} alComprar={() => setCompro(true)} />
        </div>
      )}
    </EstadoConsulta>
  );
}

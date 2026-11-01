import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { claves } from '../../api/consultas';
import { consultarLogs } from '../../api/servicios/contenido';
import type { FiltrosLogs } from '../../api/servicios/contenido';
import { esNoDisponible } from '../../api/cliente';
import type { NivelLog } from '../../api/tipos';
import { Boton, Campo, EstadoConsulta, Insignia, SeccionNoDisponible, Selector, Titulo } from '../../componentes/ui';
import { fechaHora } from '../../lib/formato';

const NIVELES: NivelLog[] = ['ERROR', 'WARN', 'INFO'];

export default function AdminLogs() {
  const [nivel, setNivel] = useState<NivelLog | ''>('');
  const [limite, setLimite] = useState(50);
  const filtros: FiltrosLogs = { nivel: nivel || undefined, limite };
  const logs = useQuery({ queryKey: claves.logs(filtros), queryFn: () => consultarLogs(filtros), placeholderData: keepPreviousData });

  return (
    <>
      <Titulo extra={<Boton variante="secundario" cargando={logs.isFetching} onClick={() => logs.refetch()}>Actualizar</Boton>}>
        Logs de la aplicación
      </Titulo>
      <div className="mb-6 grid max-w-lg gap-4 sm:grid-cols-2">
        <Selector etiqueta="Nivel" value={nivel} onChange={(e) => setNivel(e.target.value as NivelLog | '')}>
          <option value="">Todos</option>
          {NIVELES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Selector>
        <Campo
          etiqueta="Límite"
          type="number"
          min={1}
          max={200}
          value={limite}
          ayuda="Entre 1 y 200. Por omisión, últimas 24 horas."
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            if (Number.isInteger(n)) setLimite(Math.min(200, Math.max(1, n)));
          }}
        />
      </div>
      {esNoDisponible(logs.error) ? (
        <SeccionNoDisponible que="El registro de logs" />
      ) : (
        <EstadoConsulta consulta={logs} vacio={(l) => l.length === 0} textoVacio="No hay entradas de log con ese filtro.">
          {(lista) => {
            // Más recientes primero (la API ya los ordena así; se asegura en el cliente).
            const ordenados = [...lista].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            return (
              <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <table className="w-full min-w-[48rem] text-sm">
                  <caption className="sr-only">Entradas de log</caption>
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th scope="col" className="px-3 py-2">Fecha</th>
                      <th scope="col" className="px-3 py-2">Nivel</th>
                      <th scope="col" className="px-3 py-2">Logger</th>
                      <th scope="col" className="px-3 py-2">Mensaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenados.map((l, i) => (
                      <tr key={`${l.fecha}-${i}`} className="border-t border-slate-100 align-top">
                        <td className="whitespace-nowrap px-3 py-2">{fechaHora(l.fecha)}</td>
                        <td className="px-3 py-2">
                          <Insignia valor={l.nivel} />
                        </td>
                        <td className="max-w-[14rem] break-all px-3 py-2 font-mono text-xs text-slate-700" title={l.hilo ?? undefined}>
                          {l.logger}
                        </td>
                        <td className="break-words px-3 py-2">{l.mensaje}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }}
        </EstadoConsulta>
      )}
    </>
  );
}

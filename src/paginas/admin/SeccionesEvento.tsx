import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { claves } from '../../api/consultas';
import {
  actualizarTipoEntrada,
  crearTipoEntrada,
  guardarDetalleEvento,
  listarTiposEntrada,
  obtenerDetalleEvento,
  resumenVentasEvento,
} from '../../api/servicios/eventos';
import { configurarCola, estadoCola } from '../../api/servicios/cola';
import { esNoDisponible, esNoEncontrado } from '../../api/cliente';
import { erroresDeCampos, mensajeDeError } from '../../api/errores';
import type { ColaEstado, DetalleEvento, TipoEntrada } from '../../api/tipos';
import { AreaTexto, Aviso, Boton, Campo, Cargando, EstadoConsulta, SeccionNoDisponible, Tarjeta } from '../../componentes/ui';
import { moneda } from '../../lib/formato';
import { aLineas, deLineas, esRutaRelativa } from './textoLista';

// ---------- Tipos de entrada ----------

// Reglas de TipoEntradaEntrada en el OpenAPI.
const esquemaTipo = z.object({
  nombre: z.string().trim().min(1, 'Obligatorio').max(60, 'Máximo 60 caracteres'),
  precio: z.coerce.number({ invalid_type_error: 'Escribe un número' }).min(0, 'No puede ser negativo'),
  cupo: z.coerce
    .number({ invalid_type_error: 'Escribe un número' })
    .int('Debe ser entero')
    .min(1, 'Mínimo 1')
    .max(100000, 'Máximo 100000'),
});
type DatosTipo = z.infer<typeof esquemaTipo>;

function FormularioTipo({ idEvento, tipo, alTerminar }: { idEvento: number; tipo: TipoEntrada | null; alTerminar: () => void }) {
  const clienteQuery = useQueryClient();
  const { register, handleSubmit, formState, setError } = useForm<DatosTipo>({
    resolver: zodResolver(esquemaTipo),
    defaultValues: { nombre: tipo?.nombre ?? '', precio: tipo?.precio ?? 0, cupo: tipo?.cupo ?? 100 },
  });
  const guardar = useMutation({
    mutationFn: (d: DatosTipo) => (tipo ? actualizarTipoEntrada(tipo.idTipoEntrada, d) : crearTipoEntrada(idEvento, d)),
    onSuccess: () => {
      clienteQuery.invalidateQueries({ queryKey: claves.tiposEntrada(idEvento) });
      clienteQuery.invalidateQueries({ queryKey: claves.disponibilidad(idEvento) });
      clienteQuery.invalidateQueries({ queryKey: claves.ventas(idEvento) });
      clienteQuery.invalidateQueries({ queryKey: claves.evento(idEvento) });
      alTerminar();
    },
    onError: (e) => {
      for (const [c, m] of Object.entries(erroresDeCampos(e))) if (c in esquemaTipo.shape) setError(c as keyof DatosTipo, { message: m });
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit((d) => guardar.mutate(d))} className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-3" aria-label={tipo ? `Editar ${tipo.nombre}` : 'Nuevo tipo de entrada'}>
      <Campo etiqueta="Nombre" error={formState.errors.nombre?.message} {...register('nombre')} />
      <Campo etiqueta="Precio (COP)" type="number" min={0} step="0.01" inputMode="decimal" error={formState.errors.precio?.message} {...register('precio')} />
      <Campo
        etiqueta="Cupo"
        type="number"
        min={1}
        max={100000}
        inputMode="numeric"
        ayuda={tipo ? 'Subirlo genera entradas; no puede bajar de las vendidas.' : 'Se generan tantas entradas como el cupo.'}
        error={formState.errors.cupo?.message}
        {...register('cupo')}
      />
      {tipo && <p className="text-xs text-slate-600 sm:col-span-3">Cambiar el precio no afecta las órdenes ya creadas.</p>}
      {guardar.error && (
        <div className="sm:col-span-3">
          <Aviso tipo="error">
            {mensajeDeError(guardar.error, {
              CUPO_INSUFICIENTE: 'El cupo no puede quedar por debajo de las entradas ya vendidas.',
              DUPLICADO: 'Ya existe un tipo de entrada con ese nombre en este evento.',
            })}
          </Aviso>
        </div>
      )}
      <div className="flex gap-2 sm:col-span-3">
        <Boton type="submit" cargando={guardar.isPending}>
          Guardar
        </Boton>
        <Boton variante="secundario" onClick={alTerminar}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}

export function SeccionTiposEntrada({ idEvento }: { idEvento: number }) {
  const [editando, setEditando] = useState<TipoEntrada | 'nuevo' | null>(null);
  const tipos = useQuery({ queryKey: claves.tiposEntrada(idEvento), queryFn: () => listarTiposEntrada(idEvento) });

  return (
    <Tarjeta>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tipos de entrada</h2>
        <Boton variante="enlace" onClick={() => setEditando('nuevo')}>
          Nuevo tipo
        </Boton>
      </div>
      {editando === 'nuevo' && <FormularioTipo idEvento={idEvento} tipo={null} alTerminar={() => setEditando(null)} />}
      <EstadoConsulta consulta={tipos} vacio={(t) => t.length === 0} textoVacio="Sin tipos de entrada.">
        {(lista) => (
          <ul className="divide-y divide-slate-100">
            {lista.map((t) => (
              <li key={t.idTipoEntrada} className="py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{t.nombre}</span>
                  <span className="text-sm text-slate-700">
                    {moneda(t.precio)} · cupo {t.cupo.toLocaleString('es-CO')}
                  </span>
                  <Boton variante="enlace" onClick={() => setEditando(t)} aria-label={`Editar ${t.nombre}`}>
                    Editar
                  </Boton>
                </div>
                {editando !== 'nuevo' && editando?.idTipoEntrada === t.idTipoEntrada && (
                  <FormularioTipo idEvento={idEvento} tipo={t} alTerminar={() => setEditando(null)} />
                )}
              </li>
            ))}
          </ul>
        )}
      </EstadoConsulta>
    </Tarjeta>
  );
}

// ---------- Cola de reserva ----------

const esquemaCola = z.object({
  habilitada: z.boolean(),
  ventana: z.coerce.number({ invalid_type_error: 'Escribe un número' }).int().min(1, 'Mínimo 1').max(1000, 'Máximo 1000'),
  ttlMinutos: z.coerce.number({ invalid_type_error: 'Escribe un número' }).int().min(1, 'Mínimo 1').max(120, 'Máximo 120'),
});
type DatosCola = z.infer<typeof esquemaCola>;

function FormularioCola({ idEvento, estado }: { idEvento: number; estado: ColaEstado }) {
  const clienteQuery = useQueryClient();
  const { register, handleSubmit, formState } = useForm<DatosCola>({
    resolver: zodResolver(esquemaCola),
    defaultValues: { habilitada: estado.habilitada, ventana: estado.ventana || 50, ttlMinutos: estado.ttlMinutos || 10 },
  });
  const guardar = useMutation({
    mutationFn: (d: DatosCola) => configurarCola(idEvento, d),
    onSuccess: (c) => clienteQuery.setQueryData(claves.cola(idEvento), c),
  });

  return (
    <form noValidate onSubmit={handleSubmit((d) => guardar.mutate(d))} className="space-y-3">
      <label className="flex items-center gap-2">
        <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-marca-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marca-600" {...register('habilitada')} />
        <span className="font-medium">Cola habilitada</span>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Ventana" ayuda="Personas comprando a la vez (1 a 1000)." type="number" min={1} max={1000} error={formState.errors.ventana?.message} {...register('ventana')} />
        <Campo etiqueta="Minutos por turno" ayuda="Tiempo para comprar al ser admitido (1 a 120)." type="number" min={1} max={120} error={formState.errors.ttlMinutos?.message} {...register('ttlMinutos')} />
      </div>
      {guardar.isSuccess && <Aviso tipo="exito">Configuración guardada.</Aviso>}
      {guardar.error && <Aviso tipo="error">{mensajeDeError(guardar.error)}</Aviso>}
      <Boton type="submit" cargando={guardar.isPending}>
        Guardar cola
      </Boton>
    </form>
  );
}

export function SeccionCola({ idEvento }: { idEvento: number }) {
  const cola = useQuery({ queryKey: claves.cola(idEvento), queryFn: () => estadoCola(idEvento), refetchInterval: 10_000 });
  return (
    <Tarjeta>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cola de reserva</h2>
        <Boton variante="enlace" onClick={() => cola.refetch()} cargando={cola.isFetching}>
          Actualizar
        </Boton>
      </div>
      {cola.isPending ? (
        <Cargando />
      ) : esNoDisponible(cola.error) ? (
        <SeccionNoDisponible que="La cola de reserva" />
      ) : cola.isError ? (
        <Aviso tipo="error">{mensajeDeError(cola.error)}</Aviso>
      ) : (
        <>
          <dl className="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-slate-600">Estado</dt>
              <dd className="font-semibold">{cola.data.habilitada ? 'Habilitada' : 'Deshabilitada'}</dd>
            </div>
            <div>
              <dt className="text-slate-600">En espera</dt>
              <dd className="font-semibold">{cola.data.enEspera}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Comprando</dt>
              <dd className="font-semibold">{cola.data.enCompra}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Ventana / min</dt>
              <dd className="font-semibold">
                {cola.data.ventana} / {cola.data.ttlMinutos}
              </dd>
            </div>
          </dl>
          <FormularioCola key={`${cola.data.habilitada}-${cola.data.ventana}-${cola.data.ttlMinutos}`} idEvento={idEvento} estado={cola.data} />
        </>
      )}
    </Tarjeta>
  );
}

// ---------- Reporte de ventas ----------

export function SeccionVentas({ idEvento }: { idEvento: number }) {
  const ventas = useQuery({ queryKey: claves.ventas(idEvento), queryFn: () => resumenVentasEvento(idEvento) });
  return (
    <Tarjeta className="lg:col-span-2">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Reporte de ventas</h2>
        <Boton variante="enlace" onClick={() => ventas.refetch()} cargando={ventas.isFetching}>
          Actualizar
        </Boton>
      </div>
      <EstadoConsulta consulta={ventas} vacio={(v) => v.length === 0} textoVacio="Sin tipos de entrada todavía.">
        {(filas) => {
          const t = filas.reduce(
            (s, f) => ({
              cupo: s.cupo + f.cupo,
              disponibles: s.disponibles + f.disponibles,
              vendidas: s.vendidas + f.vendidas,
              usadas: s.usadas + f.usadas,
              canceladas: s.canceladas + f.canceladas,
              ingresos: s.ingresos + f.ingresos,
            }),
            { cupo: 0, disponibles: 0, vendidas: 0, usadas: 0, canceladas: 0, ingresos: 0 },
          );
          return (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <caption className="sr-only">Ventas por tipo de entrada</caption>
                <thead className="text-left text-slate-600">
                  <tr className="border-b border-slate-200">
                    <th scope="col" className="py-2">Tipo</th>
                    <th scope="col" className="py-2 text-right">Cupo</th>
                    <th scope="col" className="py-2 text-right">Disponibles</th>
                    <th scope="col" className="py-2 text-right">Vendidas</th>
                    <th scope="col" className="py-2 text-right">Usadas</th>
                    <th scope="col" className="py-2 text-right">Canceladas</th>
                    <th scope="col" className="py-2 text-right">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.idTipoEntrada} className="border-b border-slate-100">
                      <th scope="row" className="py-2 text-left font-medium">{f.nombre}</th>
                      <td className="py-2 text-right">{f.cupo}</td>
                      <td className="py-2 text-right">{f.disponibles}</td>
                      <td className="py-2 text-right">{f.vendidas}</td>
                      <td className="py-2 text-right">{f.usadas}</td>
                      <td className="py-2 text-right">{f.canceladas}</td>
                      <td className="py-2 text-right">{moneda(f.ingresos)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="font-semibold">
                  <tr>
                    <th scope="row" className="py-2 text-left">Total</th>
                    <td className="py-2 text-right">{t.cupo}</td>
                    <td className="py-2 text-right">{t.disponibles}</td>
                    <td className="py-2 text-right">{t.vendidas}</td>
                    <td className="py-2 text-right">{t.usadas}</td>
                    <td className="py-2 text-right">{t.canceladas}</td>
                    <td className="py-2 text-right">{moneda(t.ingresos)}</td>
                  </tr>
                </tfoot>
              </table>
              <p className="mt-2 text-xs text-slate-600">Los ingresos solo suman órdenes pagadas (no reembolsadas ni canceladas).</p>
            </div>
          );
        }}
      </EstadoConsulta>
    </Tarjeta>
  );
}

// ---------- Detalle enriquecido (MongoDB) ----------

function FormularioDetalle({ idEvento, inicial }: { idEvento: number; inicial: DetalleEvento | null }) {
  const clienteQuery = useQueryClient();
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '');
  const [etiquetas, setEtiquetas] = useState((inicial?.etiquetas ?? []).join(', '));
  const [politicas, setPoliticas] = useState(inicial?.politicas ?? '');
  const [medios, setMedios] = useState(deLineas(inicial?.medios));
  const invalidas = aLineas(medios).filter((r) => !esRutaRelativa(r));

  const guardar = useMutation({
    mutationFn: () =>
      guardarDetalleEvento(idEvento, {
        descripcion: descripcion.trim() || undefined,
        etiquetas: etiquetas
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        politicas: politicas.trim() || undefined,
        medios: aLineas(medios),
      }),
    onSuccess: (d) => clienteQuery.setQueryData(claves.detalleEvento(idEvento), d),
  });

  return (
    <form
      noValidate
      className="grid gap-4 lg:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (invalidas.length === 0) guardar.mutate();
      }}
    >
      <AreaTexto etiqueta="Descripción" rows={6} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      <AreaTexto etiqueta="Políticas" rows={6} value={politicas} onChange={(e) => setPoliticas(e.target.value)} />
      <Campo etiqueta="Etiquetas" ayuda="Separadas por comas." value={etiquetas} onChange={(e) => setEtiquetas(e.target.value)} />
      <AreaTexto
        etiqueta="Medios"
        ayuda="Rutas relativas de imágenes o videos, una por línea (p. ej. eventos/5/cartel.jpg)."
        error={invalidas.length ? `Deben ser rutas relativas sin "..", ":" ni "/" inicial: ${invalidas.join(', ')}` : undefined}
        value={medios}
        onChange={(e) => setMedios(e.target.value)}
      />
      <div className="space-y-3 lg:col-span-2">
        {guardar.isSuccess && <Aviso tipo="exito">Detalle guardado.</Aviso>}
        {guardar.error && <Aviso tipo="error">{mensajeDeError(guardar.error)}</Aviso>}
        <Boton type="submit" cargando={guardar.isPending}>
          Guardar detalle
        </Boton>
      </div>
    </form>
  );
}

export function SeccionDetalleEvento({ idEvento }: { idEvento: number }) {
  const detalle = useQuery({
    queryKey: claves.detalleEvento(idEvento),
    queryFn: () => obtenerDetalleEvento(idEvento),
    staleTime: Infinity,
  });
  let contenido;
  if (detalle.isPending) contenido = <Cargando />;
  else if (esNoDisponible(detalle.error)) contenido = <SeccionNoDisponible que="La edición del detalle" />;
  else if (detalle.error && !esNoEncontrado(detalle.error)) contenido = <Aviso tipo="error">{mensajeDeError(detalle.error)}</Aviso>;
  else contenido = <FormularioDetalle idEvento={idEvento} inicial={detalle.data ?? null} />;

  return (
    <Tarjeta>
      <h2 className="mb-3 text-lg font-semibold">Detalle del evento</h2>
      {contenido}
    </Tarjeta>
  );
}

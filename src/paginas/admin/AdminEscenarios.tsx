import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { claves } from '../../api/consultas';
import { actualizarEscenario, crearEscenario, desactivarEscenario, listarEscenarios } from '../../api/servicios/catalogo';
import { erroresDeCampos, mensajeDeError } from '../../api/errores';
import type { Escenario } from '../../api/tipos';
import { Aviso, Boton, Campo, EstadoConsulta, Paginacion, Tarjeta, Titulo } from '../../componentes/ui';

// Reglas de EscenarioEntrada en el OpenAPI.
const esquema = z.object({
  nombre: z.string().trim().min(1, 'Obligatorio').max(100, 'Máximo 100 caracteres'),
  ciudad: z.string().trim().min(1, 'Obligatorio').max(80, 'Máximo 80 caracteres'),
  direccion: z.string().trim().max(200, 'Máximo 200 caracteres'),
  capacidad: z.coerce.number({ invalid_type_error: 'Escribe un número' }).int('Debe ser entero').min(1, 'Debe ser mayor que 0'),
});
type Datos = z.infer<typeof esquema>;

function FormularioEscenario({ escenario, alTerminar }: { escenario: Escenario | null; alTerminar: () => void }) {
  const clienteQuery = useQueryClient();
  const { register, handleSubmit, formState, setError } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: escenario?.nombre ?? '',
      ciudad: escenario?.ciudad ?? '',
      direccion: escenario?.direccion ?? '',
      capacidad: escenario?.capacidad ?? 1,
    },
  });
  const guardar = useMutation({
    mutationFn: (d: Datos) => {
      const cuerpo = { ...d, direccion: d.direccion || undefined };
      return escenario ? actualizarEscenario(escenario.idEscenario, cuerpo) : crearEscenario(cuerpo);
    },
    onSuccess: () => {
      clienteQuery.invalidateQueries({ queryKey: ['escenarios'] });
      alTerminar();
    },
    onError: (e) => {
      for (const [c, m] of Object.entries(erroresDeCampos(e))) if (c in esquema.shape) setError(c as keyof Datos, { message: m });
    },
  });

  return (
    <Tarjeta className="mb-6">
      <h2 className="mb-4 text-lg font-semibold">{escenario ? `Editar ${escenario.nombre}` : 'Nuevo escenario'}</h2>
      <form noValidate onSubmit={handleSubmit((d) => guardar.mutate(d))} className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" error={formState.errors.nombre?.message} {...register('nombre')} />
        <Campo etiqueta="Ciudad" error={formState.errors.ciudad?.message} {...register('ciudad')} />
        <Campo etiqueta="Dirección" error={formState.errors.direccion?.message} {...register('direccion')} />
        <Campo etiqueta="Capacidad" type="number" min={1} inputMode="numeric" error={formState.errors.capacidad?.message} {...register('capacidad')} />
        {guardar.error && (
          <div className="sm:col-span-2">
            <Aviso tipo="error">{mensajeDeError(guardar.error)}</Aviso>
          </div>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <Boton type="submit" cargando={guardar.isPending}>
            Guardar
          </Boton>
          <Boton variante="secundario" onClick={alTerminar}>
            Cancelar
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}

export default function AdminEscenarios() {
  const clienteQuery = useQueryClient();
  const [pagina, setPagina] = useState(0);
  const [editando, setEditando] = useState<Escenario | null | 'nuevo'>(null);
  const filtros = { pagina, tamano: 20 };
  const escenarios = useQuery({ queryKey: claves.escenarios(filtros), queryFn: () => listarEscenarios(filtros), placeholderData: keepPreviousData });
  const desactivar = useMutation({
    mutationFn: (e: Escenario) => desactivarEscenario(e.idEscenario),
    onSuccess: () => clienteQuery.invalidateQueries({ queryKey: ['escenarios'] }),
  });

  return (
    <>
      <Titulo extra={<Boton onClick={() => setEditando('nuevo')}>Nuevo escenario</Boton>}>Escenarios</Titulo>
      {editando && (
        <FormularioEscenario
          key={editando === 'nuevo' ? 'nuevo' : editando.idEscenario}
          escenario={editando === 'nuevo' ? null : editando}
          alTerminar={() => setEditando(null)}
        />
      )}
      {desactivar.error && (
        <div className="mb-4">
          <Aviso tipo="error">{mensajeDeError(desactivar.error)}</Aviso>
        </div>
      )}
      <EstadoConsulta consulta={escenarios} vacio={(p) => p.contenido.length === 0} textoVacio="No hay escenarios activos.">
        {(p) => (
          <>
            <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <table className="w-full min-w-[40rem] text-sm">
                <caption className="sr-only">Escenarios activos</caption>
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-2">Nombre</th>
                    <th scope="col" className="px-4 py-2">Ciudad</th>
                    <th scope="col" className="px-4 py-2">Dirección</th>
                    <th scope="col" className="px-4 py-2 text-right">Capacidad</th>
                    <th scope="col" className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {p.contenido.map((e) => (
                    <tr key={e.idEscenario} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium">{e.nombre}</td>
                      <td className="px-4 py-2">{e.ciudad}</td>
                      <td className="px-4 py-2">{e.direccion ?? '—'}</td>
                      <td className="px-4 py-2 text-right">{e.capacidad.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          <Boton variante="enlace" onClick={() => setEditando(e)}>
                            Editar
                          </Boton>
                          <Boton
                            variante="enlace"
                            className="!text-red-700"
                            cargando={desactivar.isPending && desactivar.variables?.idEscenario === e.idEscenario}
                            onClick={() => desactivar.mutate(e)}
                            aria-label={`Desactivar ${e.nombre}`}
                          >
                            Desactivar
                          </Boton>
                        </div>
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

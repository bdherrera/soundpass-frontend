import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { claves } from '../../api/consultas';
import { listarEscenarios } from '../../api/servicios/catalogo';
import { actualizarEvento, crearEvento } from '../../api/servicios/eventos';
import { erroresDeCampos, mensajeDeError } from '../../api/errores';
import type { Evento } from '../../api/tipos';
import { Aviso, Boton, Campo, Selector } from '../../componentes/ui';
import { isoALocal, localAIso } from '../../lib/formato';

// Reglas de EventoEntrada en el OpenAPI.
const esquema = z
  .object({
    nombre: z.string().trim().min(1, 'Obligatorio').max(150, 'Máximo 150 caracteres'),
    idEscenario: z.coerce.number({ invalid_type_error: 'Elige un escenario' }).int().min(1, 'Elige un escenario'),
    fechaInicio: z.string().min(1, 'Obligatorio'),
    fechaFin: z.string().min(1, 'Obligatorio'),
  })
  .refine((d) => !d.fechaInicio || !d.fechaFin || new Date(d.fechaFin) > new Date(d.fechaInicio), {
    path: ['fechaFin'],
    message: 'Debe ser posterior al inicio',
  });
type Datos = z.infer<typeof esquema>;

export const MENSAJE_SOLAPAMIENTO = 'Ese escenario ya tiene un evento en ese horario.';

export function FormularioEvento({ evento, alGuardar }: { evento?: Evento; alGuardar: (e: Evento) => void }) {
  const escenarios = useQuery({
    queryKey: claves.escenarios({ tamano: 100 }),
    queryFn: () => listarEscenarios({ tamano: 100 }),
  });
  const { register, handleSubmit, formState, setError } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: evento?.nombre ?? '',
      idEscenario: evento?.idEscenario ?? 0,
      fechaInicio: isoALocal(evento?.fechaInicio),
      fechaFin: isoALocal(evento?.fechaFin),
    },
  });

  const guardar = useMutation({
    mutationFn: (d: Datos) => {
      const cuerpo = { ...d, fechaInicio: localAIso(d.fechaInicio), fechaFin: localAIso(d.fechaFin) };
      return evento ? actualizarEvento(evento.idEvento, cuerpo) : crearEvento(cuerpo);
    },
    onSuccess: alGuardar,
    onError: (e) => {
      for (const [c, m] of Object.entries(erroresDeCampos(e))) {
        if (['nombre', 'idEscenario', 'fechaInicio', 'fechaFin'].includes(c)) setError(c as keyof Datos, { message: m });
      }
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit((d) => guardar.mutate(d))} className="grid gap-4 sm:grid-cols-2">
      <Campo etiqueta="Nombre" className="sm:col-span-2" error={formState.errors.nombre?.message} {...register('nombre')} />
      <Selector
        etiqueta="Escenario"
        className="sm:col-span-2"
        error={formState.errors.idEscenario?.message}
        disabled={escenarios.isPending}
        {...register('idEscenario')}
      >
        <option value={0}>{escenarios.isPending ? 'Cargando…' : 'Elige un escenario'}</option>
        {escenarios.data?.contenido.map((e) => (
          <option key={e.idEscenario} value={e.idEscenario}>
            {e.nombre} · {e.ciudad} (cap. {e.capacidad})
          </option>
        ))}
      </Selector>
      <Campo etiqueta="Inicio" type="datetime-local" error={formState.errors.fechaInicio?.message} {...register('fechaInicio')} />
      <Campo etiqueta="Fin" type="datetime-local" error={formState.errors.fechaFin?.message} {...register('fechaFin')} />
      {escenarios.isError && (
        <div className="sm:col-span-2">
          <Aviso tipo="error">No se pudieron cargar los escenarios. {mensajeDeError(escenarios.error)}</Aviso>
        </div>
      )}
      {guardar.error && (
        <div className="sm:col-span-2">
          <Aviso tipo="error">
            {mensajeDeError(guardar.error, {
              SOLAPAMIENTO_ESCENARIO: MENSAJE_SOLAPAMIENTO,
              NO_ENCONTRADO: 'El escenario elegido no existe o está desactivado.',
            })}
          </Aviso>
        </div>
      )}
      <div className="sm:col-span-2">
        <Boton type="submit" cargando={guardar.isPending}>
          {evento ? 'Guardar cambios' : 'Crear evento (borrador)'}
        </Boton>
      </div>
    </form>
  );
}

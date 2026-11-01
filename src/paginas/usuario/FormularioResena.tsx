import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crearResena } from '../../api/servicios/contenido';
import { listarMisEntradas } from '../../api/servicios/entradas';
import { mensajeDeError } from '../../api/errores';
import { Aviso, AreaTexto, Boton } from '../../componentes/ui';
import type { Entrada } from '../../api/tipos';

const esquema = z.object({
  calificacion: z.coerce.number().int().min(1, 'Elige una calificación').max(5),
  comentario: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
});
type Datos = z.infer<typeof esquema>;

/**
 * No hay endpoint "¿puedo reseñar?": se recorren las entradas USADA del usuario.
 * El backend vuelve a validarlo (403 si no hay entrada USADA, 409 si ya reseñó).
 */
async function tieneEntradaUsada(idEvento: number): Promise<boolean> {
  for (let pagina = 0; pagina < 10; pagina++) {
    const p = await listarMisEntradas({ estado: 'USADA', pagina, tamano: 100 });
    if (p.contenido.some((e: Entrada) => e.idEvento === idEvento)) return true;
    if (pagina >= p.totalPaginas - 1) break;
  }
  return false;
}

export function FormularioResena({ idEvento }: { idEvento: number }) {
  const clienteQuery = useQueryClient();
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const puede = useQuery({ queryKey: ['entradas', 'usada', idEvento], queryFn: () => tieneEntradaUsada(idEvento) });
  const { register, handleSubmit, formState, reset } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: { calificacion: 0, comentario: '' },
  });

  const enviar = useMutation({
    mutationFn: (d: Datos) =>
      crearResena(idEvento, { calificacion: d.calificacion, comentario: d.comentario?.trim() || undefined }),
    onSuccess: () => {
      setMensaje({ tipo: 'exito', texto: '¡Gracias! Tu reseña quedó publicada.' });
      reset();
      clienteQuery.invalidateQueries({ queryKey: ['evento', idEvento, 'resenas'] });
    },
    onError: (e) =>
      setMensaje({
        tipo: 'error',
        texto: mensajeDeError(e, {
          DUPLICADO: 'Ya reseñaste este evento.',
          PROHIBIDO: 'Solo puedes reseñar eventos a los que asististe.',
        }),
      }),
  });

  if (!puede.data) return null;
  if (mensaje?.tipo === 'exito') return <Aviso tipo="exito">{mensaje.texto}</Aviso>;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((d) => {
        setMensaje(null);
        enviar.mutate(d);
      })}
      className="space-y-3 rounded-lg bg-slate-50 p-4"
      aria-label="Escribir reseña"
    >
      <fieldset>
        <legend className="text-sm font-medium text-slate-800">Tu calificación</legend>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" value={n} className="peer sr-only" {...register('calificacion')} />
              <span className="flex h-10 w-10 items-center justify-center rounded-lg text-xl ring-1 ring-slate-300 peer-checked:bg-amber-100 peer-checked:ring-amber-500 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-marca-600">
                <span aria-hidden="true">★</span>
                <span className="sr-only">{n} {n === 1 ? 'estrella' : 'estrellas'}</span>
              </span>
            </label>
          ))}
        </div>
        {formState.errors.calificacion && (
          <p role="alert" className="mt-1 text-sm text-red-700">
            {formState.errors.calificacion.message}
          </p>
        )}
      </fieldset>
      <AreaTexto etiqueta="Comentario (opcional)" maxLength={2000} error={formState.errors.comentario?.message} {...register('comentario')} />
      {mensaje && <Aviso tipo="error">{mensaje.texto}</Aviso>}
      <Boton type="submit" cargando={enviar.isPending}>
        Publicar reseña
      </Boton>
    </form>
  );
}

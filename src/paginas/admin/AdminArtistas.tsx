import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { claves } from '../../api/consultas';
import { actualizarArtista, crearArtista, desactivarArtista, listarArtistas } from '../../api/servicios/catalogo';
import { erroresDeCampos, mensajeDeError } from '../../api/errores';
import type { Artista } from '../../api/tipos';
import { Aviso, Boton, Campo, EstadoConsulta, Paginacion, Tarjeta, Titulo } from '../../componentes/ui';

// Reglas de ArtistaEntrada en el OpenAPI.
const esquema = z.object({
  nombreArtistico: z.string().trim().min(1, 'Obligatorio').max(100, 'Máximo 100 caracteres'),
  pais: z.string().trim().max(60, 'Máximo 60 caracteres'),
  genero: z.string().trim().max(60, 'Máximo 60 caracteres'),
});
type Datos = z.infer<typeof esquema>;

function FormularioArtista({ artista, alTerminar }: { artista: Artista | null; alTerminar: () => void }) {
  const clienteQuery = useQueryClient();
  const { register, handleSubmit, formState, setError } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: { nombreArtistico: artista?.nombreArtistico ?? '', pais: artista?.pais ?? '', genero: artista?.genero ?? '' },
  });
  const guardar = useMutation({
    mutationFn: (d: Datos) => {
      const cuerpo = { nombreArtistico: d.nombreArtistico, pais: d.pais || undefined, genero: d.genero || undefined };
      return artista ? actualizarArtista(artista.idArtista, cuerpo) : crearArtista(cuerpo);
    },
    onSuccess: () => {
      clienteQuery.invalidateQueries({ queryKey: ['artistas'] });
      if (artista) clienteQuery.invalidateQueries({ queryKey: claves.artista(artista.idArtista) });
      alTerminar();
    },
    onError: (e) => {
      for (const [c, m] of Object.entries(erroresDeCampos(e))) if (c in esquema.shape) setError(c as keyof Datos, { message: m });
    },
  });

  return (
    <Tarjeta className="mb-6">
      <h2 className="mb-4 text-lg font-semibold">{artista ? `Editar ${artista.nombreArtistico}` : 'Nuevo artista'}</h2>
      <form noValidate onSubmit={handleSubmit((d) => guardar.mutate(d))} className="grid gap-4 sm:grid-cols-3">
        <Campo etiqueta="Nombre artístico" error={formState.errors.nombreArtistico?.message} {...register('nombreArtistico')} />
        <Campo etiqueta="País" error={formState.errors.pais?.message} {...register('pais')} />
        <Campo etiqueta="Género" error={formState.errors.genero?.message} {...register('genero')} />
        {guardar.error && (
          <div className="sm:col-span-3">
            <Aviso tipo="error">{mensajeDeError(guardar.error, { DUPLICADO: 'Ya existe un artista con ese nombre.' })}</Aviso>
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
    </Tarjeta>
  );
}

export default function AdminArtistas() {
  const clienteQuery = useQueryClient();
  const [pagina, setPagina] = useState(0);
  const [editando, setEditando] = useState<Artista | null | 'nuevo'>(null);
  const filtros = { pagina, tamano: 20 };
  const artistas = useQuery({ queryKey: claves.artistas(filtros), queryFn: () => listarArtistas(filtros), placeholderData: keepPreviousData });

  const desactivar = useMutation({
    mutationFn: (a: Artista) => desactivarArtista(a.idArtista),
    onSuccess: () => clienteQuery.invalidateQueries({ queryKey: ['artistas'] }),
  });

  return (
    <>
      <Titulo extra={<Boton onClick={() => setEditando('nuevo')}>Nuevo artista</Boton>}>Artistas</Titulo>
      {editando && (
        <FormularioArtista
          key={editando === 'nuevo' ? 'nuevo' : editando.idArtista}
          artista={editando === 'nuevo' ? null : editando}
          alTerminar={() => setEditando(null)}
        />
      )}
      {desactivar.error && (
        <div className="mb-4">
          <Aviso tipo="error">{mensajeDeError(desactivar.error)}</Aviso>
        </div>
      )}
      <EstadoConsulta consulta={artistas} vacio={(p) => p.contenido.length === 0} textoVacio="No hay artistas activos.">
        {(p) => (
          <>
            <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <table className="w-full min-w-[36rem] text-sm">
                <caption className="sr-only">Artistas activos</caption>
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-2">Nombre</th>
                    <th scope="col" className="px-4 py-2">País</th>
                    <th scope="col" className="px-4 py-2">Género</th>
                    <th scope="col" className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {p.contenido.map((a) => (
                    <tr key={a.idArtista} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium">{a.nombreArtistico}</td>
                      <td className="px-4 py-2">{a.pais ?? '—'}</td>
                      <td className="px-4 py-2">{a.genero ?? '—'}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Boton variante="enlace" onClick={() => setEditando(a)}>
                            Editar
                          </Boton>
                          <Link to={`/admin/artistas/${a.idArtista}/perfil`} className="px-1 py-1 text-marca-700 hover:underline">
                            Perfil
                          </Link>
                          <Boton
                            variante="enlace"
                            className="!text-red-700"
                            cargando={desactivar.isPending && desactivar.variables?.idArtista === a.idArtista}
                            onClick={() => desactivar.mutate(a)}
                            aria-label={`Desactivar ${a.nombreArtistico}`}
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

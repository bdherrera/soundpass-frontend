import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { claves } from '../../api/consultas';
import { listarMisEntradas, registrarAsistente } from '../../api/servicios/entradas';
import { erroresDeCampos, mensajeDeError } from '../../api/errores';
import type { Entrada, EstadoEntrada } from '../../api/tipos';
import { Aviso, Boton, Campo, EstadoConsulta, Insignia, Paginacion, Selector, Titulo } from '../../componentes/ui';
import { CodigoQR } from '../../componentes/CodigoQR';
import { fechaHora } from '../../lib/formato';

// DISPONIBLE no aplica a las entradas de un usuario.
const ESTADOS: EstadoEntrada[] = ['VENDIDA', 'USADA', 'CANCELADA'];

// Reglas de AsistenteEntrada en el OpenAPI.
const esquemaAsistente = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre').max(100, 'Máximo 100 caracteres'),
  documento: z.string().trim().min(1, 'Escribe el documento').max(30, 'Máximo 30 caracteres'),
  correo: z.union([z.literal(''), z.string().trim().email('Correo no válido').max(150, 'Máximo 150 caracteres')]),
});
type DatosAsistente = z.infer<typeof esquemaAsistente>;

function FormularioAsistente({ entrada, alCerrar }: { entrada: Entrada; alCerrar: () => void }) {
  const clienteQuery = useQueryClient();
  const { register, handleSubmit, formState, setError } = useForm<DatosAsistente>({
    resolver: zodResolver(esquemaAsistente),
    defaultValues: { nombre: '', documento: '', correo: '' },
  });
  const guardar = useMutation({
    mutationFn: (d: DatosAsistente) =>
      registrarAsistente(entrada.idEntrada, {
        nombre: d.nombre.trim(),
        documento: d.documento.trim(),
        correo: d.correo.trim() || undefined,
      }),
    onSuccess: () => {
      clienteQuery.invalidateQueries({ queryKey: ['entradas'] });
      alCerrar();
    },
    onError: (e) => {
      for (const [campo, mensaje] of Object.entries(erroresDeCampos(e))) {
        if (campo in esquemaAsistente.shape) setError(campo as keyof DatosAsistente, { message: mensaje });
      }
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit((d) => guardar.mutate(d))} className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3" aria-label="Registrar asistente">
      <Campo etiqueta="Nombre del asistente" autoComplete="name" error={formState.errors.nombre?.message} {...register('nombre')} />
      <Campo etiqueta="Documento" error={formState.errors.documento?.message} {...register('documento')} />
      <Campo etiqueta="Correo (opcional)" type="email" autoComplete="email" error={formState.errors.correo?.message} {...register('correo')} />
      {guardar.error && (
        <Aviso tipo="error">
          {mensajeDeError(guardar.error, {
            DUPLICADO: 'Esta entrada ya tiene un asistente registrado.',
            TRANSICION_INVALIDA: 'Solo se puede registrar asistente en entradas vendidas.',
          })}
        </Aviso>
      )}
      <div className="flex gap-2">
        <Boton type="submit" cargando={guardar.isPending}>
          Guardar
        </Boton>
        <Boton variante="secundario" onClick={alCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}

function TarjetaEntrada({ entrada }: { entrada: Entrada }) {
  const [registrando, setRegistrando] = useState(false);
  const a = entrada.asistente;
  return (
    <li className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row">
      <CodigoQR valor={entrada.codigo} apagado={entrada.estado !== 'VENDIDA'} />
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Insignia valor={entrada.estado} />
          <span className="text-sm text-slate-600">Entrada #{entrada.idEntrada}</span>
        </div>
        <p className="font-semibold">
          {entrada.evento ? (
            <Link to={`/eventos/${entrada.idEvento}`} className="text-marca-700 hover:underline">
              {entrada.evento}
            </Link>
          ) : (
            `Evento #${entrada.idEvento}`
          )}
        </p>
        <p className="text-sm text-slate-700">
          {entrada.tipoEntrada ?? `Tipo #${entrada.idTipoEntrada}`} ·{' '}
          <Link to={`/mis-ordenes/${entrada.idOrden}`} className="underline">
            Orden #{entrada.idOrden}
          </Link>
        </p>
        {a ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-sm">
            <dt className="text-slate-600">Asistente</dt>
            <dd>{a.nombre}</dd>
            <dt className="text-slate-600">Documento</dt>
            <dd>{a.documento}</dd>
            {a.correo && (
              <>
                <dt className="text-slate-600">Correo</dt>
                <dd className="break-all">{a.correo}</dd>
              </>
            )}
            {a.fechaCheckin && (
              <>
                <dt className="text-slate-600">Ingreso</dt>
                <dd>{fechaHora(a.fechaCheckin)}</dd>
              </>
            )}
          </dl>
        ) : entrada.estado === 'VENDIDA' ? (
          registrando ? (
            <FormularioAsistente entrada={entrada} alCerrar={() => setRegistrando(false)} />
          ) : (
            <>
              <p className="text-sm text-amber-800">Registra al asistente para poder ingresar al evento.</p>
              <Boton variante="secundario" onClick={() => setRegistrando(true)}>
                Registrar asistente
              </Boton>
            </>
          )
        ) : null}
      </div>
    </li>
  );
}

export default function MisEntradas() {
  const [params, setParams] = useSearchParams();
  const estadoParam = params.get('estado');
  const estado = ESTADOS.includes(estadoParam as EstadoEntrada) ? (estadoParam as EstadoEntrada) : undefined;
  const pagina = Math.max(0, Number(params.get('pagina') ?? 0) || 0);
  const filtros = { estado, pagina, tamano: 10 };

  const entradas = useQuery({
    queryKey: claves.misEntradas(filtros),
    queryFn: () => listarMisEntradas(filtros),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <Titulo>Mis entradas</Titulo>
      <div className="mb-6 max-w-xs">
        <Selector
          etiqueta="Estado"
          value={estado ?? ''}
          onChange={(e) => setParams(e.target.value ? { estado: e.target.value } : {})}
        >
          <option value="">Todas</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e.charAt(0) + e.slice(1).toLowerCase()}
            </option>
          ))}
        </Selector>
      </div>
      <EstadoConsulta consulta={entradas} vacio={(p) => p.contenido.length === 0} textoVacio="No tienes entradas con ese filtro.">
        {(p) => (
          <>
            <ul className="grid gap-4 lg:grid-cols-2">
              {p.contenido.map((e) => (
                <TarjetaEntrada key={e.idEntrada} entrada={e} />
              ))}
            </ul>
            <Paginacion
              pagina={p.pagina}
              totalPaginas={p.totalPaginas}
              totalElementos={p.totalElementos}
              alCambiar={(n) => setParams({ ...(estado ? { estado } : {}), pagina: String(n) })}
            />
          </>
        )}
      </EstadoConsulta>
    </>
  );
}

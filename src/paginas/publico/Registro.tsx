import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { registrarUsuario } from '../../api/servicios/autenticacion';
import { erroresDeCampos, mensajeDeError } from '../../api/errores';
import { Aviso, Boton, Campo, Tarjeta } from '../../componentes/ui';

// Reglas de RegistroSolicitud en el OpenAPI.
const esquemaRegistro = z.object({
  nombre: z.string().trim().min(1, 'Escribe tu nombre').max(100, 'Máximo 100 caracteres'),
  apellido: z.string().trim().min(1, 'Escribe tu apellido').max(100, 'Máximo 100 caracteres'),
  correo: z.string().trim().min(1, 'Escribe tu correo').email('Correo no válido').max(150, 'Máximo 150 caracteres'),
  contrasena: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
});
type Datos = z.infer<typeof esquemaRegistro>;

export default function Registro() {
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError } = useForm<Datos>({ resolver: zodResolver(esquemaRegistro) });

  const registro = useMutation({
    mutationFn: registrarUsuario,
    onSuccess: (u) => {
      const destino = params.get('destino');
      navegar(`/login${destino ? `?destino=${encodeURIComponent(destino)}` : ''}`, { state: { registrado: u.correo } });
    },
    onError: (e) => {
      const campos = erroresDeCampos(e);
      for (const [campo, mensaje] of Object.entries(campos)) {
        if (campo in esquemaRegistro.shape) setError(campo as keyof Datos, { message: mensaje });
      }
      setErrorGeneral(mensajeDeError(e, { DUPLICADO: 'Ese correo ya está registrado.' }));
    },
  });

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">Crear cuenta</h1>
      <Tarjeta>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((d) => {
            setErrorGeneral(null);
            registro.mutate({
              nombre: d.nombre.trim(),
              apellido: d.apellido.trim(),
              correo: d.correo.trim().toLowerCase(),
              contrasena: d.contrasena,
            });
          })}
        >
          {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}
          <Campo etiqueta="Nombre" autoComplete="given-name" error={formState.errors.nombre?.message} {...register('nombre')} />
          <Campo etiqueta="Apellido" autoComplete="family-name" error={formState.errors.apellido?.message} {...register('apellido')} />
          <Campo
            etiqueta="Correo"
            type="email"
            autoComplete="email"
            error={formState.errors.correo?.message}
            {...register('correo')}
          />
          <Campo
            etiqueta="Contraseña"
            type="password"
            autoComplete="new-password"
            ayuda="Entre 8 y 72 caracteres."
            error={formState.errors.contrasena?.message}
            {...register('contrasena')}
          />
          <Boton type="submit" cargando={registro.isPending} className="w-full">
            Crear cuenta
          </Boton>
        </form>
      </Tarjeta>
      <p className="mt-4 text-center text-sm text-slate-700">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-medium text-marca-700 underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}

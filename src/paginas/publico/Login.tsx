import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { iniciarSesion } from '../../api/servicios/autenticacion';
import { esApiError } from '../../api/cliente';
import { mensajeDeError } from '../../api/errores';
import { destinoSeguro, iniciarSesionLocal } from '../../sesion/sesion';
import { Aviso, Boton, Campo, Tarjeta } from '../../componentes/ui';

const esquema = z.object({
  correo: z.string().trim().min(1, 'Escribe tu correo').email('Correo no válido'),
  contrasena: z.string().min(1, 'Escribe tu contraseña'),
});
type Datos = z.infer<typeof esquema>;

export default function Login() {
  const [params] = useSearchParams();
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const destino = destinoSeguro(params.get('destino'));
  const vencida = (ubicacion.state as { sesionVencida?: boolean } | null)?.sesionVencida;
  const registrado = (ubicacion.state as { registrado?: string } | null)?.registrado;
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: { correo: registrado ?? '' },
  });

  const login = useMutation({
    mutationFn: iniciarSesion,
    onSuccess: (r) => {
      iniciarSesionLocal(r);
      navegar(destino, { replace: true });
    },
    onError: (e) =>
      setErrorGeneral(
        esApiError(e) && e.estado === 401 ? 'Correo o contraseña incorrectos.' : mensajeDeError(e),
      ),
  });

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">Iniciar sesión</h1>
      <Tarjeta>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((d) => {
            setErrorGeneral(null);
            login.mutate({ correo: d.correo.trim().toLowerCase(), contrasena: d.contrasena });
          })}
        >
          {vencida && <Aviso tipo="alerta">Tu sesión terminó. Inicia sesión de nuevo para continuar.</Aviso>}
          {registrado && <Aviso tipo="exito">Cuenta creada. Ya puedes iniciar sesión.</Aviso>}
          {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}
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
            autoComplete="current-password"
            error={formState.errors.contrasena?.message}
            {...register('contrasena')}
          />
          <Boton type="submit" cargando={login.isPending} className="w-full">
            Entrar
          </Boton>
        </form>
      </Tarjeta>
      <p className="mt-4 text-center text-sm text-slate-700">
        ¿No tienes cuenta?{' '}
        <Link
          to={`/registro${params.get('destino') ? `?destino=${encodeURIComponent(destino)}` : ''}`}
          className="font-medium text-marca-700 underline"
        >
          Crea una
        </Link>
      </p>
    </div>
  );
}

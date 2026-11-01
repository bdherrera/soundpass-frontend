import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSesion } from '../sesion/contexto';
import { cerrarSesion } from '../sesion/sesion';
import { useQueryClient } from '@tanstack/react-query';

const claseEnlace = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
    isActive ? 'bg-marca-800 text-white' : 'text-marca-50 hover:bg-marca-800/60'
  }`;

export function Marco() {
  const { usuario, tieneRol } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const navegar = useNavigate();
  const clienteQuery = useQueryClient();

  const salir = () => {
    cerrarSesion('usuario');
    clienteQuery.clear();
    navegar('/');
  };

  const enlaces = (
    <>
      <NavLink to="/" end className={claseEnlace} onClick={() => setAbierto(false)}>
        Eventos
      </NavLink>
      {usuario && (
        <>
          <NavLink to="/mis-ordenes" className={claseEnlace} onClick={() => setAbierto(false)}>
            Mis órdenes
          </NavLink>
          <NavLink to="/mis-entradas" className={claseEnlace} onClick={() => setAbierto(false)}>
            Mis entradas
          </NavLink>
        </>
      )}
      {tieneRol('ADMIN') && (
        <NavLink to="/admin" className={claseEnlace} onClick={() => setAbierto(false)}>
          Administración
        </NavLink>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-marca-800"
      >
        Saltar al contenido
      </a>
      <header className="bg-marca-700 text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-xl font-extrabold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            SoundPass
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {enlaces}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {usuario ? (
              <>
                <span className="text-sm text-marca-50">
                  {usuario.nombre}
                  {usuario.rol === 'ADMIN' && ' (admin)'}
                </span>
                <button onClick={salir} className="rounded-md bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={claseEnlace}>
                  Iniciar sesión
                </NavLink>
                <NavLink to="/registro" className={claseEnlace}>
                  Crear cuenta
                </NavLink>
              </>
            )}
          </div>
          <button
            className="rounded-md p-2 md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            aria-expanded={abierto}
            aria-controls="menu-movil"
            onClick={() => setAbierto((a) => !a)}
          >
            <span className="sr-only">{abierto ? 'Cerrar menú' : 'Abrir menú'}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              {abierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
        {abierto && (
          <nav id="menu-movil" aria-label="Principal" className="space-y-1 border-t border-white/10 px-4 pb-4 pt-2 md:hidden">
            {enlaces}
            {usuario ? (
              <button onClick={salir} className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-marca-50 hover:bg-marca-800/60">
                Cerrar sesión ({usuario.nombre})
              </button>
            ) : (
              <>
                <NavLink to="/login" className={claseEnlace} onClick={() => setAbierto(false)}>
                  Iniciar sesión
                </NavLink>
                <NavLink to="/registro" className={claseEnlace} onClick={() => setAbierto(false)}>
                  Crear cuenta
                </NavLink>
              </>
            )}
          </nav>
        )}
      </header>
      <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 focus:outline-none sm:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-600">
        SoundPass · Proyecto de Bases de Datos 2
      </footer>
    </div>
  );
}

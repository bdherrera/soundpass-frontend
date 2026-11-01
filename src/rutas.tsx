import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter, Link, Outlet } from 'react-router-dom';
import { Marco } from './componentes/Marco';
import { Cargando, Vacio } from './componentes/ui';
import { VigilanteSesion } from './sesion/contexto';
import { RequiereSesion } from './sesion/RequiereSesion';
import type { Rol } from './api/tipos';

const Login = lazy(() => import('./paginas/publico/Login'));
const Registro = lazy(() => import('./paginas/publico/Registro'));
const Catalogo = lazy(() => import('./paginas/publico/Catalogo'));
const DetalleEvento = lazy(() => import('./paginas/publico/DetalleEvento'));
const PerfilArtista = lazy(() => import('./paginas/publico/PerfilArtista'));
const Compra = lazy(() => import('./paginas/usuario/Compra'));
const Cola = lazy(() => import('./paginas/usuario/Cola'));
const MisOrdenes = lazy(() => import('./paginas/usuario/MisOrdenes'));
const DetalleOrden = lazy(() => import('./paginas/usuario/DetalleOrden'));
const MisEntradas = lazy(() => import('./paginas/usuario/MisEntradas'));
const AdminInicio = lazy(() => import('./paginas/admin/AdminInicio'));
const AdminArtistas = lazy(() => import('./paginas/admin/AdminArtistas'));
const AdminPerfilArtista = lazy(() => import('./paginas/admin/AdminPerfilArtista'));
const AdminEscenarios = lazy(() => import('./paginas/admin/AdminEscenarios'));
const AdminEventos = lazy(() => import('./paginas/admin/AdminEventos'));
const AdminEvento = lazy(() => import('./paginas/admin/AdminEvento'));
const AdminCheckin = lazy(() => import('./paginas/admin/AdminCheckin'));
const AdminLogs = lazy(() => import('./paginas/admin/AdminLogs'));

const carga = (n: ReactNode) => <Suspense fallback={<Cargando />}>{n}</Suspense>;
const protegida = (n: ReactNode, rol: Rol = 'USUARIO') => <RequiereSesion rol={rol}>{carga(n)}</RequiereSesion>;

function Raiz() {
  return (
    <>
      <VigilanteSesion />
      <Outlet />
    </>
  );
}

function NoEncontrada() {
  return (
    <Vacio>
      Página no encontrada.{' '}
      <Link to="/" className="font-medium text-marca-700 underline">
        Volver al catálogo
      </Link>
    </Vacio>
  );
}

export function crearEnrutador() {
  return createBrowserRouter(
    [
      {
        element: <Raiz />,
        children: [
          {
            element: <Marco />,
            children: [
              { index: true, element: carga(<Catalogo />) },
              { path: 'login', element: carga(<Login />) },
              { path: 'registro', element: carga(<Registro />) },
              { path: 'eventos/:idEvento', element: carga(<DetalleEvento />) },
              { path: 'artistas/:idArtista', element: carga(<PerfilArtista />) },
              { path: 'eventos/:idEvento/compra', element: protegida(<Compra />) },
              { path: 'eventos/:idEvento/cola', element: protegida(<Cola />) },
              { path: 'mis-ordenes', element: protegida(<MisOrdenes />) },
              { path: 'mis-ordenes/:idOrden', element: protegida(<DetalleOrden />) },
              { path: 'mis-entradas', element: protegida(<MisEntradas />) },
              { path: 'admin', element: protegida(<AdminInicio />, 'ADMIN') },
              { path: 'admin/artistas', element: protegida(<AdminArtistas />, 'ADMIN') },
              { path: 'admin/artistas/:idArtista/perfil', element: protegida(<AdminPerfilArtista />, 'ADMIN') },
              { path: 'admin/escenarios', element: protegida(<AdminEscenarios />, 'ADMIN') },
              { path: 'admin/eventos', element: protegida(<AdminEventos />, 'ADMIN') },
              { path: 'admin/eventos/:idEvento', element: protegida(<AdminEvento />, 'ADMIN') },
              { path: 'admin/checkin', element: protegida(<AdminCheckin />, 'ADMIN') },
              { path: 'admin/logs', element: protegida(<AdminLogs />, 'ADMIN') },
              { path: '*', element: <NoEncontrada /> },
            ],
          },
        ],
      },
    ],
    {
      future: {
        v7_relativeSplatPath: true,
        v7_fetcherPersist: true,
        v7_normalizeFormMethod: true,
        v7_partialHydration: true,
        v7_skipActionErrorRevalidation: true,
      },
    },
  );
}

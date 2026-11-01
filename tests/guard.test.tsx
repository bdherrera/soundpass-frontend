import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Outlet, useLocation } from 'react-router-dom';
import { RequiereSesion } from '../src/sesion/RequiereSesion';
import { VigilanteSesion } from '../src/sesion/contexto';
import { cerrarSesion, destinoSeguro, iniciarSesionLocal, obtenerSesion, restaurarSesion } from '../src/sesion/sesion';
import { configurarCliente, pedir } from '../src/api/cliente';
import { errorApi, renderizarRutas, simularFetch, tokenDePrueba } from './utilidades';
import { act } from 'react';

function PaginaLogin() {
  const u = useLocation();
  return <p>login {u.search}</p>;
}

const rutas = [
  {
    element: (
      <>
        <VigilanteSesion />
        <Outlet />
      </>
    ),
    children: [
      { path: '/login', element: <PaginaLogin /> },
      { path: '/mis-ordenes', element: <RequiereSesion><p>mis órdenes</p></RequiereSesion> },
      { path: '/admin/logs', element: <RequiereSesion rol="ADMIN"><p>logs</p></RequiereSesion> },
    ],
  },
];

describe('guard de rutas', () => {
  it('sin sesión manda a /login conservando la ruta de destino', async () => {
    cerrarSesion();
    renderizarRutas(rutas, '/mis-ordenes?pagina=2');
    expect(await screen.findByText(/login/)).toHaveTextContent('destino=%2Fmis-ordenes%3Fpagina%3D2');
  });

  it('un USUARIO entra a sus rutas pero no a las de ADMIN', async () => {
    iniciarSesionLocal(tokenDePrueba('USUARIO'));
    const { enrutador } = renderizarRutas(rutas, '/mis-ordenes');
    expect(await screen.findByText('mis órdenes')).toBeInTheDocument();
    await act(() => enrutador.navigate('/admin/logs'));
    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument();
    expect(screen.queryByText('logs')).not.toBeInTheDocument();
  });

  it('un ADMIN entra a las rutas de ADMIN', async () => {
    iniciarSesionLocal(tokenDePrueba('ADMIN'));
    renderizarRutas(rutas, '/admin/logs');
    expect(await screen.findByText('logs')).toBeInTheDocument();
  });

  it('un 401 limpia la sesión y redirige a /login con el destino', async () => {
    iniciarSesionLocal(tokenDePrueba('USUARIO'));
    configurarCliente({ obtenerToken: () => obtenerSesion()?.token ?? null, alNoAutenticado: () => cerrarSesion('vencida') });
    renderizarRutas(rutas, '/mis-ordenes');
    expect(await screen.findByText('mis órdenes')).toBeInTheDocument();

    simularFetch(() => errorApi(401, 'NO_AUTENTICADO'));
    await act(async () => {
      await pedir('/ordenes/mias').catch(() => {});
    });

    expect(obtenerSesion()).toBeNull();
    expect(sessionStorage.length).toBe(0);
    expect(await screen.findByText(/login/)).toHaveTextContent('destino=%2Fmis-ordenes');
  });

  it('guarda la sesión en sessionStorage y descarta una vencida al restaurar', () => {
    iniciarSesionLocal(tokenDePrueba('USUARIO'));
    expect(sessionStorage.getItem('soundpass.sesion')).toContain('token-USUARIO');
    restaurarSesion();
    expect(obtenerSesion()?.usuario.nombre).toBe('Ana');

    const vencida = { ...tokenDePrueba(), expiraEn: new Date(Date.now() - 1000).toISOString() };
    sessionStorage.setItem('soundpass.sesion', JSON.stringify(vencida));
    restaurarSesion();
    expect(obtenerSesion()).toBeNull();
  });

  it('solo acepta destinos internos', () => {
    expect(destinoSeguro('/mis-entradas')).toBe('/mis-entradas');
    expect(destinoSeguro('//malo.com')).toBe('/');
    expect(destinoSeguro('https://malo.com')).toBe('/');
    expect(destinoSeguro(null)).toBe('/');
  });
});

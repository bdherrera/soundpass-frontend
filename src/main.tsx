import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { configurarCliente } from './api/cliente';
import { crearClienteQuery } from './api/consultas';
import { cerrarSesion, obtenerToken, restaurarSesion } from './sesion/sesion';
import { crearEnrutador } from './rutas';

configurarCliente({ obtenerToken, alNoAutenticado: () => cerrarSesion('vencida') });
restaurarSesion();

const clienteQuery = crearClienteQuery();
const enrutador = crearEnrutador();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={clienteQuery}>
      <RouterProvider router={enrutador} future={{ v7_startTransition: true }} />
    </QueryClientProvider>
  </StrictMode>,
);

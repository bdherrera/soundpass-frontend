import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import DetalleEvento from '../src/paginas/publico/DetalleEvento';
import { errorApi, renderizarRutas, simularFetch } from './utilidades';
import { cerrarSesion } from '../src/sesion/sesion';

const evento = {
  idEvento: 7,
  idEscenario: 1,
  nombre: 'Rock al Parque',
  fechaInicio: '2026-11-20T20:00:00-05:00',
  fechaFin: '2026-11-20T23:00:00-05:00',
  estado: 'PUBLICADO',
  escenario: { idEscenario: 1, nombre: 'Movistar Arena', ciudad: 'Bogotá', capacidad: 1000 },
  artistas: [
    { idArtista: 2, nombreArtistico: 'Segundo', ordenPresentacion: 2 },
    { idArtista: 1, nombreArtistico: 'Primero', ordenPresentacion: 1 },
  ],
  tiposEntrada: [],
};

describe('detalle de evento', () => {
  it('con MongoDB caído (503) muestra el evento y oculta solo detalle y reseñas', async () => {
    cerrarSesion();
    simularFetch((_m, url) => {
      const r = url.pathname.replace('/api/v1', '');
      if (r === '/eventos/7') return { estado: 200, cuerpo: evento };
      if (r === '/eventos/7/disponibilidad')
        return { estado: 200, cuerpo: [{ idTipoEntrada: 3, nombre: 'General', precio: 150000, cupo: 10, disponibles: 4 }] };
      if (r === '/eventos/7/cola') return errorApi(503, 'ERROR_INTERNO');
      return errorApi(503, 'ERROR_INTERNO', 'MongoDB no responde');
    });

    renderizarRutas([{ path: '/eventos/:idEvento', element: <DetalleEvento /> }], '/eventos/7');

    expect(await screen.findByRole('heading', { name: 'Rock al Parque' })).toBeInTheDocument();
    expect(await screen.findByText('La información ampliada no está disponible en este momento.')).toBeInTheDocument();
    expect(await screen.findByText('La sección de reseñas no está disponible en este momento.')).toBeInTheDocument();
    expect(await screen.findByText('4 de 10 disponibles')).toBeInTheDocument();
    // Artistas en orden de presentación
    const nombres = screen.getAllByRole('link', { name: /Primero|Segundo/ }).map((a) => a.textContent);
    expect(nombres).toEqual(['Primero', 'Segundo']);
    // Sin cola (Mongo caído) se compra directamente
    expect(await screen.findByRole('link', { name: 'Comprar entradas' })).toHaveAttribute('href', '/eventos/7/compra');
    expect(document.body.textContent).not.toContain('MongoDB no responde');
  });
});

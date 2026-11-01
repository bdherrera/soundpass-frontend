import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminEvento from '../src/paginas/admin/AdminEvento';
import { errorApi, renderizarRutas, simularFetch } from './utilidades';

const evento = (estado: string) => ({
  idEvento: 7,
  idEscenario: 1,
  nombre: 'Rock al Parque',
  fechaInicio: '2026-11-20T20:00:00-05:00',
  fechaFin: '2026-11-20T23:00:00-05:00',
  estado,
  escenario: { idEscenario: 1, nombre: 'Arena', ciudad: 'Bogotá', capacidad: 1000 },
  artistas: [],
  tiposEntrada: [],
});

function backend(estado: string, alPatch: () => { estado: number; cuerpo?: unknown }) {
  simularFetch((metodo, url) => {
    const r = url.pathname.replace('/api/v1', '');
    if (r === '/eventos/7' && metodo === 'GET') return { estado: 200, cuerpo: evento(estado) };
    if (r === '/eventos/7/estado' && metodo === 'PATCH') return alPatch();
    if (r === '/eventos/7/tipos-entrada' || r === '/eventos/7/ventas') return { estado: 200, cuerpo: [] };
    if (r === '/artistas' || r === '/escenarios') return { estado: 200, cuerpo: { pagina: 0, tamano: 100, totalElementos: 0, totalPaginas: 0, contenido: [] } };
    return errorApi(503, 'ERROR_INTERNO');
  });
}

const montar = () => renderizarRutas([{ path: '/admin/eventos/:idEvento', element: <AdminEvento /> }], '/admin/eventos/7');

describe('administración de eventos', () => {
  it('solo ofrece las transiciones permitidas', async () => {
    backend('BORRADOR', () => ({ estado: 200 }));
    montar();
    expect(await screen.findByRole('button', { name: 'Publicar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar evento' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como finalizado' })).not.toBeInTheDocument();
  });

  it('un evento FINALIZADO no ofrece transiciones', async () => {
    backend('FINALIZADO', () => ({ estado: 200 }));
    montar();
    expect(await screen.findByText('Un evento finalizado ya no cambia de estado.')).toBeInTheDocument();
  });

  it('muestra el 409 por solapamiento al reactivar un evento cancelado', async () => {
    backend('CANCELADO', () => errorApi(409, 'SOLAPAMIENTO_ESCENARIO', 'conflicto'));
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole('button', { name: 'Reactivar como borrador' }));
    expect(await screen.findByText('Ese escenario ya tiene un evento en ese horario.')).toBeInTheDocument();
    // Las secciones de MongoDB caídas se degradan sin romper la página
    expect(await screen.findByText('La edición del detalle no está disponible en este momento.')).toBeInTheDocument();
  });
});

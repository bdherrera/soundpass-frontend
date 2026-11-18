import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MisEntradas from '../src/paginas/usuario/MisEntradas';
import { errorApi, renderizarRutas, simularFetch } from './utilidades';

const pagina = (contenido: unknown[]) => ({ pagina: 0, tamano: 10, totalElementos: contenido.length, totalPaginas: 1, contenido });

const vendida = {
  idEntrada: 5,
  codigo: '3f2a6c1e-9d3b-4c55-8a77-0c1d2e3f4a5b',
  estado: 'VENDIDA',
  idOrden: 9,
  idTipoEntrada: 3,
  tipoEntrada: 'General',
  idEvento: 7,
  evento: 'Rock al Parque',
};

describe('mis entradas', () => {
  it('filtra por estado y registra un asistente solo en entradas VENDIDA', async () => {
    const consultas: string[] = [];
    let asistente: unknown;
    simularFetch((metodo, url, cuerpo) => {
      if (metodo === 'GET' && url.pathname.endsWith('/entradas/mias')) {
        consultas.push(url.search);
        return {
          estado: 200,
          cuerpo: pagina(url.searchParams.get('estado') === 'USADA' ? [] : [
                  vendida,
                  {
                    ...vendida,
                    idEntrada: 6,
                    estado: 'USADA',
                    codigo: 'a'.repeat(8),
                    asistente: { idEntrada: 6, nombre: 'Marta', apellido: 'Ríos', documento: '456' },
                  },
                ]),
        };
      }
      if (metodo === 'PUT' && url.pathname.endsWith('/entradas/5/asistente')) {
        asistente = cuerpo;
        return errorApi(409, 'DUPLICADO');
      }
      return errorApi(404, 'NO_ENCONTRADO');
    });
    const usuario = userEvent.setup();
    renderizarRutas([{ path: '/mis-entradas', element: <MisEntradas /> }], '/mis-entradas');

    expect(await screen.findByAltText(`Código QR de la entrada ${vendida.codigo}`)).toBeInTheDocument();
    expect(screen.getByText('Marta Ríos')).toBeInTheDocument();
    // Solo la entrada VENDIDA ofrece registrar asistente
    const botones = screen.getAllByRole('button', { name: 'Registrar asistente' });
    expect(botones).toHaveLength(1);

    await usuario.click(botones[0]);
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Escribe el nombre')).toBeInTheDocument();
    expect(screen.getByText('Escribe el apellido')).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Nombre del asistente'), 'Luis');
    await usuario.type(screen.getByLabelText('Apellido del asistente'), ' Pérez ');
    await usuario.type(screen.getByLabelText('Documento'), '123');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Esta entrada ya tiene un asistente registrado.')).toBeInTheDocument();
    expect(asistente).toEqual({ nombre: 'Luis', apellido: 'Pérez', documento: '123' });

    // Las opciones del filtro no incluyen DISPONIBLE
    const filtro = screen.getByLabelText('Estado');
    expect([...filtro.querySelectorAll('option')].map((o) => o.value)).toEqual(['', 'VENDIDA', 'USADA', 'CANCELADA']);
    await usuario.selectOptions(filtro, 'USADA');
    expect(await screen.findByText('No tienes entradas con ese filtro.')).toBeInTheDocument();
    expect(consultas.at(-1)).toContain('estado=USADA');
  });
});

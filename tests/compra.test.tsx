import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkout } from '../src/paginas/usuario/Checkout';
import { errorApi, renderizarRutas, simularFetch } from './utilidades';
import type { RespuestaSimulada } from './utilidades';

const disponibilidad = [
  { idTipoEntrada: 3, nombre: 'General', precio: 150000, cupo: 10, disponibles: 5 },
  { idTipoEntrada: 4, nombre: 'VIP', precio: 400000, cupo: 2, disponibles: 1 },
];

const orden = (id: number) => ({
  idOrden: id,
  fecha: '2026-10-28T10:00:00-05:00',
  estado: 'PAGADA',
  total: 300000,
  detalles: [{ idTipoEntrada: 3, cantidad: 2, precioUnitario: 150000, subtotal: 300000 }],
});

/** Backend simulado: devuelve en orden las respuestas de POST /ordenes y registra cada cuerpo. */
function backend(respuestasCompra: RespuestaSimulada[]) {
  const compras: Array<{ claveIdempotencia: string; lineas: unknown }> = [];
  simularFetch((metodo, url, cuerpo) => {
    if (url.pathname.endsWith('/disponibilidad')) return { estado: 200, cuerpo: disponibilidad };
    if (metodo === 'POST' && url.pathname.endsWith('/ordenes')) {
      compras.push(cuerpo as (typeof compras)[number]);
      return respuestasCompra.shift() ?? { estado: 500 };
    }
    return errorApi(404, 'NO_ENCONTRADO');
  });
  return compras;
}

async function elegirYConfirmar(usuario: ReturnType<typeof userEvent.setup>, cantidad = '2') {
  const general = await screen.findByLabelText('General');
  await usuario.clear(general);
  await usuario.type(general, cantidad);
  await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
}

const montar = () => renderizarRutas([{ path: '/', element: <Checkout idEvento={7} /> }], '/');

describe('flujo de compra', () => {
  it('reutiliza la misma clave de idempotencia en los reintentos y muestra si la orden fue creada', async () => {
    const compras = backend([
      { estado: 500, cuerpo: { estado: 500, codigo: 'ERROR_INTERNO', mensaje: 'boom', fecha: '', ruta: '' } },
      errorApi(409, 'ENTRADAS_AGOTADAS'),
      { estado: 201, cuerpo: orden(11) },
    ]);
    const usuario = userEvent.setup();
    montar();

    await elegirYConfirmar(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Confirmar compra' }));
    expect(await screen.findByText('No se pudo completar la compra')).toBeInTheDocument();

    // Reintento tras error del servidor
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(/No quedan suficientes entradas/)).toBeInTheDocument();

    // 409 ENTRADAS_AGOTADAS: se ofrece volver y reducir
    await usuario.click(screen.getByRole('button', { name: 'Volver y reducir cantidades' }));
    await elegirYConfirmar(usuario, '1');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar compra' }));

    expect(await screen.findByText('¡Compra confirmada!')).toBeInTheDocument();
    expect(compras).toHaveLength(3);
    const claves = new Set(compras.map((c) => c.claveIdempotencia));
    expect(claves.size).toBe(1);
    expect([...claves][0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(compras[2].lineas).toEqual([{ idTipoEntrada: 3, cantidad: 1 }]);
  });

  it('con 200 indica que la orden ya existía, y una compra nueva usa otra clave', async () => {
    const compras = backend([{ estado: 200, cuerpo: orden(11) }, { estado: 201, cuerpo: orden(12) }]);
    const usuario = userEvent.setup();
    montar();

    await elegirYConfirmar(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Confirmar compra' }));
    const aviso = await screen.findByText('Esta compra ya estaba registrada');
    expect(within(aviso.closest('[role="status"]')!).getByText(/orden #11 que ya existía/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Hacer otra compra' }));
    await elegirYConfirmar(usuario, '1');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar compra' }));
    expect(await screen.findByText('¡Compra confirmada!')).toBeInTheDocument();

    expect(compras[0].claveIdempotencia).not.toBe(compras[1].claveIdempotencia);
  });

  it('conserva la clave si se vuelve a abrir el checkout antes de terminar la compra', async () => {
    const compras = backend([{ estado: 0 }, { estado: 201, cuerpo: orden(13) }]);
    const usuario = userEvent.setup();
    const primero = montar();
    await elegirYConfirmar(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Confirmar compra' }));
    await screen.findByText('No se pudo completar la compra');
    primero.unmount();

    montar();
    await elegirYConfirmar(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Confirmar compra' }));
    await screen.findByText('¡Compra confirmada!');
    expect(compras[0].claveIdempotencia).toBe(compras[1].claveIdempotencia);
  });

  it('no deja pedir más entradas de las disponibles', async () => {
    backend([]);
    const usuario = userEvent.setup();
    montar();
    const vip = await screen.findByLabelText('VIP');
    await usuario.clear(vip);
    await usuario.type(vip, '9');
    expect(vip).toHaveValue(1);
  });
});

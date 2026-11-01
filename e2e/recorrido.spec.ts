import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

/**
 * Smoke test: registro -> catálogo -> compra, contra el backend real.
 * Los datos (escenario, evento publicado y tipo de entrada) se crean por la API con un ADMIN
 * de la pila de prueba (E2E_ADMIN_CORREO / E2E_ADMIN_CONTRASENA).
 */
const ADMIN_CORREO = process.env.E2E_ADMIN_CORREO ?? 'admin.e2e@soundpass.test';
const ADMIN_CONTRASENA = process.env.E2E_ADMIN_CONTRASENA ?? 'e2e-solo-pruebas-123';
const API = '/api/v1';

const marca = Date.now().toString(36);
const nombreEvento = `Smoke ${marca}`;

async function prepararEvento(request: APIRequestContext): Promise<number> {
  const login = await request.post(`${API}/auth/login`, { data: { correo: ADMIN_CORREO, contrasena: ADMIN_CONTRASENA } });
  expect(login.ok(), 'login del ADMIN de prueba').toBeTruthy();
  const { token } = await login.json();
  const headers = { Authorization: `Bearer ${token}` };

  const escenario = await request.post(`${API}/escenarios`, {
    headers,
    data: { nombre: `Escenario ${marca}`, ciudad: 'Bogotá', capacidad: 500 },
  });
  expect(escenario.status()).toBe(201);
  const { idEscenario } = await escenario.json();

  // Un horario único dentro de los próximos meses para no solaparse con corridas anteriores.
  const inicio = new Date(Date.now() + (30 + (Date.now() % 1000)) * 24 * 3600 * 1000);
  inicio.setUTCMinutes(0, 0, 0);
  const fin = new Date(inicio.getTime() + 3 * 3600 * 1000);
  const evento = await request.post(`${API}/eventos`, {
    headers,
    data: { idEscenario, nombre: nombreEvento, fechaInicio: inicio.toISOString(), fechaFin: fin.toISOString() },
  });
  expect(evento.status()).toBe(201);
  const { idEvento } = await evento.json();

  const tipo = await request.post(`${API}/eventos/${idEvento}/tipos-entrada`, {
    headers,
    data: { nombre: 'General', precio: 120000, cupo: 20 },
  });
  expect(tipo.status()).toBe(201);

  const publicar = await request.patch(`${API}/eventos/${idEvento}/estado`, { headers, data: { estado: 'PUBLICADO' } });
  expect(publicar.ok()).toBeTruthy();
  return idEvento;
}

test('registro -> catálogo -> compra', async ({ page, request }) => {
  const idEvento = await prepararEvento(request);
  const correo = `usuario.${marca}@soundpass.test`;

  // Registro
  await page.goto('/registro');
  await page.getByLabel('Nombre').fill('Usuaria Smoke');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(`clave-${marca}-segura`);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  // Login (el correo viene precargado)
  await expect(page.getByText('Cuenta creada. Ya puedes iniciar sesión.')).toBeVisible();
  await page.getByLabel('Contraseña').fill(`clave-${marca}-segura`);
  await page.getByRole('button', { name: 'Entrar' }).click();

  // Catálogo: filtrar por ciudad y abrir el evento
  await expect(page.getByRole('heading', { name: 'Próximos eventos' })).toBeVisible();
  await page.getByLabel('Ciudad').fill('Bogotá');
  await page.getByRole('button', { name: 'Filtrar' }).click();
  let enlace = page.getByRole('link', { name: new RegExp(nombreEvento) });
  // Con muchos eventos de corridas anteriores puede estar en otra página: se entra directo.
  if (!(await enlace.isVisible().catch(() => false))) {
    await page.goto(`/eventos/${idEvento}`);
  } else {
    await enlace.click();
  }
  await expect(page.getByRole('heading', { name: nombreEvento })).toBeVisible();

  // Compra
  enlace = page.getByRole('link', { name: 'Comprar entradas' });
  await enlace.click();
  await page.getByLabel('General').fill('2');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Confirmar compra' }).click();
  await expect(page.getByText('¡Compra confirmada!')).toBeVisible();

  // La orden aparece en "Mis órdenes"
  await page.getByRole('link', { name: 'Ver la orden' }).click();
  await expect(page.getByRole('heading', { name: /Orden #\d+/ })).toBeVisible();
  await expect(page.getByText('PAGADA')).toBeVisible();
});

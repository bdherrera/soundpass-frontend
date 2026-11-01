# SoundPass · Frontend

Interfaz web de SoundPass (proyecto de Bases de Datos 2): catálogo de eventos, compra de entradas con cola de
reserva, órdenes, entradas con QR, reseñas y panel de administración. Consume la API del backend
(`soundpass-backend`, contrato en `docs/openapi.yaml`).

React 18 · Vite · TypeScript · React Router · TanStack Query · React Hook Form + Zod · Tailwind CSS.

## Configuración

Copia `.env.example` a `.env` si necesitas cambiar algo:

| Variable | Para qué | Por omisión |
|---|---|---|
| `VITE_API_URL` | Base de la API vista desde el navegador | `/api/v1` (mismo origen, vía proxy) |
| `VITE_MEDIA_URL` | Base para las rutas relativas de imágenes | `/media/` |
| `API_PROXY_TARGET` | Solo `npm run dev`: a dónde reenvía Vite `/api` | `http://localhost:8080` |

El backend no envía CORS, por eso el navegador habla siempre con el mismo origen y un proxy reenvía la API
(Vite en desarrollo, nginx en Docker).

## Desarrollo

Con Node 22:

```bash
npm install
npm run dev
```

Si el equipo no tiene Node, todo funciona con la imagen de Docker (desde la carpeta que contiene `Backend/` y
`Frontend/`, para que `gen:api` encuentre el contrato):

```bash
docker run --rm -it -v "$PWD:/work" -w /work/Frontend -p 5173:5173 -e API_PROXY_TARGET=http://host.docker.internal:8080 node:22-alpine sh -c "npm install && npm run dev"
```

Scripts:

- `npm run gen:api` — regenera `src/api/schema.d.ts` desde `../Backend/soundpass-backend/docs/openapi.yaml`.
- `npm run typecheck`, `npm run lint`, `npm test` — tipos, ESLint (sin advertencias) y Vitest.
- `npm run build` — compila a `dist/`.
- `npm run test:e2e` — smoke test de Playwright (ver abajo).

## Docker

`Dockerfile` multi-etapa: compila con Node y sirve con `nginx-unprivileged` (usuario sin privilegios, puerto
8080). nginx sirve la SPA y reenvía `/api/` a `API_UPSTREAM` (por omisión `http://app:8080`).

Con el backend levantado (`docker compose up -d` en `soundpass-backend`, red `soundpass_default`):

```bash
docker compose up -d --build
```

Abre http://localhost:3000. Variables: `WEB_PUERTO`, `API_UPSTREAM`, `RED_BACKEND`.

La red `soundpass_default` debe existir (se crea la primera vez que levantas el backend). nginx resuelve `app` en
cada petición, así que el frontend arranca aunque el backend esté apagado; mientras tanto la API responde 502 y la
interfaz muestra "servicio no disponible".

## Pruebas

- **Vitest + Testing Library** (`tests/`): cliente HTTP (errores tipados, `%2B`, 401 global, red), guard de rutas
  por rol, flujo de compra (clave de idempotencia estable en reintentos, nueva solo en otra compra, 200 vs 201),
  degradación de secciones de MongoDB con 503, entradas/asistente y transiciones de eventos.
- **Playwright** (`e2e/recorrido.spec.ts`): registro → catálogo → compra contra el backend real. Crea los datos con
  un ADMIN de prueba. La forma más simple es una pila aislada que no publica puertos ni toca tus volúmenes:

```bash
docker build -t soundpass-frontend:local .
docker compose -p soundpass-e2e -f ../Backend/soundpass-backend/docker-compose.yml -f e2e/docker-compose.e2e.yml up -d --build --wait
docker run --rm --network soundpass-e2e_default -v "$PWD:/work" -w /work -e E2E_BASE_URL=http://web:8080 mcr.microsoft.com/playwright:v1.49.1-noble npx playwright test
docker compose -p soundpass-e2e -f ../Backend/soundpass-backend/docker-compose.yml -f e2e/docker-compose.e2e.yml down -v
```

Contra una pila propia: `E2E_BASE_URL=<url del frontend> E2E_ADMIN_CORREO=... E2E_ADMIN_CONTRASENA=... npm run test:e2e`
(el ADMIN se crea en el backend con `ADMIN_CORREO`/`ADMIN_CONTRASENA`).

## Decisiones

- **Errores:** un único cliente (`src/api/cliente.ts`) convierte toda respuesta no exitosa en `ApiError`
  (`estado`, `codigo`, `mensaje`, `detalles`); `src/api/errores.ts` traduce `codigo` a mensajes en español. Nunca
  se muestran trazas ni JSON. Un 401 limpia la sesión y lleva a `/login?destino=…`; un 503 oculta solo la sección
  de MongoDB afectada.
- **Sesión:** token en memoria y en `sessionStorage`, se borra al vencer `expiraEn`. Los roles solo ocultan; el
  backend decide (un 403 se muestra como "No tienes permiso").
- **Compra:** la clave de idempotencia (UUID) se crea al abrir el checkout, se guarda en `sessionStorage` por
  evento y se reutiliza en cada reintento hasta que una compra termina bien.
- **Cola:** polling cada 3 s mientras el turno está ESPERANDO o ADMITIDO; la compra solo aparece con ADMITIDO.
  Si MongoDB no responde, la API permite comprar sin cola y la pantalla lo indica.

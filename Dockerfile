# Etapa de compilación
FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Se fijan al compilar (Vite las incrusta en el bundle). Por omisión, mismo origen vía el proxy de nginx.
ARG VITE_API_URL=/api/v1
ARG VITE_MEDIA_URL=/media/
ENV VITE_API_URL=$VITE_API_URL VITE_MEDIA_URL=$VITE_MEDIA_URL
RUN npm run build

# Etapa de ejecución: nginx sin privilegios (usuario nginx, puerto 8080)
FROM nginxinc/nginx-unprivileged:1.27-alpine
# El backend al que nginx reenvía /api/ (no llega al navegador). Se sustituye al arrancar.
ENV API_UPSTREAM=http://app:8080
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/salud || exit 1

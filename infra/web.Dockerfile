# Compila el panel y lo sirve con Caddy. Contexto: raíz del repositorio.
FROM node:22-alpine AS build
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM caddy:2-alpine
COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /web/dist /srv/web

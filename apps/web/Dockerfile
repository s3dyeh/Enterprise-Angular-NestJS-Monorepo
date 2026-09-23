# Build from the monorepo root:
#   docker build -f apps/web/Dockerfile -t enterprise-web:local .
FROM node:24.15.0-alpine AS contracts
WORKDIR /workspace/libs/contracts
COPY libs/contracts/package*.json ./
RUN npm ci
COPY libs/contracts/ ./
RUN npm run build

FROM node:24.15.0-alpine AS build
WORKDIR /workspace/apps/web
COPY apps/web/package*.json ./
COPY --from=contracts /workspace/libs/contracts /workspace/libs/contracts
RUN npm ci
COPY apps/web/ ./
RUN npm run build:prod

FROM nginxinc/nginx-unprivileged:1.28-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist/monorepo/browser /usr/share/nginx/html
USER 101
EXPOSE 8080

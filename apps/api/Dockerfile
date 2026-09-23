# Build from the monorepo root:
#   docker build -f apps/api/Dockerfile -t enterprise-api:local .
FROM node:24.15.0-alpine AS contracts
WORKDIR /workspace/libs/contracts
COPY libs/contracts/package*.json ./
RUN npm ci
COPY libs/contracts/ ./
RUN npm run build

FROM node:24.15.0-alpine AS dependencies
WORKDIR /workspace/apps/api
COPY apps/api/package*.json ./
COPY --from=contracts /workspace/libs/contracts /workspace/libs/contracts
RUN npm ci

FROM dependencies AS build
COPY apps/api/nest-cli.json apps/api/tsconfig*.json ./
COPY apps/api/src ./src
RUN npm run build

FROM node:24.15.0-alpine AS production-dependencies
WORKDIR /workspace/apps/api
COPY apps/api/package*.json ./
COPY --from=contracts /workspace/libs/contracts /workspace/libs/contracts
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:24.15.0-alpine AS runtime
ENV NODE_ENV=production
# Preserve the file:../../libs/contracts layout used by package.json / npm links.
WORKDIR /workspace/apps/api
COPY --from=production-dependencies --chown=node:node /workspace/apps/api/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/api/dist ./dist
COPY --from=build --chown=node:node /workspace/apps/api/package.json ./package.json
COPY --from=contracts --chown=node:node /workspace/libs/contracts /workspace/libs/contracts
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]

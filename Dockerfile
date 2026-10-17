# syntax=docker/dockerfile:1.7
# Node 22 is supported by Prisma 7 and is the API's production runtime.
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /workspace
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
RUN corepack enable

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN CI=true pnpm install --frozen-lockfile --filter @alibi/api...

FROM dependencies AS build
COPY apps/api apps/api
COPY packages/shared packages/shared
# Client generation reads only the checked-in schema; it does not connect to the database.
# Prisma config requires this build-only, non-routable placeholder to resolve DIRECT_URL.
RUN DIRECT_URL=postgresql://localhost/placeholder pnpm --filter @alibi/api run prisma:generate
# Keep only runtime dependencies (including tsx, which is the existing startup method).
RUN pnpm --filter @alibi/api deploy --legacy --prod /opt/alibi-api

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV LLM_ENABLED=false

COPY --from=build --chown=node:node /opt/alibi-api ./
# The generated client is git-ignored, so copy it explicitly after the production deploy.
COPY --from=build --chown=node:node /workspace/apps/api/generated ./generated
# API source currently imports shared code through its workspace-relative path.
COPY --from=build --chown=node:node /workspace/packages/shared/src/ /packages/shared/src/
RUN mkdir -p /packages/shared/node_modules \
  && ln -s /app/node_modules/zod /packages/shared/node_modules/zod

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3001) + '/ready').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["./node_modules/.bin/tsx", "src/server.ts"]

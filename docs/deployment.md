# API container deployment and release

This repository publishes the API as one platform-independent Node container. It
does not include the frontend, a `.env` file, any Neon connection URL, an OpenAI
key, or `GENERATION_ACCESS_KEY`.

The image uses `node:22-bookworm-slim`. Node 22 is supported by the installed
Prisma 7 packages. The existing `tsx` server startup remains in use because the
current `build` script is type checking only; introducing a JavaScript build
would expand the change to workspace-module and generated-client packaging.
`tsx` is consequently a production dependency. Prisma Client is generated in
the image build stage and copied into the final runtime image.
Prisma's config requires a `DIRECT_URL` value even for this offline generate
command, so the Docker build supplies a non-routable local placeholder. It is
not a Neon URL, is never contacted, and is not present in the final image.

## Build and run the API image

Build from the repository root:

```sh
docker build --tag alibi-api:local .
```

Run an already released database-backed image with only the pooled runtime URL:

```sh
docker run --rm --init --publish 3001:3001 \
  --env DATABASE_URL='postgresql://…-pooler…' \
  --env LLM_ENABLED=false \
  alibi-api:local
```

The Docker health check calls `GET /ready`, so it succeeds only after the
database is reachable. `GET /health` remains the liveness endpoint and does not
require a database connection. Set `PORT` only when the hosting platform
requires a port other than `3001`.

## Required production environment

At API runtime, `DATABASE_URL` is required and must be the Neon **pooled** URL.
`CLIENT_ORIGIN` is optional and should be the deployed browser origin. The
default safe LLM setting is `LLM_ENABLED=false`.

Do not place `.env` files, `OPENAI_API_KEY`, `GENERATION_ACCESS_KEY`, any real
`DIRECT_URL`, or any Neon URL in the image, Dockerfile, source control, build
arguments, or a client bundle. In particular, `GENERATION_ACCESS_KEY` is
server-only and must never be bundled into the frontend.

When LLM generation is enabled, also provide server-side `OPENAI_API_KEY` and
`GENERATION_ACCESS_KEY`, plus the applicable `OPENAI_MODEL`, `GENERATION_CONCURRENCY`,
`GENERATION_MAX_COST_NANO_USD`, and `GENERATION_DAILY_BUDGET_NANO_USD` values.
They are not needed for the preset-game default.

## Release procedure

Migration and seed work are explicit, one-off release jobs. They are never run
by the API container at startup. Run the following order for every release:

1. `prisma generate`
2. `migrate deploy`
3. `seed`
4. start the API container

The matching API workspace commands are deliberately separate:

```sh
# Build artifact preparation; no database migration or connection is performed.
# The placeholder is only for Prisma config resolution, not a production URL.
DIRECT_URL='postgresql://localhost/placeholder' \
  pnpm --filter @alibi/api run prisma:generate

# Dedicated migration job: DIRECT_URL only (the Neon non-pooled/direct URL).
DIRECT_URL='postgresql://…direct…' \
  pnpm --filter @alibi/api run db:migrate:deploy

# Dedicated seed job: DATABASE_URL only (the Neon pooled URL).
DATABASE_URL='postgresql://…-pooler…' \
  pnpm --filter @alibi/api run db:seed

# Long-running API runtime: DATABASE_URL only (the Neon pooled URL).
DATABASE_URL='postgresql://…-pooler…' \
  LLM_ENABLED=false \
  pnpm --filter @alibi/api run start
```

Do not set `DIRECT_URL` for the long-running API. Conversely, do not use the
pooled `DATABASE_URL` for the migration job. The commands above should receive
their secrets from the hosting platform's server-side secret store, not from
checked-in files or shell history.

## LLM operating boundary

With `LLM_ENABLED=false`, this API serves preset games and can be deployed as
multiple instances or serverless instances. No OpenAI API call is made in this
mode.

With `LLM_ENABLED=true`, generation uses a process-local, in-memory queue. Run
exactly one long-running API instance with replica count `1`; do not perform a
rolling deployment while generation is in progress. Durable queueing, worker
leases, and multi-instance LLM generation are intentionally not implemented by
this release artifact.

import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, env } from "prisma/config";

const apiDirectory = dirname(fileURLToPath(import.meta.url));

config({
  path: [
    resolve(apiDirectory, "../../.env.local"),
    resolve(apiDirectory, "../../.env"),
  ],
});

process.env.DIRECT_URL ??= process.env.DATABASE_URL_UNPOOLED;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});

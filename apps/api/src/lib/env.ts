import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const environmentDirectory = dirname(fileURLToPath(import.meta.url));

config({
  path: [
    resolve(environmentDirectory, "../../../../.env.local"),
    resolve(environmentDirectory, "../../../../.env"),
  ],
});

const configuredPort = Number.parseInt(process.env.PORT ?? "3001", 10);

export const port =
  Number.isInteger(configuredPort) && configuredPort > 0
    ? configuredPort
    : 3001;

export const clientOrigin =
  process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../../generated/prisma/client";

const apiDirectory = dirname(fileURLToPath(import.meta.url));

config({
  path: [
    resolve(apiDirectory, "../../../../.env.local"),
    resolve(apiDirectory, "../../../../.env"),
  ],
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize Prisma Client.");
  }

  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

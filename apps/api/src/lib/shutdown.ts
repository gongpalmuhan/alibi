import { disconnectPrisma } from "./prisma";

type ClosableHttpServer = {
  close: (callback: (error?: Error) => void) => unknown;
};

type ShutdownDependencies = {
  server: ClosableHttpServer;
  disconnect?: () => Promise<void>;
};

const closeHttpServer = (server: ClosableHttpServer): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

/**
 * Stops new HTTP connections before releasing Prisma resources. This function
 * is idempotent so SIGTERM and SIGINT can arrive during the same shutdown.
 */
export const createGracefulShutdown = ({
  server,
  disconnect = disconnectPrisma,
}: ShutdownDependencies): (() => Promise<void>) => {
  let shutdownPromise: Promise<void> | undefined;

  return () => {
    if (!shutdownPromise) {
      shutdownPromise = (async () => {
        console.info("API server shutdown started");

        try {
          await closeHttpServer(server);
        } catch {
          process.exitCode = 1;
          console.error("API server HTTP shutdown failed");
        }

        try {
          await disconnect();
        } catch {
          process.exitCode = 1;
          console.error("API server database shutdown failed");
        }

        console.info("API server shutdown complete");
      })();
    }

    return shutdownPromise;
  };
};

export const registerShutdownSignals = (shutdown: () => Promise<void>): void => {
  const requestShutdown = (): void => {
    void shutdown();
  };

  // Keep both listeners installed while shutdown is in progress. Repeated
  // signals reuse the same promise instead of restarting cleanup.
  process.on("SIGTERM", requestShutdown);
  process.on("SIGINT", requestShutdown);
};

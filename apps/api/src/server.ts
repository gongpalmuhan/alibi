import { app } from "./app";
import { port } from "./lib/env";
import { createGracefulShutdown, registerShutdownSignals } from "./lib/shutdown";
import { failInterruptedGenerations } from "./services/generation";

const startServer = async (): Promise<void> => {
  await failInterruptedGenerations().catch(() => {
    // Database may be unavailable during startup; do not expose internals.
  });

  const server = app.listen(port, () => {
    console.info(`API server listening on port ${port}`);
  });

  // The generation queue is process-local. Existing generation work cannot be
  // durably handed to another process during shutdown; startup reconciliation
  // handles records left interrupted by a stopped process.
  registerShutdownSignals(createGracefulShutdown({ server }));
};

void startServer().catch(() => {
  process.exitCode = 1;
  console.error("API server failed to start");
});

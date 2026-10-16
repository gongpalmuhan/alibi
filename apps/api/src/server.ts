import { app } from "./app";
import { port } from "./lib/env";
import { failInterruptedGenerations } from "./services/generation";

void failInterruptedGenerations()
  .catch(() => {
    // Database may be unavailable during startup; do not expose internals.
  })
  .finally(() => {
    app.listen(port, () => {
      console.info(`API server listening on port ${port}`);
    });
  });

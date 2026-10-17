import cors from "cors";
import express from "express";

import { clientOrigin } from "./lib/env";
import { checkDatabaseReady } from "./lib/prisma";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { roomsRouter } from "./routes/rooms";
import { scenariosRouter } from "./routes/scenarios";

type AppOptions = {
  checkReadiness?: () => Promise<void>;
};

export const createApp = ({ checkReadiness = checkDatabaseReady }: AppOptions = {}) => {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: clientOrigin }));
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/ready", async (_request, response) => {
    try {
      await checkReadiness();
      response.json({ status: "ready" });
    } catch {
      response.status(503).json({ status: "unavailable" });
    }
  });

  app.use("/api/rooms", roomsRouter);
  app.use("/api/scenarios", scenariosRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const app = createApp();

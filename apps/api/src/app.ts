import cors from "cors";
import express from "express";

import { clientOrigin } from "./lib/env";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { roomsRouter } from "./routes/rooms";

export const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: clientOrigin }));
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/rooms", roomsRouter);
app.use(notFoundHandler);
app.use(errorHandler);

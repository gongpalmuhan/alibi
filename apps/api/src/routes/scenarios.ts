import { PlayerCountSchema } from "../../../../packages/shared/src";
import { Router } from "express";

import { ApiError } from "../lib/errors";
import { listScenarios } from "../services/room";

const scenariosRouter = Router();

scenariosRouter.get("/", async (request, response, next) => {
  try {
    const rawPlayerCount = request.query.playerCount;
    if (Array.isArray(rawPlayerCount)) {
      throw new ApiError(400, "INVALID_INPUT", "playerCount must be a single value.");
    }
    const playerCount =
      rawPlayerCount === undefined
        ? undefined
        : PlayerCountSchema.safeParse(Number(rawPlayerCount));
    if (playerCount && !playerCount.success) {
      throw new ApiError(400, "INVALID_INPUT", "playerCount must be 4, 5, or 6.");
    }
    response.json(await listScenarios(playerCount?.data));
  } catch (error) {
    next(error);
  }
});

export { scenariosRouter };

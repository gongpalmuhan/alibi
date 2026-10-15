import {
  CreateRoomInputSchema,
  JoinRoomInputSchema,
  RoomCodeSchema,
} from "../../../../packages/shared/src";
import { Router } from "express";

import { ApiError } from "../lib/errors";
import { createRoom, getRoomSnapshot, joinRoom } from "../services/room";

const roomsRouter = Router();

const parseOrThrow = <T>(
  result:
    | { success: true; data: T }
    | { success: false; error: unknown },
): T => {
  if (!result.success) {
    throw new ApiError(400, "INVALID_INPUT", "Request input is invalid.");
  }

  return result.data;
};

const roomCodeFrom = (rawCode: string): string =>
  parseOrThrow(RoomCodeSchema.safeParse(rawCode));

const optionalPlayerTokenFrom = (authorization: string | undefined): string | undefined => {
  if (authorization === undefined) {
    return undefined;
  }

  const [scheme, token, extra] = authorization.trim().split(/\s+/);
  if (scheme !== "Bearer" || !token || extra) {
    throw new ApiError(401, "UNAUTHORIZED", "Player token is invalid.");
  }

  return token;
};

const optionalHostTokenFrom = (hostToken: string | undefined): string | undefined => {
  if (hostToken === undefined) {
    return undefined;
  }

  if (!hostToken.trim()) {
    throw new ApiError(401, "UNAUTHORIZED", "Host token is invalid.");
  }

  return hostToken;
};

roomsRouter.post("/", async (request, response, next) => {
  try {
    const input = parseOrThrow(CreateRoomInputSchema.safeParse(request.body));
    const result = await createRoom(input);

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

roomsRouter.post("/:code/players", async (request, response, next) => {
  try {
    const code = roomCodeFrom(request.params.code);
    const input = parseOrThrow(JoinRoomInputSchema.safeParse(request.body));
    const result = await joinRoom(code, input);

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

roomsRouter.get("/:code", async (request, response, next) => {
  try {
    const code = roomCodeFrom(request.params.code);
    const snapshot = await getRoomSnapshot(code, {
      playerToken: optionalPlayerTokenFrom(request.get("authorization") ?? undefined),
      hostToken: optionalHostTokenFrom(request.get("x-host-token") ?? undefined),
    });

    response.json(snapshot);
  } catch (error) {
    next(error);
  }
});

export { roomsRouter };

import {
  CastVoteInputSchema,
  ChangePhaseInputSchema,
  CreateRoomInputSchema,
  JoinRoomInputSchema,
  RoomCodeSchema,
} from "../../../../packages/shared/src";
import { Router } from "express";

import { ApiError } from "../lib/errors";
import {
  assignCharacters,
  castVote,
  changeRoomPhase,
  createRoom,
  getRoomSnapshot,
  joinRoom,
} from "../services/room";

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

const requiredPlayerTokenFrom = (authorization: string | undefined): string => {
  const playerToken = optionalPlayerTokenFrom(authorization);
  if (!playerToken) {
    throw new ApiError(401, "UNAUTHORIZED", "Player token is required.");
  }

  return playerToken;
};

const requiredHostTokenFrom = (hostToken: string | undefined): string => {
  const token = optionalHostTokenFrom(hostToken);
  if (!token) {
    throw new ApiError(401, "UNAUTHORIZED", "Host token is required.");
  }

  return token;
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

roomsRouter.post("/:code/assignments", async (request, response, next) => {
  try {
    const code = roomCodeFrom(request.params.code);
    const snapshot = await assignCharacters(
      code,
      requiredHostTokenFrom(request.get("x-host-token") ?? undefined),
      optionalPlayerTokenFrom(request.get("authorization") ?? undefined),
    );

    response.json(snapshot);
  } catch (error) {
    next(error);
  }
});

roomsRouter.patch("/:code/phase", async (request, response, next) => {
  try {
    const code = roomCodeFrom(request.params.code);
    const input = parseOrThrow(ChangePhaseInputSchema.safeParse(request.body));
    const snapshot = await changeRoomPhase(
      code,
      input,
      requiredHostTokenFrom(request.get("x-host-token") ?? undefined),
      optionalPlayerTokenFrom(request.get("authorization") ?? undefined),
    );

    response.json(snapshot);
  } catch (error) {
    next(error);
  }
});

roomsRouter.put("/:code/vote", async (request, response, next) => {
  try {
    const code = roomCodeFrom(request.params.code);
    const input = parseOrThrow(CastVoteInputSchema.safeParse(request.body));
    const vote = await castVote(
      code,
      input,
      requiredPlayerTokenFrom(request.get("authorization") ?? undefined),
    );

    response.json(vote);
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

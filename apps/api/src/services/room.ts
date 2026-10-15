import {
  ScenarioSchema,
  type CreateRoomInput,
  type JoinRoomInput,
  type Phase,
  type Scenario,
} from "../../../../packages/shared/src";
import { randomInt } from "node:crypto";

import { ApiError } from "../lib/errors";
import { getPrisma } from "../lib/prisma";
import { createRoomCode } from "../lib/roomCode";
import { createToken, hashToken, tokenHashesMatch } from "../lib/token";
import { redactScenarioFor, type RedactedScenario } from "./redact";

type SnapshotPlayer = {
  id: string;
  nickname: string;
  characterId: string | null;
};

type SnapshotRoom = {
  code: string;
  theme: string;
  playerCount: number;
  phase: Phase;
  generationStatus: string;
};

export type RoomSnapshot = {
  code: string;
  theme: string;
  playerCount: number;
  joinedPlayerCount: number;
  phase: Phase;
  generationStatus: string;
  scenario: RedactedScenario;
  me?: SnapshotPlayer;
  isHost?: true;
};

type GetRoomOptions = {
  playerToken?: string;
  hostToken?: string;
};

const CODE_GENERATION_ATTEMPTS = 10;
const JOIN_TRANSACTION_ATTEMPTS = 6;

const parseStoredScenario = (data: unknown): Scenario => {
  try {
    return ScenarioSchema.parse(data);
  } catch {
    throw new ApiError(500, "INTERNAL_ERROR", "Stored scenario is invalid.");
  }
};

const toSnapshot = (
  room: SnapshotRoom,
  scenario: Scenario,
  joinedPlayerCount: number,
  player: SnapshotPlayer | null,
  isHost: boolean,
): RoomSnapshot => ({
  code: room.code,
  theme: room.theme,
  playerCount: room.playerCount,
  joinedPlayerCount,
  phase: room.phase,
  generationStatus: room.generationStatus,
  scenario: redactScenarioFor(scenario, room.phase, player),
  ...(player ? { me: player } : {}),
  ...(isHost ? { isHost: true } : {}),
});

const isPrismaCode = (error: unknown, code: string): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === code;

const isTransactionConflict = (error: unknown): boolean => {
  if (isPrismaCode(error, "P2034")) {
    return true;
  }

  if (typeof error !== "object" || error === null || !("cause" in error)) {
    return false;
  }

  const cause = (error as { cause?: unknown }).cause;
  return (
    typeof cause === "object" &&
    cause !== null &&
    (("originalCode" in cause &&
      (cause as { originalCode?: unknown }).originalCode === "40001") ||
      ("kind" in cause &&
        (cause as { kind?: unknown }).kind === "TransactionWriteConflict"))
  );
};

const waitBeforeTransactionRetry = async (attempt: number): Promise<void> => {
  const delay = 10 * 2 ** attempt + randomInt(10);
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delay);
  });
};

export const createRoom = async (
  input: CreateRoomInput,
): Promise<{ room: RoomSnapshot; hostToken: string }> => {
  const prisma = getPrisma();
  const storedScenario = await prisma.scenario.findFirst({
    where: {
      theme: input.theme,
      playerCount: input.playerCount,
    },
    select: {
      id: true,
      data: true,
    },
  });

  if (!storedScenario) {
    throw new ApiError(
      400,
      "SCENARIO_UNAVAILABLE",
      "No seeded scenario matches this theme and player count.",
    );
  }

  const scenario = parseStoredScenario(storedScenario.data);
  const hostToken = createToken();
  const hostTokenHash = hashToken(hostToken);

  for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const code = createRoomCode();

    try {
      const room = await prisma.room.create({
        data: {
          code,
          theme: scenario.theme,
          playerCount: scenario.playerCount,
          phase: "lobby",
          generationStatus: "ready",
          hostTokenHash,
          scenario: {
            connect: { id: storedScenario.id },
          },
        },
        select: {
          code: true,
          theme: true,
          playerCount: true,
          phase: true,
          generationStatus: true,
        },
      });

      return {
        room: toSnapshot(room, scenario, 0, null, true),
        hostToken,
      };
    } catch (error) {
      if (isPrismaCode(error, "P2002")) {
        continue;
      }

      throw error;
    }
  }

  throw new ApiError(500, "INTERNAL_ERROR", "Unable to allocate a room code.");
};

export const joinRoom = async (
  code: string,
  input: JoinRoomInput,
): Promise<{ playerId: string; playerToken: string; room: RoomSnapshot }> => {
  const prisma = getPrisma();
  const playerToken = createToken();
  const sessionTokenHash = hashToken(playerToken);

  for (let attempt = 0; attempt < JOIN_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      const result = await prisma.$transaction(
        async (transaction) => {
          const room = await transaction.room.findUnique({
            where: { code },
            select: {
              id: true,
              code: true,
              theme: true,
              playerCount: true,
              phase: true,
              generationStatus: true,
              scenario: {
                select: { data: true },
              },
            },
          });

          if (!room) {
            throw new ApiError(404, "NOT_FOUND", "Room not found.");
          }

          if (room.phase !== "lobby") {
            throw new ApiError(
              400,
              "INVALID_INPUT",
              "This room is no longer accepting players.",
            );
          }

          const joinedPlayerCount = await transaction.player.count({
            where: { roomId: room.id },
          });

          if (joinedPlayerCount >= room.playerCount) {
            throw new ApiError(409, "ROOM_FULL", "Room is full.");
          }

          if (!room.scenario) {
            throw new ApiError(500, "INTERNAL_ERROR", "Room scenario is missing.");
          }

          const scenario = parseStoredScenario(room.scenario.data);
          const player = await transaction.player.create({
            data: {
              roomId: room.id,
              nickname: input.nickname,
              sessionTokenHash,
            },
            select: {
              id: true,
              nickname: true,
              characterId: true,
            },
          });

          return {
            player,
            snapshot: toSnapshot(room, scenario, joinedPlayerCount + 1, player, false),
          };
        },
        { isolationLevel: "Serializable" },
      );

      return {
        playerId: result.player.id,
        playerToken,
        room: result.snapshot,
      };
    } catch (error) {
      if (
        isTransactionConflict(error) &&
        attempt + 1 < JOIN_TRANSACTION_ATTEMPTS
      ) {
        await waitBeforeTransactionRetry(attempt);
        continue;
      }

      throw error;
    }
  }

  throw new ApiError(500, "INTERNAL_ERROR", "Unable to join room.");
};

export const getRoomSnapshot = async (
  code: string,
  options: GetRoomOptions,
): Promise<RoomSnapshot> => {
  const prisma = getPrisma();
  const room = await prisma.room.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      theme: true,
      playerCount: true,
      phase: true,
      generationStatus: true,
      hostTokenHash: true,
      scenario: {
        select: { data: true },
      },
      _count: {
        select: { players: true },
      },
    },
  });

  if (!room) {
    throw new ApiError(404, "NOT_FOUND", "Room not found.");
  }

  let player: SnapshotPlayer | null = null;
  if (options.playerToken) {
    player = await prisma.player.findFirst({
      where: {
        roomId: room.id,
        sessionTokenHash: hashToken(options.playerToken),
      },
      select: {
        id: true,
        nickname: true,
        characterId: true,
      },
    });

    if (!player) {
      throw new ApiError(401, "UNAUTHORIZED", "Player token is invalid.");
    }
  }

  const isHost = options.hostToken
    ? tokenHashesMatch(room.hostTokenHash, options.hostToken)
    : false;

  if (options.hostToken && !isHost) {
    throw new ApiError(401, "UNAUTHORIZED", "Host token is invalid.");
  }

  if (!room.scenario) {
    throw new ApiError(500, "INTERNAL_ERROR", "Room scenario is missing.");
  }

  return toSnapshot(
    room,
    parseStoredScenario(room.scenario.data),
    room._count.players,
    player,
    isHost,
  );
};

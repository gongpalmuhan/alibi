import {
  ScenarioSchema,
  GenerationStepSchema,
  type CastVoteInput,
  type CastVoteResponse,
  type ChangePhaseInput,
  type CreateRoomInput,
  type JoinRoomInput,
  type Phase,
  type RoomSnapshot,
  type RoomSnapshotPlayer,
  type Scenario,
  type ScenarioLibraryItem,
  type VoteProgress,
  type VoteResult,
} from "../../../../packages/shared/src";
import { randomInt } from "node:crypto";

import { ApiError } from "../lib/errors";
import { getPrisma } from "../lib/prisma";
import { createRoomCode } from "../lib/roomCode";
import { createToken, hashToken, tokenHashesMatch } from "../lib/token";
import { redactScenarioFor } from "./redact";

type SnapshotRoom = Pick<
  RoomSnapshot,
  "code" | "theme" | "phase" | "generationStatus"
> & {
  playerCount: number;
  generationStep?: string | null;
  generationError?: string | null;
};

type GetRoomOptions = {
  playerToken?: string;
  hostToken?: string;
};

const CODE_GENERATION_ATTEMPTS = 10;
const JOIN_TRANSACTION_ATTEMPTS = 6;
const VOTE_TRANSACTION_ATTEMPTS = 6;
const phaseSequence: Phase[] = [
  "lobby",
  "reading",
  "investigation",
  "discussion",
  "voting",
  "reveal",
];

const parseStoredScenario = (data: unknown): Scenario => {
  try {
    return ScenarioSchema.parse(data);
  } catch {
    throw new ApiError(500, "INTERNAL_ERROR", "Stored scenario is invalid.");
  }
};

const toSnapshot = (
  room: SnapshotRoom,
  scenario: Scenario | null,
  joinedPlayerCount: number,
  player: RoomSnapshotPlayer | null,
  isHost: boolean,
  voteProgress?: VoteProgress,
  voteResults?: VoteResult[],
): RoomSnapshot => ({
  code: room.code,
  theme: room.theme,
  playerCount: room.playerCount as 4 | 5 | 6,
  joinedPlayerCount,
  phase: room.phase,
  generationStatus: room.generationStatus,
  generation: {
    status: room.generationStatus,
    step: GenerationStepSchema.safeParse(room.generationStep ?? null).data ?? null,
    errorCode: room.generationError ?? null,
  },
  ...(scenario ? { scenario: redactScenarioFor(scenario, room.phase, player) } : {}),
  ...(player ? { me: player } : {}),
  ...(isHost ? { isHost: true } : {}),
  ...(voteProgress ? { voteProgress } : {}),
  ...(voteResults ? { voteResults } : {}),
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

const withSerializableTransactionRetry = async <T>(
  operation: () => Promise<T>,
  failureMessage: string,
): Promise<T> => {
  for (let attempt = 0; attempt < VOTE_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (
        isTransactionConflict(error) &&
        attempt + 1 < VOTE_TRANSACTION_ATTEMPTS
      ) {
        await waitBeforeTransactionRetry(attempt);
        continue;
      }

      throw error;
    }
  }

  throw new ApiError(500, "INTERNAL_ERROR", failureMessage);
};

const nextPhaseFor = (phase: Phase): Phase | undefined => {
  const currentIndex = phaseSequence.indexOf(phase);
  return phaseSequence[currentIndex + 1];
};

const isVotingOrLater = (phase: Phase): boolean =>
  phase === "voting" || phase === "reveal";

const createVoteResults = (
  scenario: Scenario,
  votes: { targetCharacterId: string }[],
): VoteResult[] => {
  const votesByCharacter = new Map<string, number>();
  votes.forEach((vote) => {
    votesByCharacter.set(
      vote.targetCharacterId,
      (votesByCharacter.get(vote.targetCharacterId) ?? 0) + 1,
    );
  });

  return scenario.characters.map((character) => ({
    characterId: character.id,
    voteCount: votesByCharacter.get(character.id) ?? 0,
  }));
};

const shuffledCharacterIds = (scenario: Scenario): string[] => {
  const characterIds = scenario.characters.map((character) => character.id);

  for (let index = characterIds.length - 1; index > 0; index -= 1) {
    const randomIndex = randomInt(index + 1);
    [characterIds[index], characterIds[randomIndex]] = [
      characterIds[randomIndex],
      characterIds[index],
    ];
  }

  return characterIds;
};

const assertHostToken = (hostTokenHash: string, hostToken: string): void => {
  if (!tokenHashesMatch(hostTokenHash, hostToken)) {
    throw new ApiError(401, "UNAUTHORIZED", "Host token is invalid.");
  }
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
          generationStep: null,
          generationError: null,
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
          generationStep: true,
          generationError: true,
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

/** Creates a room from an immutable stored scenario, never request-supplied metadata. */
export const createRoomFromScenario = async (
  scenarioId: string,
): Promise<{ room: RoomSnapshot; hostToken: string }> => {
  const prisma = getPrisma();
  const storedScenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    select: { id: true, data: true },
  });
  if (!storedScenario) {
    throw new ApiError(404, "NOT_FOUND", "Scenario not found.");
  }

  const scenario = parseStoredScenario(storedScenario.data);
  const hostToken = createToken();
  const hostTokenHash = hashToken(hostToken);
  for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const room = await prisma.room.create({
        data: {
          code: createRoomCode(),
          theme: scenario.theme,
          playerCount: scenario.playerCount,
          phase: "lobby",
          generationStatus: "ready",
          generationStep: null,
          generationError: null,
          hostTokenHash,
          scenario: { connect: { id: storedScenario.id } },
        },
        select: {
          code: true,
          theme: true,
          playerCount: true,
          phase: true,
          generationStatus: true,
          generationStep: true,
          generationError: true,
        },
      });
      return { room: toSnapshot(room, scenario, 0, null, true), hostToken };
    } catch (error) {
      if (isPrismaCode(error, "P2002")) {
        continue;
      }
      throw error;
    }
  }
  throw new ApiError(500, "INTERNAL_ERROR", "Unable to allocate a room code.");
};

export const listScenarios = async (
  playerCount?: 4 | 5 | 6,
): Promise<ScenarioLibraryItem[]> => {
  const prisma = getPrisma();
  const scenarios = await prisma.scenario.findMany({
    where: playerCount ? { playerCount } : undefined,
    select: { id: true, data: true, source: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return scenarios.map((storedScenario) => {
    const scenario = parseStoredScenario(storedScenario.data);
    return {
      id: storedScenario.id,
      title: scenario.title,
      theme: scenario.theme,
      playerCount: scenario.playerCount,
      intro: scenario.intro,
      source: storedScenario.source,
      createdAt: storedScenario.createdAt.toISOString(),
    };
  });
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
              generationStep: true,
              generationError: true,
              scenario: { select: { data: true } },
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

          if (room.generationStatus !== "ready" || !room.scenario) {
            throw new ApiError(
              409,
              "SCENARIO_NOT_READY",
              "This room's scenario is not ready yet.",
            );
          }

          const joinedPlayerCount = await transaction.player.count({
            where: { roomId: room.id },
          });

          if (joinedPlayerCount >= room.playerCount) {
            throw new ApiError(409, "ROOM_FULL", "Room is full.");
          }

          const scenario = parseStoredScenario(room.scenario.data);
          const player = await transaction.player.create({
            data: {
              roomId: room.id,
              nickname: input.nickname,
              sessionTokenHash,
            },
            select: { id: true, nickname: true, characterId: true },
          });

          return {
            player,
            snapshot: toSnapshot(
              room,
              scenario,
              joinedPlayerCount + 1,
              { ...player, hasVoted: false },
              false,
            ),
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

export const assignCharacters = async (
  code: string,
  hostToken: string,
  playerToken?: string,
): Promise<RoomSnapshot> => {
  const prisma = getPrisma();

  return withSerializableTransactionRetry(
    () =>
      prisma.$transaction(
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
          generationStep: true,
          generationError: true,
          hostTokenHash: true,
          scenario: { select: { data: true } },
        },
      });

      if (!room) {
        throw new ApiError(404, "NOT_FOUND", "Room not found.");
      }

      assertHostToken(room.hostTokenHash, hostToken);

      if (room.phase !== "lobby") {
        throw new ApiError(
          409,
          "INVALID_PHASE_TRANSITION",
          "Characters can only be assigned while the room is in the lobby.",
        );
      }

      if (room.generationStatus !== "ready" || !room.scenario) {
        throw new ApiError(409, "SCENARIO_NOT_READY", "This room's scenario is not ready yet.");
      }

      const scenario = parseStoredScenario(room.scenario.data);
      if (scenario.playerCount !== room.playerCount) {
        throw new ApiError(
          500,
          "INTERNAL_ERROR",
          "Room scenario does not match the room player count.",
        );
      }
      const players = await transaction.player.findMany({
        where: { roomId: room.id },
        orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
        select: { id: true, nickname: true, characterId: true },
      });

      if (players.length !== room.playerCount) {
        throw new ApiError(
          409,
          "ASSIGNMENT_INCOMPLETE",
          "All player slots must be filled before assigning characters.",
        );
      }

      if (players.some((player) => player.characterId !== null)) {
        throw new ApiError(
          409,
          "ALREADY_ASSIGNED",
          "Characters have already been assigned for this room.",
        );
      }

      const characterIds = shuffledCharacterIds(scenario);
      await Promise.all(
        players.map((player, index) =>
          transaction.player.update({
            where: { id: player.id },
            data: { characterId: characterIds[index] },
          }),
        ),
      );

      let requestingPlayer: RoomSnapshotPlayer | null = null;
      if (playerToken) {
        const player = await transaction.player.findFirst({
          where: {
            roomId: room.id,
            sessionTokenHash: hashToken(playerToken),
          },
          select: { id: true, nickname: true, characterId: true },
        });

        if (!player) {
          throw new ApiError(401, "UNAUTHORIZED", "Player token is invalid.");
        }

        requestingPlayer = { ...player, hasVoted: false };
      }

          return toSnapshot(room, scenario, players.length, requestingPlayer, true);
        },
        { isolationLevel: "Serializable" },
      ),
    "Unable to assign characters.",
  );
};

export const changeRoomPhase = async (
  code: string,
  input: ChangePhaseInput,
  hostToken: string,
  playerToken?: string,
): Promise<RoomSnapshot> => {
  const prisma = getPrisma();

  return withSerializableTransactionRetry(
    () =>
      prisma.$transaction(
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
          generationStep: true,
          generationError: true,
          hostTokenHash: true,
          scenario: { select: { data: true } },
        },
      });

      if (!room) {
        throw new ApiError(404, "NOT_FOUND", "Room not found.");
      }

      assertHostToken(room.hostTokenHash, hostToken);

      if (nextPhaseFor(room.phase) !== input.phase) {
        throw new ApiError(
          409,
          "INVALID_PHASE_TRANSITION",
          "The requested phase must be the next phase in the room sequence.",
        );
      }

      if (room.generationStatus !== "ready" || !room.scenario) {
        throw new ApiError(409, "SCENARIO_NOT_READY", "This room's scenario is not ready yet.");
      }

      const scenario = parseStoredScenario(room.scenario.data);

      if (room.phase === "lobby" && input.phase === "reading") {
        const players = await transaction.player.findMany({
          where: { roomId: room.id },
          select: { characterId: true },
        });

        if (
          players.length !== room.playerCount ||
          players.some((player) => player.characterId === null)
        ) {
          throw new ApiError(
            409,
            "ASSIGNMENT_INCOMPLETE",
            "All player slots must be filled and assigned before reading begins.",
          );
        }
      }

      if (room.phase === "voting" && input.phase === "reveal") {
        const [submittedCount, totalCount] = await Promise.all([
          transaction.vote.count({ where: { roomId: room.id } }),
          transaction.player.count({ where: { roomId: room.id } }),
        ]);

        if (submittedCount !== totalCount) {
          throw new ApiError(
            409,
            "VOTING_INCOMPLETE",
            "Every joined player must submit a vote before reveal.",
          );
        }
      }

      const updatedRoom = await transaction.room.update({
        where: { id: room.id },
        data: { phase: input.phase },
        select: {
          code: true,
          theme: true,
          playerCount: true,
          phase: true,
          generationStatus: true,
          generationStep: true,
          generationError: true,
        },
      });

      let requestingPlayer: RoomSnapshotPlayer | null = null;
      if (playerToken) {
        const player = await transaction.player.findFirst({
          where: {
            roomId: room.id,
            sessionTokenHash: hashToken(playerToken),
          },
          select: { id: true, nickname: true, characterId: true },
        });

        if (!player) {
          throw new ApiError(401, "UNAUTHORIZED", "Player token is invalid.");
        }

        const vote = await transaction.vote.findUnique({
          where: {
            roomId_voterId: { roomId: room.id, voterId: player.id },
          },
          select: { id: true },
        });
        requestingPlayer = { ...player, hasVoted: vote !== null };
      }

      const voteProgress = isVotingOrLater(updatedRoom.phase)
        ? {
            submittedCount: await transaction.vote.count({
              where: { roomId: room.id },
            }),
            totalCount: await transaction.player.count({
              where: { roomId: room.id },
            }),
          }
        : undefined;

      const voteResults =
        updatedRoom.phase === "reveal"
          ? createVoteResults(
              scenario,
              await transaction.vote.findMany({
                where: { roomId: room.id },
                select: { targetCharacterId: true },
              }),
            )
          : undefined;

          return toSnapshot(
            updatedRoom,
            scenario,
            await transaction.player.count({ where: { roomId: room.id } }),
            requestingPlayer,
            true,
            voteProgress,
            voteResults,
          );
        },
        { isolationLevel: "Serializable" },
      ),
    "Unable to change the room phase.",
  );
};

export const castVote = async (
  code: string,
  input: CastVoteInput,
  playerToken: string,
): Promise<CastVoteResponse> => {
  const prisma = getPrisma();

  for (let attempt = 0; attempt < VOTE_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const room = await transaction.room.findUnique({
            where: { code },
            select: {
              id: true,
              phase: true,
              scenario: { select: { data: true } },
            },
          });

          if (!room) {
            throw new ApiError(404, "NOT_FOUND", "Room not found.");
          }

          if (room.phase !== "voting") {
            throw new ApiError(
              409,
              "INVALID_PHASE_TRANSITION",
              "Votes can only be cast during the voting phase.",
            );
          }

          const player = await transaction.player.findFirst({
            where: {
              roomId: room.id,
              sessionTokenHash: hashToken(playerToken),
            },
            select: { id: true, characterId: true },
          });

          if (!player) {
            throw new ApiError(401, "UNAUTHORIZED", "Player token is invalid.");
          }

          if (player.characterId === null) {
            throw new ApiError(
              409,
              "ASSIGNMENT_INCOMPLETE",
              "A character must be assigned before voting.",
            );
          }

          if (!room.scenario) {
            throw new ApiError(500, "INTERNAL_ERROR", "Room scenario is missing.");
          }

          const scenario = parseStoredScenario(room.scenario.data);
          if (
            !scenario.characters.some(
              (character) => character.id === input.targetCharacterId,
            )
          ) {
            throw new ApiError(
              400,
              "INVALID_VOTE_TARGET",
              "Vote target must be a character in this room's scenario.",
            );
          }

          const vote = await transaction.vote.upsert({
            where: {
              roomId_voterId: { roomId: room.id, voterId: player.id },
            },
            update: { targetCharacterId: input.targetCharacterId },
            create: {
              roomId: room.id,
              voterId: player.id,
              targetCharacterId: input.targetCharacterId,
            },
            select: { targetCharacterId: true },
          });

          return {
            targetCharacterId: vote.targetCharacterId,
            hasVoted: true,
          };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (
        isTransactionConflict(error) &&
        attempt + 1 < VOTE_TRANSACTION_ATTEMPTS
      ) {
        await waitBeforeTransactionRetry(attempt);
        continue;
      }

      throw error;
    }
  }

  throw new ApiError(500, "INTERNAL_ERROR", "Unable to cast vote.");
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
      generationStep: true,
      generationError: true,
      hostTokenHash: true,
      scenario: { select: { data: true } },
      _count: { select: { players: true } },
    },
  });

  if (!room) {
    throw new ApiError(404, "NOT_FOUND", "Room not found.");
  }

  let player: RoomSnapshotPlayer | null = null;
  if (options.playerToken) {
    const requestingPlayer = await prisma.player.findFirst({
      where: {
        roomId: room.id,
        sessionTokenHash: hashToken(options.playerToken),
      },
      select: { id: true, nickname: true, characterId: true },
    });

    if (!requestingPlayer) {
      throw new ApiError(401, "UNAUTHORIZED", "Player token is invalid.");
    }

    const vote = await prisma.vote.findUnique({
      where: {
        roomId_voterId: { roomId: room.id, voterId: requestingPlayer.id },
      },
      select: { id: true },
    });
    player = { ...requestingPlayer, hasVoted: vote !== null };
  }

  const isHost = options.hostToken
    ? tokenHashesMatch(room.hostTokenHash, options.hostToken)
    : false;

  if (options.hostToken && !isHost) {
    throw new ApiError(401, "UNAUTHORIZED", "Host token is invalid.");
  }

  if (!room.scenario || room.generationStatus !== "ready") {
    return toSnapshot(room, null, room._count.players, player, isHost);
  }

  const scenario = parseStoredScenario(room.scenario.data);
  const voteProgress =
    isHost && isVotingOrLater(room.phase)
      ? {
          submittedCount: await prisma.vote.count({ where: { roomId: room.id } }),
          totalCount: room._count.players,
        }
      : undefined;
  const voteResults =
    room.phase === "reveal"
      ? createVoteResults(
          scenario,
          await prisma.vote.findMany({
            where: { roomId: room.id },
            select: { targetCharacterId: true },
          }),
        )
      : undefined;

  return toSnapshot(
    room,
    scenario,
    room._count.players,
    player,
    isHost,
    voteProgress,
    voteResults,
  );
};

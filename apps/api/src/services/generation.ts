import type {
  GenerateRoomInput,
  RoomSnapshot,
  SelectRoomScenarioInput,
} from "../../../../packages/shared/src";
import { randomUUID } from "node:crypto";

import {
  generationDailyBudgetNanoUsd,
  generationAccessKey,
  generationConfigurationError,
  generationMaxCostNanoUsd,
  llmEnabled,
  openAiApiKey,
  openAiModel,
} from "../lib/env";
import { ApiError } from "../lib/errors";
import { getPrisma } from "../lib/prisma";
import { createRoomCode } from "../lib/roomCode";
import { createToken, hashToken, tokenHashesMatch } from "../lib/token";
import { generateScenario, PipelineGenerationError, type PipelineStep } from "../llm/pipeline";
import { OpenAiProvider, type LlmUsage } from "../llm/openaiProvider";
import { generationQueue } from "../llm/queue";

const CODE_GENERATION_ATTEMPTS = 10;
const TRANSACTION_ATTEMPTS = 6;

/** Pinned price card. Unknown models deliberately fail closed. Amounts are nano USD/token. */
const MODEL_PRICING: Record<
  string,
  { inputNanoUsd: bigint; cachedInputNanoUsd: bigint; outputNanoUsd: bigint }
> = {
  "gpt-6.1-sol": {
    inputNanoUsd: 2_000n,
    cachedInputNanoUsd: 200n,
    outputNanoUsd: 8_000n,
  },
};

const priceForConfiguredModel = () => {
  const price = MODEL_PRICING[openAiModel];
  if (!price) {
    throw new ApiError(
      500,
      "LLM_CONFIGURATION_INVALID",
      "The configured model has no approved price card.",
    );
  }
  return price;
};

const costOfUsage = (usage: LlmUsage): bigint => {
  const price = priceForConfiguredModel();
  const uncachedInput = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  return (
    BigInt(uncachedInput) * price.inputNanoUsd +
    BigInt(usage.cachedInputTokens) * price.cachedInputNanoUsd +
    BigInt(usage.outputTokens) * price.outputNanoUsd
  );
};

const startOfUtcDay = (value = new Date()): Date =>
  new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );

const isPrismaCode = (error: unknown, code: string): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === code;

const isTransactionConflict = (error: unknown): boolean =>
  isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002");

const assertHost = (hash: string, token: string): void => {
  if (!tokenHashesMatch(hash, token)) {
    throw new ApiError(401, "UNAUTHORIZED", "Host token is invalid.");
  }
};

export const assertGenerationAuthorized = (providedKey: string | undefined): void => {
  if (!llmEnabled) {
    throw new ApiError(403, "LLM_DISABLED", "LLM scenario generation is disabled.");
  }
  if (!providedKey || !generationAccessKey || providedKey !== generationAccessKey) {
    throw new ApiError(401, "GENERATION_KEY_INVALID", "Generation access key is invalid.");
  }
  if (!openAiApiKey) {
    throw new ApiError(500, "LLM_CONFIGURATION_INVALID", "OpenAI API key is not configured.");
  }
  if (generationConfigurationError) {
    throw new ApiError(500, "LLM_CONFIGURATION_INVALID", generationConfigurationError);
  }
  priceForConfiguredModel();
};

const createQueuedRoomSnapshot = (room: {
  code: string;
  theme: string;
  playerCount: number;
  phase: "lobby";
}): RoomSnapshot => ({
  code: room.code,
  theme: room.theme,
  playerCount: room.playerCount as 4 | 5 | 6,
  joinedPlayerCount: 0,
  phase: room.phase,
  generationStatus: "queued",
  generation: { status: "queued", step: null, errorCode: null },
});

type QueuedGeneration = { roomId: string; attemptId: string };

const reserveAndCreate = async (
  input: GenerateRoomInput,
  hostTokenHash: string,
): Promise<{ queued: QueuedGeneration; room: RoomSnapshot }> => {
  const prisma = getPrisma();
  const day = startOfUtcDay();
  for (let attempt = 0; attempt < TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const budget = await transaction.generationBudget.upsert({
            where: { date: day },
            create: { date: day, reservedNanoUsd: 0n, spentNanoUsd: 0n },
            update: {},
            select: { reservedNanoUsd: true, spentNanoUsd: true },
          });
          if (
            budget.reservedNanoUsd +
              budget.spentNanoUsd +
              generationMaxCostNanoUsd >
            generationDailyBudgetNanoUsd
          ) {
            throw new ApiError(
              409,
              "DAILY_BUDGET_EXCEEDED",
              "The daily generation budget is exhausted.",
            );
          }

          await transaction.generationBudget.update({
            where: { date: day },
            data: { reservedNanoUsd: { increment: generationMaxCostNanoUsd } },
          });

          let room: { id: string; code: string; theme: string; playerCount: number } | undefined;
          for (let codeAttempt = 0; codeAttempt < CODE_GENERATION_ATTEMPTS; codeAttempt += 1) {
            try {
              room = await transaction.room.create({
                data: {
                  code: createRoomCode(),
                  theme: input.theme,
                  playerCount: input.playerCount,
                  phase: "lobby",
                  generationStatus: "queued",
                  generationStep: null,
                  generationError: null,
                  hostTokenHash,
                },
                select: { id: true, code: true, theme: true, playerCount: true },
              });
              break;
            } catch (error) {
              if (!isPrismaCode(error, "P2002")) throw error;
            }
          }
          if (!room) {
            throw new ApiError(500, "INTERNAL_ERROR", "Unable to allocate a room code.");
          }
          const generationAttempt = await transaction.generationAttempt.create({
            data: {
              roomId: room.id,
              status: "queued",
              model: openAiModel,
              reservedNanoUsd: generationMaxCostNanoUsd,
            },
            select: { id: true },
          });
          return {
            queued: { roomId: room.id, attemptId: generationAttempt.id },
            room: createQueuedRoomSnapshot({ ...room, phase: "lobby" }),
          };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (isTransactionConflict(error) && attempt + 1 < TRANSACTION_ATTEMPTS) continue;
      throw error;
    }
  }
  throw new ApiError(500, "INTERNAL_ERROR", "Unable to reserve generation budget.");
};

export const createGeneratedRoom = async (
  input: GenerateRoomInput,
): Promise<{ room: RoomSnapshot; hostToken: string }> => {
  const hostToken = createToken();
  const result = await reserveAndCreate(input, hashToken(hostToken));
  generationQueue.enqueue(() => processGeneration(result.queued));
  return { room: result.room, hostToken };
};

const beginAttempt = async ({ roomId, attemptId }: QueuedGeneration): Promise<boolean> => {
  const prisma = getPrisma();
  return prisma.$transaction(async (transaction) => {
    const updatedRoom = await transaction.room.updateMany({
      where: { id: roomId, generationStatus: "queued", scenarioId: null },
      data: { generationStatus: "generating", generationStep: "truth", generationError: null },
    });
    if (updatedRoom.count !== 1) return false;
    const updatedAttempt = await transaction.generationAttempt.updateMany({
      where: { id: attemptId, roomId, status: "queued" },
      data: {
        status: "generating",
        step: "truth",
        actualNanoUsd: 0n,
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
      },
    });
    return updatedAttempt.count === 1;
  });
};

const updateStep = async (attemptId: string, roomId: string, step: PipelineStep): Promise<void> => {
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.room.updateMany({
      where: { id: roomId, generationStatus: "generating" },
      data: { generationStep: step },
    }),
    prisma.generationAttempt.updateMany({
      where: { id: attemptId, status: "generating" },
      data: { step },
    }),
  ]);
};

const recordUsage = async (attemptId: string, usage: LlmUsage): Promise<void> => {
  const prisma = getPrisma();
  const cost = costOfUsage(usage);
  await prisma.$transaction(async (transaction) => {
    const current = await transaction.generationAttempt.findUnique({
      where: { id: attemptId },
      select: {
        reservedNanoUsd: true,
        actualNanoUsd: true,
        inputTokens: true,
        cachedInputTokens: true,
        outputTokens: true,
        status: true,
      },
    });
    if (!current || current.status !== "generating") return;
    const actualNanoUsd = (current.actualNanoUsd ?? 0n) + cost;
    await transaction.generationAttempt.update({
      where: { id: attemptId },
      data: {
        actualNanoUsd,
        inputTokens: (current.inputTokens ?? 0) + usage.inputTokens,
        cachedInputTokens: (current.cachedInputTokens ?? 0) + usage.cachedInputTokens,
        outputTokens: (current.outputTokens ?? 0) + usage.outputTokens,
      },
    });
    if (actualNanoUsd > current.reservedNanoUsd) {
      throw new PipelineGenerationError("COST_LIMIT_EXCEEDED", true);
    }
  });
};

const settleAttempt = async (input: {
  roomId: string;
  attemptId: string;
  status: "ready" | "failed";
  errorCode?: string;
  scenario?: { id: string; theme: string; playerCount: number; data: object };
  chargeReservedAmount?: boolean;
}): Promise<void> => {
  const prisma = getPrisma();
  await prisma.$transaction(
    async (transaction) => {
      const attempt = await transaction.generationAttempt.findUnique({
        where: { id: input.attemptId },
        select: {
          status: true,
          reservedNanoUsd: true,
          actualNanoUsd: true,
          createdAt: true,
        },
      });
      if (!attempt || (attempt.status !== "generating" && attempt.status !== "queued")) return;

      const actualNanoUsd = input.chargeReservedAmount
        ? attempt.reservedNanoUsd
        : (attempt.actualNanoUsd ?? 0n);
      // A job can cross midnight; settle against the day that reserved it.
      const day = startOfUtcDay(attempt.createdAt);
      await transaction.generationBudget.update({
        where: { date: day },
        data: {
          reservedNanoUsd: { decrement: attempt.reservedNanoUsd },
          spentNanoUsd: { increment: actualNanoUsd },
        },
      });
      if (input.status === "ready" && input.scenario) {
        await transaction.scenario.create({
          data: {
            id: input.scenario.id,
            theme: input.scenario.theme,
            playerCount: input.scenario.playerCount,
            data: input.scenario.data,
            source: "GENERATED",
          },
        });
      }
      await transaction.generationAttempt.update({
        where: { id: input.attemptId },
        data: {
          status: input.status,
          scenarioId: input.scenario?.id,
          actualNanoUsd,
          errorCode: input.errorCode ?? null,
          completedAt: new Date(),
        },
      });
      await transaction.room.update({
        where: { id: input.roomId },
        data:
          input.status === "ready" && input.scenario
            ? {
                scenarioId: input.scenario.id,
                theme: input.scenario.theme,
                playerCount: input.scenario.playerCount,
                generationStatus: "ready",
                generationStep: null,
                generationError: null,
                phase: "lobby",
              }
            : {
                generationStatus: "failed",
                generationStep: null,
                generationError: input.errorCode ?? "GENERATION_FAILED",
              },
      });
    },
    { isolationLevel: "Serializable" },
  );
};

const processGeneration = async ({ roomId, attemptId }: QueuedGeneration): Promise<void> => {
  if (!(await beginAttempt({ roomId, attemptId }))) return;
  const prisma = getPrisma();
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { theme: true, playerCount: true },
  });
  if (!room || !openAiApiKey || (room.playerCount !== 4 && room.playerCount !== 5 && room.playerCount !== 6)) {
    await settleAttempt({ roomId, attemptId, status: "failed", errorCode: "LLM_CONFIGURATION_INVALID" });
    return;
  }

  try {
    const scenarioId = randomUUID();
    const scenario = await generateScenario(new OpenAiProvider(openAiApiKey, openAiModel), {
      theme: room.theme,
      playerCount: room.playerCount,
      scenarioId,
      onStep: (step) => updateStep(attemptId, roomId, step),
      onUsage: (usage) => recordUsage(attemptId, usage),
      runProvider: (operation) => generationQueue.runModelCall(operation),
    });
    await settleAttempt({
      roomId,
      attemptId,
      status: "ready",
      scenario: { id: scenario.id, theme: scenario.theme, playerCount: scenario.playerCount, data: scenario },
    });
  } catch (error) {
    const pipelineError = error instanceof PipelineGenerationError ? error : undefined;
    await settleAttempt({
      roomId,
      attemptId,
      status: "failed",
      errorCode: pipelineError?.code ?? "GENERATION_FAILED",
      chargeReservedAmount: !pipelineError?.usageIsKnown,
    });
  }
};

export const retryGeneration = async (
  code: string,
  hostToken: string,
): Promise<{ room: RoomSnapshot }> => {
  const prisma = getPrisma();
  const room = await prisma.room.findUnique({
    where: { code },
    select: { id: true, code: true, theme: true, playerCount: true, phase: true, hostTokenHash: true, generationStatus: true },
  });
  if (!room) throw new ApiError(404, "NOT_FOUND", "Room not found.");
  assertHost(room.hostTokenHash, hostToken);
  if (room.generationStatus !== "failed") {
    throw new ApiError(409, "GENERATION_NOT_FAILED", "Only failed generations can be retried.");
  }
  const existingAttempts = await prisma.generationAttempt.count({ where: { roomId: room.id } });
  if (existingAttempts >= 2) {
    throw new ApiError(409, "RETRY_LIMIT_EXCEEDED", "A room can only be retried once.");
  }
  if (room.playerCount !== 4 && room.playerCount !== 5 && room.playerCount !== 6) {
    throw new ApiError(400, "INVALID_INPUT", "Room player count is invalid.");
  }
  const day = startOfUtcDay();
  for (let attempt = 0; attempt < TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      const queued = await prisma.$transaction(
        async (transaction) => {
          const budget = await transaction.generationBudget.upsert({
            where: { date: day },
            create: { date: day, reservedNanoUsd: 0n, spentNanoUsd: 0n },
            update: {},
            select: { reservedNanoUsd: true, spentNanoUsd: true },
          });
          if (budget.reservedNanoUsd + budget.spentNanoUsd + generationMaxCostNanoUsd > generationDailyBudgetNanoUsd) {
            throw new ApiError(409, "DAILY_BUDGET_EXCEEDED", "The daily generation budget is exhausted.");
          }
          const activated = await transaction.room.updateMany({
            where: { id: room.id, generationStatus: "failed", scenarioId: null },
            data: { generationStatus: "queued", generationStep: null, generationError: null, phase: "lobby" },
          });
          if (activated.count !== 1) {
            throw new ApiError(409, "GENERATION_NOT_FAILED", "Only failed generations can be retried.");
          }
          await transaction.generationBudget.update({
            where: { date: day },
            data: { reservedNanoUsd: { increment: generationMaxCostNanoUsd } },
          });
          const generationAttempt = await transaction.generationAttempt.create({
            data: { roomId: room.id, status: "queued", model: openAiModel, reservedNanoUsd: generationMaxCostNanoUsd },
            select: { id: true },
          });
          return generationAttempt.id;
        },
        { isolationLevel: "Serializable" },
      );
      generationQueue.enqueue(() => processGeneration({ roomId: room.id, attemptId: queued }));
      return {
        room: createQueuedRoomSnapshot({
          code: room.code,
          theme: room.theme,
          playerCount: room.playerCount,
          phase: "lobby",
        }),
      };
    } catch (error) {
      if (isTransactionConflict(error) && attempt + 1 < TRANSACTION_ATTEMPTS) continue;
      throw error;
    }
  }
  throw new ApiError(500, "INTERNAL_ERROR", "Unable to reserve generation budget.");
};

export const selectFallbackScenario = async (
  code: string,
  input: SelectRoomScenarioInput,
  hostToken: string,
): Promise<RoomSnapshot> => {
  const prisma = getPrisma();
  return prisma.$transaction(async (transaction) => {
    const room = await transaction.room.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        theme: true,
        playerCount: true,
        phase: true,
        generationStatus: true,
        hostTokenHash: true,
        _count: { select: { players: true } },
        generationAttempts: {
          where: { status: "queued" },
          select: { id: true, reservedNanoUsd: true, createdAt: true },
        },
      },
    });
    if (!room) throw new ApiError(404, "NOT_FOUND", "Room not found.");
    assertHost(room.hostTokenHash, hostToken);
    if (room.generationStatus !== "failed" && !(room.generationStatus === "queued" && room._count.players === 0)) {
      throw new ApiError(409, "GENERATION_NOT_FAILED", "Fallback is only available for failed or empty queued rooms.");
    }
    const storedScenario = await transaction.scenario.findUnique({
      where: { id: input.scenarioId },
      select: { data: true },
    });
    if (!storedScenario) throw new ApiError(404, "NOT_FOUND", "Scenario not found.");
    const { ScenarioSchema } = await import("../../../../packages/shared/src");
    const scenario = ScenarioSchema.safeParse(storedScenario.data);
    if (!scenario.success) throw new ApiError(500, "INTERNAL_ERROR", "Stored scenario is invalid.");
    if (scenario.data.playerCount !== room.playerCount) {
      throw new ApiError(409, "SCENARIO_PLAYER_COUNT_MISMATCH", "Scenario player count does not match the room.");
    }
    for (const queuedAttempt of room.generationAttempts) {
      const day = startOfUtcDay(queuedAttempt.createdAt);
      await transaction.generationBudget.update({
        where: { date: day },
        data: { reservedNanoUsd: { decrement: queuedAttempt.reservedNanoUsd } },
      });
      await transaction.generationAttempt.update({
        where: { id: queuedAttempt.id },
        data: { status: "failed", errorCode: "FALLBACK_SELECTED", actualNanoUsd: 0n, completedAt: new Date() },
      });
    }
    const activatedFallback = await transaction.room.updateMany({
      // Do not race an in-process worker that has already changed queued -> generating.
      where: {
        id: room.id,
        generationStatus: room.generationStatus,
        scenarioId: null,
      },
      data: {
        scenarioId: input.scenarioId,
        theme: scenario.data.theme,
        playerCount: scenario.data.playerCount,
        phase: "lobby",
        generationStatus: "ready",
        generationStep: null,
        generationError: null,
      },
    });
    if (activatedFallback.count !== 1) {
      throw new ApiError(409, "GENERATION_NOT_FAILED", "The generation is no longer available for fallback.");
    }
    const updated = await transaction.room.findUniqueOrThrow({
      where: { id: room.id },
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
    const { redactScenarioFor } = await import("./redact");
    return {
      code: updated.code,
      theme: updated.theme,
      playerCount: updated.playerCount as 4 | 5 | 6,
      joinedPlayerCount: room._count.players,
      phase: updated.phase,
      generationStatus: "ready",
      generation: { status: "ready", step: null, errorCode: null },
      scenario: redactScenarioFor(scenario.data, updated.phase, null),
      isHost: true,
    };
  });
};

/** Mark abandoned in-process jobs after a restart without exposing error details. */
export const failInterruptedGenerations = async (): Promise<void> => {
  const prisma = getPrisma();
  const attempts = await prisma.generationAttempt.findMany({
    where: { status: { in: ["queued", "generating"] } },
    select: { id: true, roomId: true, status: true, reservedNanoUsd: true },
  });
  for (const attempt of attempts) {
    await settleAttempt({
      roomId: attempt.roomId,
      attemptId: attempt.id,
      status: "failed",
      errorCode: "SERVER_RESTARTED",
      chargeReservedAmount: attempt.status === "generating",
    });
  }
};

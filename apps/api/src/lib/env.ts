import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const environmentDirectory = dirname(fileURLToPath(import.meta.url));

config({
  path: [
    resolve(environmentDirectory, "../../../../.env.local"),
    resolve(environmentDirectory, "../../../../.env"),
  ],
});

const configuredPort = Number.parseInt(process.env.PORT ?? "3001", 10);

export const port =
  Number.isInteger(configuredPort) && configuredPort > 0
    ? configuredPort
    : 3001;

export const clientOrigin =
  process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const positiveInteger = (value: string | undefined, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const nonnegativeNanoUsd = (value: string | undefined, fallback: bigint): bigint => {
  if (value === undefined || !/^\d+$/.test(value)) {
    return fallback;
  }

  try {
    return BigInt(value);
  } catch {
    return fallback;
  }
};

export const llmEnabled = process.env.LLM_ENABLED === "true";
export const openAiApiKey = process.env.OPENAI_API_KEY;
export const openAiModel = process.env.OPENAI_MODEL ?? "gpt-6.1-sol";
export const generationConcurrency = positiveInteger(
  process.env.GENERATION_CONCURRENCY,
  1,
);
export const generationAccessKey = process.env.GENERATION_ACCESS_KEY;
export const generationMaxCostNanoUsd = nonnegativeNanoUsd(
  process.env.GENERATION_MAX_COST_NANO_USD,
  500_000_000n,
);
export const generationDailyBudgetNanoUsd = nonnegativeNanoUsd(
  process.env.GENERATION_DAILY_BUDGET_NANO_USD,
  3_000_000_000n,
);

const hasInvalidPositiveInteger = (value: string | undefined): boolean =>
  value !== undefined && (!/^\d+$/.test(value) || Number(value) <= 0);
const hasInvalidNanoUsd = (value: string | undefined): boolean =>
  value !== undefined && !/^\d+$/.test(value);

/** A request is rejected when an explicitly supplied safety setting is invalid. */
export const generationConfigurationError =
  hasInvalidPositiveInteger(process.env.GENERATION_CONCURRENCY) ||
  hasInvalidNanoUsd(process.env.GENERATION_MAX_COST_NANO_USD) ||
  hasInvalidNanoUsd(process.env.GENERATION_DAILY_BUDGET_NANO_USD) ||
  generationMaxCostNanoUsd === 0n ||
  generationDailyBudgetNanoUsd === 0n ||
  generationMaxCostNanoUsd > generationDailyBudgetNanoUsd
    ? "Generation cost and concurrency settings are invalid."
    : undefined;

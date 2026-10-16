import type { Scenario } from "../../../../packages/shared/src";

import { charactersPrompt } from "./prompts/characters";
import { cluesPrompt } from "./prompts/clues";
import { scriptPrompt } from "./prompts/script";
import { timelinePrompt } from "./prompts/timeline";
import { truthPrompt } from "./prompts/truth";
import { verificationPrompt } from "./prompts/verification";
import {
  type LlmProvider,
  LlmProviderError,
  type LlmUsage,
  type ReasoningEffort,
} from "./openaiProvider";
import { CharactersStepSchema, type CharactersStep } from "./steps/characters";
import { CluesStepSchema, type CluesStep } from "./steps/clues";
import { ScriptStepSchema, type ScriptStep } from "./steps/scripts";
import { TimelineStepSchema, type TimelineStep } from "./steps/timeline";
import { TruthStepSchema, type TruthStep } from "./steps/truth";
import { VerificationStepSchema } from "./steps/verification";
import {
  GenerationValidationError,
  validateGeneratedScenario,
  validateTimeline,
} from "./validate";

export type PipelineStep =
  | "truth"
  | "characters"
  | "timeline"
  | "scripts"
  | "clues"
  | "verification";

export type PipelineOptions = {
  theme: string;
  playerCount: 4 | 5 | 6;
  scenarioId: string;
  onStep: (step: PipelineStep) => Promise<void> | void;
  onUsage: (usage: LlmUsage) => Promise<void> | void;
  /** Shared queue limiter; it prevents parallel script calls exceeding the configured cap. */
  runProvider?: <T>(operation: () => Promise<T>) => Promise<T>;
};

export class PipelineGenerationError extends Error {
  constructor(
    public readonly code: string,
    public readonly usageIsKnown: boolean,
  ) {
    super(code);
    this.name = "PipelineGenerationError";
  }
}

const suspectIdsFor = (playerCount: number): string[] =>
  Array.from({ length: playerCount }, (_, index) => `suspect-${index + 1}`);

const equalIdSets = (actual: string[], expected: string[]): boolean =>
  actual.length === expected.length &&
  actual.slice().sort().every((id, index) => id === expected.slice().sort()[index]);

const buildTimelineCandidate = (
  truth: TruthStep,
  characters: CharactersStep,
  timeline: TimelineStep,
  scenarioId: string,
  playerCount: 4 | 5 | 6,
): Scenario => ({
  id: scenarioId,
  title: truth.title,
  theme: "timeline-validation",
  playerCount,
  intro: truth.intro,
  victim: truth.victim,
  characters: characters.characters.map((character) => ({
    id: character.id,
    name: character.name,
    occupation: character.occupation,
    publicProfile: character.publicProfile,
    privateScript: character.id === truth.culpritId ? "나는 범인이다." : "개인 대본",
    secret: character.secretFact,
    objectives: ["진실을 밝혀라"],
    isCulprit: character.id === truth.culpritId,
  })),
  clues: [],
  truth: {
    culpritId: truth.culpritId,
    motive: truth.motive,
    method: truth.method,
    timeline: timeline.timeline,
  },
});

export const generateScenario = async (
  provider: LlmProvider,
  options: PipelineOptions,
): Promise<Scenario> => {
  const suspectIds = suspectIdsFor(options.playerCount);
  const runProvider = options.runProvider ?? (async <T>(operation: () => Promise<T>) => operation());
  let usageWasReceived = false;

  const call = async <T>(input: {
    step: PipelineStep;
    prompt: string;
    schema: Parameters<LlmProvider["generateStructured"]>[0]["schema"];
    maxOutputTokens: number;
    reasoningEffort: ReasoningEffort;
  }): Promise<T> => {
    try {
      const generated = await runProvider(() =>
        provider.generateStructured({
          ...input,
          schema: input.schema,
        }),
      );
      usageWasReceived = true;
      await options.onUsage(generated.usage);
      return generated.data as T;
    } catch (error) {
      if (error instanceof LlmProviderError) {
        throw new PipelineGenerationError(error.code, false);
      }
      throw error;
    }
  };

  try {
    await options.onStep("truth");
    const truth = await call<TruthStep>({
      step: "truth",
      prompt: truthPrompt({ theme: options.theme, suspectIds }),
      schema: TruthStepSchema,
      maxOutputTokens: 1_200,
      reasoningEffort: "medium",
    });
    if (!suspectIds.includes(truth.culpritId)) {
      throw new GenerationValidationError("CULPRIT_ID_INVALID", "Truth selected an unknown culprit ID.");
    }

    await options.onStep("characters");
    const characters = await call<CharactersStep>({
      step: "characters",
      prompt: charactersPrompt({
        theme: options.theme,
        victimName: truth.victim.name,
        suspectIds,
      }),
      schema: CharactersStepSchema,
      maxOutputTokens: 1_500,
      reasoningEffort: "low",
    });
    if (!equalIdSets(characters.characters.map((character) => character.id), suspectIds)) {
      throw new GenerationValidationError("CHARACTER_IDS_INVALID", "Characters did not use the supplied suspect IDs exactly once.");
    }

    let timeline: TimelineStep | undefined;
    let timelineError: unknown;
    await options.onStep("timeline");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        timeline = await call<TimelineStep>({
          step: "timeline",
          prompt: timelinePrompt({
            crimeTime: truth.crimeTime,
            crimeLocation: truth.crimeLocation,
            culpritId: truth.culpritId,
            characters: characters.characters.map(({ id, name }) => ({ id, name })),
          }),
          schema: TimelineStepSchema,
          maxOutputTokens: 2_200,
          reasoningEffort: "medium",
        });
        validateTimeline(
          buildTimelineCandidate(truth, characters, timeline, options.scenarioId, options.playerCount),
          { time: truth.crimeTime, location: truth.crimeLocation },
        );
        break;
      } catch (error) {
        if (!(error instanceof GenerationValidationError)) {
          throw error;
        }
        timelineError = error;
        timeline = undefined;
      }
    }
    if (!timeline) {
      if (timelineError instanceof PipelineGenerationError) {
        throw timelineError;
      }
      throw new GenerationValidationError("TIMELINE_INVALID", "Timeline remained invalid after three attempts.");
    }

    await options.onStep("scripts");
    const scripts = await Promise.all(
      characters.characters.map(async (character) => ({
        id: character.id,
        ...(await call<ScriptStep>({
          step: "scripts",
          prompt: scriptPrompt({
            character,
            isCulprit: character.id === truth.culpritId,
            victimName: truth.victim.name,
          }),
          schema: ScriptStepSchema,
          maxOutputTokens: 1_400,
          reasoningEffort: "low",
        })),
      })),
    );

    await options.onStep("clues");
    const clueData = await call<CluesStep>({
      step: "clues",
      prompt: cluesPrompt({
        theme: options.theme,
        characterIds: suspectIds,
        culpritId: truth.culpritId,
      }),
      schema: CluesStepSchema,
      maxOutputTokens: 1_600,
      reasoningEffort: "low",
    });

    const scenario = validateGeneratedScenario({
      id: options.scenarioId,
      title: truth.title,
      theme: options.theme,
      playerCount: options.playerCount,
      intro: truth.intro,
      victim: truth.victim,
      characters: characters.characters.map((character) => {
        const script = scripts.find((candidate) => candidate.id === character.id);
        if (!script) {
          throw new GenerationValidationError("SCRIPT_MISSING", "A generated character script is missing.");
        }
        return {
          id: character.id,
          name: character.name,
          occupation: character.occupation,
          publicProfile: character.publicProfile,
          privateScript: script.privateScript,
          secret: script.secret,
          objectives: script.objectives,
          isCulprit: character.id === truth.culpritId,
        };
      }),
      clues: clueData.clues,
      truth: {
        culpritId: truth.culpritId,
        motive: truth.motive,
        method: truth.method,
        timeline: timeline.timeline,
      },
    });
    validateTimeline(scenario, { time: truth.crimeTime, location: truth.crimeLocation });

    await options.onStep("verification");
    const verification = await call<{ culpritId: string }>({
      step: "verification",
      prompt: verificationPrompt({
        scripts: scripts.map(({ id, privateScript, secret, objectives }) => ({
          id,
          privateScript,
          secret,
          objectives,
        })),
        clues: scenario.clues.map(({ title, content }) => ({ title, content })),
      }),
      schema: VerificationStepSchema,
      maxOutputTokens: 300,
      reasoningEffort: "medium",
    });
    if (verification.culpritId !== truth.culpritId) {
      throw new GenerationValidationError("VERIFICATION_FAILED", "Verification inferred a different culprit.");
    }

    return scenario;
  } catch (error) {
    if (error instanceof PipelineGenerationError) {
      throw error;
    }
    if (error instanceof GenerationValidationError) {
      throw new PipelineGenerationError(error.code, true);
    }
    throw new PipelineGenerationError("GENERATION_FAILED", usageWasReceived);
  }
};

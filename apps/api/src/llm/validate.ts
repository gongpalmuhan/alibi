import {
  ScenarioSchema,
  validateScenarioTimeline,
  type Scenario,
} from "../../../../packages/shared/src";

export class GenerationValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "GenerationValidationError";
  }
}

const fail = (code: string, message: string): never => {
  throw new GenerationValidationError(code, message);
};

/**
 * Domain rules intentionally live outside Zod so they can be tested and reused
 * by the pipeline after every model response has been structurally parsed.
 */
export const validateGeneratedScenario = (candidate: unknown): Scenario => {
  const parsed = ScenarioSchema.safeParse(candidate);
  if (!parsed.success) {
    return fail("SCENARIO_SCHEMA_INVALID", "Generated scenario does not match ScenarioSchema.");
  }

  const scenario = parsed.data;
  const expectedIds = Array.from(
    { length: scenario.playerCount },
    (_, index) => `suspect-${index + 1}`,
  );
  const actualIds = scenario.characters.map((character) => character.id).sort();

  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    return fail("CHARACTER_IDS_INVALID", "Generated characters must use the supplied suspect IDs.");
  }

  if (scenario.characters.some((character) => character.id === "victim")) {
    return fail("VICTIM_IS_PLAYER", "The victim must be an NPC, never a player character.");
  }

  const culprit = scenario.characters.find((character) => character.isCulprit);
  if (!culprit) {
    return fail("CULPRIT_MISSING", "The scenario has no culprit.");
  }

  if (!/(?:\bculprit\b|범인)/iu.test(culprit.privateScript)) {
    return fail("CULPRIT_SCRIPT_INCOMPLETE", "The culprit script must explicitly identify the player as the culprit.");
  }

  if (
    scenario.clues.some(
      (clue) =>
        clue.pointsTo.length === 1 && clue.pointsTo[0] === scenario.truth.culpritId,
    )
  ) {
    return fail("CLUE_TOO_CONCLUSIVE", "No individual clue may identify the culprit by itself.");
  }

  return scenario;
};

export const validateTimeline = (
  scenario: Scenario,
  crimeScene: { time: string; location: string },
): void => {
  const issues = validateScenarioTimeline(scenario, crimeScene);
  if (issues.length > 0) {
    fail("TIMELINE_INVALID", issues[0].message);
  }
};

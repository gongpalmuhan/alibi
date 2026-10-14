import type { Scenario } from "./types";

export type CrimeScene = {
  time: string;
  location: string;
};

export type TimelineValidationIssue = {
  message: string;
  path: Array<string | number>;
};

/**
 * Validates relationships that span several timeline entries. This stays
 * separate from ScenarioSchema so a caller can provide the scenario's known
 * crime scene without expanding the persisted shared scenario contract.
 */
export const validateScenarioTimeline = (
  scenario: Scenario,
  crimeScene: CrimeScene,
): TimelineValidationIssue[] => {
  const issues: TimelineValidationIssue[] = [];
  const entriesByCharacterAndTime = new Map<string, typeof scenario.truth.timeline>();

  scenario.truth.timeline.forEach((entry, entryIndex) => {
    const key = `${entry.characterId}\u0000${entry.time}`;
    const entries = entriesByCharacterAndTime.get(key) ?? [];
    entries.push(entry);
    entriesByCharacterAndTime.set(key, entries);

    entry.witnessedBy.forEach((witnessId, witnessIndex) => {
      const reciprocalEntry = scenario.truth.timeline.find(
        (candidate) =>
          candidate.characterId === witnessId &&
          candidate.time === entry.time &&
          candidate.location === entry.location &&
          candidate.witnessedBy.includes(entry.characterId),
      );

      if (!reciprocalEntry) {
        issues.push({
          message:
            "A witnessed timeline entry must have a reciprocal entry at the same time and location.",
          path: ["truth", "timeline", entryIndex, "witnessedBy", witnessIndex],
        });
      }
    });
  });

  entriesByCharacterAndTime.forEach((entries) => {
    const locations = new Set(entries.map((entry) => entry.location));

    if (locations.size > 1) {
      entries.forEach((entry) => {
        const entryIndex = scenario.truth.timeline.indexOf(entry);
        issues.push({
          message: "A character cannot be in more than one location at the same time.",
          path: ["truth", "timeline", entryIndex, "location"],
        });
      });
    }
  });

  const culpritAtCrimeScene = scenario.truth.timeline.some(
    (entry) =>
      entry.characterId === scenario.truth.culpritId &&
      entry.time === crimeScene.time &&
      entry.location === crimeScene.location,
  );

  if (!culpritAtCrimeScene) {
    issues.push({
      message: "The culprit must be present at the crime scene at the crime time.",
      path: ["truth", "culpritId"],
    });
  }

  return issues;
};

export const assertValidScenarioTimeline = (
  scenario: Scenario,
  crimeScene: CrimeScene,
): void => {
  const issues = validateScenarioTimeline(scenario, crimeScene);

  if (issues.length > 0) {
    throw new Error(
      `Invalid timeline for ${scenario.id}: ${issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }
};

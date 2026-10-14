import { z } from "zod";

const NonEmptyStringSchema = z.string().trim().min(1);

export const PhaseSchema = z.enum([
  "lobby",
  "reading",
  "investigation",
  "discussion",
  "voting",
  "reveal",
]);

export const PlayerCountSchema = z.union([z.literal(4), z.literal(5), z.literal(6)]);

export const VictimSchema = z.object({
  name: NonEmptyStringSchema,
  occupation: NonEmptyStringSchema,
  description: NonEmptyStringSchema,
});

export const CharacterSchema = z.object({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  occupation: NonEmptyStringSchema,
  publicProfile: NonEmptyStringSchema,
  privateScript: NonEmptyStringSchema,
  secret: NonEmptyStringSchema,
  objectives: z.array(NonEmptyStringSchema).min(1),
  isCulprit: z.boolean(),
});

export const ClueSchema = z.object({
  id: NonEmptyStringSchema,
  title: NonEmptyStringSchema,
  content: NonEmptyStringSchema,
  revealPhase: PhaseSchema,
  pointsTo: z.array(NonEmptyStringSchema),
});

export const TimelineEntrySchema = z.object({
  time: NonEmptyStringSchema,
  characterId: NonEmptyStringSchema,
  location: NonEmptyStringSchema,
  action: NonEmptyStringSchema,
  witnessedBy: z.array(NonEmptyStringSchema),
});

export const TruthSchema = z.object({
  culpritId: NonEmptyStringSchema,
  motive: NonEmptyStringSchema,
  method: NonEmptyStringSchema,
  timeline: z.array(TimelineEntrySchema),
});

export const ScenarioSchema = z
  .object({
    id: NonEmptyStringSchema,
    title: NonEmptyStringSchema,
    theme: NonEmptyStringSchema,
    playerCount: PlayerCountSchema,
    intro: NonEmptyStringSchema,
    victim: VictimSchema,
    characters: z.array(CharacterSchema),
    clues: z.array(ClueSchema),
    truth: TruthSchema,
  })
  .superRefine((scenario, context) => {
    if (scenario.characters.length !== scenario.playerCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Character count must match playerCount.",
        path: ["characters"],
      });
    }

    const characterIds = new Set(
      scenario.characters.map((character) => character.id),
    );
    const culprits = scenario.characters.filter(
      (character) => character.isCulprit,
    );

    if (culprits.length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exactly one character must be the culprit.",
        path: ["characters"],
      });
    }

    const truthCulprit = scenario.characters.find(
      (character) => character.id === scenario.truth.culpritId,
    );

    if (!truthCulprit || !truthCulprit.isCulprit) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "truth.culpritId must reference the character marked as the culprit.",
        path: ["truth", "culpritId"],
      });
    }

    scenario.clues.forEach((clue, clueIndex) => {
      clue.pointsTo.forEach((characterId, pointIndex) => {
        if (!characterIds.has(characterId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Clue references an unknown character.",
            path: ["clues", clueIndex, "pointsTo", pointIndex],
          });
        }
      });
    });

    scenario.truth.timeline.forEach((entry, entryIndex) => {
      if (!characterIds.has(entry.characterId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Timeline entry references an unknown character.",
          path: ["truth", "timeline", entryIndex, "characterId"],
        });
      }

      entry.witnessedBy.forEach((characterId, witnessIndex) => {
        if (!characterIds.has(characterId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Timeline witness references an unknown character.",
            path: ["truth", "timeline", entryIndex, "witnessedBy", witnessIndex],
          });
        }
      });
    });
  });

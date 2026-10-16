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

export const ScenarioSourceSchema = z.enum(["PRESET", "GENERATED"]);

export const GenerationStatusSchema = z.enum([
  "queued",
  "generating",
  "ready",
  "failed",
]);

export const GenerationStepSchema = z
  .enum([
    "truth",
    "characters",
    "timeline",
    "scripts",
    "clues",
    "verification",
  ])
  .nullable();

export const RoomCodeSchema = z
  .string()
  .regex(/^[A-Z0-9]{6}$/, "Room code must be six uppercase letters or digits.");

export const NicknameSchema = z.string().trim().min(1).max(40);

export const CreateRoomInputSchema = z
  .object({
    theme: NonEmptyStringSchema,
    playerCount: PlayerCountSchema,
  })
  .strict();

/** Creates a lobby from a previously validated, stored scenario. */
export const CreateRoomFromScenarioInputSchema = z
  .object({
    scenarioId: NonEmptyStringSchema,
  })
  .strict();

export const GenerateRoomInputSchema = z
  .object({
    theme: NonEmptyStringSchema.max(120),
    playerCount: PlayerCountSchema,
  })
  .strict();

export const SelectRoomScenarioInputSchema = z
  .object({
    scenarioId: NonEmptyStringSchema,
  })
  .strict();

export const JoinRoomInputSchema = z
  .object({
    nickname: NicknameSchema,
  })
  .strict();

export const ChangePhaseInputSchema = z
  .object({
    phase: PhaseSchema,
  })
  .strict();

export const CastVoteInputSchema = z
  .object({
    targetCharacterId: NonEmptyStringSchema,
  })
  .strict();

export const VictimSchema = z.object({
  name: NonEmptyStringSchema,
  description: NonEmptyStringSchema,
  deathDescription: NonEmptyStringSchema,
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

export const RedactedCharacterSchema = z.object({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  occupation: NonEmptyStringSchema,
  publicProfile: NonEmptyStringSchema,
  privateScript: NonEmptyStringSchema.optional(),
  secret: NonEmptyStringSchema.optional(),
  objectives: z.array(NonEmptyStringSchema).min(1).optional(),
});

export const RedactedClueSchema = z.object({
  id: NonEmptyStringSchema,
  title: NonEmptyStringSchema,
  content: NonEmptyStringSchema,
  revealPhase: PhaseSchema,
});

export const RedactedScenarioSchema = z.object({
  id: NonEmptyStringSchema,
  title: NonEmptyStringSchema,
  theme: NonEmptyStringSchema,
  playerCount: PlayerCountSchema,
  intro: NonEmptyStringSchema,
  victim: VictimSchema,
  characters: z.array(RedactedCharacterSchema),
  clues: z.array(RedactedClueSchema),
  truth: TruthSchema.optional(),
});

export const ScenarioLibraryItemSchema = z.object({
  id: NonEmptyStringSchema,
  title: NonEmptyStringSchema,
  theme: NonEmptyStringSchema,
  playerCount: PlayerCountSchema,
  intro: NonEmptyStringSchema,
  source: ScenarioSourceSchema,
  createdAt: z.string().datetime(),
});

export const RoomGenerationSchema = z.object({
  status: GenerationStatusSchema,
  step: GenerationStepSchema,
  errorCode: z.string().nullable(),
});

export const RoomSnapshotPlayerSchema = z.object({
  id: NonEmptyStringSchema,
  nickname: NicknameSchema,
  characterId: NonEmptyStringSchema.nullable(),
  hasVoted: z.boolean(),
});

export const VoteProgressSchema = z.object({
  submittedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
});

export const VoteResultSchema = z.object({
  characterId: NonEmptyStringSchema,
  voteCount: z.number().int().nonnegative(),
});

export const RoomSnapshotSchema = z.object({
  code: RoomCodeSchema,
  theme: NonEmptyStringSchema,
  playerCount: PlayerCountSchema,
  joinedPlayerCount: z.number().int().nonnegative(),
  phase: PhaseSchema,
  // Retained for existing clients. New clients should use `generation`.
  generationStatus: GenerationStatusSchema,
  generation: RoomGenerationSchema,
  scenario: RedactedScenarioSchema.optional(),
  me: RoomSnapshotPlayerSchema.optional(),
  isHost: z.literal(true).optional(),
  voteProgress: VoteProgressSchema.optional(),
  voteResults: z.array(VoteResultSchema).optional(),
});

export const CastVoteResponseSchema = z.object({
  targetCharacterId: NonEmptyStringSchema,
  hasVoted: z.literal(true),
});

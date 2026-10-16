import type { z } from "zod";

import type {
  CastVoteInputSchema,
  CastVoteResponseSchema,
  CharacterSchema,
  ChangePhaseInputSchema,
  ClueSchema,
  CreateRoomFromScenarioInputSchema,
  CreateRoomInputSchema,
  GenerateRoomInputSchema,
  GenerationStatusSchema,
  GenerationStepSchema,
  JoinRoomInputSchema,
  NicknameSchema,
  PhaseSchema,
  PlayerCountSchema,
  RoomCodeSchema,
  RoomSnapshotPlayerSchema,
  RoomSnapshotSchema,
  RedactedCharacterSchema,
  RedactedClueSchema,
  RedactedScenarioSchema,
  RoomGenerationSchema,
  ScenarioSchema,
  ScenarioLibraryItemSchema,
  ScenarioSourceSchema,
  SelectRoomScenarioInputSchema,
  TimelineEntrySchema,
  TruthSchema,
  VoteProgressSchema,
  VoteResultSchema,
  VictimSchema,
} from "./schema";

export type Phase = z.infer<typeof PhaseSchema>;
export type PlayerCount = z.infer<typeof PlayerCountSchema>;
export type RoomCode = z.infer<typeof RoomCodeSchema>;
export type Nickname = z.infer<typeof NicknameSchema>;
export type CreateRoomInput = z.infer<typeof CreateRoomInputSchema>;
export type CreateRoomFromScenarioInput = z.infer<
  typeof CreateRoomFromScenarioInputSchema
>;
export type GenerateRoomInput = z.infer<typeof GenerateRoomInputSchema>;
export type SelectRoomScenarioInput = z.infer<
  typeof SelectRoomScenarioInputSchema
>;
export type JoinRoomInput = z.infer<typeof JoinRoomInputSchema>;
export type ChangePhaseInput = z.infer<typeof ChangePhaseInputSchema>;
export type CastVoteInput = z.infer<typeof CastVoteInputSchema>;
export type Victim = z.infer<typeof VictimSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type Clue = z.infer<typeof ClueSchema>;
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;
export type Truth = z.infer<typeof TruthSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type ScenarioSource = z.infer<typeof ScenarioSourceSchema>;
export type ScenarioLibraryItem = z.infer<typeof ScenarioLibraryItemSchema>;
export type RedactedCharacter = z.infer<typeof RedactedCharacterSchema>;
export type RedactedClue = z.infer<typeof RedactedClueSchema>;
export type RedactedScenario = z.infer<typeof RedactedScenarioSchema>;
export type RoomSnapshotPlayer = z.infer<typeof RoomSnapshotPlayerSchema>;
export type VoteProgress = z.infer<typeof VoteProgressSchema>;
export type VoteResult = z.infer<typeof VoteResultSchema>;
export type RoomSnapshot = z.infer<typeof RoomSnapshotSchema>;
export type GenerationStatus = z.infer<typeof GenerationStatusSchema>;
export type GenerationStep = z.infer<typeof GenerationStepSchema>;
export type RoomGeneration = z.infer<typeof RoomGenerationSchema>;
export type CastVoteResponse = z.infer<typeof CastVoteResponseSchema>;

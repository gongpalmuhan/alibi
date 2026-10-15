import type { z } from "zod";

import type {
  CharacterSchema,
  ClueSchema,
  CreateRoomInputSchema,
  JoinRoomInputSchema,
  NicknameSchema,
  PhaseSchema,
  PlayerCountSchema,
  RoomCodeSchema,
  ScenarioSchema,
  TimelineEntrySchema,
  TruthSchema,
  VictimSchema,
} from "./schema";

export type Phase = z.infer<typeof PhaseSchema>;
export type PlayerCount = z.infer<typeof PlayerCountSchema>;
export type RoomCode = z.infer<typeof RoomCodeSchema>;
export type Nickname = z.infer<typeof NicknameSchema>;
export type CreateRoomInput = z.infer<typeof CreateRoomInputSchema>;
export type JoinRoomInput = z.infer<typeof JoinRoomInputSchema>;
export type Victim = z.infer<typeof VictimSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type Clue = z.infer<typeof ClueSchema>;
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;
export type Truth = z.infer<typeof TruthSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;

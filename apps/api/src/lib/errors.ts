export type ApiErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "ROOM_FULL"
  | "ALREADY_ASSIGNED"
  | "ASSIGNMENT_INCOMPLETE"
  | "INVALID_PHASE_TRANSITION"
  | "INVALID_VOTE_TARGET"
  | "VOTING_INCOMPLETE"
  | "SCENARIO_UNAVAILABLE"
  | "SCENARIO_NOT_READY"
  | "LLM_DISABLED"
  | "GENERATION_KEY_INVALID"
  | "DAILY_BUDGET_EXCEEDED"
  | "GENERATION_NOT_FAILED"
  | "RETRY_LIMIT_EXCEEDED"
  | "SCENARIO_PLAYER_COUNT_MISMATCH"
  | "LLM_CONFIGURATION_INVALID"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

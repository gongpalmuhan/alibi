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

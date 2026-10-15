import type { ErrorRequestHandler, RequestHandler, Response } from "express";

import { ApiError } from "../lib/errors";

type BodyParseError = Error & {
  status?: number;
  type?: string;
};

const sendError = (
  response: Response,
  status: number,
  code: string,
  message: string,
): void => {
  response.status(status).json({ error: { code, message } });
};

export const notFoundHandler: RequestHandler = (_request, response) => {
  sendError(response, 404, "NOT_FOUND", "Route not found.");
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  if (error instanceof ApiError) {
    sendError(response, error.status, error.code, error.message);
    return;
  }

  const bodyParseError = error as BodyParseError;
  if (bodyParseError.type === "entity.parse.failed") {
    sendError(response, 400, "INVALID_INPUT", "Request body must be valid JSON.");
    return;
  }

  console.error("Unhandled API error", error);
  sendError(response, 500, "INTERNAL_ERROR", "Internal server error.");
};

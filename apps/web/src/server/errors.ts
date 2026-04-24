import { ZodError } from "zod";
import { fail } from "./response";

export class ApiRouteError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiRouteError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function validationError(message: string, details?: unknown) {
  return new ApiRouteError(400, "validation_error", message, details);
}

export function unauthorizedError(message = "Authentication required") {
  return new ApiRouteError(401, "unauthorized", message);
}

export function forbiddenError(message = "Forbidden") {
  return new ApiRouteError(403, "forbidden", message);
}

export function notFoundError(message = "Not found") {
  return new ApiRouteError(404, "not_found", message);
}

export function conflictError(message = "Conflict") {
  return new ApiRouteError(409, "conflict", message);
}

export function rateLimitedError(message = "Rate limited") {
  return new ApiRouteError(429, "rate_limited", message);
}

export function internalError(message = "Internal error") {
  return new ApiRouteError(500, "internal_error", message);
}

export function toErrorResponse(error: unknown) {
  if (error instanceof ApiRouteError) {
    return fail(error.code, error.message, error.status, error.details);
  }
  if (error instanceof ZodError) {
    return fail("validation_error", "Validation failed", 400, error.flatten());
  }
  if (error instanceof SyntaxError) {
    return fail("validation_error", "Invalid JSON body", 400);
  }
  if (error instanceof Error) {
    return fail("internal_error", error.message || "Unexpected error", 500);
  }
  return fail("internal_error", "Unexpected error", 500);
}

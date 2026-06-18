import { ZodError } from "zod";
import { fail } from "./response";

export class ApiRouteError extends Error {
  code: string;
  status: number;
  details?: unknown;
  headers?: HeadersInit;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    headers?: HeadersInit,
  ) {
    super(message);
    this.name = "ApiRouteError";
    this.status = status;
    this.code = code;
    this.details = details;
    if (headers !== undefined) {
      this.headers = headers;
    }
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

export function payloadTooLargeError(message = "Payload too large", details?: unknown) {
  return new ApiRouteError(413, "payload_too_large", message, details);
}

export function rateLimitedError(message = "Rate limited", retryAfterSeconds?: number) {
  return new ApiRouteError(
    429,
    "rate_limited",
    message,
    retryAfterSeconds ? { retryAfterSeconds } : undefined,
    retryAfterSeconds ? { "retry-after": String(retryAfterSeconds) } : undefined,
  );
}

export function serviceUnavailableError(message = "Service unavailable", details?: unknown) {
  return new ApiRouteError(503, "service_unavailable", message, details);
}

export function featureUnavailableError(message = "Feature unavailable", details?: unknown) {
  return new ApiRouteError(503, "feature_unavailable", message, details);
}

export function internalError(message = "Internal error") {
  return new ApiRouteError(500, "internal_error", message);
}

export function toErrorResponse(error: unknown) {
  if (error instanceof ApiRouteError) {
    const response = fail(error.code, error.message, error.status, error.details);
    if (error.headers) {
      for (const [key, value] of new Headers(error.headers).entries()) {
        response.headers.set(key, value);
      }
    }
    return response;
  }
  if (error instanceof ZodError) {
    return fail("validation_error", "Validation failed", 400, error.flatten());
  }
  if (error instanceof SyntaxError) {
    return fail("validation_error", "Invalid JSON body", 400);
  }
  if (
    error instanceof Error &&
    "status" in error &&
    "code" in error &&
    typeof (error as { status?: unknown }).status === "number" &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const serviceError = error as Error & { status: number; code: string; details?: unknown };
    return fail(serviceError.code, serviceError.message, serviceError.status, serviceError.details);
  }
  if (error instanceof Error) {
    return fail(
      "internal_error",
      process.env.NODE_ENV === "development"
        ? error.message || "Unexpected error"
        : "Unexpected error",
      500,
    );
  }
  return fail("internal_error", "Unexpected error", 500);
}

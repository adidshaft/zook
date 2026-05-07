import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getErrorReporter } from "./error-reporter";
import { captureRouteError } from "./sentry";

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

describe("Sentry error reporter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ERROR_REPORTER = "sentry";
    process.env.SENTRY_DSN = "https://public@example.ingest.sentry.io/1";
    process.env.SENTRY_ENVIRONMENT = "test";
  });

  it("initializes the real SDK and captures exceptions with redacted context", () => {
    const reporter = getErrorReporter();

    reporter.captureException(new Error("boom"), {
      requestId: "req_123",
      userId: "usr_1",
      orgId: "org_1",
      metadata: {
        email: "owner@example.com",
        phone: "+919999999999",
        safe: "visible",
      },
    });

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://public@example.ingest.sentry.io/1",
        environment: "test",
      }),
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        extra: expect.objectContaining({
          metadata: expect.objectContaining({
            email: "[REDACTED]",
            phone: "[REDACTED]",
            safe: "visible",
          }),
        }),
      }),
    );
  });

  it("captures route errors through the same SDK path", () => {
    captureRouteError(new Error("route failed"), {
      method: "PATCH",
      path: "/api/members",
      status: 500,
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          method: "PATCH",
          path: "/api/members",
          status: "500",
        }),
      }),
    );
  });
});

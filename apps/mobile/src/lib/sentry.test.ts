import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/react-native", () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        sentryDsn: "https://public@example.ingest.sentry.io/2",
        releaseProfile: "test",
      },
    },
  },
}));

describe("mobile Sentry", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  });

  it("initializes the React Native SDK with redaction", async () => {
    const Sentry = await import("@sentry/react-native");
    const { captureMobileException } = await import("./sentry");

    captureMobileException(new Error("mobile boom"), {
      email: "member@example.com",
      safe: "visible",
    });

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://public@example.ingest.sentry.io/2",
        environment: "test",
      }),
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        extra: expect.objectContaining({
          email: "[REDACTED]",
          safe: "visible",
        }),
      }),
    );
  });
});

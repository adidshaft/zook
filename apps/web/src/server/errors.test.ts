import { describe, expect, it } from "vitest";
import { featureUnavailableError, toErrorResponse } from "./errors";

describe("feature unavailable errors", () => {
  it("returns a dedicated feature_unavailable 503 contract", async () => {
    const response = toErrorResponse(
      featureUnavailableError("AI features are unavailable in this environment.", {
        feature: "ai",
        flag: "AI_FEATURES_ENABLED",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "feature_unavailable",
        message: "AI features are unavailable in this environment.",
        details: {
          feature: "ai",
          flag: "AI_FEATURES_ENABLED",
        },
      },
    });
  });
});

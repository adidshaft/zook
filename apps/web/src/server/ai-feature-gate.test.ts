import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./api-router/ai.ts", import.meta.url), "utf8");

describe("AI feature gate", () => {
  it("uses the feature_unavailable contract for the launch gate", () => {
    const helperStart = routerSource.indexOf("function assertAiLaunchEnabled()");
    expect(helperStart).toBeGreaterThanOrEqual(0);
    const helperBody = routerSource.slice(helperStart, helperStart + 400);
    expect(helperBody).toContain("featureUnavailableError(");
    expect(helperBody).toContain("AI features are unavailable in this environment.");
    expect(helperBody).toContain('flag: "AI_FEATURES_ENABLED"');
  });
});

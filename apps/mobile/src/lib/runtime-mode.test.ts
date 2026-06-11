import { beforeEach, describe, expect, it, vi } from "vitest";

const expoConstants = vi.hoisted(() => ({
  expoConfig: {
    extra: {} as Record<string, unknown>,
  },
  manifest: undefined as { extra?: Record<string, unknown> } | undefined,
  manifest2: undefined as
    | { extra?: { expoClient?: { extra?: Record<string, unknown> } } }
    | undefined,
}));

vi.mock("expo-constants", () => ({
  default: expoConstants,
}));

describe("mobile runtime mode", () => {
  beforeEach(() => {
    vi.resetModules();
    expoConstants.expoConfig.extra = {};
    expoConstants.manifest = undefined;
    expoConstants.manifest2 = undefined;
    delete process.env.EXPO_PUBLIC_API_MODE;
    delete process.env.MOBILE_API_MODE;
    delete process.env.API_MODE;
    delete process.env.EXPO_PUBLIC_DEMO;
    delete process.env.EXPO_PUBLIC_OFFLINE_DEMO;
    delete process.env.MOBILE_OFFLINE_DEMO;
  });

  it("uses Expo config API mode when Metro injects app config extras", async () => {
    expoConstants.expoConfig.extra = { apiMode: "offline-demo" };
    process.env.EXPO_PUBLIC_API_MODE = "backend";

    const { getMobileApiMode, isOfflineDemoMode } = await import("./runtime-mode");

    expect(getMobileApiMode()).toBe("offline-demo");
    expect(isOfflineDemoMode()).toBe(true);
  });

  it("uses Expo config offlineDemo boolean as a fallback", async () => {
    expoConstants.expoConfig.extra = { offlineDemo: true };

    const { getMobileApiMode } = await import("./runtime-mode");

    expect(getMobileApiMode()).toBe("offline-demo");
  });

  it("uses Expo Go manifest extras when expoConfig is unavailable", async () => {
    expoConstants.manifest2 = {
      extra: {
        expoClient: {
          extra: { apiMode: "offline-demo" },
        },
      },
    };

    const { getMobileApiMode } = await import("./runtime-mode");

    expect(getMobileApiMode()).toBe("offline-demo");
  });
});

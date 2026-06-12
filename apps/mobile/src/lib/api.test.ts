import { beforeEach, describe, expect, it, vi } from "vitest";

const runtimeMode = vi.hoisted(() => ({
  offlineDemo: false,
  configError: undefined as string | undefined,
}));

const demoRequest = vi.hoisted(() => vi.fn(async () => ({ source: "demo" })));

vi.mock("./runtime-mode", () => ({
  getMobileApiMode: () => (runtimeMode.offlineDemo ? "offline-demo" : "backend"),
  getMobileAppEnv: () => "local",
  getMobileRuntimeConfigError: () => runtimeMode.configError,
  isOfflineDemoMode: () => runtimeMode.offlineDemo,
}));

vi.mock("./demo-api", () => ({
  createDemoTransport: () => ({
    request: demoRequest,
  }),
}));

vi.mock("expo-constants", () => ({
  default: {
    easConfig: undefined,
    expoConfig: { extra: {} },
  },
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

describe("mobile API transport", () => {
  beforeEach(() => {
    runtimeMode.offlineDemo = false;
    runtimeMode.configError = undefined;
    demoRequest.mockClear();
  });

  it("selects the demo transport at request time", async () => {
    const { mobileApiFetch } = await import("./api");

    runtimeMode.offlineDemo = true;

    await expect(mobileApiFetch("/auth/request-otp")).resolves.toEqual({ source: "demo" });
    expect(demoRequest).toHaveBeenCalledWith("/auth/request-otp", {});
  });
});

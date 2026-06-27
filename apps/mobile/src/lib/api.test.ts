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
  NativeModules: {},
  Platform: { OS: "ios", select: (values: Record<string, unknown>) => values.ios ?? values.default },
  TurboModuleRegistry: {
    get: vi.fn(() => null),
    getEnforcing: vi.fn(() => ({})),
  },
}));

vi.mock("./i18n", () => ({
  translate: (key: string) => key,
}));

describe("mobile API transport", () => {
  beforeEach(() => {
    vi.stubGlobal("__DEV__", true);
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

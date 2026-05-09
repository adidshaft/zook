import Constants from "expo-constants";

export type MobileAppEnv = "local" | "staging" | "production";
export type MobileApiMode = "backend" | "offline-demo";

function normalizeAppEnv(value?: string | null): MobileAppEnv | undefined {
  switch (value?.trim().toLowerCase()) {
    case "local":
    case "development":
    case "dev":
      return "local";
    case "staging":
    case "stage":
    case "preview":
      return "staging";
    case "production":
    case "prod":
      return "production";
    default:
      return undefined;
  }
}

function normalizeApiMode(value?: string | null): MobileApiMode | undefined {
  switch (value?.trim().toLowerCase()) {
    case "backend":
    case "api":
    case "server":
      return "backend";
    case "offline-demo":
    case "offline_demo":
    case "demo":
      return "offline-demo";
    default:
      return undefined;
  }
}

function resolveAppEnv() {
  const candidates: Array<[string, string | undefined]> = [
    ["APP_ENV", process.env.APP_ENV],
    ["EXPO_CONFIG_APP_ENV", Constants.expoConfig?.extra?.appEnv as string | undefined],
    ["EXPO_CONFIG_RELEASE_PROFILE", Constants.expoConfig?.extra?.releaseProfile as string | undefined],
    ["EXPO_PUBLIC_APP_ENV", process.env.EXPO_PUBLIC_APP_ENV],
    ["EXPO_PUBLIC_ENV_PROFILE", process.env.EXPO_PUBLIC_ENV_PROFILE],
  ];
  for (const [, value] of candidates) {
    const raw = value?.trim();
    if (!raw) {
      continue;
    }
    const normalized = normalizeAppEnv(raw);
    if (!normalized) {
      return {
        appEnv: "local" as MobileAppEnv,
        error: "This app build is using an unsupported release setting.",
      };
    }
    return { appEnv: normalized };
  }
  return { appEnv: "local" as MobileAppEnv };
}

function resolveApiMode() {
  const candidates: Array<[string, string | undefined]> = [
    ["EXPO_PUBLIC_API_MODE", process.env.EXPO_PUBLIC_API_MODE],
    ["MOBILE_API_MODE", process.env.MOBILE_API_MODE],
    ["API_MODE", process.env.API_MODE],
  ];
  for (const [, value] of candidates) {
    const raw = value?.trim();
    if (!raw) {
      continue;
    }
    const normalized = normalizeApiMode(raw);
    if (!normalized) {
      return {
        apiMode: "backend" as MobileApiMode,
        error: "This app build is using an unsupported connection setting.",
      };
    }
    return { apiMode: normalized };
  }
  return { apiMode: "backend" as const };
}

export function getMobileAppEnv(): MobileAppEnv {
  return resolveAppEnv().appEnv;
}

export function getMobileApiMode(): MobileApiMode {
  return resolveApiMode().apiMode;
}

export function getMobileRuntimeMode() {
  return {
    appEnv: getMobileAppEnv(),
    apiMode: getMobileApiMode(),
  };
}

export function isOfflineDemoMode() {
  return getMobileApiMode() === "offline-demo";
}

export function getMobileRuntimeConfigError() {
  const appEnvResult = resolveAppEnv();
  const apiModeResult = resolveApiMode();
  const appEnv = appEnvResult.appEnv;
  const apiMode = apiModeResult.apiMode;

  if (appEnvResult.error) {
    return appEnvResult.error;
  }

  if (apiModeResult.error) {
    return apiModeResult.error;
  }

  if (apiMode === "offline-demo" && appEnv !== "local") {
    return "Sample mode is only available in local builds.";
  }

  return undefined;
}

import Constants from "expo-constants";

export type MobileAppEnv = "local" | "staging" | "production";
export type MobileApiMode = "backend" | "offline-demo";

function getExpoConfigExtra() {
  const constants = Constants as typeof Constants & {
    manifest?: { extra?: Record<string, unknown> };
    manifest2?: { extra?: { expoClient?: { extra?: Record<string, unknown> } } };
  };
  return {
    ...((constants.manifest2?.extra?.expoClient?.extra ?? {}) as Record<string, unknown>),
    ...((constants.manifest?.extra ?? {}) as Record<string, unknown>),
    ...((constants.expoConfig?.extra ?? {}) as Record<string, unknown>),
  };
}

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
  const expoExtra = getExpoConfigExtra();
  const candidates: Array<[string, string | undefined]> = [
    ["APP_ENV", process.env.APP_ENV],
    ["EXPO_CONFIG_APP_ENV", expoExtra.appEnv as string | undefined],
    ["EXPO_CONFIG_RELEASE_PROFILE", expoExtra.releaseProfile as string | undefined],
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
  const expoExtra = getExpoConfigExtra();
  const candidates: Array<[string, string | undefined]> = [
    ["EXPO_CONFIG_API_MODE", expoExtra.apiMode as string | undefined],
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
  if (
    normalizeBooleanFlag(process.env.EXPO_PUBLIC_DEMO) ||
    normalizeBooleanFlag(process.env.EXPO_PUBLIC_OFFLINE_DEMO) ||
    normalizeBooleanFlag(process.env.MOBILE_OFFLINE_DEMO) ||
    normalizeBooleanFlag(expoExtra.offlineDemo as string | boolean | undefined)
  ) {
    return { apiMode: "offline-demo" as const };
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

export function isDemoBundleIncluded() {
  return process.env.EXPO_PUBLIC_INCLUDE_DEMO?.trim().toLowerCase() !== "false";
}

function normalizeBooleanFlag(value?: string | boolean | null) {
  if (typeof value === "boolean") {
    return value;
  }
  switch (value?.trim().toLowerCase()) {
    case "1":
    case "true":
    case "yes":
    case "on":
    case "enabled":
      return true;
    default:
      return false;
  }
}

export function isMobileFeatureEnabled(key: string) {
  const extraValue = getExpoConfigExtra()[key] as string | boolean | undefined;
  if (typeof extraValue === "boolean") {
    return extraValue;
  }
  return normalizeBooleanFlag(extraValue) || normalizeBooleanFlag(process.env[`EXPO_PUBLIC_${key}`]);
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

  if (apiMode === "offline-demo" && !isDemoBundleIncluded()) {
    return "Sample mode is not included in this app build.";
  }

  if (apiMode === "offline-demo" && appEnv !== "local") {
    return "Sample mode is only available in local builds.";
  }

  return undefined;
}

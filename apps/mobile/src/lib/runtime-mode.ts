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

function truthy(value?: string | null) {
  return /^(1|true|yes|on)$/i.test(value ?? "");
}

function legacyOfflineDemoRequested() {
  return (
    Constants.expoConfig?.extra?.offlineDemo === true ||
    truthy(process.env.EXPO_PUBLIC_OFFLINE_DEMO) ||
    truthy(process.env.EXPO_PUBLIC_DEMO_MODE) ||
    truthy(process.env.MOBILE_OFFLINE_DEMO)
  );
}

export function getMobileAppEnv(): MobileAppEnv {
  return (
    normalizeAppEnv(Constants.expoConfig?.extra?.appEnv as string | undefined) ??
    normalizeAppEnv(Constants.expoConfig?.extra?.releaseProfile as string | undefined) ??
    normalizeAppEnv(process.env.EXPO_PUBLIC_APP_ENV) ??
    normalizeAppEnv(process.env.APP_ENV) ??
    normalizeAppEnv(process.env.EXPO_PUBLIC_ENV_PROFILE) ??
    "local"
  );
}

export function getMobileApiMode(): MobileApiMode {
  const explicitMode =
    normalizeApiMode(Constants.expoConfig?.extra?.apiMode as string | undefined) ??
    normalizeApiMode(process.env.EXPO_PUBLIC_API_MODE) ??
    normalizeApiMode(process.env.API_MODE);

  if (explicitMode) {
    return explicitMode;
  }

  return legacyOfflineDemoRequested() ? "offline-demo" : "backend";
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
  const appEnv = getMobileAppEnv();
  const apiMode = getMobileApiMode();

  if (apiMode === "offline-demo" && appEnv !== "local") {
    return `Offline demo mode is only available for local builds. Current APP_ENV is ${appEnv}.`;
  }

  return undefined;
}

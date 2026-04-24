import type { ExpoConfig } from "expo/config";
import appJson from "./app.json";

type MobileReleaseProfile = "local" | "staging" | "production";
type MobilePushEnvironment = "development" | "preview" | "production";

const baseConfig = appJson as { expo: ExpoConfig & { extra?: Record<string, unknown> } };
const appVersion = baseConfig.expo.version ?? "0.1.0";
const runtimeVersion = appVersion;

const apiBaseUrlByProfile: Record<MobileReleaseProfile, string> = {
  local: "http://127.0.0.1:3000/api",
  staging: "https://staging.zook.app/api",
  production: "https://zook.app/api"
};

const webUrlByProfile: Record<MobileReleaseProfile, string> = {
  local: "http://localhost:3000",
  staging: "https://staging.zook.app",
  production: "https://zook.app"
};

function normalizeProfile(value?: string | null): MobileReleaseProfile | undefined {
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

function resolveReleaseProfile(): MobileReleaseProfile {
  return (
    normalizeProfile(process.env.MOBILE_ENV_PROFILE) ??
    normalizeProfile(process.env.EXPO_PUBLIC_ENV_PROFILE) ??
    normalizeProfile(process.env.ENV_PROFILE) ??
    normalizeProfile(process.env.APP_ENV) ??
    normalizeProfile(process.env.EXPO_PUBLIC_APP_ENV) ??
    normalizeProfile(process.env.EAS_BUILD_PROFILE) ??
    "local"
  );
}

function resolveUrl(
  explicitValue: string | undefined,
  profile: MobileReleaseProfile,
  defaults: Record<MobileReleaseProfile, string>
) {
  return explicitValue?.trim() || defaults[profile];
}

function resolvePushEnvironment(profile: MobileReleaseProfile): MobilePushEnvironment {
  if (profile === "production") {
    return "production";
  }
  if (profile === "staging") {
    return "preview";
  }
  return "development";
}

export default (): ExpoConfig => {
  const releaseProfile = resolveReleaseProfile();
  const expoProjectId =
    process.env.EXPO_PROJECT_ID ??
    process.env.EAS_PROJECT_ID ??
    ((baseConfig.expo.extra?.eas as { projectId?: string } | undefined)?.projectId ?? undefined);

  return {
    ...baseConfig.expo,
    scheme: "zook",
    version: appVersion,
    runtimeVersion: {
      policy: "appVersion"
    },
    ios: {
      ...baseConfig.expo.ios,
      bundleIdentifier: "com.zook.app"
    },
    android: {
      ...baseConfig.expo.android,
      package: "com.zook.app"
    },
    extra: {
      ...(baseConfig.expo.extra ?? {}),
      releaseProfile,
      appScheme: "zook",
      appVersion,
      runtimeVersion,
      easBuildProfile: process.env.EAS_BUILD_PROFILE ?? "local",
      pushEnvironment: resolvePushEnvironment(releaseProfile),
      ...(expoProjectId ? { expoProjectId } : {}),
      eas: {
        ...((baseConfig.expo.extra?.eas as Record<string, unknown> | undefined) ?? {}),
        ...(expoProjectId ? { projectId: expoProjectId } : {})
      },
      mobileApiBaseUrl: resolveUrl(
        process.env.MOBILE_API_BASE_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL,
        releaseProfile,
        apiBaseUrlByProfile
      ),
      webUrl: resolveUrl(
        process.env.EXPO_PUBLIC_WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL,
        releaseProfile,
        webUrlByProfile
      )
    }
  };
};

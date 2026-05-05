import type { ExpoConfig } from "expo/config";

type MobileReleaseProfile = "local" | "staging" | "production";
type MobileApiMode = "backend" | "offline-demo";
type MobilePushEnvironment = "development" | "preview" | "production";

const baseConfig: ExpoConfig & { extra?: Record<string, unknown> } = {
  name: "Zook",
  slug: "zook",
  scheme: "zook",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  icon: "./assets/icons/AppIcon-1024.png",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.zook.app",
    icon: "./assets/icons/AppIcon-1024.png"
  },
  android: {
    package: "com.zook.app",
    adaptiveIcon: {
      foregroundImage: "./assets/icons/ic_launcher_foreground.png",
      backgroundImage: "./assets/icons/ic_launcher_background.png",
      monochromeImage: "./assets/icons/ic_launcher_monochrome.png",
      backgroundColor: "#070908"
    }
  },
  plugins: [
    "expo-router",
    "expo-notifications",
    "expo-secure-store",
    [
      "expo-camera",
      {
        cameraPermission: "Zook uses the camera to scan gym attendance QR codes."
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  }
};
const appVersion = baseConfig.version ?? "0.1.0";
const runtimeVersion = appVersion;

const apiBaseUrlByProfile: Record<MobileReleaseProfile, string> = {
  local: "http://localhost:3000/api",
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
  const candidates = [
    "APP_ENV",
    "ENV_PROFILE",
    "EXPO_PUBLIC_APP_ENV",
    "MOBILE_ENV_PROFILE",
    "EXPO_PUBLIC_ENV_PROFILE",
    "EAS_BUILD_PROFILE"
  ] as const;
  for (const key of candidates) {
    const value = process.env[key]?.trim();
    if (!value) {
      continue;
    }
    const normalized = normalizeProfile(value);
    if (!normalized) {
      throw new Error("This mobile build is using an unsupported release setting.");
    }
    return normalized;
  }
  return "local";
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

function legacyOfflineDemoRequested() {
  return (
    process.env.EXPO_PUBLIC_OFFLINE_DEMO === "true" ||
    process.env.EXPO_PUBLIC_DEMO_MODE === "true" ||
    process.env.MOBILE_OFFLINE_DEMO === "true"
  );
}

function resolveApiMode(): MobileApiMode {
  const candidates = ["API_MODE", "EXPO_PUBLIC_API_MODE", "MOBILE_API_MODE"] as const;
  for (const key of candidates) {
    const value = process.env[key]?.trim();
    if (!value) {
      continue;
    }
    const normalized = normalizeApiMode(value);
    if (!normalized) {
      throw new Error("This mobile build is using an unsupported connection setting.");
    }
    return normalized;
  }
  return legacyOfflineDemoRequested() ? "offline-demo" : "backend";
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
  const apiMode = resolveApiMode();
  if (apiMode === "offline-demo" && releaseProfile !== "local") {
    throw new Error(
      "Sample mode is only available for local mobile builds."
    );
  }
  const expoProjectId =
    process.env.EXPO_PROJECT_ID ??
    process.env.EAS_PROJECT_ID ??
    ((baseConfig.extra?.eas as { projectId?: string } | undefined)?.projectId ?? undefined);

  return {
    ...baseConfig,
    scheme: "zook",
    version: appVersion,
    runtimeVersion: {
      policy: "appVersion"
    },
    ios: {
      ...baseConfig.ios,
      bundleIdentifier: "com.zook.app",
      icon: "./assets/icons/AppIcon-1024.png"
    },
    android: {
      ...baseConfig.android,
      package: "com.zook.app"
    },
    extra: {
      ...(baseConfig.extra ?? {}),
      appEnv: releaseProfile,
      apiMode,
      releaseProfile,
      appScheme: "zook",
      appVersion,
      runtimeVersion,
      offlineDemo: apiMode === "offline-demo",
      easBuildProfile: process.env.EAS_BUILD_PROFILE ?? "local",
      pushEnvironment: resolvePushEnvironment(releaseProfile),
      ...(expoProjectId ? { expoProjectId } : {}),
      eas: {
        ...((baseConfig.extra?.eas as Record<string, unknown> | undefined) ?? {}),
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

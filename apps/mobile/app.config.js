const googleIosClientIdSuffix = ".apps.googleusercontent.com";
const notificationAccentColor = "#B9F455";

function resolveGoogleIosUrlScheme() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  if (!clientId?.endsWith(googleIosClientIdSuffix)) {
    return undefined;
  }
  return `com.googleusercontent.apps.${clientId.slice(0, -googleIosClientIdSuffix.length)}`;
}

const googleIosUrlScheme = resolveGoogleIosUrlScheme();
const googleSignInPlugins = googleIosUrlScheme
  ? [
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: googleIosUrlScheme,
        },
      ],
    ]
  : [];
function resolveAppleSignInPlugins() {
  return process.env.EAS_BUILD_PLATFORM?.trim().toLowerCase() === "android"
    ? []
    : ["expo-apple-authentication"];
}

const baseConfig = {
  name: "Zook",
  slug: "zook",
  scheme: "zook",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icons/AppIcon-1024.png",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#070908",
    dark: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#070908",
    },
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.zook.app",
    buildNumber: "5",
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription:
        "Zook uses the camera to scan gym attendance QR codes and to take your profile photo.",
      NSLocationWhenInUseUsageDescription:
        "Zook uses your location to find nearby gyms when you choose to search by location.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "Zook uses your location to find nearby gyms when you choose to search by location.",
      NSPhotoLibraryUsageDescription:
        "Zook needs access to your photos so you can set a profile picture or upload supporting documents.",
      ...(googleIosUrlScheme
        ? {
            CFBundleURLTypes: [
              {
                CFBundleURLSchemes: ["zook", "com.zook.app", googleIosUrlScheme],
              },
            ],
          }
        : {}),
    },
    associatedDomains: ["applinks:zookfit.in", "applinks:app.zookfit.in"],
    icon: "./assets/icons/AppIcon-1024.png",
  },
  android: {
    package: "com.zook.app",
    versionCode: 4,
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: true,
    intentFilters: [
      {
        action: "VIEW",
        data: [
          { scheme: "https", host: "zookfit.in" },
          { scheme: "https", host: "app.zookfit.in" },
        ],
        category: ["BROWSABLE", "DEFAULT"],
        autoVerify: true,
      },
    ],
    adaptiveIcon: {
      foregroundImage: "./assets/icons/ic_launcher_foreground.png",
      backgroundImage: "./assets/icons/ic_launcher_background.png",
      monochromeImage: "./assets/icons/ic_launcher_monochrome.png",
      backgroundColor: "#070908",
    },
  },
  plugins: [
    "expo-router",
    "expo-font",
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: notificationAccentColor,
      },
    ],
    "expo-secure-store",
    ...googleSignInPlugins,
    [
      "expo-build-properties",
      {
        ios: {
          extraPods: [
            { name: "GoogleUtilities", modular_headers: true },
            { name: "RecaptchaInterop", modular_headers: true },
          ],
        },
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission:
          "Zook uses the camera to scan gym attendance QR codes and to take your profile photo.",
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Zook needs access to your photos so you can set a profile picture or upload supporting documents.",
        cameraPermission:
          "Zook uses the camera to scan gym attendance QR codes and to take your profile photo.",
        microphonePermission: false,
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Zook uses your location to find nearby gyms when you choose to search by location.",
        locationWhenInUsePermission:
          "Zook uses your location to find nearby gyms when you choose to search by location.",
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      "expo-local-authentication",
      {
        faceIDPermission:
          "Zook uses Face ID to confirm sensitive desk actions like manual payments and refunds.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  updates: {
    url: "https://u.expo.dev/3ac0a41f-b9fd-4d91-accf-0e46f3313539",
  },
  extra: {
    eas: {
      projectId: "3ac0a41f-b9fd-4d91-accf-0e46f3313539",
    },
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || "",
  },
};
const appVersion = baseConfig.version ?? "0.1.0";
const runtimeVersion = appVersion;

const apiBaseUrlByProfile = {
  local: "http://localhost:3000/api",
  staging: "https://app.zookfit.in/api",
  production: "https://app.zookfit.in/api",
};

const webUrlByProfile = {
  local: "http://localhost:3000",
  staging: "https://zookfit.in",
  production: "https://zookfit.in",
};

function normalizeProfile(value) {
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

function resolveReleaseProfile() {
  const candidates = [
    "APP_ENV",
    "ENV_PROFILE",
    "EXPO_PUBLIC_APP_ENV",
    "MOBILE_ENV_PROFILE",
    "EXPO_PUBLIC_ENV_PROFILE",
    "EAS_BUILD_PROFILE",
  ];
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

function normalizeApiMode(value) {
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

function resolveApiMode() {
  const candidates = ["MOBILE_API_MODE", "EXPO_PUBLIC_API_MODE", "API_MODE"];
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
  if (
    process.env.EXPO_PUBLIC_OFFLINE_DEMO?.trim().toLowerCase() === "true" ||
    process.env.MOBILE_OFFLINE_DEMO?.trim().toLowerCase() === "true"
  ) {
    return "offline-demo";
  }
  return "backend";
}

function resolveUrl(explicitValue, profile, defaults) {
  return explicitValue?.trim() || defaults[profile];
}

function resolvePushEnvironment(profile) {
  if (profile === "production") {
    return "production";
  }
  if (profile === "staging") {
    return "preview";
  }
  return "development";
}

module.exports = () => {
  const releaseProfile = resolveReleaseProfile();
  const apiMode = resolveApiMode();
  const sentryOrg = process.env.SENTRY_ORG?.trim();
  const sentryProject = (process.env.SENTRY_MOBILE_PROJECT ?? process.env.SENTRY_PROJECT)?.trim();
  const shouldConfigureNativeSentry = releaseProfile !== "local" && sentryOrg && sentryProject;
  if (apiMode === "offline-demo" && releaseProfile !== "local") {
    throw new Error("Sample mode is only available for local mobile builds.");
  }
  const expoProjectId =
    process.env.EXPO_PROJECT_ID ?? process.env.EAS_PROJECT_ID ?? baseConfig.extra?.eas?.projectId;
  const plugins = [...(baseConfig.plugins ?? []), ...resolveAppleSignInPlugins()];

  return {
    ...baseConfig,
    plugins: shouldConfigureNativeSentry
      ? [
          ...plugins,
          [
            "@sentry/react-native/expo",
            {
              url: "https://sentry.io/",
              organization: sentryOrg,
              project: sentryProject,
            },
          ],
        ]
      : plugins,
    scheme: "zook",
    version: appVersion,
    runtimeVersion: {
      policy: "appVersion",
    },
    ios: {
      ...baseConfig.ios,
      bundleIdentifier: "com.zook.app",
      usesAppleSignIn: true,
      icon: "./assets/icons/AppIcon-1024.png",
    },
    android: {
      ...baseConfig.android,
      package: "com.zook.app",
    },
    extra: {
      ...(baseConfig.extra ?? {}),
      appEnv: releaseProfile,
      apiMode,
      releaseProfile,
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || "",
      appScheme: "zook",
      appVersion,
      runtimeVersion,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || "",
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || "",
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || "",
      offlineDemo: apiMode === "offline-demo",
      easBuildProfile: process.env.EAS_BUILD_PROFILE ?? "local",
      pushEnvironment: resolvePushEnvironment(releaseProfile),
      AI_CHAT_ENABLED: process.env.EXPO_PUBLIC_AI_CHAT_ENABLED?.trim() ?? "",
      AI_DRAFT_ENABLED: process.env.EXPO_PUBLIC_AI_DRAFT_ENABLED?.trim() ?? "",
      ...(expoProjectId ? { expoProjectId } : {}),
      eas: {
        ...(baseConfig.extra?.eas ?? {}),
        ...(expoProjectId ? { projectId: expoProjectId } : {}),
      },
      mobileApiBaseUrl: resolveUrl(
        process.env.MOBILE_API_BASE_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL,
        releaseProfile,
        apiBaseUrlByProfile,
      ),
      webUrl: resolveUrl(
        process.env.EXPO_PUBLIC_WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL,
        releaseProfile,
        webUrlByProfile,
      ),
    },
  };
};

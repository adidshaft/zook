import type { ExpoConfig } from "expo/config";
import appJson from "./app.json";

const baseConfig = appJson as { expo: ExpoConfig & { extra?: Record<string, unknown> } };

export default (): ExpoConfig => ({
  ...baseConfig.expo,
  extra: {
    ...(baseConfig.expo.extra ?? {}),
    mobileApiBaseUrl:
      process.env.MOBILE_API_BASE_URL ??
      process.env.EXPO_PUBLIC_API_BASE_URL ??
      "http://127.0.0.1:3000/api",
    webUrl: process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"
  }
});

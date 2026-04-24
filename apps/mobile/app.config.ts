import type { ExpoConfig } from "expo/config";

const appJson = require("./app.json") as { expo: ExpoConfig };

export default (): ExpoConfig => ({
  ...appJson.expo,
  extra: {
    ...(appJson.expo.extra ?? {}),
    mobileApiBaseUrl:
      process.env.MOBILE_API_BASE_URL ??
      process.env.EXPO_PUBLIC_API_BASE_URL ??
      "http://127.0.0.1:3000/api",
    webUrl: process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"
  }
});

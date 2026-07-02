import * as Application from "expo-application";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { mobileApiFetch } from "./api";
import { compareAppVersions } from "./app-version-utils";
import { getStoredValue, setStoredValue } from "./storage";

const APP_CONFIG_CACHE_KEY = "zook_public_app_config";
const APP_CONFIG_TIMEOUT_MS = 3_000;

type PlatformKey = "ios" | "android";

export type PublicAppConfig = {
  minimumAppVersion: {
    ios: string | null;
    android: string | null;
  };
  storeUrls: {
    ios: string | null;
    android: string | null;
  };
};

export type RequiredAppUpdate = {
  currentVersion: string;
  minimumVersion: string;
  storeUrl: string | null;
};

const emptyConfig: PublicAppConfig = {
  minimumAppVersion: { ios: null, android: null },
  storeUrls: { ios: null, android: null },
};

function platformKey(): PlatformKey | null {
  return Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : null;
}

function parseCachedConfig(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as PublicAppConfig;
    if (!parsed.minimumAppVersion || !parsed.storeUrls) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function fetchPublicAppConfig() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APP_CONFIG_TIMEOUT_MS);
  try {
    const config = await mobileApiFetch<PublicAppConfig>("/public/app-config", {
      signal: controller.signal,
    });
    await setStoredValue(APP_CONFIG_CACHE_KEY, JSON.stringify(config));
    return config;
  } finally {
    clearTimeout(timeout);
  }
}

function requiredUpdateFromConfig(config: PublicAppConfig | null): RequiredAppUpdate | null {
  const key = platformKey();
  const currentVersion = Application.nativeApplicationVersion;
  if (!key || !currentVersion || !config) {
    return null;
  }
  const minimumVersion = config.minimumAppVersion[key];
  if (!minimumVersion || compareAppVersions(currentVersion, minimumVersion) >= 0) {
    return null;
  }
  return {
    currentVersion,
    minimumVersion,
    storeUrl: config.storeUrls[key],
  };
}

export function useRequiredAppUpdate() {
  const [requiredUpdate, setRequiredUpdate] = useState<RequiredAppUpdate | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getStoredValue(APP_CONFIG_CACHE_KEY)
      .then((cached) => {
        if (!cancelled) {
          setRequiredUpdate(requiredUpdateFromConfig(parseCachedConfig(cached)));
        }
      })
      .then(() => fetchPublicAppConfig())
      .then((config) => {
        if (!cancelled) {
          setRequiredUpdate(requiredUpdateFromConfig(config));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRequiredUpdate((current) => current ?? requiredUpdateFromConfig(emptyConfig));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return requiredUpdate;
}

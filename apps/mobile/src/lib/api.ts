import Constants from "expo-constants";
import { Platform } from "react-native";
import { ApiError, parseApiResponse } from "@zook/core/api";
import { createDemoTransport } from "./demo-api";
import {
  getMobileApiMode,
  getMobileAppEnv,
  getMobileRuntimeConfigError,
  isOfflineDemoMode,
} from "./runtime-mode";

type MobileReleaseProfile = "local" | "staging" | "production";
type MobilePushEnvironment = "development" | "preview" | "production";
type ApiAuthHandlers = {
  onExpired?: () => Promise<string | void> | string | void;
  onForbidden?: (error: ApiError) => Promise<void> | void;
};
type MobileApiRequestInit = Omit<RequestInit, "body"> & {
  token?: string;
  orgId?: string;
  branchId?: string;
  body?: unknown;
  skipAuthRefresh?: boolean;
};
type MobileApiTransport = {
  request<T>(path: string, init?: MobileApiRequestInit): Promise<T>;
};

let apiAuthHandlers: ApiAuthHandlers = {};

export function setApiAuthHandlers(handlers: ApiAuthHandlers) {
  apiAuthHandlers = handlers;
  return () => {
    if (apiAuthHandlers === handlers) {
      apiAuthHandlers = {};
    }
  };
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function configuredReleaseProfile() {
  return getMobileAppEnv();
}

function isLocalAddress(url: string) {
  return /:\/\/(127\.0\.0\.1|localhost|10\.0\.2\.2)([:/]|$)/i.test(url);
}

function ensureConfiguredUrl(configured: string | undefined, label: "API" | "web") {
  const value = configured?.trim();
  if (!value) {
    throw new Error(
      `Mobile ${label} base URL is missing. Set ${
        label === "API" ? "MOBILE_API_BASE_URL or EXPO_PUBLIC_API_BASE_URL" : "EXPO_PUBLIC_WEB_URL"
      } before running the app.`,
    );
  }
  return value.replace(/\/$/, "");
}

function platformLocalUrl(value: string | undefined) {
  if (configuredReleaseProfile() !== "local" || Platform.OS !== "android") {
    return value;
  }
  return value?.replace("http://localhost:", "http://10.0.2.2:");
}

function attachResponseRetryAfter(error: unknown, response: Response) {
  if (!(error instanceof ApiError)) {
    return error;
  }
  const retryAfterSeconds = response.headers.get("retry-after");
  if (!retryAfterSeconds) {
    return error;
  }
  const details = typeof error.details === "object" && error.details !== null ? error.details : {};
  error.details = { ...details, retryAfterSeconds };
  return error;
}

export function getMobileReleaseProfile(): MobileReleaseProfile {
  return configuredReleaseProfile();
}

export function getMobileRuntimeMode() {
  return {
    appEnv: getMobileAppEnv(),
    apiMode: getMobileApiMode(),
  };
}

export function getMobilePushEnvironment() {
  return (
    (Constants.expoConfig?.extra?.pushEnvironment as MobilePushEnvironment | undefined) ??
    "development"
  );
}

export { isOfflineDemoMode };

export function getExpoProjectId() {
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.expoProjectId as string | undefined) ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
    undefined
  );
}

export function getMobileApiBaseUrl() {
  const platformDefault =
    configuredReleaseProfile() === "local"
      ? Platform.OS === "android"
        ? "http://10.0.2.2:3000/api"
        : "http://localhost:3000/api"
      : undefined;
  const configured =
    platformLocalUrl(process.env.EXPO_PUBLIC_API_BASE_URL) ??
    platformLocalUrl(Constants.expoConfig?.extra?.mobileApiBaseUrl as string | undefined) ??
    platformDefault;

  return ensureConfiguredUrl(configured, "API");
}

export function getMobileWebBaseUrl() {
  const configured =
    platformLocalUrl(process.env.EXPO_PUBLIC_WEB_URL) ??
    platformLocalUrl(Constants.expoConfig?.extra?.webUrl as string | undefined) ??
    getMobileApiBaseUrl().replace(/\/api$/, "");

  return ensureConfiguredUrl(configured, "web");
}

export function toWebUrl(path: string) {
  return `${getMobileWebBaseUrl()}${normalizePath(path)}`;
}

function createHttpTransport(): MobileApiTransport {
  async function request<T>(path: string, init: MobileApiRequestInit = {}): Promise<T> {
    const { body: rawBody, branchId, orgId, skipAuthRefresh, token, ...requestInit } = init;
    const headers = new Headers(requestInit.headers);
    let body = rawBody;
    const apiBaseUrl = getMobileApiBaseUrl();
    const requestId = `mob_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    headers.set("x-request-id", requestId);
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    if (orgId) {
      headers.set("x-zook-org-id", orgId);
    }
    if (branchId) {
      headers.set("x-zook-branch-id", branchId);
    }
    if (body && typeof body !== "string" && !(body instanceof FormData)) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${apiBaseUrl}${normalizePath(path)}`, {
        ...requestInit,
        headers,
        signal: requestInit.signal ?? controller.signal,
        ...(body !== undefined ? { body: body as BodyInit | null } : {}),
      });
      try {
        return await parseApiResponse<T>(response);
      } catch (error) {
        throw attachResponseRetryAfter(error, response);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const refreshedToken = skipAuthRefresh ? undefined : await apiAuthHandlers.onExpired?.();
        if (refreshedToken && token && refreshedToken !== token) {
          return request<T>(path, {
            ...init,
            token: refreshedToken,
            skipAuthRefresh: true,
          });
        }
        throw error;
      }
      if (error instanceof ApiError && error.status === 403) {
        await apiAuthHandlers.onForbidden?.(error);
        throw error;
      }
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timed out. Try again in a moment.");
      }
      if (error instanceof Error && isLocalAddress(apiBaseUrl)) {
        throw new Error("We cannot connect right now. Check your internet connection or try again.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    request,
  };
}

const demoTransport = createDemoTransport();
const httpTransport = createHttpTransport();

function currentTransport() {
  return isOfflineDemoMode() ? demoTransport : httpTransport;
}

export async function mobileApiFetch<T>(
  path: string,
  init: MobileApiRequestInit = {},
): Promise<T> {
  const configError = getMobileRuntimeConfigError();
  if (configError) {
    throw new Error("Zook can’t open in this build. Please update the app or contact support.");
  }
  return currentTransport().request<T>(path, init);
}

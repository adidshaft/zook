import Constants from "expo-constants";
import { Platform } from "react-native";
import { parseApiResponse } from "@zook/core";
import { demoMobileApiFetch } from "./demo-api";
import { isOfflineDemoMode } from "./demo-mode";

type MobileReleaseProfile = "local" | "staging" | "production";
type MobilePushEnvironment = "development" | "preview" | "production";

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function configuredReleaseProfile() {
  return (Constants.expoConfig?.extra?.releaseProfile as MobileReleaseProfile | undefined) ?? "local";
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
      } before running the app.`
    );
  }
  return value.replace(/\/$/, "");
}

export function getMobileReleaseProfile() {
  return configuredReleaseProfile();
}

export function getMobilePushEnvironment() {
  return (Constants.expoConfig?.extra?.pushEnvironment as MobilePushEnvironment | undefined) ?? "development";
}

export { isOfflineDemoMode };

export function getExpoProjectId() {
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.expoProjectId as string | undefined) ??
    ((Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ?? undefined)
  );
}

export function getMobileApiBaseUrl() {
  const platformDefault =
    configuredReleaseProfile() === "local"
      ? Platform.OS === "android"
        ? "http://10.0.2.2:3000/api"
        : "http://127.0.0.1:3000/api"
      : undefined;
  const configured =
    (Constants.expoConfig?.extra?.mobileApiBaseUrl as string | undefined) ??
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    platformDefault;

  return ensureConfiguredUrl(configured, "API");
}

export function getMobileWebBaseUrl() {
  const configured =
    (Constants.expoConfig?.extra?.webUrl as string | undefined) ??
    process.env.EXPO_PUBLIC_WEB_URL ??
    getMobileApiBaseUrl().replace(/\/api$/, "");

  return ensureConfiguredUrl(configured, "web");
}

export function toWebUrl(path: string) {
  return `${getMobileWebBaseUrl()}${normalizePath(path)}`;
}

export async function mobileApiFetch<T>(
  path: string,
  init: Omit<RequestInit, "body"> & {
    token?: string;
    orgId?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const { body: rawBody, orgId, token, ...requestInit } = init;
  if (isOfflineDemoMode()) {
    return demoMobileApiFetch<T>(path, { body: rawBody });
  }

  const headers = new Headers(requestInit.headers);
  let body = rawBody;
  const apiBaseUrl = getMobileApiBaseUrl();

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  if (orgId) {
    headers.set("x-zook-org-id", orgId);
  }
  if (body && typeof body !== "string" && !(body instanceof FormData)) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${normalizePath(path)}`, {
      ...requestInit,
      headers,
      ...(body !== undefined ? { body: body as BodyInit | null } : {})
    });
  } catch (error) {
    if (error instanceof Error && isLocalAddress(apiBaseUrl)) {
      throw new Error(
        `Unable to reach ${apiBaseUrl}. On iOS simulator, make sure the local web server is running. On Android emulators use 10.0.2.2, and on physical devices replace localhost with your LAN IP or use staging/production.`
      );
    }
    throw error;
  }

  return parseApiResponse<T>(response);
}

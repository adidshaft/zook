import Constants from "expo-constants";
import { Platform } from "react-native";
import { parseApiResponse } from "@zook/core";

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function getMobileApiBaseUrl() {
  const platformDefault =
    Platform.OS === "android" ? "http://10.0.2.2:3000/api" : "http://127.0.0.1:3000/api";
  const configured =
    (Constants.expoConfig?.extra?.mobileApiBaseUrl as string | undefined) ??
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    platformDefault;

  return configured.replace(/\/$/, "");
}

export function getMobileWebBaseUrl() {
  const configured =
    (Constants.expoConfig?.extra?.webUrl as string | undefined) ??
    process.env.EXPO_PUBLIC_WEB_URL ??
    getMobileApiBaseUrl().replace(/\/api$/, "");

  return configured.replace(/\/$/, "");
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
  const headers = new Headers(requestInit.headers);
  let body = rawBody;

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

  const response = await fetch(`${getMobileApiBaseUrl()}${normalizePath(path)}`, {
    ...requestInit,
    headers,
    ...(body !== undefined ? { body: body as BodyInit | null } : {})
  });

  return parseApiResponse<T>(response);
}

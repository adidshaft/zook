import { parseApiResponse } from "@zook/core";
import { toast } from "sonner";

export async function webApiFetch<T>(
  path: string,
  init: Omit<RequestInit, "body"> & {
    body?: unknown;
    feedback?: {
      success?: string | false;
      error?: string | false;
    };
  } = {},
): Promise<T> {
  const { body: rawBody, feedback, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);
  let body = rawBody;

  if (body && typeof body !== "string" && !(body instanceof FormData)) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(body);
  }
  if (!headers.has("x-zook-intent") && requestInit.method && !["GET", "HEAD"].includes(requestInit.method.toUpperCase())) {
    headers.set("x-zook-intent", "mutate");
  }

  const isMutation = Boolean(
    requestInit.method && !["GET", "HEAD"].includes(requestInit.method.toUpperCase()),
  );

  const response = await fetch(path, {
    ...requestInit,
    headers,
    ...(body !== undefined ? { body: body as BodyInit | null } : {}),
  });

  try {
    const payload = await parseApiResponse<T>(response);
    if (isMutation && feedback?.success !== false) {
      toast.success(feedback?.success ?? "Saved.");
    }
    return payload;
  } catch (error) {
    if (isMutation && feedback?.error !== false) {
      toast.error(
        feedback?.error ??
          (error instanceof Error ? error.message : "Action failed."),
      );
    }
    throw error;
  }
}

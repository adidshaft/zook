import { NextResponse } from "next/server";
import { currentRequestId } from "./request-state";

function buildMeta() {
  const requestId = currentRequestId();
  return requestId ? { meta: { requestId } } : {};
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data, ...buildMeta() }, init);
}

export function fail(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
      ...buildMeta()
    },
    { status }
  );
}

export async function readJson<T = unknown>(request: Request): Promise<T> {
  if (request.method === "GET" || request.method === "HEAD") {
    return {} as T;
  }
  const text = await request.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

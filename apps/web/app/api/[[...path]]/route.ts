import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handleApi } from "@/server/api-router";

function isAllowedApiOrigin(origin: string | null) {
  if (!origin) return false;
  if (process.env.NODE_ENV === "development") {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);
  }
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_WEB_URL,
    process.env.NEXT_PUBLIC_DASHBOARD_URL,
    process.env.NEXT_PUBLIC_MOBILE_WEB_URL,
  ]
    .flatMap((value) => (value ? value.split(",") : []))
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return value.replace(/\/$/, "");
      }
    });
  return allowedOrigins.includes(origin);
}

function withCors(request: NextRequest, response: Response) {
  const origin = request.headers.get("origin");
  if (!isAllowedApiOrigin(origin)) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin!);
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "authorization,content-type,x-request-id,x-zook-org-id,x-zook-branch-id",
  );
  headers.set("Access-Control-Expose-Headers", "retry-after,x-request-id");
  headers.set("Vary", "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const params = await context.params;
  return withCors(request, await handleApi(request, params.path ?? []));
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const params = await context.params;
  return withCors(request, await handleApi(request, params.path ?? []));
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const params = await context.params;
  return withCors(request, await handleApi(request, params.path ?? []));
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const params = await context.params;
  return withCors(request, await handleApi(request, params.path ?? []));
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const params = await context.params;
  return withCors(request, await handleApi(request, params.path ?? []));
}

export function OPTIONS(request: NextRequest) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}

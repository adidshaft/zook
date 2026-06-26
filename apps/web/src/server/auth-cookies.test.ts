import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, setRefreshSessionCookie, setSessionCookie } from "./api-router/core";

const originalEnv = { ...process.env };

function setCookieHeaders(response: NextResponse) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const values = headers.getSetCookie?.();
  const rawValues = values && values.length ? values : [headers.get("set-cookie") ?? ""];
  return rawValues.flatMap((value) =>
    value.split(/,(?=\s*zook_(?:session|refresh)=)/).map((cookie) => cookie.trim()),
  );
}

function productionRequest() {
  return new NextRequest("https://app.zookfit.in/api/auth/logout", {
    headers: { "x-forwarded-proto": "https" },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...originalEnv };
});

describe("auth cookies", () => {
  it("sets domain and host-only session cookies in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "production");
    const response = NextResponse.json({});

    setSessionCookie(response, productionRequest(), "session-token", new Date("2030-01-01T00:00:00Z"));
    setRefreshSessionCookie(response, productionRequest(), "refresh-token", new Date("2030-01-02T00:00:00Z"));

    const cookies = setCookieHeaders(response).join("\n");
    expect(cookies).toContain("zook_session=session-token");
    expect(cookies).toContain("zook_refresh=refresh-token");
    expect(cookies).toContain("Domain=.zookfit.in");
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("Secure");
  });

  it("clears domain and host-only auth cookies in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "production");
    const response = NextResponse.json({});

    clearAuthCookies(response, productionRequest());

    const cookies = setCookieHeaders(response);
    const combined = cookies.join("\n");
    expect(combined).toContain("zook_session=");
    expect(combined).toContain("zook_refresh=");
    expect(combined).toContain("Domain=.zookfit.in");
    expect(combined).toContain("Path=/api/auth/refresh");
    expect(cookies.some((cookie) => cookie.includes("zook_session=") && !cookie.includes("Domain="))).toBe(true);
    expect(cookies.some((cookie) => cookie.includes("zook_refresh=") && !cookie.includes("Domain="))).toBe(true);
  });
});

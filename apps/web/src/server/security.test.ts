import { describe, expect, it } from "vitest";
import { assertSafeMutationRequest } from "./security";

function createMutationRequest(input: {
  origin?: string;
  referer?: string;
  fetchSite?: string;
  authorization?: string;
  hasCookieSession?: boolean;
  nextOrigin?: string;
  host?: string;
  forwardedHost?: string;
  forwardedProto?: string;
  intent?: string;
}) {
  return {
    method: "POST",
    headers: new Headers({
      ...(input.origin ? { origin: input.origin } : {}),
      ...(input.referer ? { referer: input.referer } : {}),
      ...(input.fetchSite ? { "sec-fetch-site": input.fetchSite } : {}),
      ...(input.authorization ? { authorization: input.authorization } : {}),
      ...(input.host ? { host: input.host } : {}),
      ...(input.forwardedHost ? { "x-forwarded-host": input.forwardedHost } : {}),
      ...(input.forwardedProto ? { "x-forwarded-proto": input.forwardedProto } : {}),
      ...(input.intent ? { "x-zook-intent": input.intent } : {}),
    }),
    cookies: {
      get(name: string) {
        if (name === "zook_session" && input.hasCookieSession) {
          return { name, value: "session-token" };
        }
        return undefined;
      },
    },
    nextUrl: {
      origin: input.nextOrigin ?? "https://zookfit.in",
    },
  };
}

describe("mutation safety", () => {
  it("allows same-origin cookie-authenticated writes", () => {
    expect(() =>
      assertSafeMutationRequest(
        createMutationRequest({
          origin: "https://zookfit.in",
          fetchSite: "same-origin",
          hasCookieSession: true,
        }) as never,
      ),
    ).not.toThrow();
  });

  it("allows bearer-token writes without browser origin checks", () => {
    expect(() =>
      assertSafeMutationRequest(
        createMutationRequest({
          authorization: "Bearer token",
          hasCookieSession: false,
        }) as never,
      ),
    ).not.toThrow();
  });

  it("allows equivalent loopback origins in local browser development", () => {
    expect(() =>
      assertSafeMutationRequest(
        createMutationRequest({
          origin: "http://localhost:3001",
          fetchSite: "cross-site",
          hasCookieSession: true,
          nextOrigin: "http://127.0.0.1:3001",
        }) as never,
      ),
    ).not.toThrow();
  });

  it("allows same-origin writes behind a reverse proxy", () => {
    expect(() =>
      assertSafeMutationRequest(
        createMutationRequest({
          origin: "https://app.zookfit.in",
          fetchSite: "same-origin",
          hasCookieSession: true,
          nextOrigin: "http://localhost:3000",
          host: "app.zookfit.in",
          forwardedProto: "https",
        }) as never,
      ),
    ).not.toThrow();
  });

  it("allows forwarded host headers behind a reverse proxy", () => {
    expect(() =>
      assertSafeMutationRequest(
        createMutationRequest({
          origin: "https://app.zookfit.in",
          fetchSite: "same-origin",
          hasCookieSession: true,
          nextOrigin: "http://127.0.0.1:3000",
          forwardedHost: "app.zookfit.in",
          forwardedProto: "https",
        }) as never,
      ),
    ).not.toThrow();
  });

  it("allows intent-marked same-site writes between configured Zook web origins", () => {
    expect(() =>
      assertSafeMutationRequest(
        createMutationRequest({
          origin: "https://zookfit.in",
          fetchSite: "same-site",
          hasCookieSession: true,
          nextOrigin: "https://app.zookfit.in",
          intent: "mutate",
        }) as never,
      ),
    ).not.toThrow();
  });

  it("allows intent-marked same-site writes from the dashboard subdomain to the app host", () => {
    expect(() =>
      assertSafeMutationRequest(
        createMutationRequest({
          origin: "https://dashboard.zookfit.in",
          fetchSite: "same-site",
          hasCookieSession: true,
          nextOrigin: "https://app.zookfit.in",
          intent: "mutate",
        }) as never,
      ),
    ).not.toThrow();
  });

  it("allows intent-marked same-site writes when the proxy origin is internal", () => {
    expect(() =>
      assertSafeMutationRequest(
        createMutationRequest({
          origin: "https://app.zookfit.in",
          fetchSite: "same-origin",
          hasCookieSession: true,
          nextOrigin: "http://10.0.4.12:3000",
          forwardedHost: "internal-zook-web.ap-south-1.elb.amazonaws.com",
          forwardedProto: "http",
          intent: "mutate",
        }) as never,
      ),
    ).not.toThrow();
  });

  it("requires the intent header when browser origin hints are absent", () => {
    expect(() =>
      assertSafeMutationRequest(
        createMutationRequest({
          hasCookieSession: true,
        }) as never,
      ),
    ).toThrow(/Include the x-zook-intent header/);
  });

  it("blocks cross-site cookie-authenticated writes", () => {
    expect(() =>
      assertSafeMutationRequest(
        createMutationRequest({
          origin: "https://evil.example",
          fetchSite: "cross-site",
          hasCookieSession: true,
        }) as never,
      ),
    ).toThrow(/Cross-site mutation blocked/);
  });

  it("blocks sec-fetch-site none for cookie-authenticated writes", () => {
    expect(() =>
      assertSafeMutationRequest(
        createMutationRequest({
          origin: "https://zookfit.in",
          fetchSite: "none",
          hasCookieSession: true,
        }) as never,
      ),
    ).toThrow(/Cross-site mutation blocked/);
  });
});

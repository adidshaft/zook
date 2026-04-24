import { describe, expect, it } from "vitest";
import { assertSafeMutationRequest } from "./security";

function createMutationRequest(input: {
  origin?: string;
  referer?: string;
  fetchSite?: string;
  authorization?: string;
  hasCookieSession?: boolean;
}) {
  return {
    method: "POST",
    headers: new Headers({
      ...(input.origin ? { origin: input.origin } : {}),
      ...(input.referer ? { referer: input.referer } : {}),
      ...(input.fetchSite ? { "sec-fetch-site": input.fetchSite } : {}),
      ...(input.authorization ? { authorization: input.authorization } : {})
    }),
    cookies: {
      get(name: string) {
        if (name === "zook_session" && input.hasCookieSession) {
          return { name, value: "session-token" };
        }
        return undefined;
      }
    },
    nextUrl: {
      origin: "https://zook.app"
    }
  };
}

describe("mutation safety", () => {
  it("allows same-origin cookie-authenticated writes", () => {
    expect(() =>
      assertSafeMutationRequest(
        createMutationRequest({
          origin: "https://zook.app",
          fetchSite: "same-origin",
          hasCookieSession: true
        }) as never
      )
    ).not.toThrow();
  });

  it("allows bearer-token writes without browser origin checks", () => {
    expect(() =>
      assertSafeMutationRequest(
        createMutationRequest({
          authorization: "Bearer token",
          hasCookieSession: false
        }) as never
      )
    ).not.toThrow();
  });

  it("blocks cross-site cookie-authenticated writes", () => {
    expect(() =>
      assertSafeMutationRequest(
        createMutationRequest({
          origin: "https://evil.example",
          fetchSite: "cross-site",
          hasCookieSession: true
        }) as never
      )
    ).toThrow(/Cross-site mutation blocked/);
  });
});

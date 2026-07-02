import { DEMO_MEMBER_EMAIL, DEMO_MEMBER_PHONE, getOfflineDemoSession } from "../../demo-mode";

const DEMO_SEEDED_IDENTIFIERS = new Set([
  DEMO_MEMBER_EMAIL,
  "member@zook.local",
  "owner@zook.local",
  "admin@zook.local",
  "reception@zook.local",
  "trainer@zook.local",
  "platform@zook.local",
]);

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
}

function demoSessionPayload() {
  return {
    token: "offline-demo-session",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    session: getOfflineDemoSession(),
  };
}

export function authDemoResponse(pathname: string, init: { body?: unknown; method?: string }) {
  if (pathname === "/auth/request-otp") {
    return {
      challengeId: "offline-demo-otp",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      devOtp: "000000",
    };
  }

  if (pathname === "/auth/verify-otp") {
    const body = demoBody(init);
    const identifier = String(body.identifier ?? "")
      .trim()
      .toLowerCase();
    const phoneIdentifier = String(body.identifier ?? "").replace(/\D/g, "");
    if (
      body.code !== "000000" ||
      !(
        DEMO_SEEDED_IDENTIFIERS.has(identifier) ||
        phoneIdentifier === DEMO_MEMBER_PHONE.replace(/\D/g, "")
      )
    ) {
      throw new Error(
        "Use a seeded @zook.local account or +91 98765 43210 with OTP 000000 for local test mode.",
      );
    }
    return demoSessionPayload();
  }

  if (pathname === "/auth/me") return getOfflineDemoSession();
  if (pathname === "/auth/logout") return { ok: true };
  if (pathname === "/auth/google/callback" || pathname === "/auth/apple/callback") {
    throw new Error(
      "Google / Apple sign-in is not available in local test mode. Use OTP with a seeded @zook.local address.",
    );
  }
  if (pathname === "/auth/refresh") {
    return demoSessionPayload();
  }

  return undefined;
}

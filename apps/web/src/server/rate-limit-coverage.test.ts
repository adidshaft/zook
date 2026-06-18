import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./api-router/core.ts", import.meta.url), "utf8");
const attendanceRouteSource = readFileSync(
  new URL("./api-router/attendance.ts", import.meta.url),
  "utf8",
);
const authRouteSource = readFileSync(new URL("./api-router/auth.ts", import.meta.url), "utf8");
const couponsReferralsRouteSource = readFileSync(
  new URL("./api-router/coupons-referrals.ts", import.meta.url),
  "utf8",
);
const filesRouteSource = readFileSync(new URL("./api-router/files.ts", import.meta.url), "utf8");
const organizationRootRouteSource = readFileSync(
  new URL("./api-router/organization-root.ts", import.meta.url),
  "utf8",
);
const organizationJoinRequestsRouteSource = readFileSync(
  new URL("./api-router/organization-join-requests.ts", import.meta.url),
  "utf8",
);
const privacyRouteSource = readFileSync(new URL("./api-router/privacy.ts", import.meta.url), "utf8");
const reportsRouteSource = readFileSync(new URL("./api-router/reports.ts", import.meta.url), "utf8");
const staffRouteSource = readFileSync(new URL("./api-router/staff.ts", import.meta.url), "utf8");

const sensitiveRoutes = [
  {
    label: "OTP request",
    needle: 'pathMatches(path, ["auth", "request-otp"])',
    source: authRouteSource,
    sourceLabel: "api-router/auth.ts",
  },
  {
    label: "OTP verify",
    needle: 'pathMatches(path, ["auth", "verify-otp"])',
    source: authRouteSource,
    sourceLabel: "api-router/auth.ts",
  },
  {
    label: "organization create",
    needle: 'pathMatches(path, ["orgs"])',
    source: organizationRootRouteSource,
    sourceLabel: "api-router/organization-root.ts",
  },
  {
    label: "file upload",
    needle: 'pathMatches(path, ["files", "upload"])',
    source: filesRouteSource,
    sourceLabel: "api-router/files.ts",
  },
  {
    label: "report export",
    needle: 'path[2] === "reports"',
    source: reportsRouteSource,
    sourceLabel: "api-router/reports.ts",
  },
  {
    label: "join request",
    needle: 'pathMatches(path, ["orgs", /.+/, "join-requests"])',
    source: organizationJoinRequestsRouteSource,
    sourceLabel: "api-router/organization-join-requests.ts",
  },
  { label: "payment session", needle: 'pathMatches(path, ["payments", "session", /.+/])' },
  {
    label: "QR scan",
    needle: 'pathMatches(path, ["attendance", "scan"])',
    source: attendanceRouteSource,
    sourceLabel: "api-router/attendance.ts",
  },
  { label: "manual payment", needle: 'pathMatches(path, ["orgs", /.+/, "manual-payments"])' },
  { label: "payment refund", needle: 'pathMatches(path, ["orgs", /.+/, "payments", /.+/, "refund"])' },
  { label: "platform payment refund", needle: 'pathMatches(path, ["platform", "payments", /.+/, "refund"])' },
  { label: "member subscription switch", needle: 'pathMatches(path, ["me", "subscriptions", /.+/, "switch"])' },
  { label: "org subscription switch", needle: 'pathMatches(path, ["orgs", /.+/, "subscriptions", /.+/, "switch"])' },
  {
    label: "saas subscription cancel",
    needle:
      'if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "saas-subscription", "cancel"]))'
  },
  { label: "autopay cancel", needle: 'pathMatches(path, ["me", "memberships", /.+/, "autopay"])' },
  {
    label: "coupon validate",
    needle: 'pathMatches(path, ["orgs", /.+/, "coupons", "validate"])',
    source: couponsReferralsRouteSource,
    sourceLabel: "api-router/coupons-referrals.ts",
  },
  {
    label: "staff invite",
    needle: 'pathMatches(path, ["orgs", /.+/, "staff", "invite"])',
    source: staffRouteSource,
    sourceLabel: "api-router/staff.ts",
  },
  { label: "AI request", needle: 'pathMatches(path, ["ai", "generate-plan"])' },
  { label: "notification preview", needle: 'pathMatches(path, ["orgs", /.+/, "notifications", "preview"])' },
  { label: "notification send", needle: 'pathMatches(path, ["orgs", /.+/, "notifications"])' },
  {
    label: "data export",
    needle: 'pathMatches(path, ["me", "data-export-request"])',
    source: privacyRouteSource,
    sourceLabel: "api-router/privacy.ts",
  },
  {
    label: "account deletion",
    needle: 'pathMatches(path, ["me", "account-deletion-request"])',
    source: privacyRouteSource,
    sourceLabel: "api-router/privacy.ts",
  },
];

describe("rate-limit route coverage", () => {
  it.each(sensitiveRoutes)("$label consumes a rate-limit bucket", ({ needle, source, sourceLabel }) => {
    const routeSource = source ?? routerSource;
    const label = sourceLabel ?? "api-router/core.ts";
    const routeStart = routeSource.indexOf(needle);
    expect(routeStart, `${needle} was not found in ${label}`).toBeGreaterThanOrEqual(0);
    const routeBody = routeSource.slice(routeStart, routeStart + 1800);
    expect(routeBody).toContain("assertRateLimit");
  });

  it("does not exempt seeded demo OTP flows from identifier rate limits", () => {
    const requestStart = authRouteSource.indexOf('pathMatches(path, ["auth", "request-otp"])');
    const requestBody = authRouteSource.slice(requestStart, requestStart + 1400);
    expect(requestBody).toContain('"otpRequestByIdentifier"');
    expect(requestBody).not.toContain("if (!seededDemoLogin)");

    const verifyStart = authRouteSource.indexOf('pathMatches(path, ["auth", "verify-otp"])');
    const verifyBody = authRouteSource.slice(verifyStart, verifyStart + 1400);
    expect(verifyBody).toContain('"otpVerifyByIdentifier"');
    expect(verifyBody).not.toContain("if (!isSeededDemoIdentifier(body.identifier))");
  });

  it("normalizes forwarded client IPs to the first hop", async () => {
    const { getForwardedClientIp } = await import("./context");
    expect(
      getForwardedClientIp({
        headers: new Headers({
          "x-forwarded-for": "198.51.100.10, 203.0.113.5"
        })
      })
    ).toBe("198.51.100.10");
  });
});

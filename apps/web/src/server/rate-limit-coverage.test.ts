import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./api-router/core.ts", import.meta.url), "utf8");

const sensitiveRoutes = [
  { label: "OTP request", needle: 'pathMatches(path, ["auth", "request-otp"])' },
  { label: "OTP verify", needle: 'pathMatches(path, ["auth", "verify-otp"])' },
  { label: "organization create", needle: 'pathMatches(path, ["orgs"])' },
  { label: "file upload", needle: 'pathMatches(path, ["files", "upload"])' },
  { label: "report export", needle: 'path[2] === "reports"' },
  { label: "join request", needle: 'pathMatches(path, ["orgs", /.+/, "join-requests"])' },
  { label: "payment session", needle: 'pathMatches(path, ["payments", "session", /.+/])' },
  { label: "QR scan", needle: 'pathMatches(path, ["attendance", "scan"])' },
  { label: "manual payment", needle: 'pathMatches(path, ["orgs", /.+/, "manual-payments"])' },
  { label: "staff invite", needle: 'pathMatches(path, ["orgs", /.+/, "staff", "invite"])' },
  { label: "AI request", needle: 'pathMatches(path, ["ai", "generate-plan"])' },
  { label: "notification preview", needle: 'pathMatches(path, ["orgs", /.+/, "notifications", "preview"])' },
  { label: "notification send", needle: 'pathMatches(path, ["orgs", /.+/, "notifications"])' },
  { label: "data export", needle: 'pathMatches(path, ["me", "data-export-request"])' },
  { label: "account deletion", needle: 'pathMatches(path, ["me", "account-deletion-request"])' },
];

describe("rate-limit route coverage", () => {
  it.each(sensitiveRoutes)("$label consumes a rate-limit bucket", ({ needle }) => {
    const routeStart = routerSource.indexOf(needle);
    expect(routeStart, `${needle} was not found in api-router/core.ts`).toBeGreaterThanOrEqual(0);
    const routeBody = routerSource.slice(routeStart, routeStart + 1800);
    expect(routeBody).toContain("assertRateLimit");
  });

  it("does not exempt seeded demo OTP flows from identifier rate limits", () => {
    const requestStart = routerSource.indexOf('pathMatches(path, ["auth", "request-otp"])');
    const requestBody = routerSource.slice(requestStart, requestStart + 1400);
    expect(requestBody).toContain('"otpRequestByIdentifier"');
    expect(requestBody).not.toContain("if (!seededDemoLogin)");

    const verifyStart = routerSource.indexOf('pathMatches(path, ["auth", "verify-otp"])');
    const verifyBody = routerSource.slice(verifyStart, verifyStart + 1400);
    expect(verifyBody).toContain('"otpVerifyByIdentifier"');
    expect(verifyBody).not.toContain("if (!isSeededDemoIdentifier(body.identifier))");
  });
});

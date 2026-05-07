import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./api-router.ts", import.meta.url), "utf8");

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
    expect(routeStart, `${needle} was not found in api-router.ts`).toBeGreaterThanOrEqual(0);
    const routeBody = routerSource.slice(routeStart, routeStart + 1800);
    expect(routeBody).toContain("assertRateLimit");
  });
});

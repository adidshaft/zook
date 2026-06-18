import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  currentRequestId,
  getRequestState,
  mergeRequestLogContext,
  runWithRequestState,
} from "./request-state";

const runtimeSource = readFileSync(new URL("./api-router/runtime.ts", import.meta.url), "utf8");
const readinessSource = readFileSync(new URL("./readiness.ts", import.meta.url), "utf8");

describe("structured request logging", () => {
  it("keeps request identity and auth metadata in async request state", async () => {
    await runWithRequestState({ requestId: "req_test" }, async () => {
      mergeRequestLogContext({ userId: "usr_1", orgId: "org_1" });

      expect(currentRequestId()).toBe("req_test");
      expect(getRequestState()).toMatchObject({
        requestId: "req_test",
        userId: "usr_1",
        orgId: "org_1",
      });
    });
  });

  it("logs structured request fields on success, not-found, and error responses", () => {
    expect(runtimeSource).toContain("function apiLogMeta(path: string[])");
    expect(runtimeSource).toContain("getRequestState()");
    expect(runtimeSource).toContain("userId: state.userId");
    expect(runtimeSource).toContain("orgId: state.orgId");
    expect(runtimeSource).toContain("method: request.method");
    expect(runtimeSource).toContain("status: response.status");
    expect(runtimeSource).toContain("durationMs: Date.now() - startedAt");
    expect(runtimeSource).toContain('path: `/${path.join("/")}`');
    expect(runtimeSource).toContain('path: `/${rawPath.join("/")}`');
  });

  it("keeps health as liveness and readiness as the dependency-gated probe", () => {
    const healthStart = readinessSource.indexOf("export function getHealthPayload()");
    const readinessStart = readinessSource.indexOf("export async function getReadinessPayload()");
    expect(healthStart).toBeGreaterThanOrEqual(0);
    expect(readinessStart).toBeGreaterThan(healthStart);

    const healthBody = readinessSource.slice(healthStart, readinessStart);
    const readinessBody = readinessSource.slice(readinessStart);
    expect(healthBody).toContain("alive: true");
    expect(healthBody).not.toContain("$queryRawUnsafe");
    expect(readinessBody).toContain('select 1 as ready');
    expect(readinessBody).toContain('from "_prisma_migrations"');
  });
});

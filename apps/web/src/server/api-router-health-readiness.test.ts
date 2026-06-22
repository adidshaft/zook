import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockProvider = {
    selectedProvider: "mock",
    activeProvider: "mock",
    status: "ready",
    mode: "mock",
    configured: true,
} as const;

const mockRuntimeProvider = {
  selectedProvider: "memory",
  activeProvider: "memory",
  status: "ready",
  configured: true,
  missingEnv: [] as string[],
  mode: "local",
} as const;

const providerDiagnostics = {
  ai: mockProvider,
  email: mockProvider,
  map: mockProvider,
  payment: mockProvider,
  push: mockProvider,
  sms: mockProvider,
  storage: mockProvider,
  whatsapp: mockProvider,
  rateLimit: mockRuntimeProvider,
  serverCache: mockRuntimeProvider,
};

vi.mock("./readiness", () => ({
  getHealthPayload: () => ({ ok: true, service: "zook-web" }),
  getReadinessPayload: vi.fn(async () => ({
    ready: true,
    version: "0.1.0",
    envProfile: "test",
    timestamp: "2026-06-18T00:00:00.000Z",
    prisma: { clientReady: true },
    database: { reachable: true, schemaReady: true, migrationStatus: "applied" },
    providers: providerDiagnostics,
  })),
  getStatusPayload: vi.fn(async () => ({
    status: "operational",
    components: { web: { status: "operational" } },
  })),
}));

function request(method: string, path: string) {
  return new NextRequest(`https://zook.test/api/${path}`, { method });
}

describe("health/readiness API route handler", () => {
  it("returns the health payload without falling through to the monolith", async () => {
    const { handleHealthReadiness } = await import("./api-router/health-readiness");

    const response = await handleHealthReadiness(request("GET", "health"), ["health"]);

    expect(response?.status).toBe(200);
    await expect(response?.json()).resolves.toMatchObject({
      ok: true,
      data: { ok: true, service: "zook-web" },
    });
  });

  it("preserves readiness status semantics", async () => {
    const readiness = await import("./readiness");
    vi.mocked(readiness.getReadinessPayload).mockResolvedValueOnce({
      ready: false,
      version: "0.1.0",
      envProfile: "test",
      timestamp: "2026-06-18T00:00:00.000Z",
      prisma: { clientReady: true },
      database: { reachable: false, schemaReady: false },
      providers: providerDiagnostics,
    });
    const { handleHealthReadiness } = await import("./api-router/health-readiness");

    const response = await handleHealthReadiness(request("GET", "ready"), ["ready"]);

    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toMatchObject({
      ok: true,
      data: {
        ready: false,
        database: { reachable: false, schemaReady: false },
      },
    });
  });

  it("returns undefined for unrelated routes so the registry can continue dispatching", async () => {
    const { handleHealthReadiness } = await import("./api-router/health-readiness");

    await expect(handleHealthReadiness(request("GET", "me"), ["me"])).resolves.toBeUndefined();
  });
});

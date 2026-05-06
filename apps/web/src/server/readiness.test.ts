import { describe, expect, it, vi } from "vitest";

vi.mock("@zook/db", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(async () => {
      throw new Error("postgresql://zook:secret@db.internal:5432/zook");
    }),
  },
}));

vi.mock("./request-logger", () => ({
  summarizeProviderDiagnostics: () => ({
    payment: {
      selectedProvider: "mock",
      activeProvider: "mock",
      status: "ready",
      mode: "mock",
      configured: true,
    },
    push: {
      selectedProvider: "mock",
      activeProvider: "mock",
      status: "ready",
      mode: "mock",
      configured: true,
    },
    ai: {
      selectedProvider: "mock",
      activeProvider: "mock",
      status: "ready",
      mode: "mock",
      configured: true,
    },
    storage: {
      selectedProvider: "mock",
      activeProvider: "mock",
      status: "ready",
      mode: "mock",
      configured: true,
    },
  }),
}));

describe("readiness payload", () => {
  it("redacts raw database error details", async () => {
    const { getReadinessPayload } = await import("./readiness");

    const payload = await getReadinessPayload();
    const serialized = JSON.stringify(payload);

    expect(payload.database).toMatchObject({
      reachable: false,
      error: "Database readiness check failed.",
      errorCode: "Error",
    });
    expect(serialized).not.toContain("postgresql://");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("db.internal");
  });

  it("returns a public status component payload", async () => {
    const { getStatusPayload } = await import("./readiness");

    const payload = await getStatusPayload();

    expect(payload).toMatchObject({
      status: "down",
      components: {
        web: { status: "operational" },
        db: { status: "down" },
        razorpay: { status: "degraded", provider: "mock" },
      },
    });
  });
});

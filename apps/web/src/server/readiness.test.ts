import { afterEach, describe, expect, it, vi } from "vitest";

let queryHandler: (query: string) => Promise<unknown> = async () => {
  throw new Error("postgresql://zook:secret@db.internal:5432/zook");
};

vi.mock("@zook/db", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn((query: string) => queryHandler(query)),
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
  afterEach(() => {
    vi.resetModules();
    queryHandler = async () => {
      throw new Error("postgresql://zook:secret@db.internal:5432/zook");
    };
  });

  it("redacts raw database error details", async () => {
    const { getReadinessPayload } = await import("./readiness");

    const payload = await getReadinessPayload();
    const serialized = JSON.stringify(payload);

    expect(payload.database).toMatchObject({
      reachable: false,
      schemaReady: false,
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

  it("fails readiness when required migrations have not been applied", async () => {
    queryHandler = async (query: string) => {
      if (query.includes("select 1")) {
        return [{ ready: 1 }];
      }
      return [
        { migration_name: "20260524160000_phase2_platform_console" },
        { migration_name: "20260524200000_phase5_saas_upgrade" },
      ];
    };
    const { getReadinessPayload, getStatusPayload } = await import("./readiness");

    const readiness = await getReadinessPayload();
    expect(readiness.ready).toBe(false);
    expect(readiness.database).toMatchObject({
      reachable: true,
      schemaReady: false,
      migrationStatus: "pending",
    });
    expect("missingRequiredMigrations" in readiness.database).toBe(true);
    if ("missingRequiredMigrations" in readiness.database) {
      expect(readiness.database.missingRequiredMigrations).toContain(
        "20260524233000_phase10_referral_polish",
      );
    }

    const status = await getStatusPayload();
    expect(status.components.db).toMatchObject({
      status: "down",
      detail: "Database is reachable, but required migrations are missing.",
    });
  });

  it("passes readiness only when the database and required migrations are ready", async () => {
    queryHandler = async (query: string) => {
      if (query.includes("select 1")) {
        return [{ ready: 1 }];
      }
      return [
        { migration_name: "20260524160000_phase2_platform_console" },
        { migration_name: "20260524200000_phase5_saas_upgrade" },
        { migration_name: "20260524210000_phase6_invoice_sequences" },
        { migration_name: "20260524220000_phase7_branch_backfill" },
        { migration_name: "20260524230000_phase9_trainer_payouts" },
        { migration_name: "20260524233000_phase10_referral_polish" },
      ];
    };
    const { getReadinessPayload } = await import("./readiness");

    await expect(getReadinessPayload()).resolves.toMatchObject({
      ready: true,
      database: {
        reachable: true,
        schemaReady: true,
        migrationStatus: "applied",
      },
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InMemoryRateLimitStore,
  RedisRateLimitStore,
  UpstashRateLimitStore,
  assertRateLimit,
  defaultRateLimitRules,
  getRateLimitDiagnostics,
  getRateLimitStore,
} from "./rate-limit";

describe("rate limits", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T00:00:00.000Z"));
    delete process.env.APP_ENV;
    process.env.RATE_LIMIT_PROVIDER = "memory";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.REDIS_URL;
    const globalState = globalThis as unknown as {
      zookRateLimitStore?: InMemoryRateLimitStore;
      zookRateLimitProvider?: string;
    };
    globalState.zookRateLimitStore = new InMemoryRateLimitStore();
    globalState.zookRateLimitProvider = "memory";
    vi.restoreAllMocks();
  });

  it("blocks otp requests after the configured threshold", async () => {
    for (let attempt = 0; attempt < defaultRateLimitRules.otpRequestByEmail.limit; attempt += 1) {
      await expect(assertRateLimit("otpRequestByEmail", "member@zook.local")).resolves.toBeTruthy();
    }

    await expect(assertRateLimit("otpRequestByEmail", "member@zook.local")).rejects.toThrow(/Too many requests/i);
  });

  it("applies the referral redeem rule", async () => {
    for (let attempt = 0; attempt < defaultRateLimitRules.referralRedeemByActor.limit; attempt += 1) {
      await expect(assertRateLimit("referralRedeemByActor", "org_1:user_1")).resolves.toBeTruthy();
    }

    await expect(assertRateLimit("referralRedeemByActor", "org_1:user_1")).rejects.toThrow(
      /Too many requests/i,
    );
  });

  it("allows a full report pack plus retries per actor per day", async () => {
    expect(defaultRateLimitRules.reportExportByActor).toMatchObject({
      limit: 50,
      windowMs: 24 * 60 * 60 * 1000,
    });
    for (let attempt = 0; attempt < defaultRateLimitRules.reportExportByActor.limit; attempt += 1) {
      await expect(assertRateLimit("reportExportByActor", "org_1:user_1")).resolves.toBeTruthy();
    }

    await expect(assertRateLimit("reportExportByActor", "org_1:user_1")).rejects.toThrow(
      /Too many requests/i,
    );
  });

  it("allows a desk-appropriate volume of manual payments per actor per day", async () => {
    expect(defaultRateLimitRules.manualPaymentByActorOrg).toMatchObject({
      limit: 50,
      windowMs: 24 * 60 * 60 * 1000,
    });
    for (let attempt = 0; attempt < defaultRateLimitRules.manualPaymentByActorOrg.limit; attempt += 1) {
      await expect(assertRateLimit("manualPaymentByActorOrg", "org_1:user_1")).resolves.toBeTruthy();
    }

    await expect(assertRateLimit("manualPaymentByActorOrg", "org_1:user_1")).rejects.toThrow(
      /Too many requests/i,
    );
  });


  it("resets the bucket after the window passes", async () => {
    for (let attempt = 0; attempt < defaultRateLimitRules.aiRequestByUser.limit; attempt += 1) {
      await assertRateLimit("aiRequestByUser", "user_1");
    }

    await expect(assertRateLimit("aiRequestByUser", "user_1")).rejects.toThrow(/Too many requests/i);

    vi.advanceTimersByTime(defaultRateLimitRules.aiRequestByUser.windowMs + 1);

    await expect(assertRateLimit("aiRequestByUser", "user_1")).resolves.toBeTruthy();
    expect(getRateLimitStore()).toBeInstanceOf(InMemoryRateLimitStore);
  });

  it("exposes safe distributed diagnostics without secrets", () => {
    process.env.RATE_LIMIT_PROVIDER = "upstash";
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "super-secret-token";

    const diagnostics = getRateLimitDiagnostics();
    const serialized = JSON.stringify(diagnostics);

    expect(diagnostics).toMatchObject({
      selectedProvider: "upstash",
      activeProvider: "upstash",
      status: "ready",
      configured: true,
      mode: "distributed"
    });
    expect(serialized).not.toContain("super-secret-token");
    expect(serialized).not.toContain("example.upstash.io");
  });

  it("exposes Redis diagnostics without leaking the endpoint", () => {
    process.env.RATE_LIMIT_PROVIDER = "redis";
    process.env.REDIS_URL = "redis://cache.internal:6379";

    const diagnostics = getRateLimitDiagnostics();
    const serialized = JSON.stringify(diagnostics);

    expect(diagnostics).toMatchObject({
      selectedProvider: "redis",
      activeProvider: "redis",
      status: "ready",
      configured: true,
      mode: "distributed",
    });
    expect(serialized).not.toContain("cache.internal");
  });

  it("uses the Redis provider when configured", () => {
    process.env.RATE_LIMIT_PROVIDER = "redis";
    process.env.REDIS_URL = "redis://cache.internal:6379";
    const globalState = globalThis as unknown as {
      zookRateLimitStore?: InMemoryRateLimitStore;
      zookRateLimitProvider?: string;
    };
    delete globalState.zookRateLimitStore;
    delete globalState.zookRateLimitProvider;

    expect(getRateLimitStore()).toBeInstanceOf(RedisRateLimitStore);
  });

  it("uses the Upstash REST transaction provider when configured", async () => {
    process.env.RATE_LIMIT_PROVIDER = "upstash";
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "super-secret-token";
    const globalState = globalThis as unknown as {
      zookRateLimitStore?: InMemoryRateLimitStore;
      zookRateLimitProvider?: string;
    };
    delete globalState.zookRateLimitStore;
    delete globalState.zookRateLimitProvider;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ result: "OK" }, { result: 1 }, { result: 60_000 }]
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    await expect(assertRateLimit("paymentSessionByActor", "owner_1")).resolves.toMatchObject({ count: 1 });

    expect(getRateLimitStore()).toBeInstanceOf(UpstashRateLimitStore);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.upstash.io/multi-exec",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer super-secret-token"
        })
      })
    );
  });

  it("rejects local or disabled rate limiting in production diagnostics", async () => {
    process.env.APP_ENV = "production";
    process.env.RATE_LIMIT_PROVIDER = "memory";

    expect(getRateLimitDiagnostics()).toMatchObject({
      selectedProvider: "memory",
      activeProvider: null,
      status: "misconfigured",
      configured: false,
    });
    await expect(assertRateLimit("publicOrgSearchByIp", "127.0.0.1")).rejects.toThrow(
      /Too many requests/i,
    );

    process.env.RATE_LIMIT_PROVIDER = "disabled";
    expect(getRateLimitDiagnostics()).toMatchObject({
      selectedProvider: "disabled",
      activeProvider: null,
      status: "misconfigured",
      configured: false,
    });
  });

  it("fails closed when the active rate-limit provider errors", async () => {
    const globalState = globalThis as unknown as {
      zookRateLimitStore?: { consume: (key: string, rule: { limit: number; windowMs: number }) => Promise<never> };
      zookRateLimitProvider?: string;
    };
    globalState.zookRateLimitStore = {
      async consume() {
        throw new Error("provider offline");
      },
    };
    globalState.zookRateLimitProvider = "memory";

    await expect(assertRateLimit("paymentSessionByActor", "owner_1")).rejects.toThrow(
      /Too many requests\. Please try again shortly\./i,
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MemoryServerCacheStore,
  RedisServerCacheStore,
  UpstashServerCacheStore,
  cachedJson,
  getServerCacheDiagnostics,
  getServerCacheStore,
} from "./server-cache";

describe("server cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T00:00:00.000Z"));
    process.env.SERVER_CACHE_PROVIDER = "memory";
    delete process.env.CACHE_PROVIDER;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.REDIS_URL;
    const globalState = globalThis as unknown as {
      zookServerCacheStore?: unknown;
      zookServerCacheProvider?: string;
      zookServerCacheMemory?: Map<string, unknown>;
    };
    delete globalState.zookServerCacheStore;
    delete globalState.zookServerCacheProvider;
    globalState.zookServerCacheMemory = new Map();
    vi.restoreAllMocks();
  });

  it("caches JSON loader results in memory until ttl expires", async () => {
    const loader = vi.fn(async () => ({ ok: true, timestamp: Date.now() }));

    await expect(cachedJson("dashboard:org", 10, loader)).resolves.toMatchObject({ ok: true });
    await expect(cachedJson("dashboard:org", 10, loader)).resolves.toMatchObject({ ok: true });
    expect(loader).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10_001);
    await cachedJson("dashboard:org", 10, loader);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(getServerCacheStore()).toBeInstanceOf(MemoryServerCacheStore);
  });

  it("exposes distributed cache diagnostics without secrets", () => {
    process.env.SERVER_CACHE_PROVIDER = "upstash";
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "super-secret-token";

    const diagnostics = getServerCacheDiagnostics();
    const serialized = JSON.stringify(diagnostics);

    expect(diagnostics).toMatchObject({
      selectedProvider: "upstash",
      activeProvider: "upstash",
      status: "ready",
      configured: true,
      mode: "distributed",
    });
    expect(serialized).not.toContain("super-secret-token");
    expect(serialized).not.toContain("example.upstash.io");
  });

  it("exposes Redis cache diagnostics without leaking the endpoint", () => {
    process.env.SERVER_CACHE_PROVIDER = "redis";
    process.env.REDIS_URL = "redis://cache.internal:6379";

    const diagnostics = getServerCacheDiagnostics();
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

  it("uses the Redis cache provider when configured", () => {
    process.env.SERVER_CACHE_PROVIDER = "redis";
    process.env.REDIS_URL = "redis://cache.internal:6379";

    expect(getServerCacheStore()).toBeInstanceOf(RedisServerCacheStore);
  });

  it("uses the Upstash REST provider when configured", async () => {
    process.env.SERVER_CACHE_PROVIDER = "upstash";
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "super-secret-token";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ result: null }),
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    await expect(cachedJson("cache-key", 30, async () => ({ value: 1 }))).resolves.toEqual({
      value: 1,
    });

    expect(getServerCacheStore()).toBeInstanceOf(UpstashServerCacheStore);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.upstash.io",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer super-secret-token",
        }),
      }),
    );
  });
});

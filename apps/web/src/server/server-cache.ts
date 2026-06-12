import Redis from "ioredis";

export type ServerCacheProvider = "memory" | "upstash" | "redis" | "disabled";

export type ServerCacheDiagnostics = {
  selectedProvider: ServerCacheProvider;
  activeProvider: ServerCacheProvider | null;
  status: "ready" | "misconfigured" | "disabled" | "unsupported";
  configured: boolean;
  missingEnv: string[];
  mode: "local" | "distributed" | "disabled";
};

export interface ServerCacheStore {
  readonly providerName: ServerCacheProvider;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

type CacheRecord = {
  expiresAt: number;
  value: unknown;
};

const globalForCache = globalThis as unknown as {
  zookServerCacheStore?: ServerCacheStore;
  zookServerCacheProvider?: string;
  zookServerCacheMemory?: Map<string, CacheRecord>;
  zookServerCacheInflight?: Map<string, Promise<unknown>>;
};

export class MemoryServerCacheStore implements ServerCacheStore {
  readonly providerName = "memory" as const;

  private readonly records =
    globalForCache.zookServerCacheMemory ?? new Map<string, CacheRecord>();

  constructor() {
    globalForCache.zookServerCacheMemory = this.records;
  }

  async get<T>(key: string) {
    const record = this.records.get(key);
    if (!record) {
      return null;
    }
    if (record.expiresAt <= Date.now()) {
      this.records.delete(key);
      return null;
    }
    return record.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    this.records.set(key, {
      value,
      expiresAt: Date.now() + Math.max(ttlSeconds, 1) * 1000,
    });
  }

  async delete(key: string) {
    this.records.delete(key);
  }
}

type UpstashCommandResponse<T = unknown> = { result?: T; error?: string };

export class UpstashServerCacheStore implements ServerCacheStore {
  readonly providerName = "upstash" as const;

  constructor(private readonly input: { url: string; token: string; namespace?: string }) {}

  async get<T>(key: string) {
    const response = await this.command<unknown>(["GET", this.cacheKey(key)]);
    if (response === null || response === undefined) {
      return null;
    }
    if (typeof response !== "string") {
      return null;
    }
    return JSON.parse(response) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    await this.command(["SET", this.cacheKey(key), JSON.stringify(value), "EX", Math.max(ttlSeconds, 1)]);
  }

  async delete(key: string) {
    await this.command(["DEL", this.cacheKey(key)]);
  }

  private cacheKey(key: string) {
    return `${this.input.namespace ?? "zook"}:cache:${key}`;
  }

  private async command<T>(command: unknown[]) {
    const response = await fetch(`${this.input.url.replace(/\/+$/, "")}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.input.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(command),
    });
    if (!response.ok) {
      throw new Error(`Cache provider request failed with HTTP ${response.status}.`);
    }
    const payload = (await response.json()) as UpstashCommandResponse<T>;
    if (payload.error) {
      throw new Error("Cache provider command failed.");
    }
    return payload.result as T;
  }
}

export class RedisServerCacheStore implements ServerCacheStore {
  readonly providerName = "redis" as const;

  private readonly redis: Redis;

  constructor(private readonly input: { url: string; namespace?: string }) {
    this.redis = new Redis(input.url, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
  }

  async get<T>(key: string) {
    const value = await this.redis.get(this.cacheKey(key));
    return value ? (JSON.parse(value) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    await this.redis.set(this.cacheKey(key), JSON.stringify(value), "EX", Math.max(ttlSeconds, 1));
  }

  async delete(key: string) {
    await this.redis.del(this.cacheKey(key));
  }

  private cacheKey(key: string) {
    return `${this.input.namespace ?? "zook"}:cache:${key}`;
  }
}

function normalizeProvider(value?: string | null): ServerCacheProvider | "unsupported" {
  switch (value?.trim().toLowerCase() || "memory") {
    case "memory":
    case "local":
      return "memory";
    case "upstash":
      return "upstash";
    case "redis":
    case "elasticache":
    case "valkey":
      return "redis";
    case "disabled":
    case "off":
      return "disabled";
    default:
      return "unsupported";
  }
}

export function getServerCacheDiagnostics(
  env: NodeJS.ProcessEnv = process.env,
): ServerCacheDiagnostics {
  const selectedProvider = normalizeProvider(env.SERVER_CACHE_PROVIDER ?? env.CACHE_PROVIDER);
  if (selectedProvider === "unsupported") {
    return {
      selectedProvider: "memory",
      activeProvider: null,
      status: "unsupported",
      configured: false,
      missingEnv: [],
      mode: "local",
    };
  }
  if (selectedProvider === "disabled") {
    return {
      selectedProvider,
      activeProvider: null,
      status: "disabled",
      configured: false,
      missingEnv: [],
      mode: "disabled",
    };
  }
  if (selectedProvider === "upstash") {
    const missingEnv = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"].filter(
      (key) => !env[key]?.trim(),
    );
    return {
      selectedProvider,
      activeProvider: missingEnv.length ? null : "upstash",
      status: missingEnv.length ? "misconfigured" : "ready",
      configured: missingEnv.length === 0,
      missingEnv,
      mode: "distributed",
    };
  }
  if (selectedProvider === "redis") {
    const missingEnv = ["REDIS_URL"].filter((key) => !env[key]?.trim());
    return {
      selectedProvider,
      activeProvider: missingEnv.length ? null : "redis",
      status: missingEnv.length ? "misconfigured" : "ready",
      configured: missingEnv.length === 0,
      missingEnv,
      mode: "distributed",
    };
  }
  return {
    selectedProvider,
    activeProvider: "memory",
    status: "ready",
    configured: true,
    missingEnv: [],
    mode: "local",
  };
}

export function getServerCacheStore() {
  const diagnostics = getServerCacheDiagnostics();
  const cacheKey = diagnostics.selectedProvider;
  if (
    globalForCache.zookServerCacheStore &&
    globalForCache.zookServerCacheProvider === cacheKey
  ) {
    return globalForCache.zookServerCacheStore;
  }
  if (diagnostics.status === "disabled" || diagnostics.status === "misconfigured") {
    globalForCache.zookServerCacheStore = {
      providerName: "disabled",
      async get() {
        return null;
      },
      async set() {},
      async delete() {},
    };
  } else if (diagnostics.status === "ready" && diagnostics.selectedProvider === "upstash") {
    const namespace =
      process.env.SERVER_CACHE_NAMESPACE?.trim() || process.env.RATE_LIMIT_NAMESPACE?.trim();
    globalForCache.zookServerCacheStore = new UpstashServerCacheStore({
      url: process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "",
      ...(namespace ? { namespace } : {}),
    });
  } else if (diagnostics.status === "ready" && diagnostics.selectedProvider === "redis") {
    const namespace =
      process.env.SERVER_CACHE_NAMESPACE?.trim() || process.env.RATE_LIMIT_NAMESPACE?.trim();
    globalForCache.zookServerCacheStore = new RedisServerCacheStore({
      url: process.env.REDIS_URL?.trim() ?? "",
      ...(namespace ? { namespace } : {}),
    });
  } else {
    globalForCache.zookServerCacheStore = new MemoryServerCacheStore();
  }
  globalForCache.zookServerCacheProvider = cacheKey;
  return globalForCache.zookServerCacheStore;
}

export async function cachedJson<T>(key: string, ttlSeconds: number, loader: () => Promise<T>) {
  const store = getServerCacheStore();
  const cached = await store.get<T>(key);
  if (cached !== null) {
    return cached;
  }
  const inflight =
    globalForCache.zookServerCacheInflight ?? new Map<string, Promise<unknown>>();
  globalForCache.zookServerCacheInflight = inflight;
  const existing = inflight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  const pending = (async () => {
    const value = await loader();
    await store.set(key, value, ttlSeconds).catch(() => undefined);
    return value;
  })();
  inflight.set(key, pending);
  try {
    return await pending;
  } finally {
    inflight.delete(key);
  }
}

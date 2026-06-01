import { rateLimitedError } from "./errors";

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export interface RateLimitStore {
  readonly providerName: RateLimitProvider;
  consume(
    key: string,
    rule: RateLimitRule,
  ): Promise<{ allowed: boolean; count: number; resetAt: number }>;
}

export type RateLimitProvider = "memory" | "upstash" | "disabled";

export type RateLimitDiagnostics = {
  selectedProvider: RateLimitProvider;
  activeProvider: RateLimitProvider | null;
  status: "ready" | "misconfigured" | "disabled" | "unsupported";
  configured: boolean;
  missingEnv: string[];
  mode: "local" | "distributed" | "disabled";
};

type BucketRecord = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  zookRateLimitStore?: RateLimitStore;
  zookRateLimitProvider?: string;
};

export const defaultRateLimitRules = {
  otpRequestByEmail: { limit: 4, windowMs: 10 * 60 * 1000 },
  otpRequestByIdentifier: { limit: 4, windowMs: 10 * 60 * 1000 },
  otpRequestByIp: { limit: 8, windowMs: 10 * 60 * 1000 },
  otpVerifyByEmail: { limit: 8, windowMs: 10 * 60 * 1000 },
  otpVerifyByIdentifier: { limit: 8, windowMs: 10 * 60 * 1000 },
  otpVerifyByIp: { limit: 12, windowMs: 10 * 60 * 1000 },
  aiRequestByUser: { limit: 20, windowMs: 10 * 60 * 1000 },
  notificationSendByActor: { limit: 12, windowMs: 10 * 60 * 1000 },
  paymentSessionByActor: { limit: 12, windowMs: 10 * 60 * 1000 },
  pushRegisterByActor: { limit: 10, windowMs: 10 * 60 * 1000 },
  guardianConsentByActor: { limit: 6, windowMs: 30 * 60 * 1000 },
  privacyRequestByActor: { limit: 6, windowMs: 60 * 60 * 1000 },
  reportExportByActor: { limit: 50, windowMs: 24 * 60 * 60 * 1000 },
  fileUploadByActor: { limit: 24, windowMs: 10 * 60 * 1000 },
  qrScanByActor: { limit: 20, windowMs: 5 * 60 * 1000 },
  qrScanByToken: { limit: 8, windowMs: 2 * 60 * 1000 },
  memberListByActor: { limit: 30, windowMs: 60 * 1000 },
  organizationCreateByActor: { limit: 1, windowMs: 24 * 60 * 60 * 1000 },
  publicOrgSearchByIp: { limit: 100, windowMs: 60 * 1000 },
  joinRequestByActorOrg: { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
  manualPaymentByActorOrg: { limit: 2, windowMs: 24 * 60 * 60 * 1000 },
  referralRedeemByActor: { limit: 5, windowMs: 24 * 60 * 60 * 1000 },
  staffInviteByActorOrg: { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
  branchCreationByOwner: { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
  branchCreationBurstByOwner: { limit: 1, windowMs: 60 * 1000 },
  notificationOrgAllDaily: { limit: 50, windowMs: 24 * 60 * 60 * 1000 },
  notificationOrgOperationalDaily: { limit: 5, windowMs: 24 * 60 * 60 * 1000 },
  notificationOrgPromoDaily: { limit: 2, windowMs: 24 * 60 * 60 * 1000 },
  notificationSenderDaily: { limit: 25, windowMs: 24 * 60 * 60 * 1000 },
  notificationSenderMinute: { limit: 4, windowMs: 60 * 1000 },
  notificationRecipientDaily: { limit: 4, windowMs: 24 * 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;

export class InMemoryRateLimitStore implements RateLimitStore {
  readonly providerName = "memory" as const;

  private readonly buckets = new Map<string, BucketRecord>();

  async consume(key: string, rule: RateLimitRule) {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      const next: BucketRecord = {
        count: 1,
        resetAt: now + rule.windowMs,
      };
      this.buckets.set(key, next);
      return { allowed: true, count: next.count, resetAt: next.resetAt };
    }

    current.count += 1;
    this.buckets.set(key, current);
    return {
      allowed: current.count <= rule.limit,
      count: current.count,
      resetAt: current.resetAt,
    };
  }
}

type UpstashRestResponse = Array<{ result?: unknown; error?: string }> | { error?: string };

export class UpstashRateLimitStore implements RateLimitStore {
  readonly providerName = "upstash" as const;

  constructor(private readonly input: { url: string; token: string; namespace?: string }) {}

  async consume(key: string, rule: RateLimitRule) {
    const redisKey = `${this.input.namespace ?? "zook"}:rate-limit:${key}`;
    const response = await fetch(`${this.input.url.replace(/\/+$/, "")}/multi-exec`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.input.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([
        ["SET", redisKey, 0, "PX", rule.windowMs, "NX"],
        ["INCR", redisKey],
        ["PTTL", redisKey],
      ]),
    });

    if (!response.ok) {
      throw new Error(`Rate limit provider request failed with HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as UpstashRestResponse;
    if (!Array.isArray(payload)) {
      throw new Error("Rate limit provider transaction failed.");
    }

    const providerError = payload.find((item) => item.error)?.error;
    if (providerError) {
      throw new Error("Rate limit provider command failed.");
    }

    const count = Number(payload[1]?.result ?? 0);
    const ttl = Number(payload[2]?.result ?? rule.windowMs);
    const resetAt = Date.now() + Math.max(ttl > 0 ? ttl : rule.windowMs, 1);

    return {
      allowed: count <= rule.limit,
      count,
      resetAt,
    };
  }
}

function normalizeRateLimitProvider(value?: string | null): RateLimitProvider | "unsupported" {
  switch (value?.trim().toLowerCase() || "memory") {
    case "memory":
    case "local":
      return "memory";
    case "upstash":
    case "redis":
      return "upstash";
    case "disabled":
    case "off":
      return "disabled";
    default:
      return "unsupported";
  }
}

function isProductionAppEnv(env: NodeJS.ProcessEnv) {
  return ["production", "prod"].includes(env.APP_ENV?.trim().toLowerCase() ?? "");
}

export function getRateLimitDiagnostics(
  env: NodeJS.ProcessEnv = process.env,
): RateLimitDiagnostics {
  const selectedProvider = normalizeRateLimitProvider(env.RATE_LIMIT_PROVIDER);
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
  if (isProductionAppEnv(env) && (selectedProvider === "memory" || selectedProvider === "disabled")) {
    return {
      selectedProvider,
      activeProvider: null,
      status: "misconfigured",
      configured: false,
      missingEnv: ["RATE_LIMIT_PROVIDER"],
      mode: selectedProvider === "disabled" ? "disabled" : "local",
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
  return {
    selectedProvider,
    activeProvider: "memory",
    status: "ready",
    configured: true,
    missingEnv: [],
    mode: "local",
  };
}

export function getRateLimitStore() {
  const diagnostics = getRateLimitDiagnostics();
  const cacheKey = diagnostics.selectedProvider;
  if (
    globalForRateLimit.zookRateLimitStore &&
    globalForRateLimit.zookRateLimitProvider === cacheKey
  ) {
    return globalForRateLimit.zookRateLimitStore;
  }

  if (diagnostics.status === "disabled") {
    globalForRateLimit.zookRateLimitStore = {
      providerName: "disabled",
      async consume() {
        return { allowed: true, count: 0, resetAt: Date.now() };
      },
    };
  } else if (diagnostics.status === "ready" && diagnostics.selectedProvider === "upstash") {
    const namespace = process.env.RATE_LIMIT_NAMESPACE?.trim();
    globalForRateLimit.zookRateLimitStore = new UpstashRateLimitStore({
      url: process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "",
      ...(namespace ? { namespace } : {}),
    });
  } else {
    globalForRateLimit.zookRateLimitStore = new InMemoryRateLimitStore();
  }
  globalForRateLimit.zookRateLimitProvider = cacheKey;
  return globalForRateLimit.zookRateLimitStore;
}

export async function assertRateLimit(
  ruleName: keyof typeof defaultRateLimitRules,
  identity: string,
  message?: string,
) {
  const rule = defaultRateLimitRules[ruleName];
  const diagnostics = getRateLimitDiagnostics();
  if (diagnostics.status === "misconfigured" || diagnostics.status === "unsupported") {
    throw rateLimitedError("Too many requests. Please try again shortly.");
  }

  const result = await getRateLimitStore().consume(`${ruleName}:${identity}`, rule);
  if (!result.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    throw rateLimitedError(
      message ?? `Too many requests. Try again in ${retryAfterSeconds}s.`,
      retryAfterSeconds,
    );
  }
  return result;
}

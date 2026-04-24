import { rateLimitedError } from "./errors";

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export interface RateLimitStore {
  consume(key: string, rule: RateLimitRule): { allowed: boolean; count: number; resetAt: number };
}

type BucketRecord = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  zookRateLimitStore?: InMemoryRateLimitStore;
};

export const defaultRateLimitRules = {
  otpRequestByEmail: { limit: 4, windowMs: 10 * 60 * 1000 },
  otpRequestByIp: { limit: 8, windowMs: 10 * 60 * 1000 },
  otpVerifyByEmail: { limit: 8, windowMs: 10 * 60 * 1000 },
  otpVerifyByIp: { limit: 12, windowMs: 10 * 60 * 1000 },
  aiRequestByUser: { limit: 20, windowMs: 10 * 60 * 1000 },
  notificationSendByActor: { limit: 12, windowMs: 10 * 60 * 1000 },
  paymentSessionByActor: { limit: 12, windowMs: 10 * 60 * 1000 },
  pushRegisterByActor: { limit: 10, windowMs: 10 * 60 * 1000 },
  guardianConsentByActor: { limit: 6, windowMs: 30 * 60 * 1000 },
  privacyRequestByActor: { limit: 6, windowMs: 60 * 60 * 1000 },
  fileUploadByActor: { limit: 24, windowMs: 10 * 60 * 1000 },
  qrScanByActor: { limit: 20, windowMs: 5 * 60 * 1000 }
} as const satisfies Record<string, RateLimitRule>;

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, BucketRecord>();

  consume(key: string, rule: RateLimitRule) {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      const next: BucketRecord = {
        count: 1,
        resetAt: now + rule.windowMs
      };
      this.buckets.set(key, next);
      return { allowed: true, count: next.count, resetAt: next.resetAt };
    }

    current.count += 1;
    this.buckets.set(key, current);
    return {
      allowed: current.count <= rule.limit,
      count: current.count,
      resetAt: current.resetAt
    };
  }
}

export function getRateLimitStore() {
  if (!globalForRateLimit.zookRateLimitStore) {
    globalForRateLimit.zookRateLimitStore = new InMemoryRateLimitStore();
  }
  return globalForRateLimit.zookRateLimitStore;
}

export function assertRateLimit(
  ruleName: keyof typeof defaultRateLimitRules,
  identity: string,
  message?: string
) {
  const rule = defaultRateLimitRules[ruleName];
  const result = getRateLimitStore().consume(`${ruleName}:${identity}`, rule);
  if (!result.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    throw rateLimitedError(message ?? `Too many requests. Try again in ${retryAfterSeconds}s.`);
  }
  return result;
}

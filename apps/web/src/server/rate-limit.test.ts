import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryRateLimitStore, assertRateLimit, defaultRateLimitRules, getRateLimitStore } from "./rate-limit";

describe("rate limits", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T00:00:00.000Z"));
    (globalThis as unknown as { zookRateLimitStore?: InMemoryRateLimitStore }).zookRateLimitStore =
      new InMemoryRateLimitStore();
  });

  it("blocks otp requests after the configured threshold", () => {
    for (let attempt = 0; attempt < defaultRateLimitRules.otpRequestByEmail.limit; attempt += 1) {
      expect(() => assertRateLimit("otpRequestByEmail", "member@zook.local")).not.toThrow();
    }

    expect(() => assertRateLimit("otpRequestByEmail", "member@zook.local")).toThrow(/Too many requests/i);
  });

  it("resets the bucket after the window passes", () => {
    for (let attempt = 0; attempt < defaultRateLimitRules.aiRequestByUser.limit; attempt += 1) {
      assertRateLimit("aiRequestByUser", "user_1");
    }

    expect(() => assertRateLimit("aiRequestByUser", "user_1")).toThrow(/Too many requests/i);

    vi.advanceTimersByTime(defaultRateLimitRules.aiRequestByUser.windowMs + 1);

    expect(() => assertRateLimit("aiRequestByUser", "user_1")).not.toThrow();
    expect(getRateLimitStore()).toBeInstanceOf(InMemoryRateLimitStore);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { getDevOtpResponseValue } from "./auth-response";

const originalEnv = { ...process.env };

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...originalEnv };
});

describe("auth response helpers", () => {
  it("does not expose the fixed otp by default in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OTP_FIXED_CODE_DEV", "000000");

    expect(getDevOtpResponseValue()).toBeUndefined();
  });

  it("exposes the fixed otp only when explicitly enabled for development response testing", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OTP_FIXED_CODE_DEV", "000000");
    vi.stubEnv("ALLOW_DEV_OTP_RESPONSE", "true");

    expect(getDevOtpResponseValue()).toBe("000000");
  });
});

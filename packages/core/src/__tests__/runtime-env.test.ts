import { describe, expect, it } from "vitest";
import { getAllowedFixedOtp, getAppEnv, isMockPaymentCompletionAllowed } from "../runtime-env";

describe("runtime env guardrails", () => {
  it("normalizes APP_ENV before ENV_PROFILE", () => {
    expect(getAppEnv({ APP_ENV: "production", ENV_PROFILE: "local" } as NodeJS.ProcessEnv)).toBe("production");
  });

  it("never allows fixed OTP in production", () => {
    expect(
      getAllowedFixedOtp({
        APP_ENV: "production",
        NODE_ENV: "development",
        OTP_FIXED_CODE_DEV: "000000",
      } as NodeJS.ProcessEnv),
    ).toBeUndefined();
  });

  it("requires explicit staging override for fixed OTP", () => {
    expect(
      getAllowedFixedOtp({
        APP_ENV: "staging",
        OTP_FIXED_CODE_DEV: "000000",
      } as NodeJS.ProcessEnv),
    ).toBeUndefined();
    expect(
      getAllowedFixedOtp({
        APP_ENV: "staging",
        OTP_FIXED_CODE_DEV: "000000",
        ALLOW_FIXED_OTP_IN_STAGING: "true",
      } as NodeJS.ProcessEnv),
    ).toBe("000000");
  });

  it("allows mock payment completion only in safe modes", () => {
    expect(
      isMockPaymentCompletionAllowed({
        APP_ENV: "local",
        PAYMENT_PROVIDER: "mock",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      isMockPaymentCompletionAllowed({
        APP_ENV: "staging",
        PAYMENT_PROVIDER: "mock",
      } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      isMockPaymentCompletionAllowed({
        APP_ENV: "staging",
        PAYMENT_PROVIDER: "mock",
        ALLOW_MOCK_PAYMENT_COMPLETION: "true",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      isMockPaymentCompletionAllowed({
        APP_ENV: "production",
        PAYMENT_PROVIDER: "mock",
        ALLOW_MOCK_PAYMENT_COMPLETION: "true",
      } as NodeJS.ProcessEnv),
    ).toBe(false);
  });
});


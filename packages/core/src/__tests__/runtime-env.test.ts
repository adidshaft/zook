import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  RuntimeConfigError,
  getAllowedFixedOtp,
  getApiMode,
  getAppEnv,
  getQrSigningSecret,
  isMockPaymentCompletionAllowed,
  validateRuntimeConfig,
} from "../runtime-env";

describe("runtime env guardrails", () => {
  it("normalizes APP_ENV before ENV_PROFILE", () => {
    expect(getAppEnv({ APP_ENV: "production", ENV_PROFILE: "local" } as NodeJS.ProcessEnv)).toBe("production");
  });

  it("fails closed for invalid APP_ENV and API_MODE values", () => {
    expect(() => getAppEnv({ APP_ENV: "prodution" } as NodeJS.ProcessEnv)).toThrow(RuntimeConfigError);
    expect(() => getApiMode({ API_MODE: "offline" } as NodeJS.ProcessEnv)).toThrow(RuntimeConfigError);
    expect(validateRuntimeConfig({ APP_ENV: "prodution", API_MODE: "offline" } as NodeJS.ProcessEnv).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_APP_ENV", level: "error" }),
        expect.objectContaining({ code: "INVALID_API_MODE", level: "error" }),
      ]),
    );
  });

  it("rejects offline demo outside local", () => {
    expect(
      validateRuntimeConfig({ APP_ENV: "production", API_MODE: "offline-demo" } as NodeJS.ProcessEnv).issues,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ code: "OFFLINE_DEMO_NON_LOCAL" })]));
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

  it("allows explicitly configured weak QR secrets only in local environments", () => {
    expect(
      getQrSigningSecret({
        APP_ENV: "local",
        ZOOK_QR_SECRET: "dev-secret",
      } as NodeJS.ProcessEnv),
    ).toBe("dev-secret");
  });

  it("rejects missing or weak QR secrets outside local", () => {
    expect(() => getQrSigningSecret({ APP_ENV: "production" } as NodeJS.ProcessEnv)).toThrow(
      RuntimeConfigError,
    );
    expect(() =>
      getQrSigningSecret({
        APP_ENV: "staging",
        ZOOK_QR_SECRET: "dev-secret",
      } as NodeJS.ProcessEnv),
    ).toThrow(RuntimeConfigError);
    expect(
      validateRuntimeConfig({
        APP_ENV: "production",
        API_MODE: "backend",
        PAYMENT_PROVIDER: "disabled",
        AI_PROVIDER: "disabled",
        PUSH_PROVIDER: "disabled",
        STORAGE_PROVIDER: "disabled",
        FILE_UPLOADS_ENABLED: "false",
        RATE_LIMIT_PROVIDER: "upstash",
      } as NodeJS.ProcessEnv).issues,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ code: "ZOOK_QR_SECRET_REQUIRED" })]));
  });

  it("accepts a strong QR secret outside local", () => {
    expect(
      getQrSigningSecret({
        APP_ENV: "production",
        ZOOK_QR_SECRET: "qr_9vMLuR4hYb83dX2Wz7PaNk6TsFqC1EeA",
      } as NodeJS.ProcessEnv),
    ).toBe("qr_9vMLuR4hYb83dX2Wz7PaNk6TsFqC1EeA");
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

  it("flags production mock AI, mock push, local storage, and memory rate limiting", () => {
    expect(
      validateRuntimeConfig({
        APP_ENV: "production",
        API_MODE: "backend",
        PAYMENT_PROVIDER: "disabled",
        AI_PROVIDER: "mock",
        PUSH_PROVIDER: "mock",
        STORAGE_PROVIDER: "local",
        RATE_LIMIT_PROVIDER: "memory",
      } as NodeJS.ProcessEnv).issues,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "PRODUCTION_MOCK_AI_PROVIDER" }),
        expect.objectContaining({ code: "PRODUCTION_MOCK_PUSH_PROVIDER" }),
        expect.objectContaining({ code: "PRODUCTION_LOCAL_STORAGE" }),
        expect.objectContaining({ code: "PRODUCTION_MEMORY_RATE_LIMIT" }),
      ]),
    );
  });

  it("allows production with distributed rate limiting selected", () => {
    const issues = validateRuntimeConfig({
      APP_ENV: "production",
      API_MODE: "backend",
      PAYMENT_PROVIDER: "disabled",
      AI_PROVIDER: "disabled",
      PUSH_PROVIDER: "disabled",
      STORAGE_PROVIDER: "disabled",
      FILE_UPLOADS_ENABLED: "false",
      RATE_LIMIT_PROVIDER: "upstash",
      ZOOK_QR_SECRET: "qr_9vMLuR4hYb83dX2Wz7PaNk6TsFqC1EeA",
    } as NodeJS.ProcessEnv).issues;

    expect(issues).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "PRODUCTION_MEMORY_RATE_LIMIT" })]),
    );
  });

  it("blocks demo seed entrypoints in production before touching the database", () => {
    const root = resolve(import.meta.dirname, "../../..", "..");
    const result = spawnSync(
      "pnpm",
      ["exec", "tsx", "scripts/seed-demo.ts"],
      {
        cwd: root,
        env: { ...process.env, APP_ENV: "production" },
        encoding: "utf8",
      },
    );

    expect(result.status).not.toBe(0);
    expect(`${result.stderr}\n${result.stdout}`).toContain(
      "Refusing to seed demo data when APP_ENV=production",
    );
  });
});

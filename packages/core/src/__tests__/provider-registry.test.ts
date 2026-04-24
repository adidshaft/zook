import { afterEach, describe, expect, it } from "vitest";
import {
  getAIProvider,
  getEmailProvider,
  getMapProvider,
  getProviderRegistryDiagnostics,
  GoogleMapProvider,
  MockAIProvider,
  MockEmailProvider,
  MockMapProvider,
  OpenAIProvider,
  ProviderSetupError,
  ResendEmailProvider
} from "../providers";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function clearProviderEnv() {
  delete process.env.AI_PROVIDER;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;
  delete process.env.EMAIL_PROVIDER;
  delete process.env.RESEND_API_KEY;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.MAP_PROVIDER;
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.PAYMENT_PROVIDER;
  delete process.env.PUSH_PROVIDER;
  delete process.env.STORAGE_PROVIDER;
  delete process.env.S3_ENDPOINT;
  delete process.env.S3_REGION;
  delete process.env.S3_BUCKET;
  delete process.env.S3_ACCESS_KEY_ID;
  delete process.env.S3_SECRET_ACCESS_KEY;
  delete process.env.R2_ACCOUNT_ID;
  delete process.env.R2_BUCKET;
  delete process.env.R2_ACCESS_KEY_ID;
  delete process.env.R2_SECRET_ACCESS_KEY;
}

describe("provider registry", () => {
  it("returns mock and local providers by default", () => {
    clearProviderEnv();

    expect(getAIProvider()).toBeInstanceOf(MockAIProvider);
    expect(getEmailProvider()).toBeInstanceOf(MockEmailProvider);
    expect(getMapProvider()).toBeInstanceOf(MockMapProvider);

    expect(getProviderRegistryDiagnostics()).toMatchObject({
      ai: {
        status: "default",
        provider: "mock",
        activeProvider: "mock",
        env: {
          AI_PROVIDER: false,
          OPENAI_API_KEY: false
        }
      },
      email: {
        status: "default",
        provider: "mock",
        activeProvider: "mock",
        env: {
          EMAIL_PROVIDER: false,
          RESEND_API_KEY: false
        }
      },
      map: {
        status: "default",
        provider: "mock",
        activeProvider: "mock",
        env: {
          MAP_PROVIDER: false,
          GOOGLE_MAPS_API_KEY: false
        }
      },
      payment: {
        status: "default",
        provider: "mock",
        activeProvider: "mock"
      },
      push: {
        status: "default",
        provider: "mock",
        activeProvider: "mock"
      },
      storage: {
        status: "default",
        provider: "local",
        activeProvider: "local"
      }
    });
  });

  it("uses real providers only when the selected env is fully configured", () => {
    process.env.AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.OPENAI_MODEL = "gpt-4.1-mini";
    process.env.EMAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "re_test";
    process.env.MAP_PROVIDER = "google";
    process.env.GOOGLE_MAPS_API_KEY = "gm_test";

    expect(getAIProvider()).toBeInstanceOf(OpenAIProvider);
    expect(getEmailProvider()).toBeInstanceOf(ResendEmailProvider);
    expect(getMapProvider()).toBeInstanceOf(GoogleMapProvider);

    expect(getProviderRegistryDiagnostics()).toMatchObject({
      ai: {
        status: "ready",
        selectedProvider: "openai",
        activeProvider: "openai",
        provider: "openai",
        mode: "live",
        metadata: {
          model: "gpt-4.1-mini"
        }
      },
      email: {
        status: "ready",
        selectedProvider: "resend",
        activeProvider: "resend",
        provider: "resend",
        mode: "live"
      },
      map: {
        status: "ready",
        selectedProvider: "google",
        activeProvider: "google",
        provider: "google",
        mode: "live"
      }
    });
  });

  it("throws a clear setup error when a live provider is selected without required env", () => {
    process.env.AI_PROVIDER = "openai";
    process.env.EMAIL_PROVIDER = "resend";
    process.env.MAP_PROVIDER = "google";

    expect(() => getAIProvider()).toThrowError(ProviderSetupError);
    expect(() => getAIProvider()).toThrowError(/OPENAI_API_KEY/);
    expect(() => getAIProvider()).toThrowError(/AI_PROVIDER=mock/);

    expect(() => getEmailProvider()).toThrowError(ProviderSetupError);
    expect(() => getEmailProvider()).toThrowError(/RESEND_API_KEY/);
    expect(() => getEmailProvider()).toThrowError(/EMAIL_PROVIDER=mock/);

    expect(() => getMapProvider()).toThrowError(ProviderSetupError);
    expect(() => getMapProvider()).toThrowError(/GOOGLE_MAPS_API_KEY/);
    expect(() => getMapProvider()).toThrowError(/MAP_PROVIDER=mock/);

    expect(getProviderRegistryDiagnostics()).toMatchObject({
      ai: {
        status: "misconfigured",
        activeProvider: null,
        missingEnv: ["OPENAI_API_KEY"]
      },
      email: {
        status: "misconfigured",
        activeProvider: null,
        missingEnv: ["RESEND_API_KEY"]
      },
      map: {
        status: "misconfigured",
        activeProvider: null,
        missingEnv: ["GOOGLE_MAPS_API_KEY"]
      }
    });
  });

  it("exposes diagnostics without leaking provider secrets", () => {
    process.env.AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-super-secret";
    process.env.OPENAI_MODEL = "gpt-safe";
    process.env.EMAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "re-super-secret";
    process.env.MAP_PROVIDER = "google";
    process.env.GOOGLE_MAPS_API_KEY = "gm-super-secret";

    const diagnostics = getProviderRegistryDiagnostics();
    const serialized = JSON.stringify(diagnostics);

    expect(serialized).not.toContain("sk-super-secret");
    expect(serialized).not.toContain("re-super-secret");
    expect(serialized).not.toContain("gm-super-secret");

    expect(diagnostics.ai.env.OPENAI_API_KEY).toBe(true);
    expect(diagnostics.email.env.RESEND_API_KEY).toBe(true);
    expect(diagnostics.map.env.GOOGLE_MAPS_API_KEY).toBe(true);
    expect(diagnostics.ai.metadata).toMatchObject({ model: "gpt-safe" });
    expect(diagnostics.email.metadata).toMatchObject({ fromEmail: "Zook <noreply@zook.app>" });
  });
});

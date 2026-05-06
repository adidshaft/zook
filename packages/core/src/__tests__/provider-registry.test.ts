import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAIProvider,
  getEmailProvider,
  getMapProvider,
  getPaymentProvider,
  getPushProvider,
  getProviderRegistryDiagnostics,
  getSmsProvider,
  ExpoPushProvider,
  getStorageProvider,
  getWhatsAppProvider,
  GoogleMapProvider,
  LocalStorageProvider,
  MockAIProvider,
  MockEmailProvider,
  MockMapProvider,
  MockPaymentProvider,
  MockPushProvider,
  MockWhatsAppProvider,
  MockSmsProvider,
  OpenAIProvider,
  ProviderSetupError,
  RazorpayPaymentProvider,
  ResendEmailProvider,
  S3CompatibleStorageProvider,
  SMTPEmailProvider,
  TwilioWhatsAppProvider,
} from "../providers";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function clearProviderEnv() {
  delete process.env.APP_ENV;
  delete process.env.AI_PROVIDER;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;
  delete process.env.EMAIL_PROVIDER;
  delete process.env.RESEND_API_KEY;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_FROM;
  delete process.env.EMAIL_FROM;
  delete process.env.MAP_PROVIDER;
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.PAYMENT_PROVIDER;
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  delete process.env.RAZORPAY_MODE;
  delete process.env.PUSH_PROVIDER;
  delete process.env.EXPO_ACCESS_TOKEN;
  delete process.env.EXPO_PROJECT_ID;
  delete process.env.PUSH_ENVIRONMENT;
  delete process.env.WHATSAPP_PROVIDER;
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_WHATSAPP_FROM;
  delete process.env.SMS_PROVIDER;
  delete process.env.SMS_WEBHOOK_URL;
  delete process.env.SMS_WEBHOOK_SECRET;
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
  beforeEach(() => {
    clearProviderEnv();
  });

  it("returns mock and local providers by default", () => {
    expect(getAIProvider()).toBeInstanceOf(MockAIProvider);
    expect(getEmailProvider()).toBeInstanceOf(MockEmailProvider);
    expect(getMapProvider()).toBeInstanceOf(MockMapProvider);
    expect(getPaymentProvider()).toBeInstanceOf(MockPaymentProvider);
    expect(getPushProvider()).toBeInstanceOf(MockPushProvider);
    expect(getSmsProvider()).toBeInstanceOf(MockSmsProvider);
    expect(getStorageProvider()).toBeInstanceOf(LocalStorageProvider);

    expect(getProviderRegistryDiagnostics()).toMatchObject({
      ai: {
        status: "default",
        provider: "mock",
        activeProvider: "mock",
        env: {
          AI_PROVIDER: false,
          OPENAI_API_KEY: false,
        },
      },
      email: {
        status: "default",
        provider: "mock",
        activeProvider: "mock",
        env: {
          EMAIL_PROVIDER: false,
          RESEND_API_KEY: false,
        },
      },
      map: {
        status: "default",
        provider: "mock",
        activeProvider: "mock",
        env: {
          MAP_PROVIDER: false,
          GOOGLE_MAPS_API_KEY: false,
        },
      },
      payment: {
        status: "default",
        provider: "mock",
        activeProvider: "mock",
      },
      push: {
        status: "default",
        provider: "mock",
        activeProvider: "mock",
      },
      sms: {
        status: "default",
        provider: "mock",
        activeProvider: "mock",
      },
      storage: {
        status: "default",
        provider: "local",
        activeProvider: "local",
      },
      whatsapp: {
        status: "disabled",
        provider: "disabled",
        activeProvider: null,
      },
    });
  });

  it("supports explicit disabled payment, AI, push, and storage providers", () => {
    clearProviderEnv();
    process.env.PAYMENT_PROVIDER = "disabled";
    process.env.AI_PROVIDER = "disabled";
    process.env.PUSH_PROVIDER = "disabled";
    process.env.STORAGE_PROVIDER = "disabled";
    process.env.WHATSAPP_PROVIDER = "disabled";

    expect(() => getPaymentProvider()).toThrowError(ProviderSetupError);
    expect(() => getPaymentProvider()).toThrowError(/PAYMENT_PROVIDER=disabled/);
    expect(() => getAIProvider()).toThrowError(ProviderSetupError);
    expect(() => getPushProvider()).toThrowError(ProviderSetupError);
    expect(() => getStorageProvider()).toThrowError(ProviderSetupError);

    expect(getProviderRegistryDiagnostics()).toMatchObject({
      payment: {
        selectedProvider: "disabled",
        activeProvider: null,
        status: "disabled",
        provider: "disabled",
        mode: "disabled",
        configured: false,
      },
      ai: {
        selectedProvider: "disabled",
        activeProvider: null,
        status: "disabled",
        provider: "disabled",
        mode: "disabled",
        configured: false,
      },
      push: {
        selectedProvider: "disabled",
        activeProvider: null,
        status: "disabled",
        provider: "disabled",
        mode: "disabled",
        configured: false,
      },
      storage: {
        selectedProvider: "disabled",
        activeProvider: null,
        status: "disabled",
        provider: "disabled",
        mode: "disabled",
        configured: false,
      },
      whatsapp: {
        selectedProvider: "disabled",
        activeProvider: null,
        status: "disabled",
        provider: "disabled",
        mode: "disabled",
        configured: false,
      },
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
    process.env.PAYMENT_PROVIDER = "razorpay";
    process.env.RAZORPAY_KEY_ID = "rzp_test";
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhook";
    process.env.RAZORPAY_MODE = "test";
    process.env.PUSH_PROVIDER = "expo";
    process.env.EXPO_PROJECT_ID = "expo-project-id";
    process.env.STORAGE_PROVIDER = "s3";
    process.env.S3_BUCKET = "zook-stage";
    process.env.S3_REGION = "ap-south-1";
    process.env.S3_ACCESS_KEY_ID = "akid";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
    process.env.WHATSAPP_PROVIDER = "twilio";
    process.env.TWILIO_ACCOUNT_SID = "AC_test";
    process.env.TWILIO_AUTH_TOKEN = "twilio-secret";
    process.env.TWILIO_WHATSAPP_FROM = "+14155238886";

    expect(getAIProvider()).toBeInstanceOf(OpenAIProvider);
    expect(getEmailProvider()).toBeInstanceOf(ResendEmailProvider);
    expect(getMapProvider()).toBeInstanceOf(GoogleMapProvider);
    expect(getPaymentProvider()).toBeInstanceOf(RazorpayPaymentProvider);
    expect(getPushProvider()).toBeInstanceOf(ExpoPushProvider);
    expect(getStorageProvider()).toBeInstanceOf(S3CompatibleStorageProvider);
    expect(getWhatsAppProvider()).toBeInstanceOf(TwilioWhatsAppProvider);

    expect(getProviderRegistryDiagnostics()).toMatchObject({
      ai: {
        status: "ready",
        selectedProvider: "openai",
        activeProvider: "openai",
        provider: "openai",
        mode: "live",
        metadata: {
          model: "gpt-4.1-mini",
        },
      },
      email: {
        status: "ready",
        selectedProvider: "resend",
        activeProvider: "resend",
        provider: "resend",
        mode: "live",
      },
      map: {
        status: "ready",
        selectedProvider: "google",
        activeProvider: "google",
        provider: "google",
        mode: "live",
      },
      payment: {
        status: "ready",
        selectedProvider: "razorpay",
        activeProvider: "razorpay",
        provider: "razorpay",
        mode: "test",
      },
      push: {
        status: "ready",
        selectedProvider: "expo",
        activeProvider: "expo",
        provider: "expo",
        mode: "live",
      },
      storage: {
        status: "ready",
        selectedProvider: "s3",
        activeProvider: "s3",
        provider: "s3",
        mode: "live",
      },
      whatsapp: {
        status: "ready",
        selectedProvider: "twilio",
        activeProvider: "twilio",
        provider: "twilio",
        mode: "live",
      },
    });
  });

  it("supports smtp when fully configured", () => {
    process.env.EMAIL_PROVIDER = "smtp";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "mailer";
    process.env.SMTP_PASS = "secret";
    process.env.SMTP_FROM = "Zook <hello@example.com>";

    expect(getEmailProvider()).toBeInstanceOf(SMTPEmailProvider);
    expect(getProviderRegistryDiagnostics().email).toMatchObject({
      status: "ready",
      selectedProvider: "smtp",
      activeProvider: "smtp",
      metadata: {
        host: "smtp.example.com",
        port: 587,
      },
    });
  });

  it("supports explicit mock WhatsApp for local transactional testing", () => {
    process.env.WHATSAPP_PROVIDER = "mock";

    expect(getWhatsAppProvider()).toBeInstanceOf(MockWhatsAppProvider);
    expect(getProviderRegistryDiagnostics().whatsapp).toMatchObject({
      status: "ready",
      selectedProvider: "mock",
      activeProvider: "mock",
    });
  });

  it("throws a clear setup error when a live provider is selected without required env", () => {
    process.env.AI_PROVIDER = "openai";
    process.env.EMAIL_PROVIDER = "resend";
    process.env.MAP_PROVIDER = "google";
    process.env.PAYMENT_PROVIDER = "razorpay";
    process.env.PUSH_PROVIDER = "expo";
    process.env.STORAGE_PROVIDER = "s3";
    process.env.WHATSAPP_PROVIDER = "twilio";

    expect(() => getAIProvider()).toThrowError(ProviderSetupError);
    expect(() => getAIProvider()).toThrowError(/OPENAI_API_KEY/);
    expect(() => getAIProvider()).toThrowError(/AI_PROVIDER=mock/);

    expect(() => getEmailProvider()).toThrowError(ProviderSetupError);
    expect(() => getEmailProvider()).toThrowError(/RESEND_API_KEY/);
    expect(() => getEmailProvider()).toThrowError(/EMAIL_PROVIDER=mock/);

    expect(() => getMapProvider()).toThrowError(ProviderSetupError);
    expect(() => getMapProvider()).toThrowError(/GOOGLE_MAPS_API_KEY/);
    expect(() => getMapProvider()).toThrowError(/MAP_PROVIDER=mock/);

    expect(() => getStorageProvider()).toThrowError(ProviderSetupError);
    expect(() => getStorageProvider()).toThrowError(/S3_BUCKET/);
    expect(() => getStorageProvider()).toThrowError(/STORAGE_PROVIDER=local/);

    expect(() => getPaymentProvider()).toThrowError(ProviderSetupError);
    expect(() => getPaymentProvider()).toThrowError(/RAZORPAY_KEY_ID/);
    expect(() => getPaymentProvider()).toThrowError(/PAYMENT_PROVIDER=mock/);

    expect(() => getPushProvider()).toThrowError(ProviderSetupError);
    expect(() => getPushProvider()).toThrowError(/EXPO_PROJECT_ID/);
    expect(() => getPushProvider()).toThrowError(/PUSH_PROVIDER=mock/);

    expect(() => getWhatsAppProvider()).toThrowError(ProviderSetupError);
    expect(() => getWhatsAppProvider()).toThrowError(/TWILIO_ACCOUNT_SID/);
    expect(() => getWhatsAppProvider()).toThrowError(/WHATSAPP_PROVIDER=disabled/);

    expect(getProviderRegistryDiagnostics()).toMatchObject({
      ai: {
        status: "misconfigured",
        activeProvider: null,
        missingEnv: ["OPENAI_API_KEY"],
      },
      email: {
        status: "misconfigured",
        activeProvider: null,
        missingEnv: ["RESEND_API_KEY"],
      },
      map: {
        status: "misconfigured",
        activeProvider: null,
        missingEnv: ["GOOGLE_MAPS_API_KEY"],
      },
      payment: {
        status: "misconfigured",
        activeProvider: null,
        missingEnv: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
      },
      push: {
        status: "misconfigured",
        activeProvider: null,
        missingEnv: ["EXPO_PROJECT_ID"],
      },
      storage: {
        status: "misconfigured",
        activeProvider: null,
        missingEnv: ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
      },
      whatsapp: {
        status: "misconfigured",
        activeProvider: null,
        missingEnv: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM"],
      },
    });
  });

  it("throws a clear setup error when smtp is selected without the required env", () => {
    process.env.EMAIL_PROVIDER = "smtp";
    process.env.SMTP_HOST = "smtp.example.com";

    expect(() => getEmailProvider()).toThrowError(ProviderSetupError);
    expect(() => getEmailProvider()).toThrowError(/SMTP_PORT/);
    expect(() => getEmailProvider()).toThrowError(/SMTP_FROM or EMAIL_FROM/);

    expect(getProviderRegistryDiagnostics().email).toMatchObject({
      status: "misconfigured",
      selectedProvider: "smtp",
      activeProvider: null,
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

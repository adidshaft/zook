import type {
  DiagnosticProvider,
  ProviderCategory,
  ProviderDiagnosticMetadata,
  ProviderDiagnosticStatus,
  ProviderDiagnostics,
  ProviderMode,
} from "../types";
import { MockAIProvider, OpenAIProvider, type AIProvider } from "./ai";
import {
  MockEmailProvider,
  ResendEmailProvider,
  SMTPEmailProvider,
  type EmailProvider,
} from "./email";
import { GoogleMapProvider, MockMapProvider, type MapProvider } from "./map";
import { MockPaymentProvider, RazorpayPaymentProvider, type PaymentProvider } from "./payment";
import { ExpoPushProvider, MockPushProvider, type PushProvider } from "./push";
import { MockSmsProvider, Msg91SmsProvider, WebhookSmsProvider, type SmsProvider } from "./sms";
import {
  LocalStorageProvider,
  S3CompatibleStorageProvider,
  SupabaseStorageProvider,
  type StorageProvider,
} from "./storage";
import {
  MockWhatsAppProvider,
  TwilioWhatsAppProvider,
  type WhatsAppProvider,
} from "./whatsapp";

type ProviderSetupErrorKind = "misconfigured" | "unsupported" | "disabled";

type ProviderResolution<T> = {
  provider: T | null;
  diagnostics: ProviderDiagnostics;
  error: ProviderSetupError | null;
};

export interface ProviderRegistryDiagnostics {
  ai: ProviderDiagnostics;
  email: ProviderDiagnostics;
  map: ProviderDiagnostics;
  payment: ProviderDiagnostics;
  push: ProviderDiagnostics;
  sms: ProviderDiagnostics;
  storage: ProviderDiagnostics;
  whatsapp: ProviderDiagnostics;
}

export class ProviderSetupError extends Error {
  readonly kind: ProviderSetupErrorKind;
  readonly category: ProviderCategory;
  readonly selectionEnv: string;
  readonly selectedProvider: string;
  readonly defaultProvider: string;
  readonly missingEnv: string[];
  readonly supportedProviders: readonly string[];

  constructor(input: {
    kind: ProviderSetupErrorKind;
    category: ProviderCategory;
    selectionEnv: string;
    selectedProvider: string;
    defaultProvider: string;
    missingEnv?: string[];
    supportedProviders: readonly string[];
  }) {
    const missingEnv = input.missingEnv ?? [];
    const label =
      input.category === "ai"
        ? "AI"
        : `${input.category.slice(0, 1).toUpperCase()}${input.category.slice(1)}`;
    const message =
      input.kind === "misconfigured"
        ? `${label} provider "${input.selectedProvider}" is selected via ${input.selectionEnv} but is missing required env: ${missingEnv.join(", ")}. Set the missing env or switch ${input.selectionEnv}=${input.defaultProvider}.`
        : input.kind === "disabled"
          ? `${label} provider is disabled via ${input.selectionEnv}=disabled. Enable one of: ${input.supportedProviders.filter((provider) => provider !== "disabled").join(", ")}.`
          : `${label} provider "${input.selectedProvider}" is not supported yet. Supported values for ${input.selectionEnv}: ${input.supportedProviders.join(", ")}.`;
    super(message);
    this.name = "ProviderSetupError";
    this.kind = input.kind;
    this.category = input.category;
    this.selectionEnv = input.selectionEnv;
    this.selectedProvider = input.selectedProvider;
    this.defaultProvider = input.defaultProvider;
    this.missingEnv = missingEnv;
    this.supportedProviders = input.supportedProviders;
  }
}

function env(value: string | undefined) {
  return value?.trim() || undefined;
}

function resolveResendFromEmail() {
  const configuredFromEmail = env(process.env.EMAIL_FROM);
  if (!configuredFromEmail || /@(?:[^<>\s]+\.)?zook\.local[>\s]*$/i.test(configuredFromEmail)) {
    return "Zook <onboarding@resend.dev>";
  }
  return configuredFromEmail;
}

function envFlags(names: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(
    names.map((name) => [name, env(process.env[name]) !== undefined]),
  ) as Record<string, boolean>;
}

function selectionStatus(selectionValue: string | undefined): ProviderDiagnosticStatus {
  return selectionValue === undefined ? "default" : "ready";
}

function createDiagnostics(input: {
  category: ProviderCategory;
  selectedProvider: string;
  activeProvider: string | null;
  status: ProviderDiagnosticStatus;
  missingEnv: string[];
  env: Record<string, boolean>;
  instance: {
    provider: string;
    mode: ProviderMode;
    configured: boolean;
    metadata?: ProviderDiagnosticMetadata;
  };
}): ProviderDiagnostics {
  return {
    category: input.category,
    selectedProvider: input.selectedProvider,
    activeProvider: input.activeProvider,
    status: input.status,
    missingEnv: input.missingEnv,
    env: input.env,
    provider: input.instance.provider,
    mode: input.instance.mode,
    configured: input.instance.configured,
    ...(input.instance.metadata ? { metadata: input.instance.metadata } : {}),
  };
}

function createReadyResolution<T extends DiagnosticProvider>(input: {
  category: ProviderCategory;
  selectedProvider: string;
  selectionValue: string | undefined;
  env: Record<string, boolean>;
  provider: T;
}): ProviderResolution<T> {
  const diagnostics = input.provider.getDiagnostics();
  return {
    provider: input.provider,
    error: null,
    diagnostics: createDiagnostics({
      category: input.category,
      selectedProvider: input.selectedProvider,
      activeProvider: diagnostics.provider,
      status: selectionStatus(input.selectionValue),
      missingEnv: [],
      env: input.env,
      instance: diagnostics,
    }),
  };
}

function createMisconfiguredResolution<T>(input: {
  category: ProviderCategory;
  selectionEnv: string;
  selectedProvider: string;
  defaultProvider: string;
  supportedProviders: readonly string[];
  missingEnv: string[];
  env: Record<string, boolean>;
  mode: ProviderMode;
  metadata?: ProviderDiagnosticMetadata;
}): ProviderResolution<T> {
  const error = new ProviderSetupError({
    kind: "misconfigured",
    category: input.category,
    selectionEnv: input.selectionEnv,
    selectedProvider: input.selectedProvider,
    defaultProvider: input.defaultProvider,
    missingEnv: input.missingEnv,
    supportedProviders: input.supportedProviders,
  });

  return {
    provider: null,
    error,
    diagnostics: createDiagnostics({
      category: input.category,
      selectedProvider: input.selectedProvider,
      activeProvider: null,
      status: "misconfigured",
      missingEnv: input.missingEnv,
      env: input.env,
      instance: {
        provider: input.selectedProvider,
        mode: input.mode,
        configured: false,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    }),
  };
}

function createUnsupportedResolution<T>(input: {
  category: ProviderCategory;
  selectionEnv: string;
  selectedProvider: string;
  defaultProvider: string;
  supportedProviders: readonly string[];
  env: Record<string, boolean>;
  mode: ProviderMode;
  metadata?: ProviderDiagnosticMetadata;
}): ProviderResolution<T> {
  const error = new ProviderSetupError({
    kind: "unsupported",
    category: input.category,
    selectionEnv: input.selectionEnv,
    selectedProvider: input.selectedProvider,
    defaultProvider: input.defaultProvider,
    supportedProviders: input.supportedProviders,
  });

  return {
    provider: null,
    error,
    diagnostics: createDiagnostics({
      category: input.category,
      selectedProvider: input.selectedProvider,
      activeProvider: null,
      status: "unsupported",
      missingEnv: [],
      env: input.env,
      instance: {
        provider: input.selectedProvider,
        mode: input.mode,
        configured: false,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    }),
  };
}

function createDisabledResolution<T>(input: {
  category: ProviderCategory;
  selectionEnv: string;
  defaultProvider: string;
  supportedProviders: readonly string[];
  env: Record<string, boolean>;
  metadata?: ProviderDiagnosticMetadata;
}): ProviderResolution<T> {
  const error = new ProviderSetupError({
    kind: "disabled",
    category: input.category,
    selectionEnv: input.selectionEnv,
    selectedProvider: "disabled",
    defaultProvider: input.defaultProvider,
    supportedProviders: input.supportedProviders,
  });

  return {
    provider: null,
    error,
    diagnostics: createDiagnostics({
      category: input.category,
      selectedProvider: "disabled",
      activeProvider: null,
      status: "disabled",
      missingEnv: [],
      env: input.env,
      instance: {
        provider: "disabled",
        mode: "disabled",
        configured: false,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    }),
  };
}

function requireProvider<T>(resolution: ProviderResolution<T>): T {
  if (resolution.error || !resolution.provider) {
    throw resolution.error ?? new Error("Provider resolution failed without diagnostics.");
  }
  return resolution.provider;
}

function resolveEmailProvider(): ProviderResolution<EmailProvider> {
  const selectionValue = env(process.env.EMAIL_PROVIDER);
  const selectedProvider = selectionValue ?? "mock";
  const envState = envFlags([
    "EMAIL_PROVIDER",
    "EMAIL_FROM",
    "RESEND_API_KEY",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
  ]);

  if (selectedProvider === "mock") {
    return createReadyResolution({
      category: "email",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new MockEmailProvider(),
    });
  }

  if (selectedProvider === "resend") {
    const apiKey = env(process.env.RESEND_API_KEY);
    if (!apiKey) {
      return createMisconfiguredResolution({
        category: "email",
        selectionEnv: "EMAIL_PROVIDER",
        selectedProvider,
        defaultProvider: "mock",
        supportedProviders: ["mock", "resend"],
        missingEnv: ["RESEND_API_KEY"],
        env: envState,
        mode: "live",
      });
    }

    return createReadyResolution({
      category: "email",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new ResendEmailProvider(apiKey, resolveResendFromEmail()),
    });
  }

  if (selectedProvider === "smtp") {
    const host = env(process.env.SMTP_HOST);
    const port = env(process.env.SMTP_PORT);
    const user = env(process.env.SMTP_USER);
    const pass = env(process.env.SMTP_PASS);
    const fromEmail = env(process.env.SMTP_FROM) ?? env(process.env.EMAIL_FROM);
    const missingEnv = [
      !host ? "SMTP_HOST" : null,
      !port ? "SMTP_PORT" : null,
      !user ? "SMTP_USER" : null,
      !pass ? "SMTP_PASS" : null,
      !fromEmail ? "SMTP_FROM or EMAIL_FROM" : null,
    ].filter(Boolean) as string[];

    if (missingEnv.length > 0) {
      return createMisconfiguredResolution({
        category: "email",
        selectionEnv: "EMAIL_PROVIDER",
        selectedProvider,
        defaultProvider: "mock",
        supportedProviders: ["mock", "resend", "smtp"],
        missingEnv,
        env: envState,
        mode: "live",
      });
    }

    return createReadyResolution({
      category: "email",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new SMTPEmailProvider({
        host: host as string,
        port: Number(port),
        user: user as string,
        pass: pass as string,
        fromEmail: fromEmail as string,
      }),
    });
  }

  return createUnsupportedResolution({
    category: "email",
    selectionEnv: "EMAIL_PROVIDER",
    selectedProvider,
    defaultProvider: "mock",
    supportedProviders: ["mock", "resend", "smtp"],
    env: envState,
    mode: "live",
  });
}

function resolvePaymentProvider(): ProviderResolution<PaymentProvider> {
  const selectionValue = env(process.env.PAYMENT_PROVIDER);
  const selectedProvider = selectionValue ?? "mock";
  const envState = envFlags([
    "PAYMENT_PROVIDER",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "RAZORPAY_MODE",
    "RAZORPAY_CHECKOUT_THEME_COLOR",
  ]);

  if (selectedProvider === "mock") {
    return createReadyResolution({
      category: "payment",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new MockPaymentProvider(),
    });
  }

  if (selectedProvider === "disabled") {
    return createDisabledResolution({
      category: "payment",
      selectionEnv: "PAYMENT_PROVIDER",
      defaultProvider: "mock",
      supportedProviders: ["mock", "razorpay", "disabled"],
      env: envState,
    });
  }

  if (selectedProvider === "razorpay") {
    const keyId = env(process.env.RAZORPAY_KEY_ID);
    const keySecret = env(process.env.RAZORPAY_KEY_SECRET);
    const webhookSecret = env(process.env.RAZORPAY_WEBHOOK_SECRET);
    const missingEnv = [
      ...(keyId ? [] : ["RAZORPAY_KEY_ID"]),
      ...(keySecret ? [] : ["RAZORPAY_KEY_SECRET"]),
      ...(webhookSecret ? [] : ["RAZORPAY_WEBHOOK_SECRET"]),
    ];

    if (missingEnv.length > 0) {
      return createMisconfiguredResolution({
        category: "payment",
        selectionEnv: "PAYMENT_PROVIDER",
        selectedProvider,
        defaultProvider: "mock",
        supportedProviders: ["mock", "razorpay", "disabled"],
        missingEnv,
        env: envState,
        mode: "test",
        metadata: {
          mode: env(process.env.RAZORPAY_MODE) ?? "test",
        },
      });
    }

    const mode = env(process.env.RAZORPAY_MODE) === "live" ? "live" : "test";
    return createReadyResolution({
      category: "payment",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new RazorpayPaymentProvider({
        keyId: keyId as string,
        keySecret: keySecret as string,
        webhookSecret: webhookSecret as string,
        mode,
        ...(env(process.env.RAZORPAY_CHECKOUT_THEME_COLOR)
          ? { themeColor: env(process.env.RAZORPAY_CHECKOUT_THEME_COLOR) as string }
          : {}),
      }),
    });
  }

  return createUnsupportedResolution({
    category: "payment",
    selectionEnv: "PAYMENT_PROVIDER",
    selectedProvider,
    defaultProvider: "mock",
    supportedProviders: ["mock", "razorpay", "disabled"],
    env: envState,
    mode: "live",
  });
}

function resolveSmsProvider(): ProviderResolution<SmsProvider> {
  const selectionValue = env(process.env.SMS_PROVIDER);
  const defaultProvider = process.env.APP_ENV?.trim() === "production" ? "disabled" : "mock";
  const selectedProvider = selectionValue ?? defaultProvider;
  const envState = envFlags([
    "SMS_PROVIDER",
    "SMS_WEBHOOK_URL",
    "SMS_WEBHOOK_SECRET",
    "MSG91_AUTH_KEY",
    "MSG91_TEMPLATE_ID",
    "MSG91_SENDER_ID",
  ]);

  if (selectedProvider === "mock") {
    return createReadyResolution({
      category: "sms",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new MockSmsProvider(),
    });
  }

  if (selectedProvider === "disabled") {
    return createDisabledResolution({
      category: "sms",
      selectionEnv: "SMS_PROVIDER",
      defaultProvider,
      supportedProviders: ["mock", "webhook", "msg91", "disabled"],
      env: envState,
    });
  }

  if (selectedProvider === "webhook") {
    const url = env(process.env.SMS_WEBHOOK_URL);
    if (!url) {
      return createMisconfiguredResolution({
        category: "sms",
        selectionEnv: "SMS_PROVIDER",
        selectedProvider,
        defaultProvider,
        supportedProviders: ["mock", "webhook", "msg91", "disabled"],
        missingEnv: ["SMS_WEBHOOK_URL"],
        env: envState,
        mode: "live",
      });
    }

    return createReadyResolution({
      category: "sms",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new WebhookSmsProvider({
        url,
        ...(env(process.env.SMS_WEBHOOK_SECRET)
          ? { bearerToken: env(process.env.SMS_WEBHOOK_SECRET) as string }
          : {}),
      }),
    });
  }

  if (selectedProvider === "msg91") {
    const authKey = env(process.env.MSG91_AUTH_KEY);
    const templateId = env(process.env.MSG91_TEMPLATE_ID);
    const missingEnv = [
      authKey ? null : "MSG91_AUTH_KEY",
      templateId ? null : "MSG91_TEMPLATE_ID",
    ].filter(Boolean) as string[];
    if (missingEnv.length > 0) {
      return createMisconfiguredResolution({
        category: "sms",
        selectionEnv: "SMS_PROVIDER",
        selectedProvider,
        defaultProvider,
        supportedProviders: ["mock", "webhook", "msg91", "disabled"],
        missingEnv,
        env: envState,
        mode: "live",
      });
    }

    const expiryMinutes = Number(env(process.env.MSG91_OTP_EXPIRY_MINUTES) ?? "10");
    return createReadyResolution({
      category: "sms",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new Msg91SmsProvider({
        authKey: authKey as string,
        templateId: templateId as string,
        ...(env(process.env.MSG91_SENDER_ID)
          ? { senderId: env(process.env.MSG91_SENDER_ID) as string }
          : {}),
        ...(env(process.env.MSG91_API_BASE_URL)
          ? { apiBaseUrl: env(process.env.MSG91_API_BASE_URL) as string }
          : {}),
        otpExpiryMinutes: Number.isFinite(expiryMinutes) && expiryMinutes > 0 ? expiryMinutes : 10,
      }),
    });
  }

  return createUnsupportedResolution({
    category: "sms",
    selectionEnv: "SMS_PROVIDER",
    selectedProvider,
    defaultProvider,
    supportedProviders: ["mock", "webhook", "msg91", "disabled"],
    env: envState,
    mode: "live",
  });
}

function resolveMapProvider(): ProviderResolution<MapProvider> {
  const selectionValue = env(process.env.MAP_PROVIDER);
  const selectedProvider = selectionValue ?? "mock";
  const envState = envFlags(["MAP_PROVIDER", "GOOGLE_MAPS_API_KEY"]);

  if (selectedProvider === "mock") {
    return createReadyResolution({
      category: "map",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new MockMapProvider(),
    });
  }

  if (selectedProvider === "google") {
    const apiKey = env(process.env.GOOGLE_MAPS_API_KEY);
    if (!apiKey) {
      return createMisconfiguredResolution({
        category: "map",
        selectionEnv: "MAP_PROVIDER",
        selectedProvider,
        defaultProvider: "mock",
        supportedProviders: ["mock", "google"],
        missingEnv: ["GOOGLE_MAPS_API_KEY"],
        env: envState,
        mode: "live",
        metadata: {
          supportsSearch: true,
          supportsReverseGeocode: true,
          supportsGoogleMapsLinks: true,
        },
      });
    }

    return createReadyResolution({
      category: "map",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new GoogleMapProvider(apiKey),
    });
  }

  return createUnsupportedResolution({
    category: "map",
    selectionEnv: "MAP_PROVIDER",
    selectedProvider,
    defaultProvider: "mock",
    supportedProviders: ["mock", "google"],
    env: envState,
    mode: "live",
  });
}

function resolveAIProvider(): ProviderResolution<AIProvider> {
  const selectionValue = env(process.env.AI_PROVIDER);
  const selectedProvider = selectionValue ?? "mock";
  const envState = envFlags([
    "AI_PROVIDER",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "OPENAI_IMAGE_MODEL",
  ]);

  if (selectedProvider === "mock") {
    return createReadyResolution({
      category: "ai",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new MockAIProvider(),
    });
  }

  if (selectedProvider === "disabled") {
    return createDisabledResolution({
      category: "ai",
      selectionEnv: "AI_PROVIDER",
      defaultProvider: "mock",
      supportedProviders: ["mock", "openai", "disabled"],
      env: envState,
    });
  }

  if (selectedProvider === "openai") {
    const apiKey = env(process.env.OPENAI_API_KEY);
    if (!apiKey) {
      return createMisconfiguredResolution({
        category: "ai",
        selectionEnv: "AI_PROVIDER",
        selectedProvider,
        defaultProvider: "mock",
        supportedProviders: ["mock", "openai", "disabled"],
        missingEnv: ["OPENAI_API_KEY"],
        env: envState,
        mode: "live",
        metadata: {
          model: env(process.env.OPENAI_MODEL) ?? "gpt-4.1-mini",
          imageModel: env(process.env.OPENAI_IMAGE_MODEL) ?? "gpt-image-1",
        },
      });
    }

    return createReadyResolution({
      category: "ai",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new OpenAIProvider(apiKey),
    });
  }

  return createUnsupportedResolution({
    category: "ai",
    selectionEnv: "AI_PROVIDER",
    selectedProvider,
    defaultProvider: "mock",
    supportedProviders: ["mock", "openai", "disabled"],
    env: envState,
    mode: "live",
  });
}

function resolveStorageProvider(): ProviderResolution<StorageProvider> {
  const selectionValue = env(process.env.STORAGE_PROVIDER);
  const selectedProvider = selectionValue ?? "local";
  const envState = envFlags([
    "STORAGE_PROVIDER",
    "STORAGE_LOCAL_DIR",
    "S3_ENDPOINT",
    "S3_REGION",
    "S3_BUCKET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "S3_PUBLIC_BASE_URL",
    "R2_ACCOUNT_ID",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_STORAGE_BUCKET",
    "SUPABASE_STORAGE_PUBLIC_BASE_URL",
    "STORAGE_URL_SIGNING_SECRET",
  ]);

  if (selectedProvider === "local") {
    return createReadyResolution({
      category: "storage",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new LocalStorageProvider(),
    });
  }

  if (selectedProvider === "disabled") {
    return createDisabledResolution({
      category: "storage",
      selectionEnv: "STORAGE_PROVIDER",
      defaultProvider: "local",
      supportedProviders: ["local", "s3", "r2", "supabase", "disabled"],
      env: envState,
    });
  }

  if (selectedProvider === "s3") {
    const bucket = env(process.env.S3_BUCKET);
    const region = env(process.env.S3_REGION);
    const accessKeyId = env(process.env.S3_ACCESS_KEY_ID);
    const secretAccessKey = env(process.env.S3_SECRET_ACCESS_KEY);
    const missingEnv = [
      bucket ? null : "S3_BUCKET",
      region ? null : "S3_REGION",
    ].filter(Boolean) as string[];

    if (missingEnv.length) {
      return createMisconfiguredResolution({
        category: "storage",
        selectionEnv: "STORAGE_PROVIDER",
        selectedProvider,
        defaultProvider: "local",
        supportedProviders: ["local", "s3", "r2", "supabase", "disabled"],
        missingEnv,
        env: envState,
        mode: "live",
        metadata: {
          hasEndpoint: Boolean(env(process.env.S3_ENDPOINT)),
          hasPublicBaseUrl: Boolean(env(process.env.S3_PUBLIC_BASE_URL)),
        },
      });
    }

    return createReadyResolution({
      category: "storage",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new S3CompatibleStorageProvider({
        provider: "s3",
        bucket: bucket as string,
        region: region as string,
        ...(accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : {}),
        ...(env(process.env.S3_ENDPOINT)
          ? { endpoint: env(process.env.S3_ENDPOINT) as string }
          : {}),
        ...(env(process.env.S3_PUBLIC_BASE_URL)
          ? { publicBaseUrl: env(process.env.S3_PUBLIC_BASE_URL) as string }
          : {}),
      }),
    });
  }

  if (selectedProvider === "r2") {
    const bucket = env(process.env.S3_BUCKET);
    const accessKeyId = env(process.env.S3_ACCESS_KEY_ID);
    const secretAccessKey = env(process.env.S3_SECRET_ACCESS_KEY);
    const endpoint =
      env(process.env.S3_ENDPOINT) ??
      (env(process.env.R2_ACCOUNT_ID)
        ? `https://${env(process.env.R2_ACCOUNT_ID)}.r2.cloudflarestorage.com`
        : undefined);
    const missingEnv = [
      bucket ? null : "S3_BUCKET",
      accessKeyId ? null : "S3_ACCESS_KEY_ID",
      secretAccessKey ? null : "S3_SECRET_ACCESS_KEY",
      endpoint ? null : "S3_ENDPOINT or R2_ACCOUNT_ID",
    ].filter(Boolean) as string[];

    if (missingEnv.length) {
      return createMisconfiguredResolution({
        category: "storage",
        selectionEnv: "STORAGE_PROVIDER",
        selectedProvider,
        defaultProvider: "local",
        supportedProviders: ["local", "s3", "r2", "supabase", "disabled"],
        missingEnv,
        env: envState,
        mode: "live",
        metadata: {
          hasPublicBaseUrl: Boolean(env(process.env.S3_PUBLIC_BASE_URL)),
        },
      });
    }

    return createReadyResolution({
      category: "storage",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new S3CompatibleStorageProvider({
        provider: "r2",
        bucket: bucket as string,
        region: env(process.env.S3_REGION) ?? "auto",
        endpoint: endpoint as string,
        accessKeyId: accessKeyId as string,
        secretAccessKey: secretAccessKey as string,
        forcePathStyle: true,
        ...(env(process.env.S3_PUBLIC_BASE_URL)
          ? { publicBaseUrl: env(process.env.S3_PUBLIC_BASE_URL) as string }
          : {}),
      }),
    });
  }

  if (selectedProvider === "supabase") {
    const url = env(process.env.SUPABASE_URL);
    const serviceRoleKey = env(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const bucket = env(process.env.SUPABASE_STORAGE_BUCKET);
    const missingEnv = [
      url ? null : "SUPABASE_URL",
      serviceRoleKey ? null : "SUPABASE_SERVICE_ROLE_KEY",
      bucket ? null : "SUPABASE_STORAGE_BUCKET",
    ].filter(Boolean) as string[];

    if (missingEnv.length) {
      return createMisconfiguredResolution({
        category: "storage",
        selectionEnv: "STORAGE_PROVIDER",
        selectedProvider,
        defaultProvider: "local",
        supportedProviders: ["local", "s3", "r2", "supabase", "disabled"],
        missingEnv,
        env: envState,
        mode: "live",
        metadata: {
          hasPublicBaseUrl: Boolean(env(process.env.SUPABASE_STORAGE_PUBLIC_BASE_URL)),
        },
      });
    }

    return createReadyResolution({
      category: "storage",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new SupabaseStorageProvider({
        url: url as string,
        serviceRoleKey: serviceRoleKey as string,
        bucket: bucket as string,
        ...(env(process.env.SUPABASE_STORAGE_PUBLIC_BASE_URL)
          ? { publicBaseUrl: env(process.env.SUPABASE_STORAGE_PUBLIC_BASE_URL) as string }
          : {}),
      }),
    });
  }

  return createUnsupportedResolution({
    category: "storage",
    selectionEnv: "STORAGE_PROVIDER",
    selectedProvider,
    defaultProvider: "local",
    supportedProviders: ["local", "s3", "r2", "supabase", "disabled"],
    env: envState,
    mode: "live",
  });
}

function resolvePushProvider(): ProviderResolution<PushProvider> {
  const selectionValue = env(process.env.PUSH_PROVIDER);
  const selectedProvider = selectionValue ?? "mock";
  const envState = envFlags([
    "PUSH_PROVIDER",
    "EXPO_ACCESS_TOKEN",
    "EXPO_PROJECT_ID",
    "PUSH_ENVIRONMENT",
  ]);

  if (selectedProvider === "mock") {
    return createReadyResolution({
      category: "push",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new MockPushProvider(),
    });
  }

  if (selectedProvider === "disabled") {
    return createDisabledResolution({
      category: "push",
      selectionEnv: "PUSH_PROVIDER",
      defaultProvider: "mock",
      supportedProviders: ["mock", "expo", "disabled"],
      env: envState,
    });
  }

  if (selectedProvider === "expo") {
    const projectId = env(process.env.EXPO_PROJECT_ID);
    if (!projectId) {
      return createMisconfiguredResolution({
        category: "push",
        selectionEnv: "PUSH_PROVIDER",
        selectedProvider,
        defaultProvider: "mock",
        supportedProviders: ["mock", "expo", "disabled"],
        missingEnv: ["EXPO_PROJECT_ID"],
        env: envState,
        mode: "live",
      });
    }

    return createReadyResolution({
      category: "push",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new ExpoPushProvider({
        projectId,
        environment:
          env(process.env.PUSH_ENVIRONMENT) === "production"
            ? "production"
            : env(process.env.PUSH_ENVIRONMENT) === "preview"
              ? "preview"
              : "development",
        ...(env(process.env.EXPO_ACCESS_TOKEN)
          ? { accessToken: env(process.env.EXPO_ACCESS_TOKEN) as string }
          : {}),
      }),
    });
  }

  return createUnsupportedResolution({
    category: "push",
    selectionEnv: "PUSH_PROVIDER",
    selectedProvider,
    defaultProvider: "mock",
    supportedProviders: ["mock", "expo", "disabled"],
    env: envState,
    mode: "live",
  });
}

function resolveWhatsAppProvider(): ProviderResolution<WhatsAppProvider> {
  const selectionValue = env(process.env.WHATSAPP_PROVIDER);
  const selectedProvider = selectionValue ?? "disabled";
  const envState = envFlags([
    "WHATSAPP_PROVIDER",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_WHATSAPP_FROM",
  ]);

  if (selectedProvider === "mock") {
    return createReadyResolution({
      category: "whatsapp",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new MockWhatsAppProvider(),
    });
  }

  if (selectedProvider === "disabled") {
    return createDisabledResolution({
      category: "whatsapp",
      selectionEnv: "WHATSAPP_PROVIDER",
      defaultProvider: "disabled",
      supportedProviders: ["mock", "twilio", "disabled"],
      env: envState,
      metadata: {
        phase: "transactional-opt-in-foundation",
      },
    });
  }

  if (selectedProvider === "twilio") {
    const accountSid = env(process.env.TWILIO_ACCOUNT_SID);
    const authToken = env(process.env.TWILIO_AUTH_TOKEN);
    const fromPhone = env(process.env.TWILIO_WHATSAPP_FROM);
    const missingEnv = [
      ...(accountSid ? [] : ["TWILIO_ACCOUNT_SID"]),
      ...(authToken ? [] : ["TWILIO_AUTH_TOKEN"]),
      ...(fromPhone ? [] : ["TWILIO_WHATSAPP_FROM"]),
    ];

    if (missingEnv.length > 0) {
      return createMisconfiguredResolution({
        category: "whatsapp",
        selectionEnv: "WHATSAPP_PROVIDER",
        selectedProvider,
        defaultProvider: "disabled",
        supportedProviders: ["mock", "twilio", "disabled"],
        missingEnv,
        env: envState,
        mode: "live",
      });
    }

    return createReadyResolution({
      category: "whatsapp",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new TwilioWhatsAppProvider({
        accountSid: accountSid as string,
        authToken: authToken as string,
        fromPhone: fromPhone as string,
      }),
    });
  }

  return createUnsupportedResolution({
    category: "whatsapp",
    selectionEnv: "WHATSAPP_PROVIDER",
    selectedProvider,
    defaultProvider: "disabled",
    supportedProviders: ["mock", "twilio", "disabled"],
    env: envState,
    mode: "live",
  });
}

export function getEmailProvider(): EmailProvider {
  return requireProvider(resolveEmailProvider());
}

export function getEmailProviderDiagnostics(): ProviderDiagnostics {
  return resolveEmailProvider().diagnostics;
}

export function getPaymentProvider(): PaymentProvider {
  return requireProvider(resolvePaymentProvider());
}

export function getPaymentProviderDiagnostics(): ProviderDiagnostics {
  return resolvePaymentProvider().diagnostics;
}

export function getSmsProvider(): SmsProvider {
  return requireProvider(resolveSmsProvider());
}

export function getSmsProviderDiagnostics(): ProviderDiagnostics {
  return resolveSmsProvider().diagnostics;
}

export function getMapProvider(): MapProvider {
  return requireProvider(resolveMapProvider());
}

export function getMapProviderDiagnostics(): ProviderDiagnostics {
  return resolveMapProvider().diagnostics;
}

export function getAIProvider(): AIProvider {
  return requireProvider(resolveAIProvider());
}

export function getAIProviderDiagnostics(): ProviderDiagnostics {
  return resolveAIProvider().diagnostics;
}

export function getStorageProvider(): StorageProvider {
  return requireProvider(resolveStorageProvider());
}

export function getStorageProviderDiagnostics(): ProviderDiagnostics {
  return resolveStorageProvider().diagnostics;
}

export function getPushProvider(): PushProvider {
  return requireProvider(resolvePushProvider());
}

export function getPushProviderDiagnostics(): ProviderDiagnostics {
  return resolvePushProvider().diagnostics;
}

export function getWhatsAppProvider(): WhatsAppProvider {
  return requireProvider(resolveWhatsAppProvider());
}

export function getWhatsAppProviderDiagnostics(): ProviderDiagnostics {
  return resolveWhatsAppProvider().diagnostics;
}

export function getProviderRegistryDiagnostics(): ProviderRegistryDiagnostics {
  return {
    ai: getAIProviderDiagnostics(),
    email: getEmailProviderDiagnostics(),
    map: getMapProviderDiagnostics(),
    payment: getPaymentProviderDiagnostics(),
    push: getPushProviderDiagnostics(),
    sms: getSmsProviderDiagnostics(),
    storage: getStorageProviderDiagnostics(),
    whatsapp: getWhatsAppProviderDiagnostics(),
  };
}

import type {
  DiagnosticProvider,
  ProviderCategory,
  ProviderDiagnosticMetadata,
  ProviderDiagnosticStatus,
  ProviderDiagnostics,
  ProviderMode
} from "../types";
import { MockAIProvider, OpenAIProvider, type AIProvider } from "./ai";
import { MockEmailProvider, ResendEmailProvider, type EmailProvider } from "./email";
import { GoogleMapProvider, MockMapProvider, type MapProvider } from "./map";
import { MockPaymentProvider, type PaymentProvider } from "./payment";
import { MockPushProvider, type PushProvider } from "./push";
import { LocalStorageProvider, type StorageProvider } from "./storage";

type ProviderSetupErrorKind = "misconfigured" | "unsupported";

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
  storage: ProviderDiagnostics;
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
    const label = input.category === "ai" ? "AI" : `${input.category.slice(0, 1).toUpperCase()}${input.category.slice(1)}`;
    const message =
      input.kind === "misconfigured"
        ? `${label} provider "${input.selectedProvider}" is selected via ${input.selectionEnv} but is missing required env: ${missingEnv.join(", ")}. Set the missing env or switch ${input.selectionEnv}=${input.defaultProvider}.`
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

function envFlags(names: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(names.map((name) => [name, env(process.env[name]) !== undefined])) as Record<string, boolean>;
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
    ...(input.instance.metadata ? { metadata: input.instance.metadata } : {})
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
      instance: diagnostics
    })
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
    supportedProviders: input.supportedProviders
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
        ...(input.metadata ? { metadata: input.metadata } : {})
      }
    })
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
    supportedProviders: input.supportedProviders
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
        ...(input.metadata ? { metadata: input.metadata } : {})
      }
    })
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
  const envState = envFlags(["EMAIL_PROVIDER", "RESEND_API_KEY", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"]);

  if (selectedProvider === "mock") {
    return createReadyResolution({
      category: "email",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new MockEmailProvider()
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
        mode: "live"
      });
    }

    return createReadyResolution({
      category: "email",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new ResendEmailProvider(apiKey)
    });
  }

  return createUnsupportedResolution({
    category: "email",
    selectionEnv: "EMAIL_PROVIDER",
    selectedProvider,
    defaultProvider: "mock",
    supportedProviders: ["mock", "resend"],
    env: envState,
    mode: "live"
  });
}

function resolvePaymentProvider(): ProviderResolution<PaymentProvider> {
  const selectionValue = env(process.env.PAYMENT_PROVIDER);
  const selectedProvider = selectionValue ?? "mock";
  const envState = envFlags(["PAYMENT_PROVIDER"]);

  if (selectedProvider === "mock") {
    return createReadyResolution({
      category: "payment",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new MockPaymentProvider()
    });
  }

  return createUnsupportedResolution({
    category: "payment",
    selectionEnv: "PAYMENT_PROVIDER",
    selectedProvider,
    defaultProvider: "mock",
    supportedProviders: ["mock"],
    env: envState,
    mode: "live"
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
      provider: new MockMapProvider()
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
          supportsGoogleMapsLinks: true
        }
      });
    }

    return createReadyResolution({
      category: "map",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new GoogleMapProvider(apiKey)
    });
  }

  return createUnsupportedResolution({
    category: "map",
    selectionEnv: "MAP_PROVIDER",
    selectedProvider,
    defaultProvider: "mock",
    supportedProviders: ["mock", "google"],
    env: envState,
    mode: "live"
  });
}

function resolveAIProvider(): ProviderResolution<AIProvider> {
  const selectionValue = env(process.env.AI_PROVIDER);
  const selectedProvider = selectionValue ?? "mock";
  const envState = envFlags(["AI_PROVIDER", "OPENAI_API_KEY", "OPENAI_MODEL"]);

  if (selectedProvider === "mock") {
    return createReadyResolution({
      category: "ai",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new MockAIProvider()
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
        supportedProviders: ["mock", "openai"],
        missingEnv: ["OPENAI_API_KEY"],
        env: envState,
        mode: "live",
        metadata: {
          model: env(process.env.OPENAI_MODEL) ?? "gpt-4.1-mini"
        }
      });
    }

    return createReadyResolution({
      category: "ai",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new OpenAIProvider(apiKey)
    });
  }

  return createUnsupportedResolution({
    category: "ai",
    selectionEnv: "AI_PROVIDER",
    selectedProvider,
    defaultProvider: "mock",
    supportedProviders: ["mock", "openai"],
    env: envState,
    mode: "live"
  });
}

function resolveStorageProvider(): ProviderResolution<StorageProvider> {
  const selectionValue = env(process.env.STORAGE_PROVIDER);
  const selectedProvider = selectionValue ?? "local";
  const envState = envFlags([
    "STORAGE_PROVIDER",
    "S3_ENDPOINT",
    "S3_REGION",
    "S3_BUCKET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "R2_ACCOUNT_ID",
    "R2_BUCKET",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY"
  ]);

  if (selectedProvider === "local") {
    return createReadyResolution({
      category: "storage",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new LocalStorageProvider()
    });
  }

  return createUnsupportedResolution({
    category: "storage",
    selectionEnv: "STORAGE_PROVIDER",
    selectedProvider,
    defaultProvider: "local",
    supportedProviders: ["local"],
    env: envState,
    mode: "live"
  });
}

function resolvePushProvider(): ProviderResolution<PushProvider> {
  const selectionValue = env(process.env.PUSH_PROVIDER);
  const selectedProvider = selectionValue ?? "mock";
  const envState = envFlags(["PUSH_PROVIDER"]);

  if (selectedProvider === "mock") {
    return createReadyResolution({
      category: "push",
      selectedProvider,
      selectionValue,
      env: envState,
      provider: new MockPushProvider()
    });
  }

  return createUnsupportedResolution({
    category: "push",
    selectionEnv: "PUSH_PROVIDER",
    selectedProvider,
    defaultProvider: "mock",
    supportedProviders: ["mock"],
    env: envState,
    mode: "live"
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

export function getProviderRegistryDiagnostics(): ProviderRegistryDiagnostics {
  return {
    ai: getAIProviderDiagnostics(),
    email: getEmailProviderDiagnostics(),
    map: getMapProviderDiagnostics(),
    payment: getPaymentProviderDiagnostics(),
    push: getPushProviderDiagnostics(),
    storage: getStorageProviderDiagnostics()
  };
}

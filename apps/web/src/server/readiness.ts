import { prisma } from "@zook/db";
import { getAppEnv } from "@zook/core";
import { summarizeProviderDiagnostics } from "./request-logger";

type ComponentStatus = "operational" | "degraded" | "down";

type StatusComponent = {
  status: ComponentStatus;
  label: string;
  detail: string;
  provider?: string | null;
};

type StatusComponents = Record<
  "web" | "db" | "razorpay" | "expo_push" | "openai" | "storage",
  StatusComponent
>;

function buildVersion() {
  return process.env.ZOOK_BUILD_VERSION ?? process.env.npm_package_version ?? "0.1.0";
}

export function getHealthPayload() {
  return {
    alive: true,
    version: buildVersion(),
    envProfile: safeEnvProfile(),
    timestamp: new Date().toISOString(),
  };
}

function safeEnvProfile() {
  try {
    return getAppEnv();
  } catch {
    return "invalid";
  }
}

export async function getReadinessPayload() {
  let dbReachable = false;
  let databaseErrorCode: string | undefined;

  try {
    await prisma.$queryRawUnsafe("select 1 as ready");
    dbReachable = true;
  } catch (error) {
    dbReachable = false;
    databaseErrorCode = error instanceof Error ? error.name : "DatabaseReadinessError";
  }

  return {
    ready: dbReachable,
    version: buildVersion(),
    envProfile: safeEnvProfile(),
    timestamp: new Date().toISOString(),
    prisma: {
      clientReady: true,
    },
    database: {
      reachable: dbReachable,
      ...(databaseErrorCode
        ? { error: "Database readiness check failed.", errorCode: databaseErrorCode }
        : {}),
    },
    providers: summarizeProviderDiagnostics(),
  };
}

function providerStatus(
  provider: ReturnType<typeof summarizeProviderDiagnostics>["payment"],
  expectedProvider?: string,
): ComponentStatus {
  if (provider.status === "misconfigured" || provider.status === "unsupported") {
    return "down";
  }
  if (provider.status === "disabled") {
    return "degraded";
  }
  if (expectedProvider && provider.activeProvider !== expectedProvider) {
    return "degraded";
  }
  return "operational";
}

function providerDetail(
  provider: ReturnType<typeof summarizeProviderDiagnostics>["payment"],
  expectedProvider?: string,
) {
  if (expectedProvider && provider.activeProvider !== expectedProvider) {
    return `${provider.activeProvider ?? provider.selectedProvider} mode is active.`;
  }
  if (provider.status === "default") {
    return "Default provider is active.";
  }
  return `${provider.selectedProvider} provider is ${provider.status}.`;
}

function providerComponent(input: {
  label: string;
  provider: ReturnType<typeof summarizeProviderDiagnostics>["payment"];
  expectedProvider?: string;
}): StatusComponent {
  return {
    label: input.label,
    provider: input.provider.activeProvider ?? input.provider.selectedProvider,
    status: providerStatus(input.provider, input.expectedProvider),
    detail: providerDetail(input.provider, input.expectedProvider),
  };
}

function aggregateStatus(components: StatusComponents): ComponentStatus {
  if (components.db.status === "down" || components.web.status === "down") {
    return "down";
  }
  if (Object.values(components).some((component) => component.status !== "operational")) {
    return "degraded";
  }
  return "operational";
}

export async function getStatusPayload() {
  const readiness = await getReadinessPayload();
  const providers = readiness.providers;
  const components: StatusComponents = {
    web: {
      label: "Web app",
      status: "operational",
      detail: "Public web routes are responding.",
    },
    db: {
      label: "Database",
      status: readiness.database.reachable ? "operational" : "down",
      detail: readiness.database.reachable
        ? "Database readiness check passed."
        : "Database readiness check failed.",
    },
    razorpay: providerComponent({
      label: "Razorpay payments",
      provider: providers.payment,
      expectedProvider: "razorpay",
    }),
    expo_push: providerComponent({
      label: "Expo push",
      provider: providers.push,
      expectedProvider: "expo",
    }),
    openai: providerComponent({
      label: "OpenAI",
      provider: providers.ai,
      expectedProvider: "openai",
    }),
    storage: providerComponent({
      label: "Storage",
      provider: providers.storage,
    }),
  };

  return {
    status: aggregateStatus(components),
    components,
    version: readiness.version,
    timestamp: readiness.timestamp,
  };
}

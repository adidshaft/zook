import { prisma } from "@zook/db";
import { getAppEnv } from "@zook/core";
import { summarizeProviderDiagnostics } from "./request-logger";

type ComponentStatus = "operational" | "degraded" | "down";

const requiredMigrationNames = [
  "20260524160000_phase2_platform_console",
  "20260524200000_phase5_saas_upgrade",
  "20260524210000_phase6_invoice_sequences",
  "20260524220000_phase7_branch_backfill",
  "20260524230000_phase9_trainer_payouts",
  "20260524233000_phase10_referral_polish",
] as const;

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
  let schemaReady = false;
  let missingMigrations: string[] = [];

  try {
    await prisma.$queryRawUnsafe("select 1 as ready");
    dbReachable = true;
    const appliedMigrations = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
      'select "migration_name" from "_prisma_migrations" where "finished_at" is not null',
    );
    const appliedMigrationNames = new Set(appliedMigrations.map((row) => row.migration_name));
    missingMigrations = requiredMigrationNames.filter((name) => !appliedMigrationNames.has(name));
    schemaReady = missingMigrations.length === 0;
  } catch (error) {
    schemaReady = false;
    databaseErrorCode = error instanceof Error ? error.name : "DatabaseReadinessError";
  }

  const providers = summarizeProviderDiagnostics();
  const rateLimitReady = providers.rateLimit.status !== "misconfigured";

  return {
    ready: dbReachable && schemaReady && rateLimitReady,
    version: buildVersion(),
    envProfile: safeEnvProfile(),
    timestamp: new Date().toISOString(),
    prisma: {
      clientReady: true,
    },
    database: {
      reachable: dbReachable,
      schemaReady,
      ...(missingMigrations.length > 0
        ? {
            migrationStatus: "pending" as const,
            missingRequiredMigrations: missingMigrations,
          }
        : dbReachable
          ? { migrationStatus: "applied" as const }
          : {}),
      ...(databaseErrorCode
        ? { error: "Database readiness check failed.", errorCode: databaseErrorCode }
        : {}),
    },
    providers,
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
      status:
        readiness.database.reachable && readiness.database.schemaReady ? "operational" : "down",
      detail: !readiness.database.reachable
        ? "Database readiness check failed."
        : readiness.database.schemaReady
          ? "Database readiness and migration checks passed."
          : "Database is reachable, but required migrations are missing.",
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

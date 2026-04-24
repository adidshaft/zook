import { prisma } from "@zook/db";
import { summarizeProviderDiagnostics } from "./request-logger";

function buildVersion() {
  return process.env.ZOOK_BUILD_VERSION ?? process.env.npm_package_version ?? "0.1.0";
}

export function getHealthPayload() {
  return {
    alive: true,
    version: buildVersion(),
    envProfile: process.env.ENV_PROFILE ?? "local",
    timestamp: new Date().toISOString()
  };
}

export async function getReadinessPayload() {
  let dbReachable = false;
  let databaseError: string | undefined;

  try {
    await prisma.$queryRawUnsafe("select 1 as ready");
    dbReachable = true;
  } catch (error) {
    dbReachable = false;
    databaseError = error instanceof Error ? error.message : "Database readiness check failed.";
  }

  return {
    ready: dbReachable,
    version: buildVersion(),
    envProfile: process.env.ENV_PROFILE ?? "local",
    timestamp: new Date().toISOString(),
    prisma: {
      clientReady: true
    },
    database: {
      reachable: dbReachable,
      ...(databaseError ? { error: databaseError } : {})
    },
    providers: summarizeProviderDiagnostics()
  };
}

import { prisma } from "@zook/db";
import { getAppEnv } from "@zook/core";
import { summarizeProviderDiagnostics } from "./request-logger";

function buildVersion() {
  return process.env.ZOOK_BUILD_VERSION ?? process.env.npm_package_version ?? "0.1.0";
}

export function getHealthPayload() {
  return {
    alive: true,
    version: buildVersion(),
    envProfile: safeEnvProfile(),
    timestamp: new Date().toISOString()
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
      clientReady: true
    },
    database: {
      reachable: dbReachable,
      ...(databaseErrorCode ? { error: "Database readiness check failed.", errorCode: databaseErrorCode } : {})
    },
    providers: summarizeProviderDiagnostics()
  };
}

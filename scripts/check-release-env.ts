import { fileURLToPath } from "node:url";
import { validateRuntimeConfig } from "@zook/core";
import {
  env,
  evaluateProviderSelection,
  fail,
  hasGeneratedPrismaClient,
  isAbsoluteHttpUrl,
  isLocalhostUrl,
  isStrongSecret,
  isTruthy,
  loadLocalEnvironment,
  pass,
  providerSelections,
  readPackageManagerVersion,
  readPnpmVersion,
  renderResult,
  resolveEnvProfile,
  warn,
  type CheckResult
} from "./shared";

function summarizeProviderModes() {
  const active = providerSelections
    .map((selection) => `${selection.envKey}=${env(selection.envKey) ?? selection.defaultValue}`)
    .join(", ");
  return pass("Provider selections", active);
}

function checkAbsoluteUrl(label: string, key: string) {
  const value = env(key);
  if (!value) {
    return fail(label, `${key} is not set.`, `Set ${key} to the public URL for this environment.`);
  }
  if (!isAbsoluteHttpUrl(value)) {
    return fail(label, `${key}=${value} is not an absolute URL.`, "Use a full http:// or https:// URL.");
  }
  return pass(label, `${key} is ${value}.`);
}

export async function runReleaseEnvChecks(): Promise<CheckResult[]> {
  loadLocalEnvironment();

  const results: CheckResult[] = [];
  let profile = "local" as ReturnType<typeof resolveEnvProfile>;
  const nodeVersion = process.versions.node;
  const nodeMajor = Number(nodeVersion.split(".")[0] ?? "0");

  try {
    profile = resolveEnvProfile();
    results.push(pass("Environment profile", `ENV_PROFILE=${profile}.`));
  } catch (error) {
    results.push(
      fail(
        "Environment profile",
        error instanceof Error ? error.message : "APP_ENV/ENV_PROFILE is invalid.",
        "Set APP_ENV to local, staging, or production."
      )
    );
  }

  for (const issue of validateRuntimeConfig(process.env).issues) {
    if (
      [
        "INVALID_APP_ENV",
        "INVALID_ENV_PROFILE",
        "INVALID_EXPO_PUBLIC_APP_ENV",
        "INVALID_API_MODE",
        "INVALID_EXPO_PUBLIC_API_MODE",
        "STAGING_IMPLICIT_PAYMENT_PROVIDER",
        "STAGING_IMPLICIT_AI_PROVIDER",
        "STAGING_IMPLICIT_PUSH_PROVIDER",
        "STAGING_IMPLICIT_RATE_LIMIT_PROVIDER",
        "PRODUCTION_MEMORY_RATE_LIMIT",
        "PRODUCTION_DISABLED_RATE_LIMIT"
      ].includes(issue.code)
    ) {
      results.push(
        issue.level === "error"
          ? fail(`Runtime guard ${issue.code}`, issue.message)
          : warn(`Runtime guard ${issue.code}`, issue.message)
      );
    }
  }

  const apiMode = env("API_MODE") ?? "backend";
  const legacyOfflineDemoEnabled =
    isTruthy(env("EXPO_PUBLIC_OFFLINE_DEMO")) ||
    isTruthy(env("EXPO_PUBLIC_DEMO_MODE")) ||
    isTruthy(env("MOBILE_OFFLINE_DEMO"));
  if (!["backend", "offline-demo"].includes(apiMode)) {
    results.push(
      fail("API mode", `API_MODE=${apiMode} is not supported.`, "Use API_MODE=backend or API_MODE=offline-demo.")
    );
  } else if (apiMode === "offline-demo" && profile !== "local") {
    results.push(
      fail("API mode", "Offline demo mode is enabled outside local.", "Use API_MODE=backend for staging and production builds.")
    );
  } else if (apiMode === "offline-demo") {
    results.push(warn("API mode", "API_MODE=offline-demo is active.", "This is only for local demos and screenshot QA."));
  } else {
    results.push(pass("API mode", "API_MODE=backend."));
  }

  if (legacyOfflineDemoEnabled && profile !== "local") {
    results.push(
      fail(
        "Legacy offline demo flags",
        "One of EXPO_PUBLIC_OFFLINE_DEMO, EXPO_PUBLIC_DEMO_MODE, or MOBILE_OFFLINE_DEMO is enabled outside local.",
        "Remove legacy demo flags and use API_MODE=backend."
      )
    );
  } else if (legacyOfflineDemoEnabled) {
    results.push(
      warn(
        "Legacy offline demo flags",
        "Legacy offline demo flags are enabled.",
        "Prefer API_MODE=offline-demo so the runtime mode is explicit."
      )
    );
  }

  if (nodeMajor >= 22) {
    results.push(pass("Node.js", `Detected Node ${nodeVersion}.`));
  } else if (nodeMajor >= 20) {
    results.push(
      warn("Node.js", `Detected Node ${nodeVersion}.`, "Zook runs best on Node 22.x for Next.js, Prisma, and Expo tooling.")
    );
  } else {
    results.push(
      fail("Node.js", `Detected Node ${nodeVersion}.`, "Use Node 20+ before running local dev, Prisma, or Playwright commands.")
    );
  }

  try {
    const actualPnpm = readPnpmVersion();
    const expectedPnpm = readPackageManagerVersion();
    if (!expectedPnpm) {
      results.push(pass("pnpm", `Detected pnpm ${actualPnpm}.`));
    } else if (actualPnpm.split(".")[0] === expectedPnpm.split(".")[0]) {
      results.push(pass("pnpm", `Detected pnpm ${actualPnpm}. packageManager expects ${expectedPnpm}.`));
    } else {
      results.push(
        warn("pnpm", `Detected pnpm ${actualPnpm}. packageManager expects ${expectedPnpm}.`, "Switch to the repo pnpm version if you hit lockfile or workspace script issues.")
      );
    }
  } catch (error) {
    results.push(
      fail("pnpm", error instanceof Error ? error.message : "Unable to resolve pnpm version.", "Install pnpm before running monorepo scripts.")
    );
  }

  results.push(
    hasGeneratedPrismaClient()
      ? pass("Prisma client", "Generated client artifacts are present.")
      : fail("Prisma client", "Generated Prisma client artifacts were not found.", "Run `pnpm db:generate`.")
  );

  const databaseUrl = env("DATABASE_URL");
  results.push(
    databaseUrl
      ? pass("Database URL", "DATABASE_URL is configured.")
      : fail("Database URL", "DATABASE_URL is not set.", "Set DATABASE_URL before running release checks.")
  );

  const sessionSecret = env("SESSION_SECRET");
  if (isStrongSecret(sessionSecret)) {
    results.push(pass("Session secret", "SESSION_SECRET meets the minimum strength policy."));
  } else {
    const detail = sessionSecret ? "SESSION_SECRET is present but weak." : "SESSION_SECRET is missing.";
    results.push(
      profile === "local"
        ? warn("Session secret", detail, "Use a random 32+ character secret before sharing a non-local environment.")
        : fail("Session secret", detail, "Use a random 32+ character secret before staging or production.")
    );
  }

  const qrSecret = env("ZOOK_QR_SECRET");
  results.push(
    isStrongSecret(qrSecret)
      ? pass("QR signing secret", "ZOOK_QR_SECRET is configured with a strong value.")
      : profile === "local"
        ? warn("QR signing secret", "ZOOK_QR_SECRET is missing or weak.", "Use a random 32+ character value before sharing environments.")
        : fail("QR signing secret", "ZOOK_QR_SECRET is missing or weak.", "Use a random 32+ character value before staging or production.")
  );

  results.push(checkAbsoluteUrl("App URL", "NEXT_PUBLIC_APP_URL"));
  results.push(checkAbsoluteUrl("Web URL", "NEXT_PUBLIC_WEB_URL"));
  results.push(checkAbsoluteUrl("Dashboard URL", "NEXT_PUBLIC_DASHBOARD_URL"));

  const mobileApiBaseUrl = env("MOBILE_API_BASE_URL") ?? env("EXPO_PUBLIC_API_BASE_URL");
  if (!mobileApiBaseUrl) {
    results.push(
      fail("Mobile API base URL", "MOBILE_API_BASE_URL and EXPO_PUBLIC_API_BASE_URL are both missing.", "Set one of them for simulator, emulator, and device builds.")
    );
  } else if (!isAbsoluteHttpUrl(mobileApiBaseUrl)) {
    results.push(
      fail("Mobile API base URL", `${mobileApiBaseUrl} is not an absolute URL.`, "Use a full http:// or https:// URL.")
    );
  } else if (profile !== "local" && isLocalhostUrl(mobileApiBaseUrl)) {
    results.push(
      fail("Mobile API base URL", `Mobile API base URL is ${mobileApiBaseUrl}.`, "Use a reachable staging or production host for shared builds.")
    );
  } else if (profile === "local" && isLocalhostUrl(mobileApiBaseUrl)) {
    results.push(
      warn("Mobile API base URL", `Mobile API base URL is ${mobileApiBaseUrl}.`, "Use `10.0.2.2` for Android emulator or a LAN IP for physical devices.")
    );
  } else {
    results.push(pass("Mobile API base URL", `Mobile API base URL is ${mobileApiBaseUrl}.`));
  }

  const fixedOtpEnabled = Boolean(env("OTP_FIXED_CODE_DEV"));
  const allowFixedOtpInStaging = isTruthy(env("ALLOW_FIXED_OTP_IN_STAGING"));
  if (profile === "production" && fixedOtpEnabled) {
    results.push(fail("Fixed OTP", "OTP_FIXED_CODE_DEV is enabled in production profile.", "Remove OTP_FIXED_CODE_DEV before production deploys."));
  } else if (profile === "staging" && fixedOtpEnabled && !allowFixedOtpInStaging) {
    results.push(fail("Fixed OTP", "OTP_FIXED_CODE_DEV is enabled for staging without an explicit override.", "Unset OTP_FIXED_CODE_DEV or set ALLOW_FIXED_OTP_IN_STAGING=true only for tightly controlled internal testing."));
  } else if (fixedOtpEnabled) {
    results.push(pass("Fixed OTP", `OTP_FIXED_CODE_DEV is enabled${profile === "staging" ? " with an explicit staging override" : ""}.`));
  } else {
    results.push(warn("Fixed OTP", "OTP_FIXED_CODE_DEV is not set.", "That is expected for staging/production. Local auth will use generated OTPs instead."));
  }

  const seedDemoUsersEnabled = env("SEED_DEMO_USERS_ENABLED");
  if (profile === "production" && isTruthy(seedDemoUsersEnabled ?? "false")) {
    results.push(fail("Seed/demo users", "SEED_DEMO_USERS_ENABLED is true in production profile.", "Disable demo seed accounts before production deploys."));
  } else if (profile === "staging" && isTruthy(seedDemoUsersEnabled ?? "false")) {
    results.push(warn("Seed/demo users", "SEED_DEMO_USERS_ENABLED is true in staging.", "Keep this only for internal pilots and remove it before production promotion."));
  } else {
    results.push(pass("Seed/demo users", `SEED_DEMO_USERS_ENABLED=${seedDemoUsersEnabled ?? (profile === "local" ? "true" : "false")}.`));
  }

  results.push(summarizeProviderModes());

  for (const selection of providerSelections) {
    results.push(evaluateProviderSelection(selection));
  }

  const paymentProvider = env("PAYMENT_PROVIDER") ?? "mock";
  if (profile === "production" && paymentProvider === "mock" && !isTruthy(env("MAINTENANCE_MOCK_MODE"))) {
    results.push(fail("Production payments", "PAYMENT_PROVIDER=mock in production profile.", "Select a real provider or explicitly set MAINTENANCE_MOCK_MODE=true for a controlled maintenance posture."));
  } else if (paymentProvider === "mock") {
    results.push(warn("Mock payments", "PAYMENT_PROVIDER=mock is active.", "This is acceptable for local development and controlled staging, but not for normal production traffic."));
  } else {
    results.push(pass("Payment webhook secret", env("RAZORPAY_WEBHOOK_SECRET") ? "Payment webhook secret is configured." : "Payment provider does not require a webhook secret check yet."));
  }

  if (profile === "production" && isTruthy(env("ALLOW_MOCK_PAYMENT_COMPLETION"))) {
    results.push(
      fail(
        "Mock payment completion",
        "ALLOW_MOCK_PAYMENT_COMPLETION is enabled in production.",
        "Unset it before production deploys."
      )
    );
  } else if (profile === "staging" && isTruthy(env("ALLOW_MOCK_PAYMENT_COMPLETION"))) {
    results.push(
      warn(
        "Mock payment completion",
        "ALLOW_MOCK_PAYMENT_COMPLETION is enabled in staging.",
        "Use only for controlled internal validation."
      )
    );
  }

  const pushProvider = env("PUSH_PROVIDER") ?? "mock";
  if (profile === "production" && pushProvider === "mock") {
    results.push(fail("Production push", "PUSH_PROVIDER=mock in production profile.", "Use PUSH_PROVIDER=expo or PUSH_PROVIDER=disabled."));
  } else if (pushProvider === "disabled") {
    results.push(warn("Push provider", "PUSH_PROVIDER=disabled is active.", "In-app notifications remain canonical; remote push delivery is unavailable."));
  } else if (pushProvider === "mock") {
    results.push(warn("Push provider", "PUSH_PROVIDER=mock is active.", "In-app notifications will still work, but remote push delivery will stay simulated."));
  } else {
    results.push(pass("Push provider", `PUSH_PROVIDER=${pushProvider} is selected.`));
  }

  const errorReporter = env("ERROR_REPORTER") ?? "mock";
  if (profile === "production" && errorReporter !== "sentry") {
    results.push(
      fail(
        "Production error reporting",
        `ERROR_REPORTER=${errorReporter} in production profile.`,
        "Use ERROR_REPORTER=sentry with web and mobile Sentry DSNs before production deploys."
      )
    );
  } else if (errorReporter === "sentry") {
    const missingReporterEnv = [
      "SENTRY_DSN",
      "NEXT_PUBLIC_SENTRY_DSN",
      "EXPO_PUBLIC_SENTRY_DSN",
    ].filter((key) => !env(key));
    results.push(
      missingReporterEnv.length
        ? (profile === "production"
            ? fail("Sentry DSNs", `ERROR_REPORTER=sentry is missing ${missingReporterEnv.join(", ")}.`, "Set the web and mobile Sentry DSNs.")
            : warn("Sentry DSNs", `ERROR_REPORTER=sentry is missing ${missingReporterEnv.join(", ")}.`, "Set both DSNs before staging source-map QA."))
        : pass("Sentry DSNs", "Web and mobile Sentry DSNs are configured.")
    );
  } else {
    results.push(warn("Error reporter", `ERROR_REPORTER=${errorReporter}.`, "Use ERROR_REPORTER=sentry before staging or production certification."));
  }
  const sentryProjectsConfigured = Boolean(
    env("SENTRY_PROJECT") || env("SENTRY_WEB_PROJECT") || env("SENTRY_MOBILE_PROJECT")
  );
  if ((env("SENTRY_ORG") || sentryProjectsConfigured) && !env("SENTRY_AUTH_TOKEN")) {
    results.push(
      profile === "production"
        ? fail("Sentry source maps", "Sentry project env is set without SENTRY_AUTH_TOKEN.", "Set a Sentry auth token so release source maps can upload.")
        : warn("Sentry source maps", "Sentry project env is set without SENTRY_AUTH_TOKEN.", "Set it before staging source-map verification.")
    );
  }

  const aiProvider = env("AI_PROVIDER") ?? "mock";
  if (profile === "production" && aiProvider === "mock") {
    results.push(fail("Production AI", "AI_PROVIDER=mock in production profile.", "Use AI_PROVIDER=openai or AI_PROVIDER=disabled."));
  } else if (aiProvider === "disabled") {
    results.push(warn("AI provider", "AI_PROVIDER=disabled is active.", "AI planning features must show unavailable states."));
  }
  if (env("AI_FEATURES_ENABLED") === "true") {
    results.push(
      profile === "production"
        ? fail(
            "AI launch gate",
            "AI_FEATURES_ENABLED=true in production profile.",
            "Keep AI_FEATURES_ENABLED=false until the post-launch OpenAI quota and safety certification is complete."
          )
        : warn(
            "AI launch gate",
            "AI_FEATURES_ENABLED=true.",
            "Use this only for controlled staging certification; launch UI should still treat AI as coming soon."
          )
    );
  } else {
    results.push(pass("AI launch gate", "AI_FEATURES_ENABLED is off."));
  }

  const emailProvider = env("EMAIL_PROVIDER") ?? "mock";
  if (profile === "production" && emailProvider === "mock") {
    results.push(fail("Production email", "EMAIL_PROVIDER=mock in production profile.", "Select SMTP or Resend before production deploys."));
  } else if (profile === "staging" && emailProvider === "mock") {
    results.push(warn("Staging email", "EMAIL_PROVIDER=mock is active in staging.", "This is acceptable for internal pilots only if the team is intentionally not sending real email."));
  }

  const storageProvider = env("STORAGE_PROVIDER") ?? "local";
  const uploadsEnabled = !["0", "false", "no", "off"].includes((env("FILE_UPLOADS_ENABLED") ?? "").toLowerCase());
  if (
    profile === "production" &&
    storageProvider === "local" &&
    uploadsEnabled
  ) {
    results.push(fail("Production storage", "STORAGE_PROVIDER=local in production profile while uploads are enabled.", "Use STORAGE_PROVIDER=supabase, s3, or r2; or set FILE_UPLOADS_ENABLED=false if uploads are intentionally disabled."));
  } else if (storageProvider === "disabled" && uploadsEnabled) {
    results.push(warn("Storage provider", "STORAGE_PROVIDER=disabled while file uploads are enabled.", "Upload routes will return a controlled unavailable error. Set FILE_UPLOADS_ENABLED=false if uploads are intentionally off."));
  } else if (storageProvider === "local" && !env("STORAGE_LOCAL_DIR")) {
    results.push(
      warn("Storage path", "STORAGE_PROVIDER=local but STORAGE_LOCAL_DIR is not set.", "The app will fall back to the default local uploads directory.")
    );
  } else {
    results.push(pass("Storage provider status", `STORAGE_PROVIDER=${storageProvider}.`));
  }
  if (storageProvider === "r2" && !env("S3_ENDPOINT") && !env("R2_ACCOUNT_ID")) {
    results.push(
      fail(
        "R2 endpoint",
        "STORAGE_PROVIDER=r2 requires S3_ENDPOINT or R2_ACCOUNT_ID.",
        "Set S3_ENDPOINT explicitly or provide R2_ACCOUNT_ID so the runtime can derive the Cloudflare R2 endpoint."
      )
    );
  }
  if (storageProvider === "supabase") {
    const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET"].filter(
      (key) => !env(key)
    );
    results.push(
      missing.length
        ? fail("Supabase storage", `STORAGE_PROVIDER=supabase is missing ${missing.join(", ")}.`, "Set the Supabase project URL, service role key, and storage bucket.")
        : pass("Supabase storage", "STORAGE_PROVIDER=supabase is configured.")
    );
  }

  const rateLimitProvider = env("RATE_LIMIT_PROVIDER") ?? "memory";
  if (profile === "production" && rateLimitProvider === "memory") {
    results.push(fail("Production rate limiting", "RATE_LIMIT_PROVIDER=memory in production profile.", "Use RATE_LIMIT_PROVIDER=upstash with UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."));
  } else if (profile === "production" && rateLimitProvider === "disabled") {
    results.push(fail("Production rate limiting", "RATE_LIMIT_PROVIDER=disabled in production profile.", "Use RATE_LIMIT_PROVIDER=upstash for production deploys."));
  } else if (rateLimitProvider === "upstash") {
    const missing = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"].filter((key) => !env(key));
    results.push(
      missing.length
        ? fail("Distributed rate limiting", `RATE_LIMIT_PROVIDER=upstash is missing ${missing.join(", ")}.`, "Set the Upstash Redis REST URL and token.")
        : pass("Distributed rate limiting", "RATE_LIMIT_PROVIDER=upstash is configured.")
    );
  } else if (rateLimitProvider === "memory") {
    results.push(warn("Rate limiting", "RATE_LIMIT_PROVIDER=memory is active.", "This is acceptable for local development and single-process staging only."));
  } else {
    results.push(warn("Rate limiting", `RATE_LIMIT_PROVIDER=${rateLimitProvider} is active.`, "Supported production value is upstash."));
  }

  results.push(pass("Map provider status", `MAP_PROVIDER=${env("MAP_PROVIDER") ?? "mock"}.`));
  results.push(pass("AI provider status", `AI_PROVIDER=${aiProvider}.`));
  results.push(pass("Email provider status", `EMAIL_PROVIDER=${emailProvider}.`));

  return results;
}

async function main() {
  const results = await runReleaseEnvChecks();
  for (const result of results) {
    renderResult(result);
  }

  const failures = results.filter((result) => result.status === "fail").length;
  const warnings = results.filter((result) => result.status === "warn").length;

  console.log("");
  if (failures > 0) {
    console.log(`Environment checks failed with ${failures} blocking issue(s) and ${warnings} warning(s).`);
    process.exit(1);
  }

  if (warnings > 0) {
    console.log(`Environment checks passed with ${warnings} warning(s).`);
    return;
  }

  console.log("Environment checks passed with no issues.");
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  void main();
}

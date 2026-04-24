import { fileURLToPath } from "node:url";
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
  const profile = resolveEnvProfile();
  const nodeVersion = process.versions.node;
  const nodeMajor = Number(nodeVersion.split(".")[0] ?? "0");

  results.push(pass("Environment profile", `ENV_PROFILE=${profile}.`));

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

  const pushProvider = env("PUSH_PROVIDER") ?? "mock";
  if (pushProvider === "mock") {
    results.push(warn("Push provider", "PUSH_PROVIDER=mock is active.", "In-app notifications will still work, but remote push delivery will stay simulated."));
  } else {
    results.push(pass("Push provider", `PUSH_PROVIDER=${pushProvider} is selected.`));
  }

  const emailProvider = env("EMAIL_PROVIDER") ?? "mock";
  if (profile === "production" && emailProvider === "mock") {
    results.push(fail("Production email", "EMAIL_PROVIDER=mock in production profile.", "Select SMTP or Resend before production deploys."));
  } else if (profile === "staging" && emailProvider === "mock") {
    results.push(warn("Staging email", "EMAIL_PROVIDER=mock is active in staging.", "This is acceptable for internal pilots only if the team is intentionally not sending real email."));
  }

  const storageProvider = env("STORAGE_PROVIDER") ?? "local";
  if (storageProvider === "local" && !env("STORAGE_LOCAL_DIR")) {
    results.push(
      warn("Storage path", "STORAGE_PROVIDER=local but STORAGE_LOCAL_DIR is not set.", "The app will fall back to the default local uploads directory.")
    );
  } else {
    results.push(pass("Storage provider status", `STORAGE_PROVIDER=${storageProvider}.`));
  }

  results.push(pass("Map provider status", `MAP_PROVIDER=${env("MAP_PROVIDER") ?? "mock"}.`));
  results.push(pass("AI provider status", `AI_PROVIDER=${env("AI_PROVIDER") ?? "mock"}.`));
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

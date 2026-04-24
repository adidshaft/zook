import { hasGeneratedPrismaClient, loadLocalEnvironment, pass, providerSelections, readPackageManagerVersion, readPnpmVersion, warn, fail, evaluateProviderSelection, type CheckResult, env } from "./shared";

const requiredLocalEnvKeys = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_WEB_URL",
  "ZOOK_QR_SECRET"
] as const;

export async function runEnvChecks(): Promise<CheckResult[]> {
  loadLocalEnvironment();

  const results: CheckResult[] = [];
  const nodeVersion = process.versions.node;
  const nodeMajor = Number(nodeVersion.split(".")[0] ?? "0");

  if (nodeMajor >= 22) {
    results.push(pass("Node.js", `Detected Node ${nodeVersion}.`));
  } else if (nodeMajor >= 20) {
    results.push(
      warn(
        "Node.js",
        `Detected Node ${nodeVersion}.`,
        "Zook runs best on Node 22.x for Next.js, Prisma, and Expo tooling."
      )
    );
  } else {
    results.push(
      fail(
        "Node.js",
        `Detected Node ${nodeVersion}.`,
        "Use Node 20+ before running local dev, Prisma, or Playwright commands."
      )
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
        warn(
          "pnpm",
          `Detected pnpm ${actualPnpm}. packageManager expects ${expectedPnpm}.`,
          "Switch to the repo pnpm version if you hit lockfile or workspace script issues."
        )
      );
    }
  } catch (error) {
    results.push(
      fail(
        "pnpm",
        error instanceof Error ? error.message : "Unable to resolve pnpm version.",
        "Install pnpm before running monorepo scripts."
      )
    );
  }

  results.push(
    hasGeneratedPrismaClient()
      ? pass("Prisma client", "Generated client artifacts are present.")
      : fail("Prisma client", "Generated Prisma client artifacts were not found.", "Run `pnpm db:generate`.")
  );

  const missingRequiredEnv = requiredLocalEnvKeys.filter((key) => !env(key));
  results.push(
    missingRequiredEnv.length === 0
      ? pass("Required env", `Local runtime env is present (${requiredLocalEnvKeys.join(", ")}).`)
      : fail(
          "Required env",
          `Missing ${missingRequiredEnv.join(", ")}.`,
          "Copy `.env.example` to `.env` and fill the required values."
        )
  );

  results.push(
    env("OTP_FIXED_CODE_DEV")
      ? pass("Dev OTP", "OTP_FIXED_CODE_DEV is set for deterministic local sign-in.")
      : warn(
          "Dev OTP",
          "OTP_FIXED_CODE_DEV is not set.",
          "Local auth still works, but OTPs will not be deterministic for manual or Playwright testing."
        )
  );

  const mobileApiBaseUrl = env("MOBILE_API_BASE_URL") ?? env("EXPO_PUBLIC_API_BASE_URL");
  if (!mobileApiBaseUrl) {
    results.push(
      warn(
        "Mobile base URL",
        "No Expo/mobile API base URL is configured.",
        "Set MOBILE_API_BASE_URL or EXPO_PUBLIC_API_BASE_URL when testing on Android emulator or physical devices."
      )
    );
  } else if (/(localhost|127\.0\.0\.1)/i.test(mobileApiBaseUrl)) {
    results.push(
      warn(
        "Mobile base URL",
        `Mobile API base URL is ${mobileApiBaseUrl}.`,
        "This is fine for iOS simulator. Use `10.0.2.2` for Android emulator or a LAN IP for physical devices."
      )
    );
  } else {
    results.push(pass("Mobile base URL", `Mobile API base URL is ${mobileApiBaseUrl}.`));
  }

  const webUrl = env("NEXT_PUBLIC_WEB_URL");
  if (webUrl && !/^https?:\/\//i.test(webUrl)) {
    results.push(
      fail(
        "Web base URL",
        `NEXT_PUBLIC_WEB_URL=${webUrl} is not an absolute URL.`,
        "Use a full URL such as http://localhost:3000."
      )
    );
  } else if (webUrl) {
    results.push(pass("Web base URL", `NEXT_PUBLIC_WEB_URL is ${webUrl}.`));
  }

  for (const selection of providerSelections) {
    results.push(evaluateProviderSelection(selection));
  }

  if (!env("STORAGE_LOCAL_DIR")) {
    results.push(
      warn(
        "Local storage path",
        "STORAGE_LOCAL_DIR is not set.",
        "The repo will fall back to a default local uploads directory once storage-backed uploads are enabled."
      )
    );
  }

  return results;
}

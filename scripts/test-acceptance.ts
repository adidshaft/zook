import { runDbCheck } from "./check-db";
import { env, loadLocalEnvironment, rootDir, spawnPnpm } from "./shared";

const acceptanceBatches = [
  { label: "a11y", args: ["apps/web/tests/a11y.spec.ts"] },
  { label: "acceptance", args: ["apps/web/tests/acceptance.spec.ts"] },
  { label: "admin actions", args: ["apps/web/tests/admin-actions.spec.ts"] },
  { label: "attendance actions", args: ["apps/web/tests/attendance-actions.spec.ts"] },
  {
    label: "auth actions",
    args: ["apps/web/tests/auth-actions.spec.ts", "--grep-invert", "OTP request rate limit"],
  },
  {
    label: "auth rate limit",
    args: ["apps/web/tests/auth-actions.spec.ts", "--grep", "OTP request rate limit"],
    env: { PLAYWRIGHT_RATE_LIMIT_PROVIDER: "memory", RATE_LIMIT_PROVIDER: "memory" },
  },
  { label: "cross-system integration", args: ["apps/web/tests/integration-cross-system.spec.ts"] },
  { label: "members actions", args: ["apps/web/tests/members-actions.spec.ts"] },
  {
    label: "misc actions",
    args: ["apps/web/tests/misc-actions.spec.ts"],
    env: { AI_FEATURES_ENABLED: "true", AI_PROVIDER: "mock" },
  },
  { label: "multi-tenant isolation", args: ["apps/web/tests/multi-tenant-isolation.spec.ts"] },
  { label: "notifications actions", args: ["apps/web/tests/notifications-actions.spec.ts"] },
  { label: "payments actions", args: ["apps/web/tests/payments-actions.spec.ts"] },
  { label: "plans actions", args: ["apps/web/tests/plans-actions.spec.ts"] },
  { label: "platform actions", args: ["apps/web/tests/platform-actions.spec.ts"] },
  { label: "rbac matrix", args: ["apps/web/tests/rbac-matrix.spec.ts"] },
  { label: "referral redeem", args: ["apps/web/tests/referral-redeem.spec.ts"] },
  { label: "shop actions", args: ["apps/web/tests/shop-actions.spec.ts"] },
  { label: "web UX affordances", args: ["apps/web/tests/web-ux-affordances.spec.ts"] },
  {
    label: "walkthrough public",
    args: ["apps/web/tests/walkthrough.spec.ts", "--grep", "public:"],
  },
  ...["owner", "admin", "reception", "trainer", "member", "prospect", "platform"].map((role) => ({
    label: `walkthrough role: ${role}`,
    args: ["apps/web/tests/walkthrough.spec.ts"],
    env: { WALKTHROUGH_INCLUDE_PUBLIC: "0", WALKTHROUGH_ROLES: role },
  })),
];

async function main() {
  loadLocalEnvironment();
  const args = new Set(process.argv.slice(2));
  const requireDb = args.has("--require-db");
  const headed = args.has("--headed");
  const debug = args.has("--debug");

  if (!env("DATABASE_URL")) {
    const message = [
      "DATABASE_URL is not set for DB-gated acceptance tests.",
      "Create `.env.test.local` or `.env.test`, or export DATABASE_URL directly.",
      "Then run `pnpm test:db:prepare` followed by `pnpm test:acceptance:db`.",
    ].join("\n");

    if (requireDb) {
      console.error(message);
      process.exit(1);
    }

    console.log("Skipping DB-gated acceptance tests because DATABASE_URL is not set.");
    console.log(message);
    return;
  }

  const dbCheck = await runDbCheck();
  if (dbCheck.status === "fail") {
    console.error(`${dbCheck.label}: ${dbCheck.detail}`);
    if (dbCheck.hint) {
      console.error(dbCheck.hint);
    }
    process.exit(1);
  }

  const basePlaywrightArgs = ["exec", "playwright", "test"];
  if (headed) {
    basePlaywrightArgs.push("--headed");
  }
  if (debug) {
    basePlaywrightArgs.push("--debug");
  }

  const playwrightEnv = {
    ...process.env,
    APPLE_BUNDLE_ID: process.env.APPLE_BUNDLE_ID ?? "com.zook.app",
    APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID ?? "com.zook.app",
    APPLE_SERVICE_ID: process.env.APPLE_SERVICE_ID ?? "com.zook.web",
    NEXT_PUBLIC_APPLE_CLIENT_ID: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ?? "com.zook.app",
    GOOGLE_WEB_CLIENT_ID:
      process.env.GOOGLE_WEB_CLIENT_ID ?? "test-google-web.apps.googleusercontent.com",
    NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID:
      process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
      "test-google-web.apps.googleusercontent.com",
    AI_FEATURES_ENABLED: "false",
    AI_PROVIDER: "mock",
    PAYMENT_PROVIDER: "mock",
    ALLOW_MOCK_PAYMENT_COMPLETION: "true",
    PLAYWRIGHT_RATE_LIMIT_PROVIDER: "disabled",
    RATE_LIMIT_PROVIDER: "disabled",
    RUN_DB_WEB_TESTS: "1",
  };

  for (const batch of acceptanceBatches) {
    console.log(`\n[acceptance] Running ${batch.label}`);
    const result = spawnPnpm([...basePlaywrightArgs, ...batch.args], {
      cwd: rootDir,
      env: { ...playwrightEnv, ...batch.env },
      stdio: "inherit",
    });

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }

  process.exit(0);
}

void main();

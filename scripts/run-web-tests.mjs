import { spawn } from "node:child_process";

const webSpecs = [
  "apps/web/tests/acceptance.spec.ts",
  "apps/web/tests/a11y.spec.ts",
  "apps/web/tests/rbac-matrix.spec.ts",
  "apps/web/tests/multi-tenant-isolation.spec.ts",
  "apps/web/tests/referral-redeem.spec.ts",
  "apps/web/tests/web-ux-affordances.spec.ts",
];

const walkthroughSpec = "apps/web/tests/walkthrough.spec.ts";
const chunks = [
  {
    label: "walkthrough: public owner",
    env: { WALKTHROUGH_INCLUDE_PUBLIC: "1", WALKTHROUGH_ROLES: "owner" },
  },
  ...["admin", "reception", "trainer", "member", "prospect", "platform"].map((role) => ({
    label: `walkthrough: ${role}`,
    env: { WALKTHROUGH_INCLUDE_PUBLIC: "0", WALKTHROUGH_ROLES: role },
  })),
];

function pnpmCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function runPlaywright(label, specs, env = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n==> ${label}`);
    const child = spawn(pnpmCommand(), ["exec", "playwright", "test", ...specs], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${label} terminated by ${signal}`));
        return;
      }
      if (code) {
        reject(new Error(`${label} failed with exit code ${code}`));
        return;
      }
      resolve();
    });
  });
}

try {
  await runPlaywright("web baseline", webSpecs);
  for (const chunk of chunks) {
    await runPlaywright(chunk.label, [walkthroughSpec], chunk.env);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const scanTargets = [
  "apps/web/app/dashboard",
  "apps/web/app/desk",
  "apps/web/src/components/dashboard",
  "apps/web/src/components/dashboard-shell.tsx",
  "apps/web/src/components/desk-panel.tsx",
  "apps/web/src/components/notification-composer-panel.tsx",
];

const banned = [
  /\bmock\b/i,
  /\bfallback\b/i,
  /\bdebug\b/i,
  /\bdev(?:elopment)?\b/i,
  /\bsystem checks?\b/i,
  /\bplatform team\b/i,
  /\binternal dashboard\b/i,
];

const files = execFileSync("rg", ["--files", ...scanTargets], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter((file) => /\.(tsx|ts)$/.test(file));

const failures: string[] = [];
for (const file of files) {
  const content = readFileSync(join(root, file), "utf8");
  content.split("\n").forEach((line, index) => {
    if (banned.some((pattern) => pattern.test(line))) {
      failures.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (failures.length) {
  console.error("User-facing dashboard copy contains internal wording:");
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Dashboard copy guard passed.");

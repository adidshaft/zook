import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fail, pass, renderResult, rootDir, type CheckResult } from "./shared";

const auditPath = resolve(rootDir, "docs/mobile-ui-cleanup-completion-audit.md");
const externalChecklistPath = resolve(rootDir, "docs/mobile-ui-cleanup-external-evidence-checklist.md");

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function commitExists(ref: string) {
  try {
    execFileSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
      cwd: rootDir,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function collectAuditRefs(audit: string) {
  const refs = audit.match(/`[0-9a-f]{7,40}(?:\s+[A-Z][^`]*)?`/g) ?? [];
  return unique(refs.map((entry) => entry.slice(1, -1).split(/\s+/)[0] ?? ""));
}

const results: CheckResult[] = [];
let checkedCommitRefCount = 0;

if (!existsSync(auditPath)) {
  results.push(fail("Cleanup audit", "docs/mobile-ui-cleanup-completion-audit.md is missing."));
} else {
  const audit = readFileSync(auditPath, "utf8");
  const refs = collectAuditRefs(audit);
  checkedCommitRefCount = refs.length;
  results.push(
    refs.length > 0
      ? pass("Cleanup audit commit refs", `${refs.length} commit reference(s) found.`)
      : fail("Cleanup audit commit refs", "No commit references were found in the completion audit."),
  );
  const missingRefs = refs.filter((ref) => !commitExists(ref));
  for (const ref of refs) {
    if (!missingRefs.includes(ref)) {
      continue;
    }
    results.push(fail("Cleanup audit commit ref", `${ref} does not resolve to a commit in this repository.`));
  }
  if (refs.length > 0 && missingRefs.length === 0) {
    results.push(
      pass("Cleanup audit commit refs", `${refs.length} referenced commit(s) resolve successfully.`),
    );
  }

  for (const phrase of [
    "Do not mark the active goal complete from code history alone",
    "These are not code-completable from this workspace without external action or approval",
    "Destructive or production-sensitive DB changes were intentionally not applied directly",
  ]) {
    results.push(
      audit.includes(phrase)
        ? pass("Cleanup audit guardrail", `${phrase} is present.`)
        : fail("Cleanup audit guardrail", `${phrase} is missing.`),
    );
  }
}

if (!existsSync(externalChecklistPath)) {
  results.push(
    fail(
      "External evidence checklist",
      "docs/mobile-ui-cleanup-external-evidence-checklist.md is missing.",
    ),
  );
} else {
  const checklist = readFileSync(externalChecklistPath, "utf8");
  for (const phrase of [
    "Live Razorpay Membership Checkout",
    "Live Razorpay Shop Order",
    "Razorpay Dashboard Configuration",
    "Provider Credential Certification",
    "Physical Device QA",
    "Store Console and Release Metadata",
    "Product and Finance Decisions",
    "Do not commit secrets",
  ]) {
    results.push(
      checklist.includes(phrase)
        ? pass("External evidence checklist", `${phrase} is tracked.`)
        : fail("External evidence checklist", `${phrase} is missing.`),
    );
  }
}

for (const result of results.filter((entry) => entry.status !== "pass")) {
  renderResult(result);
}

const failures = results.filter((result) => result.status === "fail");
if (failures.length) {
  console.error(`\nMobile UI cleanup audit check failed with ${failures.length} blocker(s).`);
  process.exit(1);
}

const passingCheckCount = results.filter((result) => result.status === "pass").length;
console.log(
  `Mobile UI cleanup audit check passed: ${checkedCommitRefCount} commit ref(s), ${passingCheckCount} check(s).`,
);

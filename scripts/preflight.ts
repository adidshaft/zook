import { runDbCheck } from "./check-db";
import { runEnvChecks } from "./check-env";
import type { CheckResult } from "./shared";

function render(result: CheckResult) {
  const prefix =
    result.status === "pass" ? "[pass]" : result.status === "warn" ? "[warn]" : "[fail]";

  console.log(`${prefix} ${result.label}: ${result.detail}`);
  if (result.hint) {
    console.log(`       ${result.hint}`);
  }
}

async function main() {
  console.log("Zook preflight");
  console.log("");

  const envResults = await runEnvChecks();
  const dbResult = await runDbCheck();
  const results = [...envResults, dbResult];

  for (const result of results) {
    render(result);
  }

  const failureCount = results.filter((result) => result.status === "fail").length;
  const warningCount = results.filter((result) => result.status === "warn").length;

  console.log("");
  if (failureCount > 0) {
    console.log(`Preflight failed with ${failureCount} blocking issue(s) and ${warningCount} warning(s).`);
    process.exit(1);
  }

  if (warningCount > 0) {
    console.log(`Preflight passed with ${warningCount} warning(s).`);
    return;
  }

  console.log("Preflight passed with no issues.");
}

void main();

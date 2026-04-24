import { runDbCheck } from "./check-db";
import { runEnvChecks } from "./check-env";
import { renderResult } from "./shared";

async function main() {
  console.log("Zook preflight");
  console.log("");

  const envResults = await runEnvChecks();
  const dbResult = await runDbCheck();
  const results = [...envResults, dbResult];

  for (const result of results) {
    renderResult(result);
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

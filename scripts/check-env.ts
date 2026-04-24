import type { CheckResult } from "./shared";
import { runReleaseEnvChecks } from "./check-release-env";

export async function runEnvChecks(): Promise<CheckResult[]> {
  return runReleaseEnvChecks();
}

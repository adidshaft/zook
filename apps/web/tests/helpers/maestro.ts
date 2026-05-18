import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const defaultMaestroBin = `${process.env.HOME ?? ""}/.maestro/bin/maestro`;
const defaultIosUdid = "16E85351-C822-4E5D-8C0F-15A50B8BFA5C";

export type MaestroResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export function runMaestro(flow: string, env: Record<string, string> = {}) {
  const maestroBin = process.env.MAESTRO_BIN?.trim() || defaultMaestroBin;
  const flowPath = flow.startsWith("/") ? flow : join(process.cwd(), flow);
  if (!existsSync(maestroBin)) {
    throw new Error(`Maestro CLI not found at ${maestroBin}`);
  }

  return new Promise<MaestroResult>((resolve) => {
    const child = spawn(
      maestroBin,
      [
        "--platform",
        "ios",
        "--udid",
        process.env.MAESTRO_IOS_UDID?.trim() || defaultIosUdid,
        "test",
        "--headless",
        "--format",
        "json",
        flowPath,
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MAESTRO_CLI_NO_ANALYTICS: "1",
          ...env,
        },
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 1 });
    });
  });
}

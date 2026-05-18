import { spawn } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const defaultMaestroBin = `${process.env.HOME ?? ""}/.maestro/bin/maestro`;
const defaultIosUdid = "16E85351-C822-4E5D-8C0F-15A50B8BFA5C";

export type MaestroResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export function runMaestro(flow: string, env: Record<string, string> = {}) {
  const maestroBin = process.env.MAESTRO_BIN?.trim() || defaultMaestroBin;
  const timeoutMs = Number.parseInt(process.env.MAESTRO_FLOW_TIMEOUT_MS ?? "90000", 10);
  const flowPath = flow.startsWith("/") ? flow : join(process.cwd(), flow);
  if (!existsSync(maestroBin)) {
    throw new Error(`Maestro CLI not found at ${maestroBin}`);
  }
  let executableFlowPath = flowPath;
  let renderedFlowPath: string | undefined;
  if (Object.keys(env).length) {
    const source = readFileSync(flowPath, "utf8");
    const rendered = Object.entries(env).reduce(
      (content, [key, value]) => content.split(`\${${key}}`).join(value),
      source,
    );
    renderedFlowPath = join(
      dirname(flowPath),
      `.${basename(flowPath)}.${process.pid}.${Date.now()}.rendered.yaml`,
    );
    writeFileSync(renderedFlowPath, rendered);
    executableFlowPath = renderedFlowPath;
  }

  const cleanup = () => {
    if (!renderedFlowPath) return;
    try {
      unlinkSync(renderedFlowPath);
    } catch {
      // Best effort cleanup for short-lived rendered Maestro flows.
    }
  };

  return new Promise<MaestroResult>((resolve) => {
    let settled = false;
    const child = spawn(
      maestroBin,
      [
        "--platform",
        "ios",
        "--udid",
        process.env.MAESTRO_IOS_UDID?.trim() || defaultIosUdid,
        "test",
        "--headless",
        executableFlowPath,
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
    const finish = (result: MaestroResult) => {
      if (settled) return;
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      cleanup();
      resolve(result);
    };
    const timeout = setTimeout(() => {
      stderr += `Maestro flow timed out after ${timeoutMs}ms: ${flow}\n`;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!settled) {
          child.kill("SIGKILL");
          finish({ stdout, stderr, exitCode: 1 });
        }
      }, 2_000).unref();
    }, timeoutMs);
    timeout.unref();
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      finish({ stdout, stderr: `${stderr}${error.message}`, exitCode: 1 });
    });
    child.on("close", (exitCode) => {
      finish({ stdout, stderr, exitCode: exitCode ?? 1 });
    });
  });
}

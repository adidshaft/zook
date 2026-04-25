import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const webDir = resolve(rootDir, "apps", "web");
const requireFromWeb = createRequire(resolve(webDir, "package.json"));
const rawArgs = process.argv.slice(2);
const forwardedArgs = rawArgs[1] === "--" ? [rawArgs[0], ...rawArgs.slice(2)] : rawArgs;
const nextCommand = forwardedArgs[0] ?? "dev";

function resolveNodeEnv(command) {
  if (process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }

  if (command === "build" || command === "start") {
    return "production";
  }

  if (command === "test") {
    return "test";
  }

  return "development";
}

function orderedRootEnvFiles(nodeEnv) {
  if (nodeEnv === "test") {
    return [".env.test.local", ".env.test", ".env.local", ".env"];
  }

  return [`.env.${nodeEnv}.local`, ".env.local", `.env.${nodeEnv}`, ".env"];
}

process.env.NODE_ENV = resolveNodeEnv(nextCommand);

for (const fileName of orderedRootEnvFiles(process.env.NODE_ENV)) {
  const filePath = resolve(rootDir, fileName);
  if (existsSync(filePath)) {
    process.loadEnvFile(filePath);
  }
}

const nextBinPath = requireFromWeb.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBinPath, ...forwardedArgs], {
  cwd: webDir,
  env: process.env,
  stdio: "inherit"
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }

  process.exit(code ?? 1);
});

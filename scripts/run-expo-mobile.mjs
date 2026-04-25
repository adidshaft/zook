import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const mobileDir = resolve(rootDir, "apps", "mobile");
const requireFromMobile = createRequire(resolve(mobileDir, "package.json"));
const rawArgs = process.argv.slice(2);
const forwardedArgs = rawArgs[1] === "--" ? [rawArgs[0], ...rawArgs.slice(2)] : rawArgs;
const expoCommand = forwardedArgs[0] ?? "start";

function orderedRootEnvFiles(nodeEnv) {
  if (nodeEnv === "test") {
    return [".env.test.local", ".env.test", ".env.local", ".env"];
  }

  return [`.env.${nodeEnv}.local`, ".env.local", `.env.${nodeEnv}`, ".env"];
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = expoCommand === "export" ? "production" : "development";
}

for (const fileName of orderedRootEnvFiles(process.env.NODE_ENV)) {
  const filePath = resolve(rootDir, fileName);
  if (existsSync(filePath)) {
    process.loadEnvFile(filePath);
  }
}

const expoBinPath = requireFromMobile.resolve("expo/bin/cli");
const child = spawn(process.execPath, [expoBinPath, ...forwardedArgs], {
  cwd: mobileDir,
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

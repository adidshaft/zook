import { configDefaults, defineConfig } from "vitest/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";

const orderedTestEnvFiles = [".env.test.local", ".env.test", ".env.local", ".env"] as const;
const rootDir = process.cwd();
const externalEnv = { ...process.env };
const parsedEnv: Record<string, string> = {};

for (const envFile of orderedTestEnvFiles) {
  const filePath = resolve(rootDir, envFile);
  if (!existsSync(filePath)) {
    continue;
  }

  const fileValues = parse(readFileSync(filePath, "utf8"));
  for (const [key, value] of Object.entries(fileValues)) {
    if (parsedEnv[key] === undefined) {
      parsedEnv[key] = value;
    }
  }
}

Object.assign(process.env, parsedEnv, externalEnv);

export default defineConfig({
  test: {
    include: [
      "packages/**/__tests__/**/*.{test,spec}.ts",
      "apps/**/src/**/*.{test,spec}.ts"
    ],
    exclude: [...configDefaults.exclude, "apps/web/tests/**", "apps/**/tests/**"],
    environment: "node",
    globals: true
  }
});

import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/__tests__/**/*.{test,spec}.ts"],
    exclude: [...configDefaults.exclude, "apps/web/tests/**", "apps/**/tests/**"],
    environment: "node",
    globals: true
  }
});

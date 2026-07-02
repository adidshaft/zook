import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./api-router/files.ts", import.meta.url), "utf8");

describe("file upload cleanup reporting", () => {
  it("reports storage delete failures instead of swallowing orphan cleanup errors", () => {
    expect(source).not.toContain("deleteFile({ key: storageKey }).catch(() => undefined)");
    expect(source).toContain("getErrorReporter().captureException(deleteError");
    expect(source).toContain('context: "file-delete-orphan"');
    expect(source).toContain("key: storageKey");
  });
});

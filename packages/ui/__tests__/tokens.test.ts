import { describe, expect, it } from "vitest";
import { auditPaletteContrast, palettes } from "../src/contrast-audit";

describe("theme token contrast", () => {
  for (const [name, palette] of Object.entries(palettes)) {
    it(`${name} palette text pairs pass WCAG AA`, () => {
      for (const result of auditPaletteContrast(palette)) {
        expect(
          result.ratio,
          `${name}: ${result.foregroundToken} on ${result.backgroundToken}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

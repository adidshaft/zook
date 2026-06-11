import { describe, expect, it } from "vitest";
import { darkPalette, lightPalette, type Palette } from "@zook/tokens";
import { contrast } from "../src/contrast";
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

const mobilePalettes = {
  "mobile light": lightPalette,
  "mobile dark": darkPalette,
} satisfies Record<string, Palette>;

const mobileTextBackgrounds = [
  ["bg.app", (palette: Palette) => palette.bg.app],
  ["bg.elevated", (palette: Palette) => palette.bg.elevated],
  ["surface.default", (palette: Palette) => palette.surface.default],
  ["surface.raised", (palette: Palette) => palette.surface.raised],
] as const;

const mobileTextColors = [
  ["text.primary", (palette: Palette) => palette.text.primary],
  ["text.secondary", (palette: Palette) => palette.text.secondary],
  ["text.tertiary", (palette: Palette) => palette.text.tertiary],
] as const;

describe("mobile palette contrast", () => {
  for (const [name, palette] of Object.entries(mobilePalettes)) {
    it(`${name} text colors pass WCAG AA on app and card backgrounds`, () => {
      for (const [foregroundName, foreground] of mobileTextColors) {
        for (const [backgroundName, background] of mobileTextBackgrounds) {
          expect(
            contrast(foreground(palette), background(palette), palette.bg.app),
            `${name}: ${foregroundName} on ${backgroundName}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    it(`${name} accent and feedback colors pass icon contrast`, () => {
      const iconPairs = [
        ["accent.base", palette.accent.base, "bg.app", palette.bg.app],
        ["feedback.danger", palette.feedback.danger, "surface.dangerSoft", palette.surface.dangerSoft],
        ["feedback.warning", palette.feedback.warning, "surface.warningSoft", palette.surface.warningSoft],
        ["feedback.success", palette.feedback.success, "surface.successSoft", palette.surface.successSoft],
        ["feedback.info", palette.feedback.info, "bg.app", palette.bg.app],
      ] as const;

      for (const [foregroundName, foreground, backgroundName, background] of iconPairs) {
        expect(
          contrast(foreground, background, palette.bg.app),
          `${name}: ${foregroundName} on ${backgroundName}`,
        ).toBeGreaterThanOrEqual(3);
      }
    });

    it(`${name} accent foreground text passes WCAG AA`, () => {
      expect(
        contrast(palette.text.onAccent, palette.accent.fill, palette.bg.app),
        `${name}: text.onAccent on accent.fill`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  }
});

import { useMemo } from "react";

import type { Palette } from "@/lib/theme";
import { useTheme } from "@/lib/theme";

export type PillTone = "neutral" | "lime" | "amber" | "red" | "blue" | "violet";

type ThemeMode = "light" | "dark";

export function getTonePalette(tone: PillTone, _mode: ThemeMode, palette: Palette) {
  if (tone === "lime") {
    return {
      borderColor: palette.border.focus,
      color: palette.accent.base,
      backgroundColor: palette.surface.accentSoft,
    };
  }
  if (tone === "amber") {
    return {
      borderColor: palette.feedback.warning,
      color: palette.feedback.warning,
      backgroundColor: palette.surface.warningSoft,
    };
  }
  if (tone === "red") {
    return {
      borderColor: palette.feedback.danger,
      color: palette.feedback.danger,
      backgroundColor: palette.surface.dangerSoft,
    };
  }
  if (tone === "blue") {
    return {
      borderColor: palette.feedback.info,
      color: palette.feedback.info,
      backgroundColor: palette.bg.sunken,
    };
  }
  if (tone === "violet") {
    return {
      borderColor: palette.border.default,
      color: palette.text.primary,
      backgroundColor: palette.surface.raised,
    };
  }
  return {
    borderColor: palette.border.subtle,
    color: palette.text.secondary,
    backgroundColor: palette.surface.default,
  };
}

export function useTonePalette(tone: PillTone) {
  const { palette, mode } = useTheme();

  return useMemo(() => getTonePalette(tone, mode, palette), [tone, palette, mode]);
}

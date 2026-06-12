import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, useColorScheme } from "react-native";

import { getStoredValue, setStoredValue } from "@/lib/storage";

import { darkPalette } from "./palettes/dark";
import { lightPalette } from "./palettes/light";
import type { Palette } from "./tokens";

export type ThemePreference = "system" | "light" | "dark";
export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "zook_theme_preference";

const ThemeContext = createContext<{
  palette: Palette;
  mode: ThemeMode;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let mounted = true;
    void getStoredValue(STORAGE_KEY).then((storedPreference) => {
      if (
        mounted &&
        (storedPreference === "system" ||
          storedPreference === "light" ||
          storedPreference === "dark")
      ) {
        setPreferenceState(storedPreference);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const mode: ThemeMode =
    preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;
  const palette = mode === "dark" ? darkPalette : lightPalette;

  useEffect(() => {
    if (typeof Appearance.setColorScheme !== "function") {
      return undefined;
    }
    Appearance.setColorScheme(preference === "system" ? null : preference);
    return () => {
      Appearance.setColorScheme(null);
    };
  }, [preference]);

  const setPreference = async (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    await setStoredValue(STORAGE_KEY, nextPreference);
  };

  const value = useMemo(
    () => ({ palette, mode, preference, setPreference }),
    [mode, palette, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme called outside ThemeProvider");
  }
  return context;
}

export function useThemePreference() {
  const { preference, setPreference } = useTheme();
  return { preference, setPreference };
}

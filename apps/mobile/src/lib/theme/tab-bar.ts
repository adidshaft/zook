import { Platform, type ViewStyle } from "react-native";

import type { Palette } from "./tokens";
import type { ThemeMode } from "./provider";

type RoleTabBarOptions = {
  palette: Palette;
  mode: ThemeMode;
  inset?: number;
  bottomInset?: number;
  height?: number;
};

export function createRoleTabBarStyle({
  palette,
  mode,
  inset = 18,
  bottomInset = 0,
  height = 70,
}: RoleTabBarOptions): ViewStyle {
  const isIOS = Platform.OS === "ios";
  const isDark = mode === "dark";
  const floatingBottom = Math.max(bottomInset > 0 ? bottomInset - 22 : 0, 12);

  return {
    position: isIOS ? "absolute" : "relative",
    left: isIOS ? inset : 0,
    right: isIOS ? inset : 0,
    bottom: isIOS ? floatingBottom : 0,
    height: isIOS ? height : 64,
    marginHorizontal: 0,
    marginBottom: 0,
    paddingTop: 8,
    paddingBottom: isIOS ? 10 : 8,
    borderTopWidth: 1,
    borderWidth: isIOS ? 1 : 0,
    borderColor: palette.border.subtle,
    borderTopColor: palette.border.subtle,
    borderRadius: isIOS ? 26 : 0,
    backgroundColor: isIOS ? "transparent" : palette.bg.elevated,
    overflow: isIOS ? "hidden" : "visible",
    shadowColor: isDark ? palette.bg.sunken : palette.text.primary,
    shadowOpacity: isIOS ? (isDark ? 0.16 : 0.08) : 0,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: Platform.OS === "android" ? 2 : 0,
  };
}

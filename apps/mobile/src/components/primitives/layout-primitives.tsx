import { useContext, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fixedSurfaces, layout, radii, spacing, useTheme, elevation } from "@/lib/theme";
import { useStickyActionOffset } from "@/lib/use-layout-padding";
import { BottomNavVisibilityContext } from "@/components/primitives/bottom-nav-context";
import { useTonePalette, type PillTone } from "./tone-palette";

function platformSurfaceShadow(
  mode: "light" | "dark",
  elevated = false,
  shadowColor?: string,
): ViewStyle | null {
  if (!elevated) {
    return null;
  }

  return elevation(2, shadowColor ?? fixedSurfaces.shadowBlack, {
    shadowOpacity: mode === "dark" ? 0.22 : 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  });
}

export function ScannerFrame({
  children,
  size,
  tone = "lime",
  transparent = false,
}: {
  children?: ReactNode;
  size?: number;
  tone?: PillTone;
  transparent?: boolean;
}) {
  const { palette: themePalette, mode } = useTheme();
  const palette = useTonePalette(tone);
  return (
    <View
      style={[
        styles.scannerFrame,
        {
          borderColor: palette.borderColor,
          backgroundColor: transparent
            ? "transparent"
            : mode === "dark"
              ? themePalette.surface.default
              : themePalette.bg.sunken,
        },
        size ? { width: size, height: size } : null,
      ]}
    >
      <View style={[styles.scannerCorner, styles.scannerCornerTopLeft, { borderColor: palette.color }]} />
      <View style={[styles.scannerCorner, styles.scannerCornerTopRight, { borderColor: palette.color }]} />
      <View style={[styles.scannerCorner, styles.scannerCornerBottomLeft, { borderColor: palette.color }]} />
      <View style={[styles.scannerCorner, styles.scannerCornerBottomRight, { borderColor: palette.color }]} />
      <View style={styles.scannerFrameContent}>{children}</View>
    </View>
  );
}

export function StickyActionBar({
  bottomOffset,
  children,
  elevated = true,
  style,
}: {
  bottomOffset?: number;
  children: ReactNode;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const computedBottomOffset = useStickyActionOffset();
  const { palette, mode } = useTheme();
  const { visible: bottomNavVisible } = useContext(BottomNavVisibilityContext);

  return (
    <View
      style={[
        styles.stickyActionBar,
        {
          backgroundColor: mode === "dark" ? "rgba(7,8,7,0.86)" : "rgba(255,255,255,0.92)",
          borderTopWidth: 1,
          borderTopColor: palette.border.subtle,
          paddingTop: 10,
          bottom: bottomNavVisible ? (bottomOffset ?? computedBottomOffset) : 0,
          paddingBottom: Math.max(insets.bottom, 10),
        },
        elevated ? platformSurfaceShadow(mode, true, palette.bg.sunken) : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scannerFrame: {
    aspectRatio: 1,
    borderRadius: radii.mainCard,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  scannerFrameContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  scannerCorner: {
    position: "absolute",
    width: 42,
    height: 42,
    borderWidth: 3,
    opacity: 0.9,
  },
  scannerCornerTopLeft: {
    top: 18,
    left: 18,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
  },
  scannerCornerTopRight: {
    top: 18,
    right: 18,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 16,
  },
  scannerCornerBottomLeft: {
    bottom: 18,
    left: 18,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
  },
  scannerCornerBottomRight: {
    bottom: 18,
    right: 18,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 16,
  },
  stickyActionBar: {
    position: "absolute",
    zIndex: 60,
    elevation: 8,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    paddingHorizontal: layout.screenPadding,
    paddingTop: 0,
    gap: spacing.sm,
    overflow: "visible",
  },
});

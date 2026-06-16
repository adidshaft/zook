import { Ionicons } from "@expo/vector-icons";
import { useContext, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout, radii, spacing, typography, useTheme, elevation } from "@/lib/theme";
import { useStickyActionOffset } from "@/lib/use-layout-padding";
import { BottomNavVisibilityContext } from "@/components/primitives/bottom-nav-context";
import { Card, pressWithHaptics } from "./foundation";
import { ZookChip } from "./chips";
import { useTonePalette, type PillTone } from "./tone-palette";

function platformSurfaceShadow(
  mode: "light" | "dark",
  elevated = false,
  shadowColor?: string,
): ViewStyle | null {
  if (!elevated) {
    return null;
  }

  return elevation(2, shadowColor ?? "#000000", {
    shadowOpacity: mode === "dark" ? 0.22 : 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  });
}

export function ScannerFrame({
  children,
  size,
  tone = "lime",
}: {
  children?: ReactNode;
  size?: number;
  tone?: PillTone;
}) {
  const { palette: themePalette, mode } = useTheme();
  const palette = useTonePalette(tone);
  return (
    <View
      style={[
        styles.scannerFrame,
        {
          borderColor: palette.borderColor,
          backgroundColor: mode === "dark" ? themePalette.surface.default : themePalette.bg.sunken,
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

export function SwipeActionRow({
  children,
  action,
  revealed = false,
}: {
  children: ReactNode;
  action: ReactNode;
  revealed?: boolean;
}) {
  return (
    <View style={styles.swipeActionRow}>
      <View style={[styles.swipeActionContent, revealed ? styles.swipeActionContentRevealed : null]}>
        {children}
      </View>
      {revealed ? <View style={styles.swipeAction}>{action}</View> : null}
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
          backgroundColor: mode === "dark" ? "rgba(7,8,7,0.92)" : "rgba(255,255,255,0.94)",
          borderTopWidth: 1,
          borderTopColor: palette.border.subtle,
          paddingTop: 14,
          bottom: bottomNavVisible ? (bottomOffset ?? computedBottomOffset) : 0,
          paddingBottom: Math.max(insets.bottom, 14),
        },
        elevated ? platformSurfaceShadow(mode, true, palette.bg.sunken) : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CollapsibleSection({
  title,
  eyebrow,
  subtitle,
  count,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = true,
  children,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  count?: number | string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const { palette } = useTheme();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;

  function toggleOpen() {
    const nextOpen = !open;
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }

  return (
    <Card contentStyle={styles.collapsibleContent}>
      <Pressable
        onPress={() => pressWithHaptics(toggleOpen)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.collapsibleHeader, pressed ? styles.pressed : null]}
      >
        <View style={styles.collapsibleCopy}>
          {eyebrow ? (
            <Text style={[typography.eyebrow, { color: palette.text.tertiary }]}>{eyebrow}</Text>
          ) : null}
          <Text style={[styles.collapsibleTitle, { color: palette.text.primary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.collapsibleSubtitle, { color: palette.text.secondary }]}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={styles.collapsibleTrailing}>
          {count !== undefined ? <ZookChip tone={open ? "lime" : "neutral"}>{count}</ZookChip> : null}
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={22}
            color={palette.text.tertiary}
          />
        </View>
      </Pressable>
      {open ? (
        <View style={[styles.collapsibleBody, { borderTopColor: palette.border.subtle }]}>
          {children}
        </View>
      ) : null}
    </Card>
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
    gap: spacing.sm,
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
  swipeActionRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
  },
  swipeActionContent: {
    flex: 1,
  },
  swipeActionContentRevealed: {
    flex: 0.76,
  },
  swipeAction: {
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
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
  collapsibleContent: {
    padding: 0,
    gap: 0,
  },
  collapsibleHeader: {
    minHeight: 62,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  collapsibleCopy: {
    flex: 1,
    gap: 3,
  },
  collapsibleTitle: {
    ...typography.cardTitle,
  },
  collapsibleSubtitle: {
    ...typography.small,
  },
  collapsibleTrailing: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  collapsibleBody: {
    borderTopWidth: 1,
    padding: 14,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});

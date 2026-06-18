import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { elevation, materials, radii, shadows, spacing, useTheme } from "@/lib/theme";
import type { Palette } from "@/lib/theme";
import {
  pressWithHaptics,
  PrimaryButton as SharedPrimaryButton,
  SecondaryButton as SharedSecondaryButton,
  ZookButton as SharedZookButton,
} from "./buttons";
import type { PressHandler } from "./buttons";
export {
  InfoRow,
  MetricTile,
  StatusRing,
} from "./metric-primitives";

type CardVariant = "default" | "compact" | "selected" | "success" | "warning" | "danger";
export type SemanticSurface =
  | "screen"
  | "card"
  | "taskCard"
  | "dangerCard"
  | "warningCard"
  | "successCard"
  | "moneyFlowCard"
  | "handoffCard";
type CardGlowTone = "lime" | "amber" | "red" | "success";
type CardSurface = "content" | "interactive" | "floating";
type BrandMarkSize = "sm" | "md" | "lg";
type ThemeMode = "light" | "dark";
export type { PillTone } from "./tone-palette";
export { getTonePalette, useTonePalette } from "./tone-palette";
export { IconBubble } from "./icon-bubble";
export { ProfileShortcut } from "./profile-shortcut";
export {
  BranchSelectorChip,
  Pill,
  StatusChip,
  ZookChip,
} from "./chips";

// Metro resolves static image requires at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const zookMarkSource = require("../../../assets/icons/app-icon-512.png");
const fallbackColors = {
  bg: "#000000",
  limeBorder: "rgba(185,244,85,0.26)",
  panel: "rgba(255,255,255,0.06)",
};

const brandMarkSizes: Record<BrandMarkSize, number> = {
  sm: 32,
  md: 44,
  lg: 56,
};

const glassGlowStyles: Record<CardGlowTone, ViewStyle> = {
  lime: shadows.glowLimeSoft,
  success: shadows.glowLimeSoft,
  amber: shadows.glowAmberSoft,
  red: shadows.glowRedSoft,
};

function platformSurfaceShadow(
  mode: ThemeMode,
  elevated = false,
  shadowColor?: string,
): ViewStyle | null {
  if (!elevated) {
    return null;
  }

  return elevation(2, shadowColor ?? fallbackColors.bg, {
    shadowOpacity: mode === "dark" ? 0.22 : 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  });
}

function glassSurfaceColors(
  mode: ThemeMode,
  palette: Palette,
  variant: CardVariant,
  surface: CardSurface,
): { backgroundColor: string; borderColor: string; blurIntensity: number; blurTint: "dark" | "light" } {
  const isDark = mode === "dark";
  const cardMaterial = materials.cardSurface(mode);
  const blurIntensity = variant === "compact" ? (isDark ? 18 : 12) : isDark ? 24 : 16;
  const blurTint = isDark ? "dark" : "light";

  if (variant === "selected") {
    return {
      backgroundColor: palette.surface.accentSoft,
      borderColor: palette.border.focus,
      blurIntensity: isDark ? 20 : 14,
      blurTint,
    };
  }

  if (variant === "success") {
    return {
      backgroundColor: palette.surface.successSoft,
      borderColor: palette.feedback.success,
      blurIntensity: isDark ? 20 : 14,
      blurTint,
    };
  }

  if (variant === "warning") {
    return {
      backgroundColor: palette.surface.warningSoft,
      borderColor: palette.feedback.warning,
      blurIntensity: isDark ? 20 : 14,
      blurTint,
    };
  }

  if (variant === "danger") {
    return {
      backgroundColor: palette.surface.dangerSoft,
      borderColor: palette.feedback.danger,
      blurIntensity: isDark ? 20 : 14,
      blurTint,
    };
  }

  return {
    backgroundColor: surface === "content" ? cardMaterial.backgroundColor : palette.surface.raised,
    borderColor: surface === "content" ? cardMaterial.borderColor : palette.border.default,
    blurIntensity,
    blurTint,
  };
}

function variantForSemanticSurface(surface?: SemanticSurface): CardVariant | undefined {
  if (surface === "successCard") return "success";
  if (surface === "warningCard" || surface === "moneyFlowCard" || surface === "handoffCard") {
    return "warning";
  }
  if (surface === "dangerCard") return "danger";
  if (surface === "taskCard") return "selected";
  return undefined;
}

export function ZookScreen({
  children,
  bottomInset = false,
  style,
  ambient = true,
  testID,
}: {
  children: ReactNode;
  bottomInset?: boolean;
  style?: StyleProp<ViewStyle>;
  ambient?: boolean;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
          paddingBottom: bottomInset ? insets.bottom : 0,
          backgroundColor: palette.bg.app,
        },
        style,
      ]}
    >
      {ambient ? (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.ambientGlow,
              Platform.OS === "android" ? styles.androidAmbientGlow : null,
              {
                backgroundColor: palette.surface.accentSoft,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.ambientWash,
              Platform.OS === "android" ? styles.androidAmbientWash : null,
              {
                backgroundColor: palette.surface.default,
              },
            ]}
          />
        </>
      ) : null}
      {children}
    </View>
  );
}

export function BrandMark({
  size = "md",
  framed = true,
  style,
}: {
  size?: BrandMarkSize;
  framed?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const dimension = brandMarkSizes[size];

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Zook"
      style={[
        styles.brandMark,
        framed ? styles.brandMarkFramed : null,
        { width: dimension, height: dimension },
        style,
      ]}
    >
      <Image source={zookMarkSource} style={styles.brandMarkImage} contentFit="contain" />
    </View>
  );
}

export function Card({
  children,
  style,
  contentStyle,
  glow = false,
  glowTone,
  variant = "default",
  padding,
  radius,
  pressable = false,
  surface,
  semanticSurface,
  disabled = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityValue,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  glow?: boolean;
  glowTone?: CardGlowTone;
  variant?: CardVariant;
  semanticSurface?: SemanticSurface;
  padding?: number;
  radius?: number;
  pressable?: boolean;
  surface?: CardSurface;
  disabled?: boolean;
  onPress?: PressHandler;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  testID?: string;
}) {
  const { mode, palette } = useTheme();
  const resolvedVariant = variantForSemanticSurface(semanticSurface) ?? variant;
  const resolvedGlowTone = glowTone ?? (glow ? "lime" : undefined);
  const resolvedRadius = radius ?? (resolvedVariant === "compact" ? radii.smallCard : radii.mainCard);
  const resolvedSurface = surface ?? (pressable || onPress ? "interactive" : "content");
  const surfaceColors = glassSurfaceColors(mode, palette, resolvedVariant, resolvedSurface);
  const cardMaterial = materials.cardSurface(mode);
  const shouldElevate =
    mode === "light" ||
    resolvedSurface === "floating" ||
    resolvedSurface === "interactive" ||
    Boolean(resolvedGlowTone);

  // Android draws `elevation` shadows behind the view; when the same view
  // has `overflow: hidden`, the shadow gets clipped *inside* the card and
  // shows up as a phantom dark rectangle behind the content. Split the
  // shadow onto an outer wrapper (no clipping) and keep border + bg + clip
  // on an inner card so the shadow renders cleanly on both platforms.
  const outerStyle: StyleProp<ViewStyle> = [
    { borderRadius: resolvedRadius },
    platformSurfaceShadow(
      mode,
      shouldElevate,
      palette.bg.sunken,
    ),
    resolvedGlowTone ? glassGlowStyles[resolvedGlowTone] : null,
    disabled ? styles.disabled : null,
    style,
  ];
  const innerStyle: StyleProp<ViewStyle> = [
    styles.glassCard,
    {
      backgroundColor: surfaceColors.backgroundColor,
      borderColor: surfaceColors.borderColor,
      borderRadius: resolvedRadius,
    },
    resolvedGlowTone ? styles.glassCardGlowBorder : null,
  ];
  const inner = (
    <View style={innerStyle}>
      {resolvedVariant === "default" || resolvedVariant === "compact" ? (
        <View
          pointerEvents="none"
          style={[
            styles.cardInnerTopHighlight,
            { backgroundColor: cardMaterial.innerTopHighlight },
          ]}
        />
      ) : null}
      {Platform.OS === "ios" && resolvedSurface !== "content" ? (
        <BlurView
          pointerEvents="none"
          intensity={surfaceColors.blurIntensity}
          tint={surfaceColors.blurTint}
          // iOS composes BlurView above sibling flex children unless we
          // explicitly pin it behind — without this, primary buttons inside
          // a tinted card lose contrast under the blur overlay.
          style={[StyleSheet.absoluteFillObject, styles.glassCardBlurLayer]}
        />
      ) : null}
      <View
        style={[
          styles.glassContent,
          Platform.OS === "ios" ? styles.glassContentLayer : null,
          padding !== undefined ? { padding } : null,
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );

  if (pressable || onPress) {
    return (
      <Pressable
        testID={testID}
        disabled={disabled}
        onPress={() => pressWithHaptics(onPress)}
        android_ripple={{ color: palette.surface.accentSoft, borderless: false }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityValue={accessibilityValue}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [outerStyle, pressed && !disabled ? styles.pressed : null]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={outerStyle}>
      {inner}
    </View>
  );
}

export const ZookButton = SharedZookButton;
export const PrimaryButton = SharedPrimaryButton;
export const SecondaryButton = SharedSecondaryButton;

export { DatePickerField } from "@/components/primitives/date-picker-field";
export { OtpInput } from "@/components/primitives/otp-input";
export type { OtpInputHandle } from "@/components/primitives/otp-input";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: fallbackColors.bg,
  },
  ambientGlow: {
    position: "absolute",
    top: -120,
    right: -72,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(185,244,85,0.075)",
    opacity: 0.82,
  },
  ambientWash: {
    position: "absolute",
    top: 148,
    left: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.42,
  },
  androidAmbientGlow: {
    top: -88,
    right: -108,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.5,
  },
  androidAmbientWash: {
    top: 184,
    left: -148,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.26,
  },
  brandMark: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  brandMarkFramed: {
    borderRadius: radii.icon,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#0F1411",
  },
  brandMarkImage: {
    width: "100%",
    height: "100%",
  },
  glassCard: {
    borderWidth: 1,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: fallbackColors.panel,
  },
  cardInnerTopHighlight: {
    height: StyleSheet.hairlineWidth,
    left: 16,
    position: "absolute",
    right: 16,
    top: 0,
    zIndex: 1,
  },
  glassCardGlowBorder: {
    borderColor: fallbackColors.limeBorder,
  },
  glassCardBlurLayer: {
    zIndex: 0,
  },
  glassContentLayer: {
    position: "relative",
    zIndex: 1,
  },
  glassContent: {
    backgroundColor: "transparent",
    padding: 18,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});

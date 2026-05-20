import { Link } from "expo-router";
import type { Href } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "@/lib/reanimated-lite";
import { radii, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";
import type { Palette } from "@/lib/theme/index";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonTone = "lime" | "secondary" | "ghost" | "danger";
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";
type IconName = keyof typeof Ionicons.glyphMap;

export type HapticWeight =
  | "light"
  | "medium"
  | "heavy"
  | "selection"
  | "success"
  | "warning"
  | "error"
  | "none";

type PressHandler = () => void | Promise<void>;

type ButtonPalette = {
  backgroundColor: string;
  borderColor: string;
  color: string;
  glow?: ViewStyle;
};

function variantFromTone(tone: ButtonTone): ButtonVariant {
  if (tone === "lime") return "primary";
  return tone;
}

function paletteForVariant(palette: Palette, variant: ButtonVariant): ButtonPalette {
  if (variant === "primary") {
    return {
      backgroundColor: palette.accent.fill,
      borderColor: palette.accent.strong,
      color: palette.text.onAccent,
      glow: { boxShadow: palette.shadow.sm } as ViewStyle,
    };
  }
  if (variant === "danger") {
    return {
      backgroundColor: palette.surface.dangerSoft,
      borderColor: palette.feedback.danger,
      color: palette.text.primary,
    };
  }
  if (variant === "ghost") {
    return {
      backgroundColor: "transparent",
      borderColor: palette.border.subtle,
      color: palette.text.primary,
    };
  }
  return {
    backgroundColor: palette.surface.raised,
    borderColor: palette.border.default,
    color: palette.text.primary,
  };
}

export function pressWithHaptics(callback?: PressHandler, weight: HapticWeight = "light") {
  if (weight !== "none") {
    if (weight === "selection") void Haptics.selectionAsync();
    else if (weight === "success")
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (weight === "warning")
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else if (weight === "error")
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else if (weight === "heavy") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else if (weight === "medium") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  const result = callback?.();
  if (result && typeof (result as Promise<void>).catch === "function") {
    void (result as Promise<void>).catch((error) => {
      console.error("Zook press action failed", error);
    });
  }
}

const buttonSizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    minHeight: 32,
    borderRadius: radii.button,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
  },
  md: {
    minHeight: 46,
    borderRadius: radii.button,
    paddingHorizontal: 16,
    paddingVertical: 0,
    gap: 7,
  },
  lg: {
    minHeight: 54,
    borderRadius: radii.button,
    paddingHorizontal: 22,
    paddingVertical: 14,
    gap: 8,
  },
};

const buttonTextSizeStyles: Record<ButtonSize, TextStyle> = {
  sm: { fontSize: 13, lineHeight: 17 },
  md: {},
  lg: { fontSize: 16, lineHeight: 21 },
};

export function ZookButton({
  children,
  onPress,
  href,
  tone = "lime",
  variant,
  size = "md",
  fullWidth = false,
  disabled = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
  onLongPress,
  busy = false,
  busyLabel,
  hapticWeight,
  testID,
}: {
  children: ReactNode;
  onPress?: PressHandler;
  href?: Href;
  tone?: ButtonTone;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  onLongPress?: PressHandler;
  busy?: boolean;
  busyLabel?: string;
  hapticWeight?: HapticWeight;
  testID?: string;
}) {
  const { palette } = useTheme();
  const resolvedVariant = variant ?? variantFromTone(tone);
  const buttonPalette = paletteForVariant(palette, resolvedVariant);
  const buttonSizeStyle = buttonSizeStyles[size];
  const buttonTextSizeStyle = buttonTextSizeStyles[size];
  const isDisabled = disabled || busy;
  const contentLabel = busy && busyLabel ? busyLabel : children;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const staticButtonStyle = StyleSheet.flatten([
    styles.button,
    buttonSizeStyle,
    buttonPalette.glow,
    {
      backgroundColor: buttonPalette.backgroundColor,
      borderColor: buttonPalette.borderColor,
    },
    fullWidth ? styles.fullWidth : null,
    isDisabled ? styles.disabled : null,
    style,
  ]);

  const label = (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.72}
      style={[styles.buttonText, buttonTextSizeStyle, { color: buttonPalette.color }, textStyle]}
    >
      {contentLabel}
    </Text>
  );
  const leading = busy ? (
    <ActivityIndicator size="small" color={buttonPalette.color} />
  ) : icon ? (
    <Ionicons name={icon} size={size === "sm" ? 15 : 17} color={buttonPalette.color} />
  ) : null;

  if (href && !isDisabled) {
    return (
      <Link href={href} asChild>
        <AnimatedPressable
          testID={testID}
          onPressIn={() => {
            if (hapticWeight !== "none") {
              pressWithHaptics(undefined, hapticWeight);
            }
            scale.value = withSpring(0.95, { mass: 0.5, damping: 12 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { mass: 0.5, damping: 12 });
          }}
          onLongPress={() => pressWithHaptics(onLongPress, hapticWeight)}
          accessibilityRole="link"
          accessibilityLabel={
            accessibilityLabel ?? (typeof children === "string" ? children : undefined)
          }
          accessibilityState={{ disabled: isDisabled, busy }}
          style={[staticButtonStyle, animatedStyle]}
        >
          {leading}
          {label}
        </AnimatedPressable>
      </Link>
    );
  }

  return (
    <AnimatedPressable
      testID={testID}
      onPressIn={() => {
        if (!isDisabled) {
          scale.value = withSpring(0.95, { mass: 0.5, damping: 12 });
        }
      }}
      onPressOut={() => {
        if (!isDisabled) {
          scale.value = withSpring(1, { mass: 0.5, damping: 12 });
        }
      }}
      onPress={() => {
        if (!isDisabled) pressWithHaptics(onPress, hapticWeight);
      }}
      onLongPress={() => pressWithHaptics(onLongPress, hapticWeight)}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? (typeof children === "string" ? children : undefined)
      }
      accessibilityState={{ disabled: isDisabled, busy }}
      style={({ pressed }) => [
        styles.button,
        buttonSizeStyle,
        buttonPalette.glow,
        {
          backgroundColor: buttonPalette.backgroundColor,
          borderColor: buttonPalette.borderColor,
        },
        pressed && !isDisabled ? styles.pressed : null,
        fullWidth ? styles.fullWidth : null,
        isDisabled ? styles.disabled : null,
        style,
        animatedStyle,
      ]}
    >
      {leading}
      {label}
    </AnimatedPressable>
  );
}

export function PrimaryButton(props: Omit<Parameters<typeof ZookButton>[0], "variant">) {
  return <ZookButton {...props} />;
}

export function SecondaryButton(props: Omit<Parameters<typeof ZookButton>[0], "variant" | "tone">) {
  return <ZookButton {...props} variant="secondary" />;
}

export function SecondaryGlassButton(
  props: Omit<Parameters<typeof ZookButton>[0], "variant" | "tone">,
) {
  return <ZookButton {...props} variant="secondary" />;
}

export function DangerButton(props: Omit<Parameters<typeof ZookButton>[0], "variant" | "tone">) {
  return <ZookButton {...props} variant="danger" />;
}

export function GhostButton(props: Omit<Parameters<typeof ZookButton>[0], "variant" | "tone">) {
  return <ZookButton {...props} variant="ghost" />;
}

export function DangerActionButton(
  props: Omit<Parameters<typeof ZookButton>[0], "variant" | "tone">,
) {
  return <ZookButton {...props} variant="danger" />;
}

export function PrimaryLink({
  href,
  children,
  tone = "lime",
  style,
  textStyle,
  accessibilityLabel,
}: {
  href: Href;
  children: ReactNode;
  tone?: ButtonTone;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <ZookButton
      href={href}
      tone={tone}
      style={style}
      textStyle={textStyle}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </ZookButton>
  );
}

export function SecondaryLink(props: Omit<Parameters<typeof PrimaryLink>[0], "tone">) {
  return <PrimaryLink {...props} tone="secondary" />;
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    minWidth: 0,
  },
  buttonText: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
    textAlign: "center",
    ...typography.button,
  },
  fullWidth: {
    width: "100%",
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.62,
  },
});

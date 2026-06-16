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

import { radii, shadows, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";
import type { Palette } from "@/lib/theme/index";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
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

function paletteForVariant(palette: Palette, variant: ButtonVariant, isDark: boolean): ButtonPalette {
  if (variant === "primary") {
    return {
      backgroundColor: palette.accent.fill,
      borderColor: palette.accent.strong,
      color: palette.text.onAccent,
      glow: isDark ? shadows.glowLimeSoft : shadows.card,
    };
  }
  if (variant === "destructive") {
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
    minHeight: 40,
    borderRadius: radii.button,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
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
  variant = "primary",
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
  const { palette, mode } = useTheme();
  const buttonPalette = paletteForVariant(palette, variant, mode === "dark");
  const buttonSizeStyle = buttonSizeStyles[size];
  const buttonTextSizeStyle = buttonTextSizeStyles[size];
  const isDisabled = disabled || busy;
  const resolvedBgColor = isDisabled ? palette.bg.sunken : buttonPalette.backgroundColor;
  const resolvedBorderColor = isDisabled ? palette.border.subtle : buttonPalette.borderColor;
  const resolvedTextColor = isDisabled ? palette.text.secondary : buttonPalette.color;
  const contentLabel = busy && busyLabel ? busyLabel : children;
  const staticButtonStyle = StyleSheet.flatten([
    styles.button,
    buttonSizeStyle,
    buttonPalette.glow,
    {
      backgroundColor: resolvedBgColor,
      borderColor: resolvedBorderColor,
    },
    fullWidth ? styles.fullWidth : null,
    isDisabled ? styles.disabled : null,
    style,
  ]);

  const label = (
    <Text
      numberOfLines={1}
      style={[styles.buttonText, buttonTextSizeStyle, { color: resolvedTextColor }, textStyle]}
    >
      {contentLabel}
    </Text>
  );
  const leading = busy ? (
    <ActivityIndicator size="small" color={resolvedTextColor} />
  ) : icon ? (
    <Ionicons name={icon} size={size === "sm" ? 15 : 17} color={resolvedTextColor} />
  ) : null;

  if (href && !isDisabled) {
    return (
      <Link href={href} asChild>
        <Pressable
          testID={testID}
          onPressIn={() => {
            if (hapticWeight !== "none") {
              pressWithHaptics(undefined, hapticWeight);
            }
          }}
          onLongPress={() => pressWithHaptics(onLongPress, hapticWeight)}
          accessibilityRole="link"
          accessibilityLabel={
            accessibilityLabel ?? (typeof children === "string" ? children : undefined)
          }
          accessibilityState={{ disabled: isDisabled, busy }}
          style={staticButtonStyle}
        >
          {leading}
          {label}
        </Pressable>
      </Link>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (!isDisabled) pressWithHaptics(onPress, hapticWeight);
      }}
      onLongPress={() => pressWithHaptics(onLongPress, hapticWeight)}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? (typeof children === "string" ? children : undefined)
      }
      accessibilityState={{ disabled: isDisabled, busy }}
      android_ripple={{ color: palette.border.default, borderless: false }}
      style={({ pressed }) => [
        styles.button,
        buttonSizeStyle,
        buttonPalette.glow,
        {
          backgroundColor: resolvedBgColor,
          borderColor: resolvedBorderColor,
        },
        pressed && !isDisabled ? styles.pressed : null,
        fullWidth ? styles.fullWidth : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {leading}
      {label}
    </Pressable>
  );
}

export function PrimaryButton(props: Omit<Parameters<typeof ZookButton>[0], "variant">) {
  return <ZookButton {...props} />;
}

export function SecondaryButton(props: Omit<Parameters<typeof ZookButton>[0], "variant">) {
  return <ZookButton {...props} variant="secondary" />;
}

export function DangerButton(props: Omit<Parameters<typeof ZookButton>[0], "variant">) {
  return <ZookButton {...props} variant="destructive" />;
}

export function GhostButton(props: Omit<Parameters<typeof ZookButton>[0], "variant">) {
  return <ZookButton {...props} variant="ghost" />;
}

export function PrimaryLink({
  href,
  children,
  variant = "primary",
  style,
  textStyle,
  accessibilityLabel,
}: {
  href: Href;
  children: ReactNode;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <ZookButton
      href={href}
      variant={variant}
      style={style}
      textStyle={textStyle}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </ZookButton>
  );
}

export function SecondaryLink(props: Omit<Parameters<typeof PrimaryLink>[0], "variant">) {
  return <PrimaryLink {...props} variant="secondary" />;
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    alignItems: "center",
    borderCurve: "continuous",
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
    opacity: 0.5,
  },
});

export const Button = ZookButton;

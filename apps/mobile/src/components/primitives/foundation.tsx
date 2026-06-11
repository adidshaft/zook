import { Link, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type ScrollViewProps,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import Reanimated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "@/lib/reanimated-lite";
import Animated, {
  useAnimatedStyle as useRealAnimatedStyle,
  useSharedValue as useRealSharedValue,
  withSpring as withRealSpring,
} from "@/lib/reanimated-lite";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Role } from "@zook/core";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useRoleContext } from "@/lib/role-context";
import { useBottomScrollPadding, useStickyActionOffset } from "@/lib/use-layout-padding";
import { useMyNotifications, useOrgAttendancePending } from "@/lib/domains";
import { layout, radii, shadows, spacing, typography, useTheme } from "@/lib/theme";
import type { Palette } from "@/lib/theme";
import { darkPalette } from "@zook/tokens";
import { BottomNavVisibilityContext } from "@/components/primitives/bottom-nav-context";
import { Icon } from "./icon";

export type PillTone = "neutral" | "lime" | "amber" | "red" | "blue" | "violet";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";
type CardVariant = "default" | "compact" | "selected" | "success" | "warning" | "danger";
type CardGlowTone = "lime" | "amber" | "red" | "success";
type CardSurface = "content" | "interactive" | "floating";
type BrandMarkSize = "sm" | "md" | "lg";
type IconName = keyof typeof Ionicons.glyphMap;
type ThemeMode = "light" | "dark";
export type ChipGroupOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  icon?: IconName;
  tone?: PillTone;
};

// Metro resolves static image requires at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const zookMarkSource = require("../../../assets/icons/app-icon-512.png");
const iconOnlyHitSlop = { top: 8, right: 8, bottom: 8, left: 8 };
const fallbackColors = {
  bg: "#000000",
  text: "#FFFFFF",
  muted: "#D4DDD0",
  subtle: "#99A595",
  lime: darkPalette.accent.base,
  limeBorder: "rgba(185,244,85,0.26)",
  amber: "#F2C94C",
  red: "#FF5A3D",
  blue: "#7DD3FC",
  violet: "#B9A9FF",
  border: "rgba(255,255,255,0.18)",
  borderStrong: "rgba(255,255,255,0.28)",
  divider: "rgba(255,255,255,0.11)",
  panel: "rgba(255,255,255,0.06)",
  panelStrong: "rgba(255,255,255,0.10)",
  glassFill: "rgba(255,255,255,0.06)",
  glassStroke: "rgba(255,255,255,0.18)",
  accentPanel: "rgba(185,244,85,0.12)",
};

const brandMarkSizes: Record<BrandMarkSize, number> = {
  sm: 32,
  md: 44,
  lg: 56,
};

export function getTonePalette(tone: PillTone, _mode: ThemeMode, palette: Palette) {
  if (tone === "lime") {
    return {
      borderColor: palette.border.focus,
      color: palette.accent.base,
      backgroundColor: palette.surface.accentSoft,
      glowColor: palette.surface.accentSoft,
    };
  }
  if (tone === "amber") {
    return {
      borderColor: palette.feedback.warning,
      color: palette.feedback.warning,
      backgroundColor: palette.surface.warningSoft,
      glowColor: palette.surface.warningSoft,
    };
  }
  if (tone === "red") {
    return {
      borderColor: palette.feedback.danger,
      color: palette.feedback.danger,
      backgroundColor: palette.surface.dangerSoft,
      glowColor: palette.surface.dangerSoft,
    };
  }
  if (tone === "blue") {
    return {
      borderColor: palette.feedback.info,
      color: palette.feedback.info,
      backgroundColor: palette.bg.sunken,
      glowColor: palette.bg.sunken,
    };
  }
  if (tone === "violet") {
    return {
      borderColor: palette.border.default,
      color: palette.text.primary,
      backgroundColor: palette.surface.raised,
      glowColor: palette.surface.default,
    };
  }
  return {
    borderColor: palette.border.subtle,
    color: palette.text.secondary,
    backgroundColor: palette.surface.default,
    glowColor: palette.surface.default,
  };
}

export function useTonePalette(tone: PillTone) {
  const { palette, mode } = useTheme();

  return useMemo(() => getTonePalette(tone, mode, palette), [tone, palette, mode]);
}

const buttonSizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    minHeight: 44,
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

  if (Platform.OS === "android") {
    return {
      elevation: 2,
      shadowColor: shadowColor ?? fallbackColors.bg,
    };
  }

  return {
    shadowColor: shadowColor ?? fallbackColors.bg,
    shadowOpacity: mode === "dark" ? 0.22 : 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  };
}

function glassSurfaceColors(
  mode: ThemeMode,
  palette: Palette,
  variant: CardVariant,
  surface: CardSurface,
): { backgroundColor: string; borderColor: string; blurIntensity: number; blurTint: "dark" | "light" } {
  const isDark = mode === "dark";
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
    backgroundColor: surface === "content" ? palette.bg.elevated : palette.surface.raised,
    borderColor: surface === "content" ? palette.border.subtle : palette.border.default,
    blurIntensity,
    blurTint,
  };
}

export type HapticWeight = "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error" | "none";

type PressHandler = () => void | Promise<void>;

export function pressWithHaptics(callback?: PressHandler, weight: HapticWeight = "light") {
  if (weight !== "none") {
    if (weight === "selection") void Haptics.selectionAsync();
    else if (weight === "success") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (weight === "warning") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else if (weight === "error") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

function initialsForName(name?: string | null) {
  const cleanName = name?.trim();
  if (!cleanName) return "ZK";
  return cleanName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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
              {
                backgroundColor: palette.surface.accentSoft,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.ambientWash,
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

export function Screen({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <ZookScreen>
      {title ? <Text style={styles.shellTitle}>{title}</Text> : null}
      {children}
    </ZookScreen>
  );
}

export function ScreenShell({
  children,
  title,
  scroll = true,
  bottomNav = true,
  stickyAction = false,
  ambient = true,
  contentStyle,
  style,
  ...scrollProps
}: {
  children: ReactNode;
  title?: string;
  scroll?: boolean;
  bottomNav?: boolean;
  stickyAction?: boolean;
  ambient?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
} & Omit<ScrollViewProps, "contentContainerStyle" | "style">) {
  const computedBottomPadding = useBottomScrollPadding({ hasStickyAction: stickyAction });
  const contentPaddingBottom = bottomNav ? computedBottomPadding : stickyAction ? layout.stickyActionHeight + spacing.lg : spacing.xl;
  return (
    <ZookScreen ambient={ambient} style={style}>
      {title ? <Text style={styles.shellTitle}>{title}</Text> : null}
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          {...scrollProps}
          contentContainerStyle={[
            styles.screenShellContent,
            { paddingBottom: contentPaddingBottom },
            contentStyle,
          ]}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[styles.screenShellContent, { paddingBottom: contentPaddingBottom }, contentStyle]}
        >
          {children}
        </View>
      )}
    </ZookScreen>
  );
}

export function SafeAreaScreen(props: Parameters<typeof ZookScreen>[0]) {
  return <ZookScreen {...props} />;
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

export function ProfileShortcut({
  size = 44,
  accessibilityLabel = "Open profile",
}: {
  size?: number;
  accessibilityLabel?: string;
}) {
  const { session, status } = useAuth();
  const router = useRouter();

  if (status !== "authenticated") return null;

  const name = session?.user.name ?? "";
  const initials = initialsForName(name);
  const photoUrl = session?.user.profilePhotoUrl?.trim();
  const remotePhotoUrl = photoUrl && /^https?:\/\//.test(photoUrl) ? photoUrl : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => pressWithHaptics(() => router.push("/profile"))}
      hitSlop={iconOnlyHitSlop}
      style={({ pressed }) => [
        styles.profileShortcut,
        { width: size, height: size, borderRadius: size / 2 },
        pressed ? styles.pressed : null,
      ]}
    >
      {remotePhotoUrl ? (
        <Image
          source={{ uri: remotePhotoUrl }}
          placeholder="L6PZfMAR00yXQD%Mt7V@00_4g9-;"
          transition={250}
          style={styles.profileShortcutImage}
          contentFit="cover"
        />
      ) : (
        <Text style={styles.profileShortcutText}>{initials}</Text>
      )}
    </Pressable>
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
  disabled = false,
  onPress,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  glow?: boolean;
  glowTone?: CardGlowTone;
  variant?: CardVariant;
  padding?: number;
  radius?: number;
  pressable?: boolean;
  surface?: CardSurface;
  disabled?: boolean;
  onPress?: PressHandler;
  testID?: string;
}) {
  const { mode, palette } = useTheme();
  const resolvedGlowTone = glowTone ?? (glow ? "lime" : undefined);
  const resolvedRadius = radius ?? (variant === "compact" ? radii.smallCard : radii.mainCard);
  const resolvedSurface = surface ?? (pressable || onPress ? "interactive" : "content");
  const surfaceColors = glassSurfaceColors(mode, palette, variant, resolvedSurface);

  // Android draws `elevation` shadows behind the view; when the same view
  // has `overflow: hidden`, the shadow gets clipped *inside* the card and
  // shows up as a phantom dark rectangle behind the content. Split the
  // shadow onto an outer wrapper (no clipping) and keep border + bg + clip
  // on an inner card so the shadow renders cleanly on both platforms.
  const outerStyle: StyleProp<ViewStyle> = [
    { borderRadius: resolvedRadius },
    platformSurfaceShadow(
      mode,
      resolvedSurface === "floating" || resolvedSurface === "interactive" || Boolean(resolvedGlowTone),
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
        accessibilityRole="button"
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

export function GlassPanel({
  children,
  strong = false,
  style,
}: {
  children: ReactNode;
  strong?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette, mode } = useTheme();
  return (
    <View
      style={[
        styles.glassPanel,
        {
          backgroundColor: strong ? palette.surface.raised : palette.surface.default,
          borderColor: strong ? palette.border.default : palette.border.subtle,
        },
        platformSurfaceShadow(mode, strong, palette.bg.sunken),
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function ZookChip({
  children,
  tone = "neutral",
  icon,
  onPress,
  accessibilityLabel,
  style,
  textStyle,
}: {
  children: ReactNode;
  tone?: PillTone;
  icon?: IconName;
  onPress?: PressHandler;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { palette: themePalette } = useTheme();
  const palette = useTonePalette(tone);
  const chip = (
    <View
      style={[
        styles.chip,
        {
          borderColor: palette.borderColor,
          backgroundColor: palette.backgroundColor,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={13} color={palette.color} /> : null}
      <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.chipText, { color: palette.color }, textStyle]}>{children}</Text>
    </View>
  );
  if (!onPress) return chip;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === "string" ? children : undefined)}
      android_ripple={{ color: themePalette.border.default, borderless: false }}
      onPress={() => pressWithHaptics(onPress)}
      style={({ pressed }) => [styles.chipPressable, pressed ? styles.pressed : null]}
    >
      {chip}
    </Pressable>
  );
}

export function Pill(props: Parameters<typeof ZookChip>[0]) {
  return <ZookChip {...props} />;
}

type StatusLabel =
  | "Active"
  | "Approved"
  | "Pending"
  | "Pending approval"
  | "Expired"
  | "Flagged"
  | "Assigned"
  | "Low stock"
  | "In stock"
  | "Review required"
  | "Desk confirmation needed";

function toneForStatusLabel(status: string): PillTone {
  const normalized = status.toLowerCase();
  if (
    normalized.includes("approved") ||
    normalized.includes("active") ||
    normalized.includes("assigned") ||
    normalized.includes("in stock")
  ) {
    return "lime";
  }
  if (
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized.includes("desk") ||
    normalized.includes("low")
  ) {
    return "amber";
  }
  if (normalized.includes("expired") || normalized.includes("flagged")) {
    return "red";
  }
  return "neutral";
}

type StatusChipProps = Omit<Parameters<typeof ZookChip>[0], "children"> & {
  status?: StatusLabel | string;
  children?: ReactNode;
};

export function StatusChip({ status, children, tone, ...props }: StatusChipProps) {
  const label = status ?? children;
  const resolvedTone = tone ?? (typeof label === "string" ? toneForStatusLabel(label) : "neutral");
  return (
    <ZookChip {...props} tone={resolvedTone}>
      {label}
    </ZookChip>
  );
}

export function ActiveGymPill({ label }: { label: string }) {
  return (
    <ZookChip tone="lime" icon="business-outline">
      {label}
    </ZookChip>
  );
}

export function RoleChip({ role }: { role: Role | string }) {
  const label = String(role).replace(/_/g, " ").toLowerCase();
  return (
    <ZookChip tone="neutral" icon="shield-checkmark-outline" textStyle={styles.capitalize}>
      {label}
    </ZookChip>
  );
}

export function PriorityChip({ priority }: { priority: "High" | "Medium" | "Low" }) {
  const tone: PillTone = priority === "High" ? "red" : priority === "Medium" ? "amber" : "neutral";
  return <ZookChip tone={tone}>{priority}</ZookChip>;
}

export function ModeChip({
  mode,
  selected = false,
}: {
  mode:
    | "Direct UPI"
    | "Manual Approval"
    | "Open Join"
    | "Desk Pickup"
    | "Cash"
    | "Bank"
    | "Card"
    | "Manual";
  selected?: boolean;
}) {
  return (
    <ZookChip
      tone={selected ? "lime" : "neutral"}
      icon={selected ? "checkmark-circle-outline" : undefined}
    >
      {mode}
    </ZookChip>
  );
}

export function MobileHeader({
  eyebrow,
  title,
  subtitle,
  leading,
  trailing,
  chip,
  contextSlot,
  centered = false,
  showProfileShortcut = true,
  style,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  chip?: ReactNode;
  contextSlot?: ReactNode;
  centered?: boolean;
  showProfileShortcut?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { palette } = useTheme();

  // Root tabs where we should not display a back button
  const isRootTab =
    ["/", "/plan", "/scan", "/shop", "/you", "/owner", "/trainer", "/reception"].includes(pathname) ||
    pathname === "";

  const canGoBack = !isRootTab;

  let resolvedLeading = leading;
  if (!resolvedLeading) {
    if (canGoBack) {
      resolvedLeading = (
        <Pressable
          onPress={() => pressWithHaptics(() => router.canGoBack() ? router.back() : router.replace("/"))}
          hitSlop={iconOnlyHitSlop}
          style={({ pressed }) => [
            {
              width: 44,
              height: 44,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: palette.surface.default,
              borderWidth: 1,
              borderColor: palette.border.subtle,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Icon name="back" size={22} color={palette.text.primary} />
        </Pressable>
      );
    } else if (!centered && showProfileShortcut) {
      resolvedLeading = <ProfileShortcut />;
    }
  }

  return (
    <View style={[styles.mobileHeader, centered ? styles.mobileHeaderCentered : null, style]}>
      {resolvedLeading ? <View style={styles.headerSide}>{resolvedLeading}</View> : null}
      <View style={[styles.mobileHeaderCopy, centered ? styles.centeredCopy : null]}>
        {chip}
        {eyebrow ? (
          <Text style={[styles.headerEyebrow, { color: palette.text.tertiary }]}>{eyebrow}</Text>
        ) : null}
        <Text style={[styles.headerTitle, centered ? styles.centerText : null, { color: palette.text.primary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, centered ? styles.centerText : null, { color: palette.text.secondary }]}>
            {subtitle}
          </Text>
        ) : null}
        {contextSlot ? <View style={styles.headerContextSlot}>{contextSlot}</View> : null}
      </View>
      {trailing ? <View style={styles.headerSide}>{trailing}</View> : null}
    </View>
  );
}

export function RoleHeader({
  role,
  title,
  subtitle,
  trailing,
}: {
  role: Role | string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <MobileHeader
      title={title}
      subtitle={subtitle}
      chip={<RoleChip role={role} />}
      trailing={trailing}
    />
  );
}

export function ZookHeader({
  title,
  subtitle,
  activeGym,
  role,
  trailing,
}: {
  title: string;
  subtitle?: string;
  activeGym?: string;
  role?: Role | string;
  trailing?: ReactNode;
}) {
  return (
    <MobileHeader
      title={title}
      subtitle={subtitle}
      chip={
        activeGym ? (
          <ActiveGymPill label={activeGym} />
        ) : role ? (
          <RoleChip role={role} />
        ) : undefined
      }
      trailing={trailing}
    />
  );
}

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  trailing,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <MobileHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      trailing={trailing}
      showProfileShortcut={false}
    />
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.sectionGroup}>
      {eyebrow ? (
        <Text style={[styles.sectionEyebrow, { color: palette.text.tertiary }]}>{eyebrow}</Text>
      ) : null}
      <SectionLabel title={title} action={action} />
      {subtitle ? (
        <Text style={[styles.sectionSubtitle, { color: palette.text.secondary }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function SectionTitle(props: Parameters<typeof SectionHeader>[0]) {
  return <SectionHeader {...props} />;
}

export function AppHeader(props: Parameters<typeof MobileHeader>[0]) {
  return <MobileHeader {...props} />;
}

export function FieldCard(props: Parameters<typeof Card>[0]) {
  return <Card variant="compact" {...props} />;
}

export function QueueCard(props: Parameters<typeof Card>[0]) {
  return <Card pressable {...props} />;
}

export function AlertCard({
  title,
  message,
  tone = "amber",
  icon,
  action,
}: {
  title: string;
  message?: string;
  tone?: PillTone;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <Card variant={tone === "red" ? "danger" : tone === "amber" ? "warning" : "selected"}>
      <View style={styles.alertCardRow}>
        <IconBubble icon={icon ?? "alert-circle-outline"} tone={tone} size={38} />
        <View style={styles.alertCardCopy}>
          <Text style={styles.alertCardTitle}>{title}</Text>
          {message ? <Text style={styles.alertCardMessage}>{message}</Text> : null}
        </View>
        {action}
      </View>
    </Card>
  );
}

export function ActionButtonRow({ children }: { children: ReactNode }) {
  return <View style={styles.actionButtonRow}>{children}</View>;
}

export function SectionLabel({ title, action }: { title: string; action?: ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>{title}</Text>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

export function IconBubble({
  icon,
  tone = "neutral",
  size = 44,
}: {
  icon: IconName;
  tone?: PillTone;
  size?: number;
}) {
  const palette = useTonePalette(tone);
  return (
    <View
      style={[
        styles.iconBubble,
        {
          width: size,
          height: size,
          borderRadius: Math.max(14, size / 2.5),
          borderColor: palette.borderColor,
          backgroundColor: palette.backgroundColor,
        },
      ]}
    >
      <Ionicons name={icon} size={Math.max(17, size / 2.25)} color={palette.color} />
    </View>
  );
}

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
  const { palette: themePalette, mode } = useTheme();
  const isDark = mode === "dark";

  let btnBg = themePalette.accent.fill;
  let btnBorder = themePalette.accent.fill;
  let btnColor = themePalette.text.onAccent;
  let btnGlow: ViewStyle | null = null;

  if (variant === "primary") {
    btnBg = themePalette.accent.fill;
    btnBorder = themePalette.accent.fill;
    btnColor = themePalette.text.onAccent;
    btnGlow = isDark ? shadows.glowLimeSoft : null;
  } else if (variant === "secondary") {
    btnBg = isDark ? themePalette.surface.raised : themePalette.surface.accentSoft;
    btnBorder = themePalette.border.default;
    btnColor = themePalette.text.primary;
    btnGlow = null;
  } else if (variant === "ghost") {
    btnBg = "transparent";
    btnBorder = themePalette.border.subtle;
    btnColor = themePalette.text.primary;
    btnGlow = null;
  } else if (variant === "destructive") {
    btnBg = themePalette.surface.dangerSoft;
    btnBorder = themePalette.feedback.danger;
    btnColor = themePalette.feedback.danger;
    btnGlow = null;
  }

  const buttonSizeStyle = buttonSizeStyles[size];
  const buttonTextSizeStyle = buttonTextSizeStyles[size];
  const isDisabled = disabled || busy;
  const contentLabel = busy && busyLabel ? busyLabel : children;
  const staticButtonStyle = StyleSheet.flatten([
    styles.button,
    buttonSizeStyle,
    btnGlow,
    {
      backgroundColor: btnBg,
      borderColor: btnBorder,
    },
    fullWidth ? styles.fullWidth : null,
    isDisabled ? styles.disabled : null,
    style,
  ]);

  if (href && !isDisabled) {
    const scale = useRealSharedValue(1);
    const animatedStyle = useRealAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Link href={href} asChild>
        <AnimatedPressable
          testID={testID}
          onPressIn={() => {
            if (hapticWeight !== "none") {
              pressWithHaptics(undefined, hapticWeight);
            }
            scale.value = withRealSpring(0.95, { mass: 0.5, damping: 12 });
          }}
          onPressOut={() => {
            scale.value = withRealSpring(1, { mass: 0.5, damping: 12 });
          }}
          onLongPress={() => pressWithHaptics(onLongPress, hapticWeight)}
          accessibilityRole="link"
          accessibilityLabel={
            accessibilityLabel ?? (typeof children === "string" ? children : undefined)
          }
          accessibilityState={{ disabled: isDisabled, busy }}
          style={[staticButtonStyle, animatedStyle]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={btnColor} />
          ) : icon ? (
            <Ionicons name={icon} size={size === "sm" ? 15 : 17} color={btnColor} />
          ) : null}
          <Text
            numberOfLines={1}
            style={[styles.buttonText, buttonTextSizeStyle, { color: btnColor }, textStyle]}
          >
            {contentLabel}
          </Text>
        </AnimatedPressable>
      </Link>
    );
  }

  const scale = useRealSharedValue(1);
  const animatedStyle = useRealAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const button = (
    <AnimatedPressable
      testID={testID}
      onPressIn={() => {
        if (!isDisabled) {
          scale.value = withRealSpring(0.95, { mass: 0.5, damping: 12 });
        }
      }}
      onPressOut={() => {
        if (!isDisabled) {
          scale.value = withRealSpring(1, { mass: 0.5, damping: 12 });
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
      android_ripple={{ color: themePalette.border.default, borderless: false }}
      style={({ pressed }) => [
        styles.button,
        buttonSizeStyle,
        btnGlow,
        {
          backgroundColor: btnBg,
          borderColor: btnBorder,
        },
        pressed && !isDisabled ? styles.pressed : null,
        fullWidth ? styles.fullWidth : null,
        isDisabled ? styles.disabled : null,
        style,
        animatedStyle,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={btnColor} />
      ) : icon ? (
        <Ionicons name={icon} size={size === "sm" ? 15 : 17} color={btnColor} />
      ) : null}
      <Text
        numberOfLines={1}
        style={[styles.buttonText, buttonTextSizeStyle, { color: btnColor }, textStyle]}
      >
        {contentLabel}
      </Text>
    </AnimatedPressable>
  );

  return button;
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

export function MetricTile({
  label,
  value,
  detail,
  tone = "neutral",
  icon,
  style,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: PillTone;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette: themePalette, mode } = useTheme();
  const tonePalette = getTonePalette(tone, mode, themePalette);

  return (
    <View
      style={[
        styles.metricTile,
        {
          borderColor: tonePalette.borderColor,
          backgroundColor: tonePalette.backgroundColor,
        },
        style,
      ]}
    >
      {icon ? <IconBubble icon={icon} tone={tone} size={34} /> : null}
      <Text style={[styles.metricTileLabel, { color: themePalette.text.secondary }]} numberOfLines={2}>
        {label}
      </Text>
      <Text
        style={[styles.metricTileValue, { color: tonePalette.color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      {detail ? (
        <Text style={[styles.metricTileDetail, { color: themePalette.text.tertiary }]} numberOfLines={2}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

export function StatCard(props: Parameters<typeof MetricTile>[0]) {
  return <MetricTile {...props} />;
}

export function MetricCard(props: Parameters<typeof MetricTile>[0]) {
  return <MetricTile {...props} />;
}

export function InfoRow({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: PillTone;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <ZookChip tone={tone}>{value}</ZookChip>
    </View>
  );
}

export function StatusRing({
  tone = "lime",
  value,
  label,
  icon,
  size = 92,
  progress = 0.73,
}: {
  tone?: PillTone;
  value?: string;
  label?: string;
  icon?: IconName;
  size?: number;
  progress?: number;
}) {
  const { palette: themePalette, mode } = useTheme();
  const palette = getTonePalette(tone, mode, themePalette);
  const activeRotation = progress >= 0.7 ? "34deg" : progress >= 0.45 ? "-24deg" : "-72deg";
  const ringShadow =
    tone !== "neutral" && Platform.OS === "ios"
      ? {
          shadowColor: palette.color,
          shadowOpacity: mode === "dark" ? 0.18 : 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 0 },
        }
      : null;
  return (
    <View
      style={[
        styles.statusRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: themePalette.border.subtle,
        },
        ringShadow,
      ]}
    >
      <View
        style={[
          styles.statusRingArc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderTopColor: palette.color,
            borderRightColor: palette.color,
            borderBottomColor: "transparent",
            borderLeftColor: "transparent",
            transform: [{ rotate: activeRotation }],
          },
        ]}
      />
      <View style={styles.statusRingCenter}>
        {icon ? (
          <Ionicons name={icon} size={Math.round(size * 0.36)} color={palette.color} />
        ) : null}
        {value ? (
          <Text style={[styles.statusRingValue, { color: palette.color }]}>{value}</Text>
        ) : null}
        {label ? (
          <Text style={[styles.statusRingLabel, { color: themePalette.text.secondary }]}>
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function ConfirmationRing({
  tone = "lime",
  icon = "checkmark",
  label,
}: {
  tone?: PillTone;
  icon?: IconName;
  label?: string;
}) {
  return <StatusRing tone={tone} icon={icon} label={label} size={132} progress={0.86} />;
}

export function EntryCodeCard({
  code,
  status,
  detail,
  tone = "lime",
}: {
  code: string;
  status?: string;
  detail?: string;
  tone?: PillTone;
}) {
  const { palette: themePalette } = useTheme();
  const palette = useTonePalette(tone);
  return (
    <Card
      glow={tone === "lime"}
      style={[styles.entryCodeCard, { borderColor: palette.borderColor }]}
      contentStyle={styles.entryCodeContent}
    >
      <Text style={[styles.entryCodeLabel, { color: themePalette.text.secondary }]}>
        Entry Code
      </Text>
      <Text style={[styles.entryCodeValue, { color: palette.color }]}>{code}</Text>
      {status ? <ZookChip tone={tone}>{status}</ZookChip> : null}
      {detail ? (
        <Text style={[styles.entryCodeDetail, { color: themePalette.text.secondary }]}>
          {detail}
        </Text>
      ) : null}
    </Card>
  );
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  icon,
  tone = "neutral",
  onPress,
  accessibilityLabel,
  style,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  icon?: IconName;
  tone?: PillTone;
  onPress?: PressHandler;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette, mode } = useTheme();
  const row = (
    <View
      style={[
        styles.listRow,
        {
          borderColor: palette.border.subtle,
          backgroundColor: mode === "dark" ? palette.surface.default : palette.bg.elevated,
        },
        style,
      ]}
    >
      {leading ?? (icon ? <IconBubble icon={icon} tone={tone} size={40} /> : null)}
      <View style={styles.listRowCopy}>
        <Text numberOfLines={1} style={[styles.listRowTitle, { color: palette.text.primary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={2} style={[styles.listRowSubtitle, { color: palette.text.secondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.listRowTrailing}>
        {trailing ?? <Ionicons name="chevron-forward" size={16} color={palette.text.tertiary} />}
      </View>
    </View>
  );
  if (!onPress) return row;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      android_ripple={{ color: palette.border.default, borderless: false }}
      onPress={() => pressWithHaptics(onPress)}
      style={({ pressed }) => (pressed ? styles.listRowPressed : null)}
    >
      {row}
    </Pressable>
  );
}

type TextFieldProps = Omit<TextInputProps, "style"> & {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  required?: boolean;
  readonly?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function TextField({
  label,
  hint,
  error,
  optional = false,
  required = false,
  readonly = false,
  style,
  inputStyle,
  leading,
  trailing,
  ...props
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const { palette, mode } = useTheme();
  const disabled = props.editable === false;
  const labelSuffix = required ? " *" : optional ? " optional" : "";
  const inputBorderColor = focused
    ? palette.border.focus
    : error
      ? palette.feedback.danger
      : palette.border.default;
  const inputSurface = error
    ? palette.surface.dangerSoft
    : focused
      ? mode === "dark"
        ? palette.surface.raised
        : palette.bg.elevated
      : readonly
        ? mode === "dark"
          ? palette.bg.sunken
          : palette.surface.accentSoft
        : mode === "dark"
          ? palette.surface.default
          : palette.surface.accentSoft;
  return (
    <View style={[styles.inputGroup, style]}>
      {label ? (
        <Text style={[styles.inputLabel, { color: palette.text.secondary }]}>
          {label}
          {labelSuffix}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor: inputBorderColor,
            backgroundColor: inputSurface,
          },
          disabled ? styles.inputWrapperDisabled : null,
        ]}
      >
        {leading}
        <TextInput
          {...props}
          editable={readonly ? false : props.editable}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          placeholderTextColor={palette.text.tertiary}
          style={[
            styles.input,
            { color: palette.text.primary },
            props.multiline ? styles.inputMultiline : null,
            inputStyle,
          ]}
        />
        {trailing}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={[styles.inputError, { color: palette.feedback.danger }]}>
          {error}
        </Text>
      ) : null}
      {!error && hint ? <Text style={[styles.inputHint, { color: palette.text.tertiary }]}>{hint}</Text> : null}
    </View>
  );
}

export function Input(props: Parameters<typeof TextField>[0]) {
  return <TextField {...props} />;
}

export function FormField(props: Parameters<typeof TextField>[0]) {
  return <TextField {...props} />;
}

export function SearchBar({
  placeholder = "Search",
  value,
  onChangeText,
  style,
  trailing,
}: {
  placeholder?: string;
  value?: string;
  onChangeText?: (value: string) => void;
  style?: StyleProp<ViewStyle>;
  trailing?: ReactNode;
}) {
  const { palette } = useTheme();
  const resolvedTrailing =
    trailing ?? <Ionicons name="options-outline" size={17} color={palette.text.tertiary} />;
  return (
    <TextField
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      autoCapitalize="none"
      autoCorrect={false}
      leading={<Ionicons name="search-outline" size={18} color={palette.text.tertiary} />}
      trailing={resolvedTrailing}
      style={style}
    />
  );
}

export function SearchField({
  label,
  ...props
}: Omit<Parameters<typeof TextField>[0], "leading"> & { label?: string }) {
  const { palette } = useTheme();
  return (
    <TextField
      label={label ?? "Search"}
      leading={<Ionicons name="search-outline" size={18} color={palette.text.tertiary} />}
      {...props}
    />
  );
}

export function ProductCard({
  name,
  price,
  stock,
  tone = "neutral",
  icon = "bag-outline",
  imageUrl,
  compact = false,
  quantity = 0,
  disabled = false,
  incrementDisabled = false,
  onPress,
  onIncrement,
  onDecrement,
  style,
  testID,
}: {
  name: string;
  price: string;
  stock: string;
  tone?: PillTone;
  icon?: IconName;
  imageUrl?: string | null;
  compact?: boolean;
  quantity?: number;
  disabled?: boolean;
  incrementDisabled?: boolean;
  onPress?: PressHandler;
  onIncrement?: () => void;
  onDecrement?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette: themePalette, mode } = useTheme();
  const palette = useTonePalette(tone);
  const increment = onIncrement ?? onPress;
  const canIncrement = !disabled && !incrementDisabled && Boolean(increment);
  const canDecrement = !disabled && Boolean(onDecrement);
  const addButtonDisabled = !canIncrement;
  return (
    <Card
      testID={testID}
      style={[styles.productCard, style]}
      contentStyle={[styles.productContent, compact ? styles.productContentCompact : null]}
      disabled={disabled}
    >
      <View
        style={[
          styles.productVisual,
          {
            borderColor: themePalette.border.subtle,
            backgroundColor: mode === "dark" ? themePalette.bg.sunken : themePalette.surface.default,
          },
          compact ? styles.productVisualCompact : null,
        ]}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.productImage} contentFit="cover" />
        ) : (
          <>
            <View
              style={[styles.productVisualGlow, { backgroundColor: palette.backgroundColor }]}
            />
            <Ionicons name={icon} size={38} color={palette.color} />
          </>
        )}
        {tone === "red" || tone === "amber" ? (
          <View
            style={[
              styles.productBadge,
              { borderColor: palette.borderColor, backgroundColor: palette.backgroundColor },
            ]}
          >
            <Text style={[styles.productBadgeText, { color: palette.color }]}>{stock}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.productInfo}>
        <Text numberOfLines={2} style={[styles.productName, { color: themePalette.text.primary }]}>
          {name}
        </Text>
        <Text numberOfLines={1} style={[styles.productMeta, { color: themePalette.text.secondary }]}>
          {stock}
        </Text>
      </View>
      <View style={styles.productFooter}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={[styles.productPrice, { color: themePalette.text.primary }]}
        >
          {price}
        </Text>
        {quantity > 0 ? (
          <View
            style={[
              styles.productStepper,
              {
                borderColor: themePalette.accent.base,
                backgroundColor: themePalette.surface.accentSoft,
              },
            ]}
          >
            <Pressable
              testID={testID ? `${testID}-decrement` : undefined}
              onPress={() => {
                if (canDecrement) pressWithHaptics(onDecrement);
              }}
              disabled={!canDecrement}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${name}`}
              accessibilityState={{ disabled: !canDecrement }}
              hitSlop={iconOnlyHitSlop}
              style={[styles.productStepperButton, !canDecrement ? styles.disabled : null]}
            >
              <Ionicons name="remove" size={16} color={themePalette.accent.strong} />
            </Pressable>
            <Text style={[styles.productQuantity, { color: themePalette.text.primary }]}>{quantity}</Text>
            <Pressable
              testID={testID ? `${testID}-increment` : undefined}
              onPress={() => {
                if (canIncrement) pressWithHaptics(increment);
              }}
              disabled={!canIncrement}
              accessibilityRole="button"
              accessibilityLabel={`Add ${name}`}
              accessibilityState={{ disabled: !canIncrement }}
              hitSlop={iconOnlyHitSlop}
              style={[styles.productStepperButton, !canIncrement ? styles.disabled : null]}
            >
              <Ionicons name="add" size={16} color={themePalette.accent.strong} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            testID={testID ? `${testID}-increment` : undefined}
            onPress={() => {
              if (canIncrement) pressWithHaptics(increment);
            }}
            disabled={!canIncrement}
            accessibilityRole="button"
            accessibilityLabel={`Add ${name}`}
            accessibilityState={{ disabled: !canIncrement }}
            hitSlop={compact ? { top: 6, bottom: 6, left: 0, right: 0 } : undefined}
            style={[
              styles.productAdd,
              {
                borderColor: addButtonDisabled ? themePalette.border.subtle : themePalette.accent.base,
                backgroundColor: addButtonDisabled
                  ? mode === "dark"
                    ? themePalette.surface.default
                    : themePalette.bg.sunken
                  : themePalette.surface.accentSoft,
              },
              compact ? styles.productAddCompact : null,
            ]}
          >
            <Text
              style={[
                styles.productAddText,
                { color: addButtonDisabled ? themePalette.text.tertiary : themePalette.accent.strong },
              ]}
            >
              {disabled ? "OUT" : "ADD"}
            </Text>
            <Ionicons
              name="add"
              size={16}
              color={addButtonDisabled ? themePalette.text.tertiary : themePalette.accent.strong}
            />
          </Pressable>
        )}
      </View>
    </Card>
  );
}

export function ExerciseRow({
  title,
  detail,
  sets,
  complete = false,
  onPress,
  style,
}: {
  title: string;
  detail: string;
  sets?: string;
  complete?: boolean;
  onPress?: PressHandler;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={() => pressWithHaptics(onPress)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: complete }}
      style={({ pressed }) => [
        styles.exerciseRow,
        {
          borderColor: palette.border.subtle,
          backgroundColor: palette.surface.default,
        },
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <View
        style={[
          styles.exerciseCheck,
          {
            borderColor: complete ? palette.accent.strong : palette.border.strong,
            backgroundColor: complete ? palette.accent.strong : palette.surface.default,
          },
        ]}
      >
        {complete ? <Ionicons name="checkmark" size={15} color={palette.text.onAccent} /> : null}
      </View>
      <IconBubble icon="barbell-outline" tone={complete ? "lime" : "neutral"} size={38} />
      <View style={styles.exerciseCopy}>
        <Text style={[styles.exerciseTitle, { color: palette.text.primary }]}>
          {sets ? `${title} · ${sets}` : title}
        </Text>
        <Text style={[styles.exerciseDetail, { color: palette.text.secondary }]}>{detail}</Text>
      </View>
    </Pressable>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}) {
  const { palette, mode } = useTheme();
  return (
    <View
      style={[
        styles.segmentedControl,
        {
          borderColor: palette.border.subtle,
          backgroundColor: mode === "dark" ? palette.surface.default : palette.surface.accentSoft,
        },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => pressWithHaptics(() => onChange(option.value))}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.segmentedOption,
              selected
                ? {
                    backgroundColor: palette.surface.accentSoft,
                    borderWidth: 1,
                    borderColor: palette.border.focus,
                  }
                : null,
              pressed ? styles.segmentedOptionPressed : null,
            ]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[
                styles.segmentedOptionText,
                { color: selected ? palette.accent.base : palette.text.secondary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ChipGroup<T extends string>({
  accessibilityLabel,
  disabled = false,
  options,
  value,
  onChange,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  options: Array<ChipGroupOption<T>>;
  value: T;
  onChange: (value: T) => void;
}) {
  const { palette: themePalette, mode } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.chipGroup}>
      {options.map((option) => {
        const selected = option.value === value;
        const tone = option.tone ?? (selected ? "lime" : "neutral");
        const palette = getTonePalette(tone, mode, themePalette);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => {
              if (option.value !== value) {
                void Haptics.selectionAsync();
                onChange(option.value);
              }
            }}
            style={({ pressed }) => [
              styles.chipGroupOption,
              {
                borderColor: selected ? palette.borderColor : themePalette.border.subtle,
                backgroundColor: selected
                  ? palette.backgroundColor
                  : mode === "dark"
                    ? themePalette.surface.default
                    : themePalette.bg.elevated,
              },
              selected ? styles.chipGroupOptionSelected : null,
              disabled ? styles.chipGroupOptionDisabled : null,
              pressed && !disabled ? styles.pressed : null,
            ]}
          >
            {option.icon ? <Ionicons name={option.icon} size={16} color={palette.color} /> : null}
            <View style={styles.chipGroupCopy}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.chipGroupLabel,
                  { color: selected ? palette.color : themePalette.text.primary },
                ]}
              >
                {option.label}
              </Text>
              {option.description ? (
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={[styles.chipGroupDescription, { color: themePalette.text.secondary }]}
                >
                  {option.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AuditWarning({ children }: { children: ReactNode }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.auditWarning,
        {
          borderColor: palette.feedback.warning,
          backgroundColor: palette.surface.warningSoft,
        },
      ]}
    >
      <IconBubble icon="reader-outline" tone="amber" size={38} />
      <Text style={[styles.auditWarningText, { color: palette.text.primary }]}>{children}</Text>
    </View>
  );
}

export function OfflineBanner({
  children = "Offline. Changes will sync when connection returns.",
}: {
  children?: ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.offlineBanner,
        {
          borderColor: palette.feedback.warning,
          backgroundColor: palette.surface.warningSoft,
        },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={palette.feedback.warning} />
      <Text style={[styles.offlineBannerText, { color: palette.text.primary }]}>{children}</Text>
    </View>
  );
}

export function DetailRow({
  label,
  value,
  trailing,
}: {
  label: string;
  value: string;
  trailing?: ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View style={[styles.detailRow, { borderBottomColor: palette.border.subtle }]}>
      <Text style={[styles.detailRowLabel, { color: palette.text.secondary }]}>{label}</Text>
      <View style={styles.detailRowValueWrap}>
        <Text style={[styles.detailRowValue, { color: palette.text.primary }]}>{value}</Text>
        {trailing}
      </View>
    </View>
  );
}

export function KPIBox(props: Parameters<typeof MetricTile>[0]) {
  return <MetricTile {...props} />;
}

export function ProgressRing(props: Parameters<typeof StatusRing>[0]) {
  return <StatusRing {...props} />;
}

export function ProgressBar({
  value,
  tone = "lime",
  label,
}: {
  value: number;
  tone?: PillTone;
  label?: string;
}) {
  const { palette: themePalette } = useTheme();
  const palette = useTonePalette(tone);
  const percent = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.progressBarGroup}>
      {label ? (
        <Text style={[styles.progressBarLabel, { color: themePalette.text.secondary }]}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.progressBarTrack, { backgroundColor: themePalette.bg.sunken }]}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${percent * 100}%`, backgroundColor: palette.color },
          ]}
        />
      </View>
    </View>
  );
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
      <View
        style={[styles.scannerCorner, styles.scannerCornerTopLeft, { borderColor: palette.color }]}
      />
      <View
        style={[styles.scannerCorner, styles.scannerCornerTopRight, { borderColor: palette.color }]}
      />
      <View
        style={[
          styles.scannerCorner,
          styles.scannerCornerBottomLeft,
          { borderColor: palette.color },
        ]}
      />
      <View
        style={[
          styles.scannerCorner,
          styles.scannerCornerBottomRight,
          { borderColor: palette.color },
        ]}
      />
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
      <View
        style={[styles.swipeActionContent, revealed ? styles.swipeActionContentRevealed : null]}
      >
        {children}
      </View>
      {revealed ? <View style={styles.swipeAction}>{action}</View> : null}
    </View>
  );
}

export function StickyActionBar({
  bottomOffset,
  children,
}: {
  bottomOffset?: number;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const computedBottomOffset = useStickyActionOffset();
  const { palette } = useTheme();
  const { visible: bottomNavVisible } = useContext(BottomNavVisibilityContext);

  return (
    <View
      style={StyleSheet.flatten([
        styles.stickyActionBar,
        {
          backgroundColor: palette.bg.app,
          borderTopWidth: 1,
          borderTopColor: palette.border.subtle,
          paddingTop: 14,
          bottom: bottomNavVisible ? (bottomOffset ?? computedBottomOffset) : 0,
          paddingBottom: Math.max(insets.bottom, 14),
        },
      ])}
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
            <Text style={[styles.sectionEyebrow, { color: palette.text.tertiary }]}>
              {eyebrow}
            </Text>
          ) : null}
          <Text style={[styles.collapsibleTitle, { color: palette.text.primary }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.collapsibleSubtitle, { color: palette.text.secondary }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.collapsibleTrailing}>
          {count !== undefined ? (
            <ZookChip tone={open ? "lime" : "neutral"}>{count}</ZookChip>
          ) : null}
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

type DockTab = {
  href: Href;
  label: string;
  accessibilityLabel?: string;
  icon: IconName;
  activeIcon: IconName;
  matchPath: string;
  activeView?: string;
  raised?: boolean;
  hideLabel?: boolean;
};

const navTranslationKeys: Record<string, TranslationKey> = {
  Home: "nav.home",
  Plan: "nav.plans",
  Plans: "nav.plans",
  "Check in": "nav.checkIn",
  "Check-in": "nav.checkIn",
  Scan: "nav.scan",
  Track: "nav.tracking",
  Tracking: "nav.tracking",
  More: "nav.more",
  Shop: "nav.shop",
  Inbox: "nav.inbox",
  AI: "nav.assistant",
  Trainer: "nav.trainer",
  Clients: "nav.clients",
  Drafts: "nav.drafts",
  "Front desk": "nav.desk",
  Members: "nav.members",
  Payments: "nav.payments",
  Orders: "nav.orders",
  Owner: "nav.owner",
  Needs: "nav.needs",
  Approvals: "nav.approvals",
  Revenue: "nav.revenue",
  Stock: "nav.stock",
  Today: "nav.command",
  You: "nav.profile",
};

function translatedNavLabel(label: string, t: ReturnType<typeof useI18n>["t"]) {
  const key = navTranslationKeys[label];
  return key ? t(key) : label;
}

const memberTabs: DockTab[] = [
  { href: "/", label: "Home", icon: "home-outline", activeIcon: "home", matchPath: "/" },
  {
    href: "/tracking" as Href,
    label: "Track",
    icon: "barbell-outline",
    activeIcon: "barbell",
    matchPath: "/tracking",
  },
  {
    href: "/scan",
    label: "Scan",
    accessibilityLabel: "Scan QR",
    icon: "qr-code-outline",
    activeIcon: "qr-code",
    matchPath: "/scan",
    raised: true,
    hideLabel: true,
  },
  {
    href: "/shop" as Href,
    label: "Shop",
    icon: "bag-outline",
    activeIcon: "bag",
    matchPath: "/shop",
  },
  {
    href: "/profile" as Href,
    label: "You",
    icon: "person-outline",
    activeIcon: "person",
    matchPath: "/profile",
  },
];

/** compat Trainer routes own their tab bar in app/trainer/_layout.tsx. */
const trainerTabs: DockTab[] = [
  {
    href: "/trainer",
    label: "Home",
    icon: "home-outline",
    activeIcon: "home",
    matchPath: "/trainer",
  },
  {
    href: "/trainer/clients" as Href,
    label: "Clients",
    icon: "people-outline",
    activeIcon: "people",
    matchPath: "/trainer",
    activeView: "clients",
  },
  {
    href: "/trainer/plans" as Href,
    label: "Plans",
    icon: "reader-outline",
    activeIcon: "reader",
    matchPath: "/trainer",
    activeView: "plans",
  },
  {
    href: "/notifications",
    label: "Inbox",
    icon: "chatbubble-outline",
    activeIcon: "chatbubble",
    matchPath: "/notifications",
  },
  {
    href: "/profile" as Href,
    label: "You",
    icon: "person-outline",
    activeIcon: "person",
    matchPath: "/profile",
  },
];

/** compat Reception owns local tabs in app/reception/_layout.tsx. */
const receptionTabs: DockTab[] = [
  {
    href: "/reception",
    label: "Front desk",
    icon: "desktop-outline",
    activeIcon: "desktop",
    matchPath: "/reception",
  },
  {
    href: "/reception/members" as Href,
    label: "Members",
    icon: "people-outline",
    activeIcon: "people",
    matchPath: "/reception",
    activeView: "members",
  },
  {
    href: "/reception/payments" as Href,
    label: "Payments",
    icon: "card-outline",
    activeIcon: "card",
    matchPath: "/reception",
    activeView: "payments",
  },
  {
    href: "/reception/orders" as Href,
    label: "Orders",
    icon: "cube-outline",
    activeIcon: "cube",
    matchPath: "/reception",
    activeView: "orders",
  },
  {
    href: "/profile" as Href,
    label: "You",
    icon: "person-outline",
    activeIcon: "person",
    matchPath: "/profile",
  },
];

/** compat Owner routes now render their own Expo Router tab layout. Plan #11 removes this. */
const ownerTabs: DockTab[] = [
  {
    href: "/owner",
    label: "Command",
    icon: "pulse-outline",
    activeIcon: "pulse",
    matchPath: "/owner",
  },
  {
    href: "/owner/approvals" as Href,
    label: "Approvals",
    icon: "checkmark-done-outline",
    activeIcon: "checkmark-done",
    matchPath: "/owner",
    activeView: "approvals",
  },
  {
    href: "/owner/revenue" as Href,
    label: "Revenue",
    icon: "trending-up-outline",
    activeIcon: "trending-up",
    matchPath: "/owner",
    activeView: "revenue",
  },
  {
    href: "/owner/stock" as Href,
    label: "Stock",
    icon: "cube-outline",
    activeIcon: "cube",
    matchPath: "/owner",
    activeView: "stock",
  },
];

/** compat Admin shares Owner's Expo Router tab layout. Plan #11 removes this. */
const adminTabs: DockTab[] = [
  {
    href: "/owner",
    label: "Home",
    icon: "pulse-outline",
    activeIcon: "pulse",
    matchPath: "/owner",
  },
  {
    href: "/scan",
    label: "Check in",
    icon: "scan-outline",
    activeIcon: "scan",
    matchPath: "/scan",
  },
  {
    href: "/owner/approvals" as Href,
    label: "Approvals",
    icon: "checkmark-done-outline",
    activeIcon: "checkmark-done",
    matchPath: "/owner",
    activeView: "approvals",
  },
  {
    href: "/owner/stock" as Href,
    label: "Stock",
    icon: "cube-outline",
    activeIcon: "cube",
    matchPath: "/owner",
    activeView: "stock",
  },
];

function getTabsForRole(role?: Role): DockTab[] {
  if (role === "TRAINER") return trainerTabs;
  if (role === "RECEPTIONIST") return receptionTabs;
  if (role === "ADMIN") return adminTabs;
  if (role === "OWNER") return ownerTabs;
  return memberTabs;
}

function AnimatedPulse() {
  const scale = useRealSharedValue(1);
  const opacity = useRealSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.5, { duration: 2000 }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: 2000 }), -1, false);
  }, [scale, opacity]);

  const animatedStyle = useRealAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: 999,
          backgroundColor: "rgba(185,244,85,0.32)",
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}

function DockTabItem({
  tab,
  t,
  active,
  badgeCount,
  isMemberNav,
  slotStyle,
}: {
  tab: DockTab;
  t: (key: any) => string;
  active: boolean;
  badgeCount: number;
  isMemberNav: boolean;
  slotStyle: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  const { palette } = useTheme();
  const raised = isMemberNav && tab.raised;
  const showLabel = !(raised && tab.hideLabel);
  const translatedLabel = translatedNavLabel(tab.label, t);
  const tabTestId = `bottom-nav-${tab.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const scale = useRealSharedValue(1);

  const animatedStyle = useRealAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const navColor = raised
    ? palette.text.onAccent
    : active
      ? palette.accent.base
      : palette.text.tertiary;
  const activeBg = palette.surface.accentSoft;
  const activeBorder = palette.border.focus;

  const memberPressProps = isMemberNav
    ? {
        onPress: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.replace(tab.href as never);
        },
      }
    : {};

  const item = (
    <AnimatedPressable
      {...memberPressProps}
      onPressIn={() => {
        if (!isMemberNav) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        scale.value = withRealSpring(0.9, { mass: 0.5, damping: 12 });
      }}
      onPressOut={() => {
        scale.value = withRealSpring(1, { mass: 0.5, damping: 12 });
      }}
      accessibilityRole="tab"
      accessibilityLabel={
        tab.accessibilityLabel ? translatedNavLabel(tab.accessibilityLabel, t) : translatedLabel
      }
      accessibilityState={{ selected: active }}
      testID={tabTestId}
      style={[
        styles.bottomNavItem,
        isMemberNav ? styles.memberBottomNavItem : null,
        raised ? styles.memberBottomNavItemRaised : null,
        active ? styles.bottomNavItemActive : null,
        active && isMemberNav ? styles.memberBottomNavItemActive : null,
        active && raised ? styles.memberBottomNavItemRaisedActive : null,
        active && !raised ? { backgroundColor: activeBg, borderColor: activeBorder } : null,
        raised
          ? {
              backgroundColor: palette.accent.fill,
              borderColor: palette.bg.app,
              shadowColor: palette.accent.base,
            }
          : null,
        animatedStyle,
      ]}
    >
      <View style={[styles.navIconShell, raised ? styles.navIconShellRaised : null]}>
        {raised ? <AnimatedPulse /> : null}
        <Ionicons
          name={active ? tab.activeIcon : tab.icon}
          size={raised ? 31 : 21}
          color={navColor}
        />
        {badgeCount > 0 ? (
          <View
            style={[
              styles.navBadge,
              { backgroundColor: palette.feedback.danger, borderColor: palette.bg.app },
            ]}
          >
            <Text style={[styles.navBadgeText, { color: palette.text.onDanger }]}>
              {badgeCount > 9 ? "9+" : badgeCount}
            </Text>
          </View>
        ) : null}
      </View>
      {showLabel ? (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={[
            styles.bottomNavText,
            isMemberNav ? styles.memberBottomNavText : null,
            raised ? styles.memberBottomNavTextRaised : null,
            active ? styles.bottomNavTextActive : null,
            active && raised ? styles.memberBottomNavTextRaisedActive : null,
            { color: navColor },
          ]}
        >
          {translatedLabel}
        </Text>
      ) : null}
    </AnimatedPressable>
  );

  if (isMemberNav) {
    return <View style={[styles.memberBottomNavSlot, slotStyle]}>{item}</View>;
  }

  return (
    <View style={[styles.bottomNavSlot, slotStyle]}>
      <Link href={tab.href} asChild>
        {item}
      </Link>
    </View>
  );
}

export function BottomNav({
  tabs,
  selectedPath,
  role,
  activeView,
  activeTab,
}: {
  tabs?: DockTab[];
  selectedPath?: string;
  role?: Role;
  activeView?: string;
  activeTab?: string;
}) {
  const { visible, setVisible } = useContext(BottomNavVisibilityContext);
  const { t } = useI18n();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ view?: string }>();
  const roleContext = useRoleContext();
  const resolvedRole = role ?? roleContext?.role;
  const notificationsQuery = useMyNotifications();
  const pendingAttendanceQuery = useOrgAttendancePending(undefined, {
    enabled: resolvedRole === "RECEPTIONIST",
  });
  const unreadCount =
    notificationsQuery.data?.notifications?.filter((notification) => !notification.readAt)
      ?.length ?? 0;
  const receptionPendingCount =
    pendingAttendanceQuery.data?.records.filter((attempt) => attempt.status === "PENDING_APPROVAL")
      .length ?? 0;
  const resolvedTabs = tabs ?? getTabsForRole(resolvedRole);
  const isMemberNav = !tabs && (!resolvedRole || resolvedRole === "MEMBER");
  const activePath = selectedPath ?? pathname;
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12);
  const { palette, mode } = useTheme();

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => setVisible(false));
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => setVisible(true));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [setVisible]);

  if (pathname.startsWith("/reception")) {
    return null;
  }

  if (pathname.startsWith("/owner")) {
    return null;
  }

  if (pathname.startsWith("/trainer")) {
    return null;
  }

  if (!visible) {
    return null;
  }

  const slotWidth = `${100 / Math.max(resolvedTabs.length, 1)}%` as const;
  const navItems = resolvedTabs.map((tab) => {
    const currentView =
      activeTab ?? activeView ?? (Array.isArray(params.view) ? params.view[0] : params.view);
    const clientDetailMatches =
      tab.label === "Clients" &&
      (activePath.startsWith("/trainer/client") || activePath.startsWith("/trainer/clients"));
    const roleRootPath =
      tab.matchPath === "/trainer" || tab.matchPath === "/reception" || tab.matchPath === "/owner";
    const viewMatches =
      clientDetailMatches || (tab.activeView ? currentView === tab.activeView : !currentView);
    const pathMatches =
      activePath === tab.matchPath ||
      (tab.matchPath !== "/" && !roleRootPath && activePath.startsWith(tab.matchPath)) ||
      clientDetailMatches;
    const active = pathMatches && viewMatches;
    const badgeCount =
      unreadCount > 0 && tab.label === "Inbox"
        ? unreadCount
        : receptionPendingCount > 0 && resolvedRole === "RECEPTIONIST" && tab.label === "Front desk"
          ? receptionPendingCount
          : 0;

    return (
      <DockTabItem
        key={`${String(tab.href)}-${tab.label}`}
        tab={tab}
        t={t}
        active={active}
        badgeCount={badgeCount}
        isMemberNav={isMemberNav}
        slotStyle={{ flexBasis: slotWidth, width: slotWidth }}
      />
    );
  });

  const safeAreaMaskHeight = Math.max(insets.bottom, 12);

  if (isMemberNav) {
    return (
      <>
        <View
          pointerEvents="none"
          style={[
            styles.bottomNavSafeAreaMask,
            { height: safeAreaMaskHeight, backgroundColor: palette.bg.app },
          ]}
        />
        <View style={[styles.memberBottomNavShell, { bottom }]}>
          <BlurView
            intensity={mode === "dark" ? 24 : 18}
            tint={mode === "dark" ? "dark" : "light"}
            style={[
              styles.memberBottomNavBlur,
              {
                borderColor: palette.border.subtle,
                backgroundColor: mode === "dark" ? palette.bg.elevated : palette.surface.raised,
              },
              platformSurfaceShadow(mode, true, palette.bg.sunken),
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.memberBottomNavLowerShield,
              {
                backgroundColor:
                  mode === "dark" ? palette.bg.app : palette.surface.raised,
                opacity: mode === "dark" ? 0.38 : 0.42,
              },
            ]}
          />
          <View style={styles.memberBottomNavItems}>{navItems}</View>
        </View>
      </>
    );
  }

  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.bottomNavSafeAreaMask,
          { height: safeAreaMaskHeight, backgroundColor: palette.bg.app },
        ]}
      />
      <BlurView
        intensity={mode === "dark" ? 24 : 18}
        tint={mode === "dark" ? "dark" : "light"}
        style={StyleSheet.flatten([
          styles.bottomNav,
          {
            bottom,
            borderColor: palette.border.subtle,
            backgroundColor: mode === "dark" ? palette.bg.elevated : palette.surface.raised,
          },
          platformSurfaceShadow(mode, true, palette.bg.sunken),
        ])}
      >
        {navItems}
      </BlurView>
    </>
  );
}

export function LoadingState({ title, body }: { title?: string; body?: string }) {
  const { t } = useI18n();
  const { palette } = useTheme();
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={palette.accent.base} />
      <Text style={[styles.stateTitle, { color: palette.text.primary }]}>
        {title ?? t("empty.loading")}
      </Text>
      <Text style={[styles.stateBody, { color: palette.text.secondary }]}>
        {body ?? t("empty.loadingBody")}
      </Text>
    </View>
  );
}

export function BranchSelectorChip() {
  const { branches, selectedBranch, selectBranch } = useBranchSelection();
  const { t } = useI18n();
  const { palette } = useTheme();

  if (!selectedBranch) {
    return null;
  }

  const branchIndex = Math.max(
    0,
    branches.findIndex((branch) => branch.id === selectedBranch.id),
  );
  const canSwitch = branches.length > 1;

  return (
    <Pressable
      onPress={() => {
        if (!canSwitch) {
          return;
        }
        const nextBranch = branches[(branchIndex + 1) % branches.length];
        if (nextBranch) {
          void Haptics.selectionAsync();
          void selectBranch(nextBranch.id);
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={canSwitch ? t("branch.switch") : t("branch.current")}
      disabled={!canSwitch}
      style={[
        styles.branchSelectorChip,
        {
          borderColor: canSwitch ? palette.accent.base : palette.border.subtle,
          backgroundColor: canSwitch ? palette.surface.accentSoft : palette.surface.default,
        },
      ]}
    >
      <Ionicons name="business-outline" size={14} color={palette.accent.base} />
      <Text numberOfLines={1} style={[styles.branchSelectorText, { color: palette.text.primary }]}>
        {selectedBranch.name}
      </Text>
      {canSwitch ? (
        <View style={[styles.branchSelectorCount, { backgroundColor: palette.bg.app }]}>
          <Text style={[styles.branchSelectorCountText, { color: palette.accent.base }]}>
            {branchIndex + 1}/{branches.length}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.emptyState,
        { borderColor: palette.border.subtle, backgroundColor: palette.surface.default },
      ]}
    >
      {icon ? <IconBubble icon={icon} tone="neutral" size={42} /> : null}
      <Text style={[styles.stateTitle, { color: palette.text.primary }]}>{title}</Text>
      <Text style={[styles.stateBody, { color: palette.text.secondary }]}>{body}</Text>
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({
  title = "Something needs attention",
  body,
  action,
}: {
  title?: string;
  body: string;
  action?: ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.emptyState,
        styles.errorState,
        { borderColor: palette.feedback.danger, backgroundColor: palette.surface.dangerSoft },
      ]}
    >
      <IconBubble icon="alert-circle-outline" tone="red" />
      <Text style={[styles.stateTitle, { color: palette.text.primary }]}>{title}</Text>
      <Text style={[styles.stateBody, { color: palette.text.secondary }]}>{body}</Text>
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
  );
}

export function QueryErrorState({
  error,
  onRetry,
  title = "Could not load this section",
  retryLabel = "Retry",
}: {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  retryLabel?: string;
}) {
  const message =
    error instanceof Error && error.message.trim()
      ? error.message
      : "Pull to refresh or try again in a moment.";
  return (
    <ErrorState
      title={title}
      body={message}
      action={
        onRetry ? (
          <ZookButton variant="secondary" icon="refresh-outline" onPress={onRetry}>
            {retryLabel}
          </ZookButton>
        ) : undefined
      }
    />
  );
}

export function Skeleton({
  style,
  width,
  height,
  borderRadius = 8,
}: {
  style?: StyleProp<ViewStyle>;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
}) {
  const progress = useSharedValue(0);
  const { palette } = useTheme();

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [progress]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-120, 360]) },
      { rotate: "18deg" },
    ],
  }));

  return (
    <View
      style={[
        {
          width: width as ViewStyle["width"],
          height: height as ViewStyle["height"],
          borderRadius,
          backgroundColor: palette.surface.default,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Reanimated.View
        style={[
          styles.skeletonShimmer,
          shimmerStyle,
        ]}
      />
    </View>
  );
}

export function LoadingSkeleton(props: Parameters<typeof Skeleton>[0]) {
  return <Skeleton {...props} />;
}

export { DatePickerField } from "@/components/primitives/date-picker-field";
export { OtpInput } from "@/components/primitives/otp-input";
export type { OtpInputHandle } from "@/components/primitives/otp-input";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: fallbackColors.bg,
  },
  skeletonShimmer: {
    position: "absolute",
    top: -24,
    bottom: -24,
    width: 96,
    backgroundColor: "rgba(255,255,255,0.16)",
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
  shellTitle: {
    color: fallbackColors.text,
    ...typography.screenTitle,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
  },
  screenShellContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.lg,
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
  profileShortcut: {
    borderWidth: 1,
    borderColor: fallbackColors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.12)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileShortcutImage: {
    width: "100%",
    height: "100%",
  },
  profileShortcutText: {
    color: fallbackColors.lime,
    ...typography.button,
  },
  glassCard: {
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: fallbackColors.panel,
  },
  glassCardGlow: {
    borderColor: fallbackColors.limeBorder,
    ...shadows.glowLimeSoft,
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
  glassPanel: {
    backgroundColor: fallbackColors.panel,
    borderColor: fallbackColors.border,
    borderWidth: 1,
    borderRadius: radii.panel,
    padding: spacing.lg,
    overflow: "hidden",
  },
  glassPanelStrong: {
    backgroundColor: fallbackColors.panelStrong,
    borderColor: fallbackColors.borderStrong,
  },
  chip: {
    alignSelf: "flex-start",
    minHeight: 26,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chipPressable: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  chipText: {
    ...typography.caption,
  },
  capitalize: {
    textTransform: "capitalize",
  },
  mobileHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  mobileHeaderCentered: {
    justifyContent: "center",
  },
  mobileHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  headerContextSlot: {
    alignSelf: "flex-start",
  },
  centeredCopy: {
    alignItems: "center",
  },
  headerSide: {
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerEyebrow: {
    color: fallbackColors.muted,
    ...typography.eyebrow,
  },
  headerTitle: {
    color: fallbackColors.text,
    ...typography.headerTitle,
    letterSpacing: 0,
  },
  headerSubtitle: {
    color: fallbackColors.muted,
    ...typography.body,
  },
  centerText: {
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: 2,
  },
  sectionGroup: {
    gap: 4,
  },
  sectionEyebrow: {
    color: fallbackColors.muted,
    ...typography.eyebrow,
  },
  sectionTitle: {
    flex: 1,
    color: fallbackColors.text,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0,
    lineHeight: 18,
  },
  sectionSubtitle: {
    color: fallbackColors.muted,
    ...typography.small,
  },
  iconBubble: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
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
    opacity: 0.5,
  },
  chipGroup: {
    gap: spacing.sm,
  },
  chipGroupOption: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  chipGroupOptionSelected: {
    shadowColor: fallbackColors.lime,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  chipGroupOptionDisabled: {
    opacity: 0.55,
  },
  chipGroupCopy: {
    flex: 1,
    gap: 2,
  },
  chipGroupLabel: {
    color: fallbackColors.text,
    ...typography.bodyStrong,
  },
  chipGroupDescription: {
    color: fallbackColors.muted,
    ...typography.caption,
  },
  metricTile: {
    flex: 1,
    minHeight: 96,
    borderRadius: radii.smallCard,
    borderWidth: 1,
    padding: spacing.lg,
    gap: 7,
  },
  metricTileLabel: {
    ...typography.caption,
  },
  metricTileValue: {
    ...typography.metric,
  },
  metricTileDetail: {
    ...typography.caption,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  infoLabel: {
    color: fallbackColors.muted,
    ...typography.caption,
    flex: 1,
  },
  statusRing: {
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statusRingArc: {
    position: "absolute",
    borderWidth: 8,
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
    backgroundColor: "transparent",
  },
  statusRingCenter: {
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  statusRingValue: {
    ...typography.h3,
  },
  statusRingLabel: {
    ...typography.caption,
  },
  entryCodeCard: {
  },
  entryCodeContent: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  entryCodeLabel: {
    ...typography.small,
  },
  entryCodeValue: {
    ...typography.display,
    fontVariant: ["tabular-nums"],
  },
  entryCodeDetail: {
    ...typography.small,
    textAlign: "center",
  },
  listRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.medium,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  listRowPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  listRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  listRowTrailing: {
    flexShrink: 0,
  },
  listRowTitle: {
    ...typography.bodyStrong,
  },
  listRowSubtitle: {
    ...typography.small,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  inputLabel: {
    ...typography.caption,
  },
  inputWrapper: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 13,
  },
  input: {
    flex: 1,
    minHeight: 44,
    ...typography.body,
    paddingVertical: 11,
  },
  inputWrapperDisabled: {
    opacity: 0.55,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  inputHint: {
    ...typography.caption,
  },
  inputError: {
    ...typography.caption,
  },
  productCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: radii.medium,
  },
  productContent: {
    padding: 8,
    gap: 8,
  },
  productContentCompact: {
    gap: 7,
  },
  productVisual: {
    height: 122,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productVisualCompact: {
    height: 86,
    borderRadius: 14,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productVisualGlow: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 43,
    opacity: 0.82,
  },
  productBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    minHeight: 24,
    maxWidth: "82%",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  productBadgeText: {
    ...typography.caption,
  },
  productInfo: {
    minHeight: 48,
    gap: 3,
  },
  productName: {
    color: fallbackColors.text,
    ...typography.bodyStrong,
  },
  productMeta: {
    color: fallbackColors.muted,
    ...typography.small,
  },
  productFooter: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  productPrice: {
    flexShrink: 1,
    color: fallbackColors.text,
    ...typography.cardTitle,
  },
  productAdd: {
    width: 86,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  productAddCompact: {
    width: 86,
    height: 44,
  },
  productAddText: {
    color: fallbackColors.lime,
    ...typography.caption,
  },
  productStepper: {
    width: 108,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  productStepperButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  productQuantity: {
    minWidth: 20,
    color: fallbackColors.text,
    ...typography.caption,
    textAlign: "center",
  },
  exerciseRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.large,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exerciseCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseCheckDone: {
  },
  exerciseCopy: {
    flex: 1,
    gap: 2,
  },
  exerciseTitle: {
    color: fallbackColors.text,
    ...typography.bodyStrong,
  },
  exerciseDetail: {
    color: fallbackColors.muted,
    ...typography.small,
  },
  segmentedControl: {
    minHeight: 50,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    padding: 4,
    gap: 4,
  },
  segmentedOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  segmentedOptionPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  segmentedOptionSelected: {
    backgroundColor: fallbackColors.accentPanel,
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.34)",
  },
  segmentedOptionText: {
    color: fallbackColors.muted,
    ...typography.caption,
    textAlign: "center",
  },
  segmentedOptionTextSelected: {
    color: fallbackColors.lime,
  },
  auditWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.large,
    borderWidth: 1,
    padding: spacing.md,
  },
  auditWarningText: {
    flex: 1,
    ...typography.body,
  },
  offlineBanner: {
    minHeight: 38,
    borderRadius: radii.input,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  offlineBannerText: {
    ...typography.caption,
    flex: 1,
  },
  detailRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
  },
  detailRowLabel: {
    ...typography.small,
    flex: 1,
  },
  detailRowValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    flex: 1.2,
  },
  detailRowValue: {
    ...typography.bodyStrong,
    textAlign: "right",
  },
  progressBarGroup: {
    gap: spacing.sm,
  },
  progressBarLabel: {
    ...typography.caption,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
  },
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
  scannerLine: {
    position: "absolute",
    left: 32,
    right: 32,
    top: "50%",
    height: 2,
    opacity: 0.3,
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
  bottomNav: {
    position: "absolute",
    zIndex: 50,
    left: layout.screenPadding,
    right: layout.screenPadding,
    height: layout.bottomNavHeight,
    borderRadius: radii.bottomNav,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingVertical: 6,
    gap: 0,
  },
  bottomNavSafeAreaMask: {
    position: "absolute",
    zIndex: 49,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: fallbackColors.bg,
  },
  memberBottomNavShell: {
    position: "absolute",
    zIndex: 50,
    left: layout.bottomNavHorizontalMargin,
    right: layout.bottomNavHorizontalMargin,
    height: 92,
    overflow: "visible",
    borderRadius: radii.bottomNav,
  },
  memberBottomNavBlur: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    borderRadius: radii.bottomNav,
    borderWidth: 1,
    overflow: "hidden",
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  memberBottomNavLowerShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 34,
    borderBottomLeftRadius: radii.bottomNav,
    borderBottomRightRadius: radii.bottomNav,
    backgroundColor: "rgba(0,0,0,0.46)",
  },
  memberBottomNavItems: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingVertical: 8,
    gap: 0,
    overflow: "visible",
  },
  bottomNavItem: {
    minWidth: 0,
    width: "100%",
    maxWidth: 62,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  bottomNavSlot: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  memberBottomNavItem: {
    width: "100%",
    maxWidth: 68,
    minWidth: 0,
    height: 56,
    borderRadius: 20,
  },
  memberBottomNavSlot: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  memberBottomNavItemRaised: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 78,
    width: 78,
    maxWidth: 78,
    height: 78,
    aspectRatio: 1,
    marginTop: -28,
    borderRadius: 999,
    borderWidth: 3,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    zIndex: 3,
  },
  bottomNavItemActive: {
    borderWidth: 1,
  },
  memberBottomNavItemActive: {
  },
  memberBottomNavItemRaisedActive: {
    borderWidth: 3,
  },
  bottomNavText: {
    maxWidth: "100%",
    textAlign: "center",
    color: fallbackColors.subtle,
    ...typography.navLabel,
  },
  navIconShell: {
    width: 28,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconShellRaised: {
    width: 42,
    height: 42,
    borderRadius: 999,
  },
  memberBottomNavText: {
    fontSize: 12,
    lineHeight: 15,
  },
  memberBottomNavTextRaised: {
    color: fallbackColors.bg,
  },
  bottomNavTextActive: {
    color: fallbackColors.lime,
  },
  memberBottomNavTextRaisedActive: {
    color: fallbackColors.bg,
  },
  navBadge: {
    position: "absolute",
    top: -8,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: fallbackColors.red,
    borderWidth: 1,
    borderColor: fallbackColors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  navBadgeText: {
    color: fallbackColors.text,
    fontSize: 9,
    lineHeight: 11,
    fontFamily: "Inter_800ExtraBold",
    fontVariant: ["tabular-nums"],
  },
  branchSelectorChip: {
    minHeight: 32,
    maxWidth: "100%",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  branchSelectorChipInteractive: {
    borderColor: "rgba(185,244,85,0.3)",
    backgroundColor: "rgba(185,244,85,0.1)",
  },
  branchSelectorText: {
    color: fallbackColors.text,
    maxWidth: 170,
    ...typography.caption,
  },
  branchSelectorCount: {
    minWidth: 30,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  branchSelectorCountText: {
    color: fallbackColors.lime,
    fontSize: 10,
    lineHeight: 12,
    fontFamily: "Inter_800ExtraBold",
    fontVariant: ["tabular-nums"],
  },
  loadingState: {
    padding: spacing.xxxl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  stateTitle: {
    color: fallbackColors.text,
    ...typography.title,
    textAlign: "center",
  },
  stateBody: {
    color: fallbackColors.muted,
    ...typography.body,
    marginTop: 4,
    textAlign: "center",
  },
  stateAction: {
    marginTop: spacing.md,
  },
  emptyState: {
    padding: spacing.xxxl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: fallbackColors.border,
    borderStyle: "dashed",
    borderRadius: radii.card,
    gap: spacing.sm,
  },
  errorState: {
    borderColor: "rgba(255,90,61,0.28)",
    backgroundColor: "rgba(255,90,61,0.08)",
  },
  alertCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  alertCardCopy: {
    flex: 1,
    gap: 3,
  },
  alertCardTitle: {
    color: fallbackColors.text,
    ...typography.bodyStrong,
  },
  alertCardMessage: {
    color: fallbackColors.muted,
    ...typography.small,
  },
  actionButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});

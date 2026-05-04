import { Link, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Role } from "@zook/core";
import { useAuth } from "@/lib/auth";
import { useMyNotifications } from "@/lib/query-hooks";
import { colors, layout, palettes, radii, shadows, spacing, typography } from "@/lib/theme";

export type PillTone = "neutral" | "lime" | "amber" | "red" | "blue" | "violet";
export type ButtonTone = "lime" | "secondary" | "ghost" | "danger";
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type GlassCardVariant = "default" | "compact" | "selected" | "success" | "warning" | "danger";
type BrandMarkSize = "sm" | "md" | "lg";
type IconName = keyof typeof Ionicons.glyphMap;

// Metro resolves static image requires at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const zookMarkSource = require("../../assets/icons/ic_launcher_foreground.png");

const brandMarkSizes: Record<BrandMarkSize, number> = {
  sm: 32,
  md: 44,
  lg: 56,
};

const tonePalettes: Record<
  PillTone,
  { borderColor: string; color: string; backgroundColor: string; glowColor: string }
> = {
  neutral: {
    borderColor: "rgba(255,255,255,0.14)",
    color: colors.muted,
    backgroundColor: "rgba(255,255,255,0.06)",
    glowColor: "rgba(255,255,255,0.1)",
  },
  lime: {
    borderColor: "rgba(185,244,85,0.42)",
    color: colors.lime,
    backgroundColor: "rgba(185,244,85,0.14)",
    glowColor: "rgba(185,244,85,0.26)",
  },
  amber: {
    borderColor: "rgba(242,201,76,0.4)",
    color: colors.amber,
    backgroundColor: "rgba(242,201,76,0.13)",
    glowColor: "rgba(242,201,76,0.22)",
  },
  red: {
    borderColor: "rgba(255,90,61,0.4)",
    color: colors.red,
    backgroundColor: "rgba(255,90,61,0.13)",
    glowColor: "rgba(255,90,61,0.22)",
  },
  blue: {
    borderColor: "rgba(125,211,252,0.35)",
    color: colors.blue,
    backgroundColor: "rgba(125,211,252,0.11)",
    glowColor: "rgba(125,211,252,0.18)",
  },
  violet: {
    borderColor: "rgba(185,169,255,0.35)",
    color: colors.violet,
    backgroundColor: "rgba(185,169,255,0.11)",
    glowColor: "rgba(185,169,255,0.18)",
  },
};

const buttonPalettes: Record<
  ButtonVariant,
  { backgroundColor: string; borderColor: string; color: string; glow?: ViewStyle }
> = {
  primary: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
    color: colors.bg,
    glow: shadows.glowLime,
  },
  secondary: {
    backgroundColor: "rgba(255,255,255,0.045)",
    borderColor: "rgba(255,255,255,0.12)",
    color: colors.text,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.1)",
    color: colors.text,
  },
  danger: {
    backgroundColor: "rgba(255,90,61,0.1)",
    borderColor: "rgba(255,90,61,0.28)",
    color: colors.text,
  },
};

const glassCardVariants: Record<
  GlassCardVariant,
  { backgroundColor: string; borderColor: string; shadow?: ViewStyle }
> = {
  default: {
    backgroundColor: colors.glassFill,
    borderColor: colors.glassStroke,
    shadow: shadows.glass,
  },
  compact: {
    backgroundColor: colors.glassFill,
    borderColor: colors.divider,
    shadow: shadows.card,
  },
  selected: {
    backgroundColor: palettes.lime.fillSoft,
    borderColor: palettes.lime.stroke,
    shadow: shadows.glowLimeSoft,
  },
  success: {
    backgroundColor: palettes.lime.fillSoft,
    borderColor: palettes.lime.stroke,
    shadow: shadows.glowLimeSoft,
  },
  warning: {
    backgroundColor: palettes.warning.fill,
    borderColor: palettes.warning.stroke,
  },
  danger: {
    backgroundColor: palettes.danger.fill,
    borderColor: palettes.danger.stroke,
  },
};

const metricPalettes = {
  neutral: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: colors.border,
    valueColor: colors.text,
  },
  lime: {
    backgroundColor: "rgba(185,244,85,0.1)",
    borderColor: "rgba(185,244,85,0.26)",
    valueColor: colors.lime,
  },
  amber: {
    backgroundColor: "rgba(242,201,76,0.1)",
    borderColor: "rgba(242,201,76,0.24)",
    valueColor: colors.amber,
  },
  blue: {
    backgroundColor: "rgba(125,211,252,0.1)",
    borderColor: "rgba(125,211,252,0.2)",
    valueColor: colors.blue,
  },
  violet: {
    backgroundColor: "rgba(185,169,255,0.1)",
    borderColor: "rgba(185,169,255,0.2)",
    valueColor: colors.violet,
  },
  red: {
    backgroundColor: "rgba(255,90,61,0.1)",
    borderColor: "rgba(255,90,61,0.22)",
    valueColor: colors.red,
  },
} satisfies Record<PillTone, { backgroundColor: string; borderColor: string; valueColor: string }>;

function variantFromTone(tone: ButtonTone): ButtonVariant {
  if (tone === "lime") return "primary";
  return tone;
}

type PressHandler = () => void | Promise<void>;

function pressWithHaptics(callback?: PressHandler) {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const result = callback?.();
  if (result && typeof (result as Promise<void>).catch === "function") {
    void (result as Promise<void>).catch((error) => {
      console.error("Zook press action failed", error);
    });
  }
}

function initialsForName(name?: string | null) {
  const cleanName = name?.trim();
  if (!cleanName) return "AM";
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
}: {
  children: ReactNode;
  bottomInset?: boolean;
  style?: StyleProp<ViewStyle>;
  ambient?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
          paddingBottom: bottomInset ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {ambient ? <View pointerEvents="none" style={styles.ambientGlow} /> : null}
      {children}
    </View>
  );
}

export function Screen({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <ZookScreen>
      {title ? <Text style={styles.legacyTitle}>{title}</Text> : null}
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
  const contentPaddingBottom =
    (bottomNav ? layout.bottomNavContentPadding : 24) +
    (stickyAction ? layout.stickyActionHeight : 0);
  return (
    <ZookScreen ambient={ambient} style={style}>
      {title ? <Text style={styles.legacyTitle}>{title}</Text> : null}
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
  framed = false,
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
  accessibilityLabel = "Open account settings",
}: {
  size?: number;
  accessibilityLabel?: string;
}) {
  const { session, status } = useAuth();
  const router = useRouter();

  if (status !== "authenticated") return null;

  const name = session?.user.name ?? "Aarav Mehta";
  const initials = initialsForName(name);
  const photoUrl = session?.user.profilePhotoUrl?.trim();
  const remotePhotoUrl = photoUrl && /^https?:\/\//.test(photoUrl) ? photoUrl : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => pressWithHaptics(() => router.push("/settings"))}
      style={({ pressed }) => [
        styles.profileShortcut,
        { width: size, height: size, borderRadius: size / 2 },
        pressed ? styles.pressed : null,
      ]}
    >
      {remotePhotoUrl ? (
        <Image
          source={{ uri: remotePhotoUrl }}
          style={styles.profileShortcutImage}
          contentFit="cover"
        />
      ) : (
        <Text style={styles.profileShortcutText}>{initials}</Text>
      )}
    </Pressable>
  );
}

export function GlassCard({
  children,
  style,
  contentStyle,
  glow = false,
  variant = "default",
  padding,
  radius,
  pressable = false,
  disabled = false,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  glow?: boolean;
  variant?: GlassCardVariant;
  padding?: number;
  radius?: number;
  pressable?: boolean;
  disabled?: boolean;
  onPress?: PressHandler;
}) {
  const palette = glassCardVariants[variant];
  const cardStyle = [
    styles.glassCard,
    palette.shadow,
    {
      backgroundColor: palette.backgroundColor,
      borderColor: palette.borderColor,
      borderRadius: radius ?? (variant === "compact" ? radii.smallCard : radii.mainCard),
    },
    glow ? styles.glassCardGlow : null,
    disabled ? styles.disabled : null,
    style,
  ];
  const inner = (
    <>
      <BlurView intensity={14} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={[styles.glassContent, padding !== undefined ? { padding } : null, contentStyle]}>
        {children}
      </View>
    </>
  );

  if (pressable || onPress) {
    return (
      <Pressable
        disabled={disabled}
        onPress={() => pressWithHaptics(onPress)}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={({ pressed }) => [cardStyle, pressed && !disabled ? styles.pressed : null]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{inner}</View>;
}

export function Card(props: Parameters<typeof GlassCard>[0]) {
  return <GlassCard {...props} />;
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
  return (
    <View style={[styles.glassPanel, strong ? styles.glassPanelStrong : null, style]}>
      {children}
    </View>
  );
}

export function ZookChip({
  children,
  tone = "neutral",
  icon,
  style,
  textStyle,
}: {
  children: ReactNode;
  tone?: PillTone;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const palette = tonePalettes[tone];
  return (
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
      <Text style={[styles.chipText, { color: palette.color }, textStyle]}>{children}</Text>
    </View>
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
  centered?: boolean;
  showProfileShortcut?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const resolvedLeading =
    leading ?? (!centered && showProfileShortcut ? <ProfileShortcut /> : null);

  return (
    <View style={[styles.mobileHeader, centered ? styles.mobileHeaderCentered : null, style]}>
      {resolvedLeading ? <View style={styles.headerSide}>{resolvedLeading}</View> : null}
      <View style={[styles.mobileHeaderCopy, centered ? styles.centeredCopy : null]}>
        {chip}
        {eyebrow ? <Text style={styles.headerEyebrow}>{eyebrow}</Text> : null}
        <Text style={[styles.headerTitle, centered ? styles.centerText : null]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, centered ? styles.centerText : null]}>
            {subtitle}
          </Text>
        ) : null}
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
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
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
  const palette = tonePalettes[tone];
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
  tone = "lime",
  variant,
  disabled = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: PressHandler;
  href?: Href;
  tone?: ButtonTone;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}) {
  const resolvedVariant = variant ?? variantFromTone(tone);
  const palette = buttonPalettes[resolvedVariant];
  const staticButtonStyle = StyleSheet.flatten([
    styles.button,
    palette.glow,
    {
      backgroundColor: palette.backgroundColor,
      borderColor: palette.borderColor,
    },
    disabled ? styles.disabled : null,
    style,
  ]);

  if (href && !disabled) {
    return (
      <Link href={href} asChild>
        <Pressable
          onPressIn={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          accessibilityRole="link"
          accessibilityLabel={
            accessibilityLabel ?? (typeof children === "string" ? children : undefined)
          }
          accessibilityState={{ disabled }}
          style={staticButtonStyle}
        >
          {icon ? <Ionicons name={icon} size={17} color={palette.color} /> : null}
          <Text style={[styles.buttonText, { color: palette.color }, textStyle]}>{children}</Text>
        </Pressable>
      </Link>
    );
  }

  const button = (
    <Pressable
      onPress={() => {
        if (!disabled) pressWithHaptics(onPress);
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? (typeof children === "string" ? children : undefined)
      }
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        palette.glow,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={17} color={palette.color} /> : null}
      <Text style={[styles.buttonText, { color: palette.color }, textStyle]}>{children}</Text>
    </Pressable>
  );

  return button;
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
  const palette = metricPalettes[tone];

  return (
    <View style={[styles.metricTile, palette, style]}>
      {icon ? <IconBubble icon={icon} tone={tone} size={34} /> : null}
      <Text style={styles.metricTileLabel}>{label}</Text>
      <Text style={[styles.metricTileValue, { color: palette.valueColor }]}>{value}</Text>
      {detail ? <Text style={styles.metricTileDetail}>{detail}</Text> : null}
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
  const palette = tonePalettes[tone];
  const activeRotation = progress >= 0.7 ? "34deg" : progress >= 0.45 ? "-24deg" : "-72deg";
  return (
    <View
      style={[
        styles.statusRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: "rgba(255,255,255,0.1)",
        },
        tone !== "neutral" ? { shadowColor: palette.color } : null,
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
        {label ? <Text style={styles.statusRingLabel}>{label}</Text> : null}
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
  const palette = tonePalettes[tone];
  return (
    <GlassCard
      glow={tone === "lime"}
      style={[styles.entryCodeCard, { borderColor: palette.borderColor }]}
      contentStyle={styles.entryCodeContent}
    >
      <Text style={styles.entryCodeLabel}>Entry Code</Text>
      <Text style={[styles.entryCodeValue, { color: palette.color }]}>{code}</Text>
      {status ? <ZookChip tone={tone}>{status}</ZookChip> : null}
      {detail ? <Text style={styles.entryCodeDetail}>{detail}</Text> : null}
    </GlassCard>
  );
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  icon,
  tone = "neutral",
  style,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  icon?: IconName;
  tone?: PillTone;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.listRow, style]}>
      {leading ?? (icon ? <IconBubble icon={icon} tone={tone} size={40} /> : null)}
      <View style={styles.listRowCopy}>
        <Text style={styles.listRowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.listRowSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ?? <Ionicons name="chevron-forward" size={16} color={colors.subtle} />}
    </View>
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
  const disabled = props.editable === false;
  const labelSuffix = required ? " *" : optional ? " optional" : "";
  return (
    <View style={[styles.inputGroup, style]}>
      {label ? (
        <Text style={styles.inputLabel}>
          {label}
          {labelSuffix}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputWrapper,
          focused ? styles.inputWrapperFocused : null,
          error ? styles.inputWrapperError : null,
          readonly ? styles.inputWrapperReadonly : null,
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
          placeholderTextColor={colors.subtle}
          style={[styles.input, props.multiline ? styles.inputMultiline : null, inputStyle]}
        />
        {trailing}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.inputError}>
          {error}
        </Text>
      ) : null}
      {!error && hint ? <Text style={styles.inputHint}>{hint}</Text> : null}
    </View>
  );
}

export function GlassInput(props: Parameters<typeof TextField>[0]) {
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
  trailing = <Ionicons name="options-outline" size={17} color={colors.muted} />,
}: {
  placeholder?: string;
  value?: string;
  onChangeText?: (value: string) => void;
  style?: StyleProp<ViewStyle>;
  trailing?: ReactNode;
}) {
  return (
    <TextField
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      autoCapitalize="none"
      autoCorrect={false}
      leading={<Ionicons name="search-outline" size={18} color={colors.subtle} />}
      trailing={trailing}
      style={style}
    />
  );
}

export function SearchField({
  label,
  ...props
}: Omit<Parameters<typeof TextField>[0], "leading"> & { label?: string }) {
  return (
    <TextField
      label={label ?? "Search"}
      leading={<Ionicons name="search-outline" size={18} color={colors.subtle} />}
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
  onPress,
  onIncrement,
  onDecrement,
  style,
}: {
  name: string;
  price: string;
  stock: string;
  tone?: PillTone;
  icon?: IconName;
  imageUrl?: string | null;
  compact?: boolean;
  quantity?: number;
  onPress?: PressHandler;
  onIncrement?: () => void;
  onDecrement?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = tonePalettes[tone];
  const increment = onIncrement ?? onPress;
  return (
    <GlassCard
      style={[styles.productCard, style]}
      contentStyle={[styles.productContent, compact ? styles.productContentCompact : null]}
    >
      <View style={[styles.productVisual, compact ? styles.productVisualCompact : null]}>
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
        {tone === "amber" || tone === "red" ? (
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
        <Text numberOfLines={2} style={styles.productName}>
          {name}
        </Text>
        <Text numberOfLines={1} style={styles.productMeta}>
          {stock}
        </Text>
      </View>
      <View style={styles.productFooter}>
        <Text style={styles.productPrice}>{price}</Text>
        {quantity > 0 ? (
          <View style={styles.productStepper}>
            <Pressable
              onPress={() => pressWithHaptics(onDecrement)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${name}`}
              style={styles.productStepperButton}
            >
              <Ionicons name="remove" size={16} color={colors.lime} />
            </Pressable>
            <Text style={styles.productQuantity}>{quantity}</Text>
            <Pressable
              onPress={() => pressWithHaptics(increment)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${name}`}
              style={styles.productStepperButton}
            >
              <Ionicons name="add" size={16} color={colors.lime} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => pressWithHaptics(increment)}
            accessibilityRole="button"
            accessibilityLabel={`Add ${name}`}
            style={[styles.productAdd, compact ? styles.productAddCompact : null]}
          >
            <Text style={styles.productAddText}>ADD</Text>
            <Ionicons name="add" size={16} color={colors.lime} />
          </Pressable>
        )}
      </View>
    </GlassCard>
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
  return (
    <Pressable
      onPress={() => pressWithHaptics(onPress)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: complete }}
      style={({ pressed }) => [styles.exerciseRow, pressed ? styles.pressed : null, style]}
    >
      <View style={[styles.exerciseCheck, complete ? styles.exerciseCheckDone : null]}>
        {complete ? <Ionicons name="checkmark" size={15} color={colors.bg} /> : null}
      </View>
      <IconBubble icon="barbell-outline" tone={complete ? "lime" : "neutral"} size={38} />
      <View style={styles.exerciseCopy}>
        <Text style={styles.exerciseTitle}>{sets ? `${title} · ${sets}` : title}</Text>
        <Text style={styles.exerciseDetail}>{detail}</Text>
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
  return (
    <View style={styles.segmentedControl}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => pressWithHaptics(() => onChange(option.value))}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.segmentedOption, selected ? styles.segmentedOptionSelected : null]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[
                styles.segmentedOptionText,
                selected ? styles.segmentedOptionTextSelected : null,
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

export function AuditWarning({ children }: { children: ReactNode }) {
  return (
    <View style={styles.auditWarning}>
      <IconBubble icon="reader-outline" tone="amber" size={38} />
      <Text style={styles.auditWarningText}>{children}</Text>
    </View>
  );
}

export function OfflineBanner({
  children = "Offline. Changes will sync when connection returns.",
}: {
  children?: ReactNode;
}) {
  return (
    <View style={styles.offlineBanner}>
      <Ionicons name="cloud-offline-outline" size={16} color={colors.amber} />
      <Text style={styles.offlineBannerText}>{children}</Text>
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
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailRowLabel}>{label}</Text>
      <View style={styles.detailRowValueWrap}>
        <Text style={styles.detailRowValue}>{value}</Text>
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
  const palette = tonePalettes[tone];
  const percent = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.progressBarGroup}>
      {label ? <Text style={styles.progressBarLabel}>{label}</Text> : null}
      <View style={styles.progressBarTrack}>
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
  tone = "lime",
}: {
  children?: ReactNode;
  tone?: PillTone;
}) {
  const palette = tonePalettes[tone];
  return (
    <View style={styles.scannerFrame}>
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
      <View style={[styles.scannerLine, { backgroundColor: palette.color }]} />
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

export function StickyActionBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <BlurView
      intensity={54}
      tint="dark"
      style={StyleSheet.flatten([
        styles.stickyActionBar,
        { paddingBottom: Math.max(insets.bottom, 14) },
      ])}
    >
      {children}
    </BlurView>
  );
}

export function CollapsibleSection({
  title,
  eyebrow,
  subtitle,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  count?: number | string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <GlassCard contentStyle={styles.collapsibleContent}>
      <Pressable
        onPress={() => pressWithHaptics(() => setOpen((value) => !value))}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.collapsibleHeader, pressed ? styles.pressed : null]}
      >
        <View style={styles.collapsibleCopy}>
          {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.collapsibleTitle}>{title}</Text>
          {subtitle ? <Text style={styles.collapsibleSubtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.collapsibleTrailing}>
          {count !== undefined ? (
            <ZookChip tone={open ? "lime" : "neutral"}>{count}</ZookChip>
          ) : null}
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={22} color={colors.muted} />
        </View>
      </Pressable>
      {open ? <View style={styles.collapsibleBody}>{children}</View> : null}
    </GlassCard>
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

const memberTabs: DockTab[] = [
  { href: "/", label: "Home", icon: "home-outline", activeIcon: "home", matchPath: "/" },
  {
    href: "/scan",
    label: "Check in",
    accessibilityLabel: "Check in",
    icon: "scan-outline",
    activeIcon: "scan",
    matchPath: "/scan",
    raised: true,
  },
  {
    href: "/plans",
    label: "Plan",
    icon: "barbell-outline",
    activeIcon: "barbell",
    matchPath: "/plans",
  },
];

const trainerTabs: DockTab[] = [
  {
    href: "/trainer",
    label: "Home",
    icon: "home-outline",
    activeIcon: "home",
    matchPath: "/trainer",
  },
  {
    href: "/trainer?view=clients" as Href,
    label: "Clients",
    icon: "people-outline",
    activeIcon: "people",
    matchPath: "/trainer",
    activeView: "clients",
  },
  {
    href: "/scan",
    label: "Check in",
    icon: "scan-outline",
    activeIcon: "scan",
    matchPath: "/scan",
  },
  {
    href: "/trainer?view=plans" as Href,
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
];

const receptionTabs: DockTab[] = [
  {
    href: "/reception",
    label: "Desk",
    icon: "desktop-outline",
    activeIcon: "desktop",
    matchPath: "/reception",
  },
  {
    href: "/reception?view=members" as Href,
    label: "Members",
    icon: "people-outline",
    activeIcon: "people",
    matchPath: "/reception",
    activeView: "members",
  },
  {
    href: "/reception?view=payments" as Href,
    label: "Payments",
    icon: "card-outline",
    activeIcon: "card",
    matchPath: "/reception",
    activeView: "payments",
  },
  {
    href: "/reception?view=orders" as Href,
    label: "Orders",
    icon: "cube-outline",
    activeIcon: "cube",
    matchPath: "/reception",
    activeView: "orders",
  },
];

const ownerTabs: DockTab[] = [
  {
    href: "/owner",
    label: "Needs",
    icon: "pulse-outline",
    activeIcon: "pulse",
    matchPath: "/owner",
  },
  {
    href: "/owner?view=approvals" as Href,
    label: "Approvals",
    icon: "checkmark-done-outline",
    activeIcon: "checkmark-done",
    matchPath: "/owner",
    activeView: "approvals",
  },
  {
    href: "/owner?view=revenue" as Href,
    label: "Revenue",
    icon: "trending-up-outline",
    activeIcon: "trending-up",
    matchPath: "/owner",
    activeView: "revenue",
  },
  {
    href: "/owner?view=stock" as Href,
    label: "Stock",
    icon: "cube-outline",
    activeIcon: "cube",
    matchPath: "/owner",
    activeView: "stock",
  },
];

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
    href: "/owner?view=approvals" as Href,
    label: "Approvals",
    icon: "checkmark-done-outline",
    activeIcon: "checkmark-done",
    matchPath: "/owner",
    activeView: "approvals",
  },
  {
    href: "/owner?view=stock" as Href,
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

export function BottomNav({
  tabs,
  selectedPath,
  role,
  activeView,
}: {
  tabs?: DockTab[];
  selectedPath?: string;
  role?: Role;
  activeView?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string }>();
  const { activeRole } = useAuth();
  const notificationsQuery = useMyNotifications();
  const unreadCount =
    notificationsQuery.data?.notifications?.filter((notification) => !notification.readAt)
      ?.length ?? 0;
  const resolvedRole = role ?? activeRole;
  const resolvedTabs = tabs ?? getTabsForRole(resolvedRole);
  const isMemberNav = !tabs && (!resolvedRole || resolvedRole === "MEMBER");
  const activePath = selectedPath ?? pathname;
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12);

  const navItems = resolvedTabs.map((tab) => {
    const currentView = activeView ?? (Array.isArray(params.view) ? params.view[0] : params.view);
    const clientDetailMatches = tab.label === "Clients" && activePath.startsWith("/trainer/client");
    const roleRootPath =
      tab.matchPath === "/trainer" || tab.matchPath === "/reception" || tab.matchPath === "/owner";
    const viewMatches =
      clientDetailMatches || (tab.activeView ? currentView === tab.activeView : !currentView);
    const pathMatches =
      activePath === tab.matchPath ||
      (tab.matchPath !== "/" && !roleRootPath && activePath.startsWith(tab.matchPath)) ||
      clientDetailMatches;
    const active = pathMatches && viewMatches;
    const showBadge = unreadCount > 0 && tab.label === "Inbox";
    const raised = isMemberNav && tab.raised;
    const showLabel = !(raised && tab.hideLabel);
    const memberPressProps = isMemberNav
      ? {
          onPress: () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.replace(tab.href as never);
          },
        }
      : {};
    const item = (
      <Pressable
        {...memberPressProps}
        onPressIn={() => {
          if (!isMemberNav) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        accessibilityRole="tab"
        accessibilityLabel={tab.accessibilityLabel ?? tab.label}
        accessibilityState={{ selected: active }}
        style={StyleSheet.flatten([
          styles.bottomNavItem,
          isMemberNav ? styles.memberBottomNavItem : null,
          raised ? styles.memberBottomNavItemRaised : null,
          active ? styles.bottomNavItemActive : null,
          active && raised ? styles.memberBottomNavItemRaisedActive : null,
        ])}
      >
        <View>
          <Ionicons
            name={active ? tab.activeIcon : tab.icon}
            size={raised ? 31 : 21}
            color={raised ? colors.bg : active ? colors.lime : colors.subtle}
          />
          {showBadge ? <View style={styles.navBadge} /> : null}
        </View>
        {showLabel ? (
          <Text
            style={[
              styles.bottomNavText,
              isMemberNav ? styles.memberBottomNavText : null,
              raised ? styles.memberBottomNavTextRaised : null,
              active ? styles.bottomNavTextActive : null,
              active && raised ? styles.memberBottomNavTextRaisedActive : null,
            ]}
          >
            {tab.label}
          </Text>
        ) : null}
      </Pressable>
    );

    if (isMemberNav) {
      return <View key={`${String(tab.href)}-${tab.label}`}>{item}</View>;
    }

    return (
      <Link key={`${String(tab.href)}-${tab.label}`} href={tab.href} asChild>
        {item}
      </Link>
    );
  });

  if (isMemberNav) {
    return (
      <View style={[styles.memberBottomNavShell, { bottom }]}>
        <BlurView intensity={86} tint="dark" style={styles.memberBottomNavBlur} />
        <View pointerEvents="none" style={styles.memberBottomNavPlate} />
        <View style={styles.memberBottomNavItems}>{navItems}</View>
      </View>
    );
  }

  return (
    <BlurView
      intensity={54}
      tint="dark"
      style={StyleSheet.flatten([
        styles.bottomNav,
        {
          bottom,
        },
      ])}
    >
      {navItems}
    </BlurView>
  );
}

export function LoadingState({
  title = "Loading",
  body = "Pulling the latest details from your gym.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={colors.lime} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
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
  return (
    <View style={[styles.emptyState, styles.errorState]}>
      <IconBubble icon="alert-circle-outline" tone="red" />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
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
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [anim]);

  return (
    <Animated.View
      style={[
        {
          width: width as ViewStyle["width"],
          height: height as ViewStyle["height"],
          borderRadius,
          backgroundColor: "rgba(255,255,255,0.1)",
          opacity: anim,
        },
        style,
      ]}
    />
  );
}

export function LoadingSkeleton(props: Parameters<typeof Skeleton>[0]) {
  return <Skeleton {...props} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  ambientGlow: {
    position: "absolute",
    top: -120,
    right: -72,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(185,244,85,0.055)",
    opacity: 0.82,
  },
  legacyTitle: {
    color: colors.text,
    ...typography.screenTitle,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
  },
  screenShellContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    gap: layout.cardGap,
  },
  brandMark: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkFramed: {
    borderRadius: radii.icon,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  brandMarkImage: {
    width: "100%",
    height: "100%",
  },
  profileShortcut: {
    borderWidth: 1,
    borderColor: colors.limeBorder,
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
    color: colors.lime,
    ...typography.button,
  },
  glassCard: {
    borderWidth: 1,
    overflow: "hidden",
  },
  glassCardGlow: {
    borderColor: colors.limeBorder,
    ...shadows.glowLimeSoft,
  },
  glassContent: {
    padding: 16,
    gap: spacing.md,
  },
  glassPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.panel,
    padding: spacing.lg,
    overflow: "hidden",
  },
  glassPanelStrong: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.borderStrong,
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
    gap: spacing.md,
  },
  mobileHeaderCentered: {
    justifyContent: "center",
  },
  mobileHeaderCopy: {
    flex: 1,
    gap: 4,
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
    color: colors.muted,
    ...typography.eyebrow,
  },
  headerTitle: {
    color: colors.text,
    ...typography.headerTitle,
  },
  headerSubtitle: {
    color: colors.muted,
    ...typography.body,
  },
  centerText: {
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sectionCopy: {
    flex: 1,
    gap: 4,
  },
  sectionEyebrow: {
    color: colors.muted,
    ...typography.eyebrow,
  },
  sectionTitle: {
    color: colors.text,
    ...typography.sectionTitle,
  },
  sectionSubtitle: {
    color: colors.muted,
    ...typography.small,
  },
  iconBubble: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  button: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 7,
  },
  buttonText: {
    ...typography.button,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
  metricTile: {
    flex: 1,
    minHeight: 84,
    borderRadius: radii.medium,
    borderWidth: 1,
    padding: spacing.md,
    gap: 6,
  },
  metricTileLabel: {
    color: colors.muted,
    ...typography.caption,
  },
  metricTileValue: {
    ...typography.h3,
  },
  metricTileDetail: {
    color: colors.muted,
    ...typography.caption,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  infoLabel: {
    color: colors.muted,
    ...typography.caption,
    flex: 1,
  },
  statusRing: {
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
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
    color: colors.muted,
    ...typography.caption,
  },
  entryCodeCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  entryCodeContent: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  entryCodeLabel: {
    color: colors.muted,
    ...typography.small,
  },
  entryCodeValue: {
    ...typography.display,
    fontVariant: ["tabular-nums"],
  },
  entryCodeDetail: {
    color: colors.muted,
    ...typography.small,
    textAlign: "center",
  },
  listRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  listRowCopy: {
    flex: 1,
    gap: 3,
  },
  listRowTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  listRowSubtitle: {
    color: colors.muted,
    ...typography.small,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  inputLabel: {
    color: colors.muted,
    ...typography.caption,
  },
  inputWrapper: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 13,
  },
  input: {
    flex: 1,
    minHeight: 44,
    color: colors.text,
    ...typography.body,
    paddingVertical: 11,
  },
  inputWrapperFocused: {
    borderColor: "rgba(185,244,85,0.38)",
    backgroundColor: "rgba(255,255,255,0.075)",
  },
  inputWrapperError: {
    borderColor: "rgba(255,90,61,0.42)",
    backgroundColor: "rgba(255,90,61,0.08)",
  },
  inputWrapperReadonly: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  inputWrapperDisabled: {
    opacity: 0.55,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  inputHint: {
    color: colors.muted,
    ...typography.caption,
  },
  inputError: {
    color: colors.red,
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
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.055)",
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
    minHeight: 44,
    gap: 2,
  },
  productName: {
    color: colors.text,
    ...typography.caption,
  },
  productMeta: {
    color: colors.muted,
    ...typography.caption,
  },
  productFooter: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  productPrice: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  productAdd: {
    minWidth: 68,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(7,9,8,0.9)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  productAddCompact: {
    minWidth: 62,
    height: 32,
  },
  productAddText: {
    color: colors.lime,
    ...typography.caption,
  },
  productStepper: {
    height: 34,
    minWidth: 84,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(7,9,8,0.9)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  productStepperButton: {
    width: 30,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  productQuantity: {
    minWidth: 20,
    color: colors.text,
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
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exerciseCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseCheckDone: {
    borderColor: colors.lime,
    backgroundColor: colors.lime,
  },
  exerciseCopy: {
    flex: 1,
    gap: 2,
  },
  exerciseTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  exerciseDetail: {
    color: colors.muted,
    ...typography.small,
  },
  segmentedControl: {
    minHeight: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    padding: 4,
    gap: 4,
  },
  segmentedOption: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  segmentedOptionSelected: {
    backgroundColor: colors.accentPanel,
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.34)",
  },
  segmentedOptionText: {
    color: colors.muted,
    ...typography.caption,
    textAlign: "center",
  },
  segmentedOptionTextSelected: {
    color: colors.lime,
  },
  auditWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: "rgba(242,201,76,0.28)",
    backgroundColor: "rgba(242,201,76,0.09)",
    padding: spacing.md,
  },
  auditWarningText: {
    flex: 1,
    color: colors.text,
    ...typography.body,
  },
  offlineBanner: {
    minHeight: 38,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(242,201,76,0.28)",
    backgroundColor: "rgba(242,201,76,0.08)",
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  offlineBannerText: {
    color: colors.text,
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
    borderBottomColor: colors.divider,
    paddingVertical: spacing.sm,
  },
  detailRowLabel: {
    color: colors.muted,
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
    color: colors.text,
    ...typography.bodyStrong,
    textAlign: "right",
  },
  progressBarGroup: {
    gap: spacing.sm,
  },
  progressBarLabel: {
    color: colors.muted,
    ...typography.caption,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
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
    borderColor: colors.divider,
    backgroundColor: "rgba(255,255,255,0.035)",
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
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "rgba(7,9,8,0.76)",
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    gap: spacing.sm,
    overflow: "hidden",
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
    color: colors.text,
    ...typography.cardTitle,
  },
  collapsibleSubtitle: {
    color: colors.muted,
    ...typography.small,
  },
  collapsibleTrailing: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  collapsibleBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 14,
    gap: spacing.md,
  },
  bottomNav: {
    position: "absolute",
    zIndex: 30,
    left: layout.screenPadding,
    right: layout.screenPadding,
    height: layout.bottomNavHeight,
    borderRadius: radii.bottomNav,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(7,9,8,0.76)",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  memberBottomNavShell: {
    position: "absolute",
    zIndex: 30,
    left: 28,
    right: 28,
    height: 86,
    overflow: "visible",
  },
  memberBottomNavBlur: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 66,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(7,9,8,0.88)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  memberBottomNavPlate: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 86,
    borderRadius: 24,
    backgroundColor: "rgba(7,9,8,0.94)",
  },
  memberBottomNavItems: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 0,
    gap: 18,
    overflow: "visible",
  },
  bottomNavItem: {
    width: 58,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  memberBottomNavItem: {
    flex: 1,
    height: 58,
    borderRadius: 19,
  },
  memberBottomNavItemRaised: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 82,
    width: 82,
    height: 82,
    marginTop: -30,
    borderRadius: 41,
    borderWidth: 3,
    borderColor: "rgba(7,9,8,0.94)",
    backgroundColor: colors.lime,
    shadowColor: colors.lime,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    zIndex: 3,
  },
  bottomNavItemActive: {
    backgroundColor: "rgba(185,244,85,0.18)",
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.34)",
  },
  memberBottomNavItemRaisedActive: {
    backgroundColor: colors.lime,
    borderColor: "rgba(7,9,8,0.94)",
    borderWidth: 3,
  },
  bottomNavText: {
    color: colors.subtle,
    ...typography.navLabel,
  },
  memberBottomNavText: {
    fontSize: 12,
    lineHeight: 15,
  },
  memberBottomNavTextRaised: {
    color: colors.bg,
  },
  bottomNavTextActive: {
    color: colors.lime,
  },
  memberBottomNavTextRaisedActive: {
    color: colors.bg,
  },
  navBadge: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
  },
  loadingState: {
    padding: spacing.xxxl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  stateTitle: {
    color: colors.text,
    ...typography.title,
    textAlign: "center",
  },
  stateBody: {
    color: colors.muted,
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
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radii.card,
    gap: spacing.sm,
  },
  errorState: {
    borderColor: "rgba(255,90,61,0.28)",
    backgroundColor: "rgba(255,90,61,0.08)",
  },
});

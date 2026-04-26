import { Link, usePathname } from "expo-router";
import type { Href } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  View,
  ActivityIndicator,
  Animated,
} from "react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Role } from "@zook/core";
import { useAuth } from "@/lib/auth";
import { useMyNotifications } from "@/lib/query-hooks";
import { colors, radii, shadows, typography } from "@/lib/theme";

export type PillTone = "neutral" | "lime" | "amber" | "red" | "blue" | "violet";
export type ButtonTone = "lime" | "secondary" | "ghost" | "danger";
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

const pillPalettes: Record<
  PillTone,
  { borderColor: string; color: string; backgroundColor: string }
> = {
  neutral: {
    borderColor: colors.border,
    color: colors.muted,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  lime: {
    borderColor: "rgba(185,244,85,0.35)",
    color: colors.lime,
    backgroundColor: "rgba(185,244,85,0.12)",
  },
  amber: {
    borderColor: "rgba(255,182,80,0.35)",
    color: colors.amber,
    backgroundColor: "rgba(255,182,80,0.12)",
  },
  red: {
    borderColor: "rgba(255,93,93,0.35)",
    color: colors.red,
    backgroundColor: "rgba(255,93,93,0.12)",
  },
  blue: {
    borderColor: "rgba(125,211,252,0.35)",
    color: colors.blue,
    backgroundColor: "rgba(125,211,252,0.12)",
  },
  violet: {
    borderColor: "rgba(185,169,255,0.35)",
    color: colors.violet,
    backgroundColor: "rgba(185,169,255,0.12)",
  },
};

const metricPalettes = {
  neutral: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: colors.border,
    valueColor: colors.text,
  },
  lime: {
    backgroundColor: "rgba(185,244,85,0.1)",
    borderColor: "rgba(185,244,85,0.18)",
    valueColor: colors.lime,
  },
  amber: {
    backgroundColor: "rgba(255,182,80,0.1)",
    borderColor: "rgba(255,182,80,0.18)",
    valueColor: colors.amber,
  },
  blue: {
    backgroundColor: "rgba(125,211,252,0.1)",
    borderColor: "rgba(125,211,252,0.18)",
    valueColor: colors.blue,
  },
  violet: {
    backgroundColor: "rgba(185,169,255,0.1)",
    borderColor: "rgba(185,169,255,0.18)",
    valueColor: colors.violet,
  },
  red: {
    backgroundColor: "rgba(255,93,93,0.1)",
    borderColor: "rgba(255,93,93,0.18)",
    valueColor: colors.red,
  },
} satisfies Record<PillTone, { backgroundColor: string; borderColor: string; valueColor: string }>;

const buttonPalettes: Record<
  ButtonTone,
  { backgroundColor: string; borderColor: string; color: string }
> = {
  lime: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
    color: "#070908",
  },
  secondary: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: colors.border,
    color: colors.text,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.1)",
    color: colors.text,
  },
  danger: {
    backgroundColor: "rgba(255,93,93,0.12)",
    borderColor: "rgba(255,93,93,0.26)",
    color: colors.text,
  },
};

export function Screen({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <View style={styles.screen}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function ScreenShell({ children, title }: { children: ReactNode; title?: string }) {
  return <Screen title={title}>{children}</Screen>;
}

export function SafeAreaScreen({
  children,
  bottomInset = false,
  style,
}: {
  children: ReactNode;
  bottomInset?: boolean;
  style?: StyleProp<ViewStyle>;
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
      {children}
    </View>
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
    <View style={styles.zookHeader}>
      <View style={styles.zookHeaderCopy}>
        {activeGym ? <ActiveGymPill label={activeGym} /> : null}
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        {role ? <RoleChip role={role} /> : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </View>
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
    <View style={styles.screenHeader}>
      <View style={styles.screenHeaderCopy}>
        {eyebrow ? (
          <Text style={styles.headerEyebrow}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={styles.headerTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </View>
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
      <View style={styles.sectionHeaderCopy}>
        {eyebrow ? (
          <Text style={styles.sectionEyebrow}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={styles.sectionTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.sectionSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function GlassCard(props: Parameters<typeof Card>[0]) {
  return <Card {...props} />;
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
  return <View style={[styles.glassPanel, strong ? styles.glassPanelStrong : null, style]}>{children}</View>;
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

export function MetricTile({
  label,
  value,
  detail,
  tone = "neutral",
  style,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: PillTone;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = metricPalettes[tone];

  return (
    <View style={[styles.metricTile, palette, style]}>
      <Text style={styles.metricTileLabel}>
        {label}
      </Text>
      <Text style={[styles.metricTileValue, { color: palette.valueColor }]}>
        {value}
      </Text>
      {detail ? (
        <Text style={styles.metricTileDetail}>
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
      <Text style={styles.infoLabel}>
        {label}
      </Text>
      <Pill tone={tone}>{value}</Pill>
    </View>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: PillTone }) {
  const palette = pillPalettes[tone];
  return (
    <View style={[styles.pill, palette]}>
      <Text style={[styles.pillText, { color: palette.color }]}>
        {children}
      </Text>
    </View>
  );
}

export function StatusChip(props: Parameters<typeof Pill>[0]) {
  return <Pill {...props} />;
}

export function ActiveGymPill({ label }: { label: string }) {
  return (
    <View style={styles.activeGymPill}>
      <Ionicons name="business-outline" size={14} color={colors.lime} />
      <Text style={styles.activeGymPillText}>{label}</Text>
    </View>
  );
}

export function RoleChip({ role }: { role: Role | string }) {
  const label = String(role).replace(/_/g, " ").toLowerCase();
  return (
    <View style={styles.roleChip}>
      <Ionicons name="shield-checkmark-outline" size={14} color={colors.text} />
      <Text style={styles.roleChipText}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  children,
  onPress,
  tone = "lime",
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  tone?: ButtonTone;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}) {
  const palette = buttonPalettes[tone];

  return (
    <Pressable
      onPress={() => {
        if (!disabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress?.();
        }
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: palette.color }, textStyle]}>{children}</Text>
    </Pressable>
  );
}

export function SecondaryButton(props: Omit<Parameters<typeof PrimaryButton>[0], "tone">) {
  return <PrimaryButton {...props} tone="secondary" />;
}

export function SecondaryGlassButton(props: Omit<Parameters<typeof PrimaryButton>[0], "tone">) {
  return <PrimaryButton {...props} tone="secondary" />;
}

export function DangerButton(props: Omit<Parameters<typeof PrimaryButton>[0], "tone">) {
  return <PrimaryButton {...props} tone="danger" />;
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
  const palette = buttonPalettes[tone];
  return (
    <Link href={href} asChild>
      <Pressable
        onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
        accessibilityRole="link"
        accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: palette.backgroundColor,
            borderColor: palette.borderColor,
          },
          pressed ? styles.buttonPressed : null,
          style,
        ]}
      >
        <Text style={[styles.buttonText, { color: palette.color }, textStyle]}>{children}</Text>
      </Pressable>
    </Link>
  );
}

export function SecondaryLink(props: Omit<Parameters<typeof PrimaryLink>[0], "tone">) {
  return <PrimaryLink {...props} tone="secondary" />;
}

export function GlassInput({
  label,
  hint,
  style,
  inputStyle,
  ...props
}: TextInputProps & {
  label?: string;
  hint?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.inputGroup, style]}>
      {label ? (
        <Text style={styles.inputLabel}>
          {label}
        </Text>
      ) : null}
      <View style={styles.inputWrapper}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.flatten(StyleSheet.absoluteFill)} />
        <TextInput
          {...props}
          placeholderTextColor={colors.muted}
          style={[styles.input, props.multiline ? styles.inputMultiline : null, inputStyle]}
        />
      </View>
      {hint ? (
        <Text style={styles.inputHint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function FormField(props: Parameters<typeof GlassInput>[0]) {
  return <GlassInput {...props} />;
}

export function SearchField({ label = "Search", ...props }: Omit<Parameters<typeof GlassInput>[0], "label"> & { label?: string }) {
  return (
    <GlassInput
      label={label}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
    />
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
      <Text style={styles.stateTitle}>
        {title}
      </Text>
      <Text style={styles.stateBody}>
        {body}
      </Text>
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
      <Text style={styles.stateTitle}>
        {title}
      </Text>
      <Text style={styles.stateBody}>
        {body}
      </Text>
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

export function LoadingSkeleton(props: Parameters<typeof Skeleton>[0]) {
  return <Skeleton {...props} />;
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
  const palette = pillPalettes[tone];
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
      <Ionicons name={icon} size={Math.max(18, size / 2.2)} color={palette.color} />
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.listRow}>
      {leading}
      <View style={styles.listRowCopy}>
        <Text style={styles.listRowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.listRowSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing}
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
  const palette = pillPalettes[tone];
  return (
    <View style={[styles.confirmationRing, { borderColor: palette.borderColor }]}>
      <View style={[styles.confirmationRingInner, { backgroundColor: palette.backgroundColor }]}>
        <Ionicons name={icon} size={38} color={palette.color} />
      </View>
      {label ? <Text style={[styles.confirmationRingLabel, { color: palette.color }]}>{label}</Text> : null}
    </View>
  );
}

export function EntryCodeCard({
  code,
  status,
  detail,
}: {
  code: string;
  status?: string;
  detail?: string;
}) {
  return (
    <Card style={styles.entryCodeCard}>
      <Text style={styles.entryCodeLabel}>Entry code</Text>
      <Text style={styles.entryCodeValue}>{code}</Text>
      {status ? <Pill tone="lime">{status}</Pill> : null}
      {detail ? <Text style={styles.entryCodeDetail}>{detail}</Text> : null}
    </Card>
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
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.segmentedOption, selected ? styles.segmentedOptionSelected : null]}
          >
            <Text style={[styles.segmentedOptionText, selected ? styles.segmentedOptionTextSelected : null]}>
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

export function StickyActionBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <BlurView intensity={80} tint="dark" style={[styles.stickyActionBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
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
    <Card style={styles.collapsibleCard}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.collapsibleHeader, pressed ? styles.buttonPressed : null]}
      >
        <View style={styles.collapsibleCopy}>
          {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.collapsibleTitle}>{title}</Text>
          {subtitle ? <Text style={styles.collapsibleSubtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.collapsibleTrailing}>
          {count !== undefined ? <Pill tone={open ? "lime" : "neutral"}>{count}</Pill> : null}
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={22} color={colors.muted} />
        </View>
      </Pressable>
      {open ? <View style={styles.collapsibleBody}>{children}</View> : null}
    </Card>
  );
}

type DockTab = { href: Href; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap };

const memberTabs: DockTab[] = [
  { href: "/", label: "Home", icon: "home-outline", activeIcon: "home" },
  { href: "/scan", label: "Check-in", icon: "qr-code-outline", activeIcon: "qr-code" },
  { href: "/plans", label: "Plans", icon: "barbell-outline", activeIcon: "barbell" },
  { href: "/shop", label: "Shop", icon: "bag-outline", activeIcon: "bag" },
  { href: "/profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

const trainerTabs: DockTab[] = [
  { href: "/trainer", label: "Home", icon: "home-outline", activeIcon: "home" },
  { href: "/trainer?view=clients", label: "Clients", icon: "people-outline", activeIcon: "people" },
  { href: "/plans", label: "Plans", icon: "reader-outline", activeIcon: "reader" },
  { href: "/notifications", label: "Inbox", icon: "chatbubble-outline", activeIcon: "chatbubble" },
  { href: "/profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

const receptionTabs: DockTab[] = [
  { href: "/reception", label: "Desk", icon: "desktop-outline", activeIcon: "desktop" },
  { href: "/reception?view=members", label: "Members", icon: "people-outline", activeIcon: "people" },
  { href: "/reception?view=payments", label: "Payments", icon: "card-outline", activeIcon: "card" },
  { href: "/reception?view=orders", label: "Orders", icon: "cube-outline", activeIcon: "cube" },
  { href: "/profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

const ownerTabs: DockTab[] = [
  { href: "/owner", label: "Command", icon: "pulse-outline", activeIcon: "pulse" },
  { href: "/owner?view=approvals", label: "Approvals", icon: "checkmark-done-outline", activeIcon: "checkmark-done" },
  { href: "/owner?view=revenue", label: "Revenue", icon: "trending-up-outline", activeIcon: "trending-up" },
  { href: "/owner?view=stock", label: "Stock", icon: "cube-outline", activeIcon: "cube" },
  { href: "/profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

function getTabsForRole(role?: Role): DockTab[] {
  if (role === "TRAINER") return trainerTabs;
  if (role === "RECEPTIONIST") return receptionTabs;
  if (role === "OWNER" || role === "ADMIN") return ownerTabs;
  return memberTabs;
}

export function Dock() {
  const pathname = usePathname();
  const { activeRole } = useAuth();
  const notificationsQuery = useMyNotifications();
  const unreadCount = notificationsQuery.data?.notifications?.filter(n => !n.readAt)?.length ?? 0;
  const tabs = getTabsForRole(activeRole);
  const insets = useSafeAreaInsets();
  return (
    <BlurView intensity={80} tint="dark" style={StyleSheet.flatten([styles.dock, { bottom: Math.max(insets.bottom, 18) }])}>
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const showBadge = unreadCount > 0 && (tab.label === "Inbox" || (tab.label === "Profile" && !tabs.find(t => t.label === "Inbox")));
        return (
          <Link key={String(tab.href)} href={tab.href} asChild>
            <Pressable 
              onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={[styles.dockItem, active ? styles.dockItemActive : null]}
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
            >
              <View>
                <Ionicons
                  name={active ? tab.activeIcon : tab.icon}
                  size={22}
                  color={active ? colors.lime : colors.muted}
                />
                {showBadge && <View style={styles.dockBadge} />}
              </View>
              <Text style={[styles.dockText, active ? styles.dockTextActive : null]}>
                {tab.label}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </BlurView>
  );
}

export function Skeleton({ style, width, height, borderRadius = 8 }: { style?: StyleProp<ViewStyle>, width?: number | string, height?: number | string, borderRadius?: number }) {
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
      ])
    ).start();
  }, [anim]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: "rgba(255,255,255,0.1)",
          opacity: anim,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  title: {
    color: colors.text,
    ...typography.headline,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  zookHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  zookHeaderCopy: {
    flex: 1,
    gap: 8,
  },
  screenHeaderCopy: {
    flex: 1,
    gap: 8,
  },
  headerEyebrow: {
    color: colors.amber,
    ...typography.eyebrow,
  },
  headerTitle: {
    color: colors.text,
    ...typography.display,
  },
  headerSubtitle: {
    color: colors.muted,
    ...typography.body,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  sectionEyebrow: {
    color: colors.muted,
    ...typography.eyebrow,
  },
  sectionTitle: {
    color: colors.text,
    ...typography.headline,
  },
  sectionSubtitle: {
    color: colors.muted,
    ...typography.body,
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 18,
    overflow: "hidden",
    ...shadows.glass,
  },
  glassPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.panel,
    padding: 16,
    overflow: "hidden",
  },
  glassPanelStrong: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.borderStrong,
  },
  brandMark: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkFramed: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  brandMarkImage: {
    width: "100%",
    height: "100%",
  },
  metricTile: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    minHeight: 124,
    gap: 8,
  },
  metricTileLabel: {
    color: colors.muted,
    ...typography.caption,
  },
  metricTileValue: {
    ...typography.display,
  },
  metricTileDetail: {
    color: colors.muted,
    ...typography.caption,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  infoLabel: {
    color: colors.muted,
    ...typography.caption,
    flex: 1,
  },
  pill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    ...typography.caption,
  },
  activeGymPill: {
    alignSelf: "flex-start",
    minHeight: 34,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    backgroundColor: colors.accentPanel,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  activeGymPillText: {
    color: colors.text,
    ...typography.caption,
  },
  roleChip: {
    alignSelf: "flex-start",
    minHeight: 32,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  roleChipText: {
    color: colors.text,
    ...typography.caption,
    textTransform: "capitalize",
  },
  button: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.titleSmall,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: colors.muted,
    ...typography.caption,
  },
  inputWrapper: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    minHeight: 54,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  inputHint: {
    color: colors.muted,
    ...typography.caption,
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radii.card,
    gap: 8,
  },
  errorState: {
    borderColor: "rgba(255,107,95,0.28)",
    backgroundColor: "rgba(255,107,95,0.08)",
  },
  loadingState: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
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
    marginTop: 14,
  },
  iconBubble: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  listRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  listRowCopy: {
    flex: 1,
    gap: 4,
  },
  listRowTitle: {
    color: colors.text,
    ...typography.titleSmall,
  },
  listRowSubtitle: {
    color: colors.muted,
    ...typography.body,
  },
  confirmationRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    ...shadows.glowLime,
  },
  confirmationRingInner: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmationRingLabel: {
    marginTop: 8,
    ...typography.caption,
  },
  entryCodeCard: {
    alignItems: "center",
    gap: 8,
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.08)",
  },
  entryCodeLabel: {
    color: colors.muted,
    ...typography.eyebrow,
  },
  entryCodeValue: {
    color: colors.text,
    fontSize: 42,
    lineHeight: 46,
    fontFamily: "Inter_900Black",
    letterSpacing: 0,
  },
  entryCodeDetail: {
    color: colors.muted,
    ...typography.body,
    textAlign: "center",
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
    paddingHorizontal: 10,
  },
  segmentedOptionSelected: {
    backgroundColor: colors.accentPanel,
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.28)",
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
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,200,75,0.24)",
    backgroundColor: "rgba(245,200,75,0.08)",
    padding: 14,
  },
  auditWarningText: {
    flex: 1,
    color: colors.text,
    ...typography.body,
  },
  stickyActionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "rgba(7,9,8,0.76)",
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
    overflow: "hidden",
  },
  collapsibleCard: {
    gap: 0,
    padding: 0,
  },
  collapsibleHeader: {
    minHeight: 76,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  collapsibleCopy: {
    flex: 1,
    gap: 6,
  },
  collapsibleTitle: {
    color: colors.text,
    ...typography.title,
  },
  collapsibleSubtitle: {
    color: colors.muted,
    ...typography.body,
  },
  collapsibleTrailing: {
    alignItems: "flex-end",
    gap: 8,
  },
  collapsibleBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 16,
    gap: 12,
  },
  dock: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    minHeight: 64,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(10,12,10,0.5)",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  dockItem: {
    minWidth: 58,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center" as const,
    gap: 2,
  },
  dockItemActive: {
    backgroundColor: "rgba(185,244,85,0.12)",
  },
  dockText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  dockBadge: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
  },
  dockTextActive: {
    color: colors.lime,
  },
});

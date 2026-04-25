import { Link, usePathname } from "expo-router";
import type { Href } from "expo-router";
import type { ReactNode } from "react";
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
} from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { colors, radii } from "@/lib/theme";

type PillTone = "neutral" | "lime" | "amber" | "red" | "blue" | "violet";
type ButtonTone = "lime" | "secondary" | "ghost" | "danger";

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
      <View pointerEvents="none" style={styles.screenGlowTop} />
      <View pointerEvents="none" style={styles.screenGlowBottom} />
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
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

export function PrimaryButton({
  children,
  onPress,
  tone = "lime",
  disabled = false,
  style,
  textStyle,
}: {
  children: ReactNode;
  onPress?: () => void;
  tone?: ButtonTone;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
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

export function PrimaryLink({
  href,
  children,
  tone = "lime",
  style,
  textStyle,
}: {
  href: Href;
  children: ReactNode;
  tone?: ButtonTone;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const palette = buttonPalettes[tone];
  return (
    <Link href={href} asChild>
      <Pressable
        onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
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
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
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

type DockTab = { href: Href; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap };

const memberTabs: DockTab[] = [
  { href: "/", label: "Home", icon: "home-outline", activeIcon: "home" },
  { href: "/plans", label: "Plans", icon: "barbell-outline", activeIcon: "barbell" },
  { href: "/scan", label: "Scan", icon: "qr-code-outline", activeIcon: "qr-code" },
  { href: "/shop", label: "Shop", icon: "bag-outline", activeIcon: "bag" },
  { href: "/profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

const ownerTabs: DockTab[] = [
  { href: "/owner", label: "Dashboard", icon: "grid-outline", activeIcon: "grid" },
  { href: "/find-gyms", label: "Members", icon: "people-outline", activeIcon: "people" },
  { href: "/scan", label: "Scan", icon: "qr-code-outline", activeIcon: "qr-code" },
  { href: "/shop", label: "Shop", icon: "bag-outline", activeIcon: "bag" },
  { href: "/profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

const trainerTabs: DockTab[] = [
  { href: "/trainer", label: "Clients", icon: "people-outline", activeIcon: "people" },
  { href: "/plans", label: "Plans", icon: "barbell-outline", activeIcon: "barbell" },
  { href: "/scan", label: "Scan", icon: "qr-code-outline", activeIcon: "qr-code" },
  { href: "/notifications", label: "Inbox", icon: "chatbubble-outline", activeIcon: "chatbubble" },
  { href: "/profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

const receptionTabs: DockTab[] = [
  { href: "/reception", label: "Queue", icon: "list-outline", activeIcon: "list" },
  { href: "/find-gyms", label: "Members", icon: "people-outline", activeIcon: "people" },
  { href: "/scan", label: "Scan", icon: "qr-code-outline", activeIcon: "qr-code" },
  { href: "/shop", label: "Shop", icon: "bag-outline", activeIcon: "bag" },
  { href: "/profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

function getTabsForRole(hasAnyRole: (...roles: string[]) => boolean): DockTab[] {
  if (hasAnyRole("OWNER", "ADMIN")) return ownerTabs;
  if (hasAnyRole("TRAINER")) return trainerTabs;
  if (hasAnyRole("RECEPTIONIST")) return receptionTabs;
  return memberTabs;
}

export function Dock() {
  const pathname = usePathname();
  const { hasAnyRole } = useAuth();
  const tabs = getTabsForRole(hasAnyRole);
  const insets = useSafeAreaInsets();
  return (
    <BlurView intensity={80} tint="dark" style={[styles.dock, { bottom: Math.max(insets.bottom, 18) }]}>
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link key={String(tab.href)} href={tab.href} asChild>
            <Pressable 
              onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={[styles.dockItem, active ? styles.dockItemActive : null]}
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
            >
              <Ionicons
                name={active ? tab.activeIcon : tab.icon}
                size={22}
                color={active ? colors.lime : colors.muted}
              />
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screenGlowTop: {
    position: "absolute",
    top: -100,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(185,244,85,0.08)",
  },
  screenGlowBottom: {
    position: "absolute",
    bottom: 60,
    left: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(125,211,252,0.06)",
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  screenHeaderCopy: {
    flex: 1,
    gap: 8,
  },
  headerEyebrow: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
  },
  headerSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
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
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 18,
    overflow: "hidden",
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
    fontSize: 12,
    fontWeight: "700",
  },
  metricTileValue: {
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
  },
  metricTileDetail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 13,
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
    fontSize: 12,
    fontWeight: "700",
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
    fontWeight: "800",
    fontSize: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
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
    fontSize: 12,
    lineHeight: 17,
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
  loadingState: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  stateBody: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 4,
    textAlign: "center",
  },
  stateAction: {
    marginTop: 14,
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
    fontWeight: "700",
  },
  dockTextActive: {
    color: colors.lime,
  },
});

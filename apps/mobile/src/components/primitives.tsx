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
} from "react-native";
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
          <Text style={styles.headerEyebrow} selectable>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={styles.headerTitle} selectable>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle} selectable>
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
          <Text style={styles.sectionEyebrow} selectable>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={styles.sectionTitle} selectable>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.sectionSubtitle} selectable>
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
      <Text style={styles.metricTileLabel} selectable>
        {label}
      </Text>
      <Text style={[styles.metricTileValue, { color: palette.valueColor }]} selectable>
        {value}
      </Text>
      {detail ? (
        <Text style={styles.metricTileDetail} selectable>
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
      <Text style={styles.infoLabel} selectable>
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
      <Text style={[styles.pillText, { color: palette.color }]} selectable>
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
      onPress={onPress}
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
        <Text style={styles.inputLabel} selectable>
          {label}
        </Text>
      ) : null}
      <TextInput
        {...props}
        placeholderTextColor={colors.muted}
        style={[styles.input, props.multiline ? styles.inputMultiline : null, inputStyle]}
      />
      {hint ? (
        <Text style={styles.inputHint} selectable>
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
    <Card>
      <Text style={styles.stateTitle} selectable>
        {title}
      </Text>
      <Text style={styles.stateBody} selectable>
        {body}
      </Text>
    </Card>
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
    <Card style={styles.stateCard}>
      <Text style={styles.stateTitle} selectable>
        {title}
      </Text>
      <Text style={styles.stateBody} selectable>
        {body}
      </Text>
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </Card>
  );
}

export function Dock() {
  const pathname = usePathname();
  const items: Array<[Href, string]> = [
    ["/", "Home"],
    ["/plans", "Plans"],
    ["/scan", "Scan"],
    ["/shop", "Shop"],
    ["/profile", "Profile"],
  ];
  return (
    <View style={styles.dock}>
      {items.map(([href, label]) => (
        <Link key={String(href)} href={href} asChild>
          <Pressable style={[styles.dockItem, pathname === href ? styles.dockItemActive : null]}>
            <Text style={[styles.dockText, pathname === href ? styles.dockTextActive : null]}>
              {label}
            </Text>
          </Pressable>
        </Link>
      ))}
    </View>
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
  input: {
    minHeight: 54,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.05)",
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
  stateCard: {
    gap: 6,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  stateBody: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 4,
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
    borderColor: colors.border,
    backgroundColor: "rgba(10,12,10,0.92)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  dockItem: {
    minWidth: 58,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  dockItemActive: {
    backgroundColor: "rgba(185,244,85,0.12)",
  },
  dockText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  dockTextActive: {
    color: colors.lime,
  },
});

import { Link, usePathname } from "expo-router";
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
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Role } from "@zook/core";
import { useAuth } from "@/lib/auth";
import { useMyNotifications } from "@/lib/query-hooks";
import { colors, layout, radii, shadows, spacing, typography } from "@/lib/theme";

export type PillTone = "neutral" | "lime" | "amber" | "red" | "blue" | "violet";
export type ButtonTone = "lime" | "secondary" | "ghost" | "danger";
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
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
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: colors.border,
    color: colors.text,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.12)",
    color: colors.text,
  },
  danger: {
    backgroundColor: "rgba(255,90,61,0.14)",
    borderColor: "rgba(255,90,61,0.35)",
    color: colors.text,
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

function pressWithHaptics(callback?: () => void) {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  callback?.();
}

export function ZookScreen({
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
      <View pointerEvents="none" style={styles.ambientGlow} />
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

export function ScreenShell({ children, title }: { children: ReactNode; title?: string }) {
  return <Screen title={title}>{children}</Screen>;
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

export function GlassCard({
  children,
  style,
  contentStyle,
  glow = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  glow?: boolean;
}) {
  return (
    <View style={[styles.glassCard, glow ? styles.glassCardGlow : null, style]}>
      <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={[styles.glassContent, contentStyle]}>{children}</View>
    </View>
  );
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

export function StatusChip(props: Parameters<typeof ZookChip>[0]) {
  return <ZookChip {...props} />;
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

export function MobileHeader({
  eyebrow,
  title,
  subtitle,
  leading,
  trailing,
  chip,
  centered = false,
  style,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  chip?: ReactNode;
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.mobileHeader, centered ? styles.mobileHeaderCentered : null, style]}>
      {leading ? <View style={styles.headerSide}>{leading}</View> : null}
      <View style={[styles.mobileHeaderCopy, centered ? styles.centeredCopy : null]}>
        {chip}
        {eyebrow ? <Text style={styles.headerEyebrow}>{eyebrow}</Text> : null}
        <Text style={[styles.headerTitle, centered ? styles.centerText : null]}>{title}</Text>
        {subtitle ? <Text style={[styles.headerSubtitle, centered ? styles.centerText : null]}>{subtitle}</Text> : null}
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
      chip={activeGym ? <ActiveGymPill label={activeGym} /> : role ? <RoleChip role={role} /> : undefined}
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
  return <MobileHeader eyebrow={eyebrow} title={title} subtitle={subtitle} trailing={trailing} />;
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
  onPress?: () => void;
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
  const button = (
    <Pressable
      onPress={href ? undefined : () => {
        if (!disabled) pressWithHaptics(onPress);
      }}
      onPressIn={href && !disabled ? () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : undefined}
      disabled={disabled}
      accessibilityRole={href ? "link" : "button"}
      accessibilityLabel={accessibilityLabel ?? (typeof children === "string" ? children : undefined)}
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

  if (!href || disabled) return button;
  return (
    <Link href={href} asChild>
      {button}
    </Link>
  );
}

export function PrimaryButton(props: Omit<Parameters<typeof ZookButton>[0], "variant">) {
  return <ZookButton {...props} variant="primary" />;
}

export function SecondaryButton(props: Omit<Parameters<typeof ZookButton>[0], "variant" | "tone">) {
  return <ZookButton {...props} variant="secondary" />;
}

export function SecondaryGlassButton(props: Omit<Parameters<typeof ZookButton>[0], "variant" | "tone">) {
  return <ZookButton {...props} variant="secondary" />;
}

export function DangerButton(props: Omit<Parameters<typeof ZookButton>[0], "variant" | "tone">) {
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
    <ZookButton href={href} tone={tone} style={style} textStyle={textStyle} accessibilityLabel={accessibilityLabel}>
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
        {icon ? <Ionicons name={icon} size={Math.round(size * 0.36)} color={palette.color} /> : null}
        {value ? <Text style={[styles.statusRingValue, { color: palette.color }]}>{value}</Text> : null}
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
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function TextField({
  label,
  hint,
  style,
  inputStyle,
  leading,
  trailing,
  ...props
}: TextFieldProps) {
  return (
    <View style={[styles.inputGroup, style]}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <View style={styles.inputWrapper}>
        {leading}
        <TextInput
          {...props}
          placeholderTextColor={colors.subtle}
          style={[styles.input, props.multiline ? styles.inputMultiline : null, inputStyle]}
        />
        {trailing}
      </View>
      {hint ? <Text style={styles.inputHint}>{hint}</Text> : null}
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
  return <TextField label={label ?? "Search"} leading={<Ionicons name="search-outline" size={18} color={colors.subtle} />} {...props} />;
}

export function ProductCard({
  name,
  price,
  stock,
  tone = "neutral",
  icon = "bag-outline",
  onPress,
  style,
}: {
  name: string;
  price: string;
  stock: string;
  tone?: PillTone;
  icon?: IconName;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <GlassCard style={[styles.productCard, style]} contentStyle={styles.productContent}>
      <View style={styles.productVisual}>
        <Ionicons name={icon} size={30} color={colors.lime} />
      </View>
      <Text style={styles.productName}>{name}</Text>
      <Text style={styles.productPrice}>{price}</Text>
      <View style={styles.productFooter}>
        <ZookChip tone={tone}>{stock}</ZookChip>
        <Pressable
          onPress={() => pressWithHaptics(onPress)}
          accessibilityRole="button"
          accessibilityLabel={`Add ${name}`}
          style={styles.productAdd}
        >
          <Ionicons name="add" size={18} color={colors.lime} />
        </Pressable>
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
  onPress?: () => void;
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
    <BlurView
      intensity={80}
      tint="dark"
      style={[styles.stickyActionBar, { paddingBottom: Math.max(insets.bottom, 14) }]}
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
          {count !== undefined ? <ZookChip tone={open ? "lime" : "neutral"}>{count}</ZookChip> : null}
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
  icon: IconName;
  activeIcon: IconName;
  matchPath: string;
};

const memberTabs: DockTab[] = [
  { href: "/", label: "Home", icon: "home-outline", activeIcon: "home", matchPath: "/" },
  { href: "/scan", label: "Check-in", icon: "qr-code-outline", activeIcon: "qr-code", matchPath: "/scan" },
  { href: "/plans", label: "Plans", icon: "barbell-outline", activeIcon: "barbell", matchPath: "/plans" },
  { href: "/shop", label: "Shop", icon: "bag-outline", activeIcon: "bag", matchPath: "/shop" },
  { href: "/profile", label: "Profile", icon: "person-outline", activeIcon: "person", matchPath: "/profile" },
];

const trainerTabs: DockTab[] = [
  { href: "/trainer", label: "Home", icon: "home-outline", activeIcon: "home", matchPath: "/trainer" },
  { href: "/trainer?view=clients" as Href, label: "Clients", icon: "people-outline", activeIcon: "people", matchPath: "/trainer" },
  { href: "/plans", label: "Plans", icon: "reader-outline", activeIcon: "reader", matchPath: "/plans" },
  { href: "/notifications", label: "Inbox", icon: "chatbubble-outline", activeIcon: "chatbubble", matchPath: "/notifications" },
  { href: "/profile", label: "Profile", icon: "person-outline", activeIcon: "person", matchPath: "/profile" },
];

const receptionTabs: DockTab[] = [
  { href: "/reception", label: "Desk", icon: "desktop-outline", activeIcon: "desktop", matchPath: "/reception" },
  { href: "/reception?view=members" as Href, label: "Members", icon: "people-outline", activeIcon: "people", matchPath: "/reception" },
  { href: "/reception?view=payments" as Href, label: "Payments", icon: "card-outline", activeIcon: "card", matchPath: "/reception" },
  { href: "/reception?view=orders" as Href, label: "Orders", icon: "cube-outline", activeIcon: "cube", matchPath: "/reception" },
  { href: "/profile", label: "Profile", icon: "person-outline", activeIcon: "person", matchPath: "/profile" },
];

const ownerTabs: DockTab[] = [
  { href: "/owner", label: "Command", icon: "pulse-outline", activeIcon: "pulse", matchPath: "/owner" },
  { href: "/owner?view=approvals" as Href, label: "Approvals", icon: "checkmark-done-outline", activeIcon: "checkmark-done", matchPath: "/owner" },
  { href: "/owner?view=revenue" as Href, label: "Revenue", icon: "trending-up-outline", activeIcon: "trending-up", matchPath: "/owner" },
  { href: "/owner?view=stock" as Href, label: "Stock", icon: "cube-outline", activeIcon: "cube", matchPath: "/owner" },
  { href: "/profile", label: "Profile", icon: "person-outline", activeIcon: "person", matchPath: "/profile" },
];

function getTabsForRole(role?: Role): DockTab[] {
  if (role === "TRAINER") return trainerTabs;
  if (role === "RECEPTIONIST") return receptionTabs;
  if (role === "OWNER" || role === "ADMIN") return ownerTabs;
  return memberTabs;
}

export function BottomNav({ tabs, selectedPath }: { tabs?: DockTab[]; selectedPath?: string }) {
  const pathname = usePathname();
  const { activeRole } = useAuth();
  const notificationsQuery = useMyNotifications();
  const unreadCount = notificationsQuery.data?.notifications?.filter((notification) => !notification.readAt)?.length ?? 0;
  const resolvedTabs = tabs ?? getTabsForRole(activeRole);
  const activePath = selectedPath ?? pathname;
  const insets = useSafeAreaInsets();

  return (
    <BlurView
      intensity={80}
      tint="dark"
      style={[
        styles.bottomNav,
        {
          bottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {resolvedTabs.map((tab, index) => {
        const firstMatchingIndex = resolvedTabs.findIndex((item) => item.matchPath === tab.matchPath);
        const active =
          (activePath === tab.matchPath || (tab.matchPath !== "/" && activePath.startsWith(tab.matchPath))) &&
          index === firstMatchingIndex;
        const showBadge =
          unreadCount > 0 && (tab.label === "Inbox" || (tab.label === "Profile" && !resolvedTabs.find((item) => item.label === "Inbox")));
        return (
          <Link key={`${String(tab.href)}-${tab.label}`} href={tab.href} asChild>
            <Pressable
              onPressIn={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              style={[styles.bottomNavItem, active ? styles.bottomNavItemActive : null]}
            >
              <View>
                <Ionicons name={active ? tab.activeIcon : tab.icon} size={21} color={active ? colors.lime : colors.subtle} />
                {showBadge ? <View style={styles.navBadge} /> : null}
              </View>
              <Text style={[styles.bottomNavText, active ? styles.bottomNavTextActive : null]}>{tab.label}</Text>
            </Pressable>
          </Link>
        );
      })}
    </BlurView>
  );
}

export function Dock() {
  return <BottomNav />;
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
    top: -96,
    right: -44,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(185,244,85,0.08)",
    opacity: 0.9,
  },
  legacyTitle: {
    color: colors.text,
    ...typography.h1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
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
  glassCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.panel,
    overflow: "hidden",
    ...shadows.glass,
  },
  glassCardGlow: {
    borderColor: colors.limeBorder,
    ...shadows.glowLime,
  },
  glassContent: {
    padding: 18,
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
    minHeight: 30,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    ...typography.h1,
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
    ...typography.h3,
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
    borderRadius: radii.large,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    gap: spacing.sm,
  },
  buttonText: {
    ...typography.bodyStrong,
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
    minHeight: 96,
    borderRadius: radii.large,
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
    minHeight: 58,
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
    minHeight: 48,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    minHeight: 48,
    color: colors.text,
    ...typography.body,
    paddingVertical: spacing.md,
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  inputHint: {
    color: colors.muted,
    ...typography.caption,
  },
  productCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: radii.large,
  },
  productContent: {
    padding: 10,
    gap: 7,
  },
  productVisual: {
    height: 58,
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(185,244,85,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  productName: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  productPrice: {
    color: colors.lime,
    ...typography.h3,
  },
  productFooter: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  productAdd: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseRow: {
    minHeight: 58,
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
    width: 28,
    height: 28,
    borderRadius: 14,
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
    minHeight: 76,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
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
    gap: spacing.sm,
  },
  collapsibleBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  bottomNav: {
    position: "absolute",
    left: layout.screenPadding,
    right: layout.screenPadding,
    height: layout.bottomNavHeight,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(7,9,8,0.72)",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  bottomNavItem: {
    width: 64,
    height: 58,
    borderRadius: radii.large,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  bottomNavItemActive: {
    backgroundColor: "rgba(185,244,85,0.1)",
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.22)",
  },
  bottomNavText: {
    color: colors.subtle,
    ...typography.caption,
  },
  bottomNavTextActive: {
    color: colors.lime,
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

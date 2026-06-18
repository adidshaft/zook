import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { useBranchSelection } from "@/lib/branch-selection";
import { useAuth } from "@/lib/auth";
import { formatBranchName } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { radii, typography, useTheme } from "@/lib/theme";
import { useTonePalette, type PillTone } from "./tone-palette";
export type { PillTone } from "./tone-palette";

type IconName = keyof typeof Ionicons.glyphMap;

function pressWithLightHaptic(callback?: () => void) {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  try {
    callback?.();
  } catch (error) {
    console.error("Zook chip action failed", error);
  }
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
  onPress?: () => void;
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
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.chipText, { color: palette.color }, textStyle]}
      >
        {children}
      </Text>
    </View>
  );

  if (!onPress) return chip;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === "string" ? children : undefined)}
      android_ripple={{ color: themePalette.border.default, borderless: false }}
      onPress={() => pressWithLightHaptic(onPress)}
      style={({ pressed }) => [styles.chipPressable, pressed ? styles.pressed : null]}
    >
      {chip}
    </Pressable>
  );
}

export function Pill(props: Parameters<typeof ZookChip>[0]) {
  return <ZookChip {...props} />;
}

export function normalizePillTone(tone?: PillTone | "danger" | null): PillTone {
  return tone === "danger" ? "red" : tone ?? "neutral";
}

export function toneForStatusLabel(status: string): PillTone {
  const normalized = status.toLowerCase().replace(/[_-]+/g, " ");
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
    normalized.includes("expiring") ||
    normalized.includes("past due") ||
    normalized.includes("low")
  ) {
    return "amber";
  }
  if (
    normalized.includes("expired") ||
    normalized.includes("flagged") ||
    normalized.includes("failed") ||
    normalized.includes("suspended") ||
    normalized.includes("cancelled") ||
    normalized.includes("canceled")
  ) {
    return "red";
  }
  return "neutral";
}

type StatusChipProps = Omit<Parameters<typeof ZookChip>[0], "children"> & {
  status?: string;
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

export function BranchSelectorChip() {
  const { branches, selectedBranch, selectBranch } = useBranchSelection();
  const { session, activeOrgId } = useAuth();
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
  const activeOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization ??
    null;
  const branchLabel = formatBranchName(
    activeOrganization?.name ?? null,
    selectedBranch.name,
  );

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
        {branchLabel ?? selectedBranch.name}
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

const styles = StyleSheet.create({
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
  branchSelectorText: {
    maxWidth: 112,
    ...typography.caption,
    flexShrink: 1,
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
    fontSize: 9,
    lineHeight: 11,
    fontFamily: "Inter_800ExtraBold",
    fontVariant: ["tabular-nums"],
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});

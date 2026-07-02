import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/primitives";
import { normalizeWebUrl } from "@/lib/api";
import type { GymProfileData } from "@/lib/domains";
import { formatBranchName } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";

type PublicBranch = NonNullable<GymProfileData["branches"]>[number];

type GymBranchSelectorProps = {
  alternateBranches: PublicBranch[];
  branchSelectorVisible: boolean;
  gymName?: string | null;
  onOpenDirections: () => void;
  onSelectBranch: (branchId: string) => void;
  selectedLocationMeta: string;
  selectedLocationTitle: string;
};

function compactBranchName(orgName: string | null | undefined, branchName?: string | null) {
  const cleanedBranch = branchName?.trim();
  if (!cleanedBranch) return "";
  const orgFirstWord = orgName?.trim().split(/\s+/)[0];
  if (!orgFirstWord || orgFirstWord.length < 4) return cleanedBranch;
  const escapedOrg = orgFirstWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedOrg}\\s+`, "i");
  return cleanedBranch.replace(pattern, "").trim() || cleanedBranch;
}

export function GymBranchSelector({
  alternateBranches,
  branchSelectorVisible,
  gymName,
  onOpenDirections,
  onSelectBranch,
  selectedLocationMeta,
  selectedLocationTitle,
}: GymBranchSelectorProps) {
  const { t } = useI18n();
  const { palette } = useTheme();

  return (
    <Card variant="compact" contentStyle={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: palette.text.secondary }]}>
            {t("gymProfile.location")}
          </Text>
          <Text numberOfLines={2} style={[styles.title, { color: palette.text.primary }]}>
            {selectedLocationTitle}
          </Text>
          {selectedLocationMeta ? (
            <Text numberOfLines={1} style={[styles.address, { color: palette.text.secondary }]}>
              {selectedLocationMeta}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("gymProfile.getDirections")}
          onPress={onOpenDirections}
          style={({ pressed }) => [
            styles.directionsButton,
            {
              backgroundColor: palette.surface.accentSoft,
              borderColor: palette.border.focus,
            },
            pressed ? styles.chipPressed : null,
          ]}
        >
          <Ionicons name="navigate-outline" size={18} color={palette.accent.base} />
        </Pressable>
      </View>
      {branchSelectorVisible && alternateBranches.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {alternateBranches.map((branch) => {
            const hasMapLocation = Boolean(
              normalizeWebUrl(branch.googleMapsUrl) ||
                (branch.latitude != null && branch.longitude != null),
            );
            const branchName =
              formatBranchName(gymName, branch.name, {
                collapseOrgMatch: true,
                fallback: branch.city ?? t("branch.current"),
              }) ?? branch.name;
            const branchChipName = compactBranchName(gymName, branchName);
            return (
              <Pressable
                key={branch.id}
                accessibilityRole="button"
                accessibilityLabel={`${branchChipName}, ${t("branch.useBranch")}`}
                onPress={() => onSelectBranch(branch.id)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: palette.bg.sunken,
                    borderColor: palette.border.subtle,
                  },
                  pressed ? styles.chipPressed : null,
                ]}
              >
                <Ionicons
                  name={hasMapLocation ? "navigate-outline" : "alert-circle-outline"}
                  size={13}
                  color={hasMapLocation ? palette.text.secondary : palette.feedback.warning}
                />
                <Text numberOfLines={1} style={[styles.chipText, { color: palette.text.secondary }]}>
                  {branchChipName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  eyebrow: {
    ...typography.eyebrow,
  },
  title: {
    ...typography.cardTitle,
  },
  address: {
    ...typography.small,
  },
  directionsButton: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  rail: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  chip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    maxWidth: 168,
    minHeight: 34,
    paddingHorizontal: spacing.md,
  },
  chipText: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  chipPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
});

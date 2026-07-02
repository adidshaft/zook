import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, SectionHeader } from "@/components/primitives";
import { getTonePalette } from "@/components/primitives/tone-palette";
import { formatLongDate } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";
import { membershipStatusLabel, toneForStatus } from "./helpers";
import type { MembershipRecord } from "./types";

export function MembershipHistorySection({ subscriptions }: { subscriptions: MembershipRecord[] }) {
  const { mode, palette } = useTheme();
  const t = useT();
  if (subscriptions.length <= 1) {
    return null;
  }
  return (
    <>
      <SectionHeader title={t("member.membership.history")} />
      <View style={styles.stack}>
        {subscriptions.slice(1).map((subscription) => (
          <Card key={subscription.id} variant="compact" contentStyle={styles.historyContent}>
            <View style={styles.historyRow}>
              <View style={styles.historyCopy}>
                <Text numberOfLines={1} style={[styles.historyTitle, { color: palette.text.primary }]}>
                  {subscription.plan?.name ?? t("member.membership.eyebrow")}
                </Text>
                <Text numberOfLines={1} style={[styles.historyBody, { color: palette.text.secondary }]}>
                  {subscription.organization?.name ?? t("member.home.gymFallback")} ·{" "}
                  {subscription.endsAt ? formatLongDate(subscription.endsAt) : t("member.membership.noExpiry")}
                </Text>
              </View>
              <StatusMark
                colorMode={mode}
                label={membershipStatusLabel(subscription.status, t)}
                palette={palette}
                tone={toneForStatus(subscription.status)}
              />
            </View>
          </Card>
        ))}
      </View>
    </>
  );
}

function StatusMark({
  colorMode,
  label,
  palette,
  tone,
}: {
  colorMode: "light" | "dark";
  label: string;
  palette: ReturnType<typeof useTheme>["palette"];
  tone: ReturnType<typeof toneForStatus>;
}) {
  const tonePalette = getTonePalette(tone, colorMode, palette);
  const icon = tone === "red" ? "alert-circle-outline" : tone === "amber" ? "time-outline" : tone === "lime" ? "checkmark" : "ellipse-outline";
  return (
    <View
      accessibilityLabel={label}
      accessible
      style={[
        styles.statusMark,
        {
          borderColor: tonePalette.borderColor,
          backgroundColor: tonePalette.backgroundColor,
        },
      ]}
    >
      <Ionicons name={icon} size={13} color={tonePalette.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 8,
  },
  historyContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  historyCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  historyTitle: {
    ...typography.cardTitle,
  },
  historyBody: {
    ...typography.small,
  },
  statusMark: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
});

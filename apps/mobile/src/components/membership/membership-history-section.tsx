import { StyleSheet, Text, View } from "react-native";
import { Card, Pill, SectionHeader } from "@/components/primitives";
import { formatLongDate, titleCaseFromCode } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";
import { toneForStatus } from "./helpers";
import type { MembershipRecord } from "./types";

export function MembershipHistorySection({ subscriptions }: { subscriptions: MembershipRecord[] }) {
  const { palette } = useTheme();
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
              <Pill tone={toneForStatus(subscription.status)}>
                {titleCaseFromCode(subscription.status ?? "ACTIVE")}
              </Pill>
            </View>
          </Card>
        ))}
      </View>
    </>
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
  },
  historyTitle: {
    ...typography.cardTitle,
  },
  historyBody: {
    ...typography.small,
  },
});

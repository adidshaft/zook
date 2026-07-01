import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card, IconBubble } from "@/components/primitives";
import type { MemberHomeData } from "@/lib/domains/shared/types";
import { formatLongDate, titleCaseFromCode } from "@/lib/formatting";
import { type TranslationKey, useT } from "@/lib/i18n";
import { spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

function membershipTone(membership?: MemberHomeData["activeMembership"]) {
  if (!membership) return "amber";
  const status = String(membership.status ?? "").toUpperCase();
  if (["EXPIRED", "CANCELLED", "FAILED", "PAST_DUE"].includes(status)) return "red";
  if (status === "PAUSED" || (typeof membership.daysLeft === "number" && membership.daysLeft <= 7)) {
    return "amber";
  }
  return "lime";
}

const membershipStatusLabelKeys: Record<string, TranslationKey> = {
  ACTIVE: "memberList.status.active",
  EXPIRED: "memberList.status.expired",
  PAST_DUE: "memberList.status.expired",
  PENDING: "memberList.status.pending",
  PENDING_PAYMENT: "memberList.status.pending",
};

function membershipStatusLabel(status: string | null | undefined, t: ReturnType<typeof useT>) {
  const key = String(status ?? "ACTIVE").toUpperCase();
  const labelKey = membershipStatusLabelKeys[key];
  return labelKey ? t(labelKey) : titleCaseFromCode(status ?? "ACTIVE");
}

export function MembershipSummary({
  membership,
  onViewDetail,
}: {
  membership?: MemberHomeData["activeMembership"];
  onViewDetail: () => void;
}) {
  const { palette } = useTheme();
  const t = useT();
  const status = String(membership?.status ?? "").toUpperCase();
  const hasMembership = Boolean(membership);
  const isBlocked = ["EXPIRED", "CANCELLED", "FAILED", "PAST_DUE"].includes(status);
  const title = !hasMembership
    ? t("member.you.noActiveMembership")
    : isBlocked
      ? t("member.you.membershipNeedsAttention")
      : t("member.you.activeMembership");
  const detail =
    typeof membership?.daysLeft === "number"
      ? t("member.home.daysLeft", { count: membership.daysLeft })
      : typeof membership?.remainingVisits === "number"
        ? t("member.you.visitsLeft", { count: membership.remainingVisits })
        : membership?.endsAt
          ? t("member.you.validUntil", { date: formatLongDate(membership.endsAt) })
          : hasMembership
            ? membershipStatusLabel(membership?.status, t)
            : t("member.you.findMembershipPlan");
  return (
    <Card variant="compact" contentStyle={styles.card}>
      <IconBubble icon="card-outline" tone={membershipTone(membership)} size={42} />
      <View style={styles.copy}>
        <Text numberOfLines={2} style={[styles.title, { color: palette.text.primary }]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: palette.text.secondary }]}>
          {detail}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasMembership ? t("member.you.viewMembership") : t("member.you.browsePlans")}
        onPress={onViewDetail}
        hitSlop={8}
        style={({ pressed }) => [
          styles.detailAction,
          {
            borderColor: palette.border.subtle,
            backgroundColor: palette.surface.raised,
          },
          pressed ? styles.detailActionPressed : null,
        ]}
      >
        <Ionicons name="chevron-forward" size={18} color={palette.text.secondary} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  copy: { flex: 1, gap: 3, minWidth: 0 },
  title: typography.cardTitle,
  meta: typography.small,
  detailAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  detailActionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
});

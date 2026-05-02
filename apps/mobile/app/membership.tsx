import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  MobileHeader,
  Pill,
  SectionHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { formatLongDate, titleCaseFromCode } from "@/lib/formatting";
import { useMyMemberships } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

type MembershipRecord = {
  id: string;
  status?: string | null;
  endsAt?: string | null;
  remainingVisits?: number | null;
  createdAt?: string | null;
  plan?: {
    name?: string | null;
    type?: string | null;
  } | null;
  organization?: {
    name?: string | null;
  } | null;
};

function toneForStatus(status?: string | null) {
  if (status === "ACTIVE") return "lime" as const;
  if (status === "PENDING" || status === "PAST_DUE") return "amber" as const;
  if (status === "EXPIRED" || status === "CANCELLED") return "red" as const;
  return "blue" as const;
}

function daysUntil(dateStr?: string | null) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function MembershipScreen() {
  const routeParams = useLocalSearchParams<{
    focus?: string;
    notificationId?: string;
    subscriptionId?: string;
  }>();
  const membershipsQuery = useMyMemberships();
  const subscriptions = (membershipsQuery.data?.subscriptions ?? []) as MembershipRecord[];
  const sortedSubscriptions = [...subscriptions].sort((left, right) => {
    if (left.id === routeParams.subscriptionId) return -1;
    if (right.id === routeParams.subscriptionId) return 1;
    return 0;
  });
  const activeCount = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const expiringSoonCount = subscriptions.filter((s) => {
    if (s.status !== "ACTIVE" || !s.endsAt) return false;
    const days = daysUntil(s.endsAt);
    return days !== null && days <= 30;
  }).length;
  const latestSubscription = sortedSubscriptions[0];
  const latestDaysLeft = latestSubscription ? daysUntil(latestSubscription.endsAt) : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            eyebrow="Membership"
            title="Your plans"
            subtitle={activeCount > 0 ? `${activeCount} active membership${activeCount !== 1 ? "s" : ""}` : "No active plans"}
          />

          {routeParams.focus === "membership" ? (
            <GlassCard variant="selected" contentStyle={styles.calloutContent}>
              <IconBubble icon="notifications" tone="blue" size={36} />
              <View style={styles.calloutCopy}>
                <Text style={styles.calloutTitle}>Membership update</Text>
                <Text style={styles.calloutBody}>
                  {routeParams.subscriptionId ? "Your subscription has been updated." : "Showing your current status."}
                </Text>
              </View>
            </GlassCard>
          ) : null}

          {/* Summary row */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryChip, activeCount > 0 ? styles.summaryChipActive : null]}>
              <Text style={styles.summaryValue}>{activeCount}</Text>
              <Text style={styles.summaryLabel}>active</Text>
            </View>
            <View style={[styles.summaryChip, expiringSoonCount > 0 ? styles.summaryChipWarning : null]}>
              <Text style={styles.summaryValue}>{expiringSoonCount}</Text>
              <Text style={styles.summaryLabel}>expiring</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryValue}>{subscriptions.length}</Text>
              <Text style={styles.summaryLabel}>total</Text>
            </View>
          </View>

          {membershipsQuery.isLoading ? (
            <GlassCard variant="compact" contentStyle={styles.loadingContent}>
              <IconBubble icon="hourglass-outline" tone="amber" size={36} />
              <Text style={styles.loadingText}>Loading memberships...</Text>
            </GlassCard>
          ) : null}

          {!membershipsQuery.isLoading && !subscriptions.length ? (
            <GlassCard variant="compact" contentStyle={styles.emptyContent}>
              <IconBubble icon="card-outline" tone="neutral" size={42} />
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>No memberships yet</Text>
                <Text style={styles.emptyBody}>Join a gym to see your membership here.</Text>
              </View>
              <ZookButton href="/find-gyms" icon="search-outline">Browse gyms</ZookButton>
            </GlassCard>
          ) : null}

          {/* Featured membership */}
          {latestSubscription ? (
            <>
              <SectionHeader title="Current plan" />
              <GlassCard
                variant={latestSubscription.status === "ACTIVE" ? "success" : "default"}
                contentStyle={styles.featuredContent}
              >
                <View style={styles.featuredHeader}>
                  <IconBubble icon="card-outline" tone={toneForStatus(latestSubscription.status)} size={40} />
                  <View style={styles.featuredCopy}>
                    <Text style={styles.featuredTitle}>
                      {latestSubscription.plan?.name ?? "Membership"}
                    </Text>
                    <Text style={styles.featuredOrg}>
                      {latestSubscription.organization?.name ?? "Gym"}
                    </Text>
                  </View>
                  <Pill tone={toneForStatus(latestSubscription.status)}>
                    {titleCaseFromCode(latestSubscription.status ?? "ACTIVE")}
                  </Pill>
                </View>

                {/* Progress indicator */}
                {latestDaysLeft !== null ? (
                  <View style={styles.progressSection}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.max(5, Math.min(100, (latestDaysLeft / 30) * 100))}%` },
                          latestDaysLeft <= 7 ? styles.progressFillWarning : null,
                        ]}
                      />
                    </View>
                    <View style={styles.progressLabels}>
                      <Text style={[styles.progressText, latestDaysLeft <= 7 ? styles.progressTextWarning : null]}>
                        {latestDaysLeft} day{latestDaysLeft !== 1 ? "s" : ""} left
                      </Text>
                      <Text style={styles.progressTextMuted}>
                        {latestSubscription.endsAt ? formatLongDate(latestSubscription.endsAt) : ""}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {latestSubscription.remainingVisits !== null && latestSubscription.remainingVisits !== undefined ? (
                  <View style={styles.visitsBadge}>
                    <Ionicons name="walk-outline" size={14} color={colors.lime} />
                    <Text style={styles.visitsText}>{latestSubscription.remainingVisits} visits remaining</Text>
                  </View>
                ) : null}

                {latestDaysLeft !== null && latestDaysLeft <= 7 ? (
                  <ZookButton href="/find-gyms" icon="refresh-outline">Renew membership</ZookButton>
                ) : null}
              </GlassCard>
            </>
          ) : null}

          {/* Other memberships */}
          {sortedSubscriptions.length > 1 ? (
            <>
              <SectionHeader title="History" />
              <View style={styles.stack}>
                {sortedSubscriptions.slice(1).map((subscription) => (
                  <GlassCard key={subscription.id} variant="compact" contentStyle={styles.historyContent}>
                    <View style={styles.historyRow}>
                      <View style={styles.historyCopy}>
                        <Text numberOfLines={1} style={styles.historyTitle}>
                          {subscription.plan?.name ?? "Membership"}
                        </Text>
                        <Text numberOfLines={1} style={styles.historyBody}>
                          {subscription.organization?.name ?? "Gym"} · {subscription.endsAt ? formatLongDate(subscription.endsAt) : "No expiry"}
                        </Text>
                      </View>
                      <Pill tone={toneForStatus(subscription.status)}>
                        {titleCaseFromCode(subscription.status ?? "ACTIVE")}
                      </Pill>
                    </View>
                  </GlassCard>
                ))}
              </View>
            </>
          ) : null}

          {/* Payment history */}
          <SectionHeader title="Payments" />
          <GlassCard variant="compact" contentStyle={styles.emptyPaymentContent}>
            <IconBubble icon="receipt-outline" tone="neutral" size={36} />
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>No payments yet</Text>
              <Text style={styles.emptyBody}>Transaction history will appear here.</Text>
            </View>
          </GlassCard>
        </ScrollView>
        <BottomNav />
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 14,
    paddingBottom: layout.bottomNavContentPadding,
  },
  calloutContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  calloutCopy: {
    flex: 1,
    gap: 4,
  },
  calloutTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  calloutBody: {
    color: colors.muted,
    ...typography.body,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryChip: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
    gap: 2,
  },
  summaryChipActive: {
    borderColor: "rgba(185,244,85,0.3)",
    backgroundColor: "rgba(185,244,85,0.06)",
  },
  summaryChipWarning: {
    borderColor: "rgba(242,201,76,0.3)",
    backgroundColor: "rgba(242,201,76,0.06)",
  },
  summaryValue: {
    color: colors.text,
    ...typography.cardTitle,
  },
  summaryLabel: {
    color: colors.muted,
    ...typography.small,
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    color: colors.muted,
    ...typography.body,
  },
  emptyContent: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyCopy: {
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  emptyBody: {
    color: colors.muted,
    ...typography.body,
    textAlign: "center",
  },
  featuredContent: {
    gap: spacing.md,
  },
  featuredHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  featuredCopy: {
    flex: 1,
    gap: 4,
  },
  featuredTitle: {
    color: colors.text,
    ...typography.headerTitle,
  },
  featuredOrg: {
    color: colors.muted,
    ...typography.body,
  },
  progressSection: {
    gap: 6,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.lime,
  },
  progressFillWarning: {
    backgroundColor: colors.amber,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    color: colors.lime,
    ...typography.caption,
  },
  progressTextWarning: {
    color: colors.amber,
  },
  progressTextMuted: {
    color: colors.muted,
    ...typography.small,
  },
  visitsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.2)",
    backgroundColor: "rgba(185,244,85,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  visitsText: {
    color: colors.text,
    ...typography.caption,
  },
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
    color: colors.text,
    ...typography.cardTitle,
  },
  historyBody: {
    color: colors.muted,
    ...typography.small,
  },
  emptyPaymentContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
});

import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  GlassCard,
  IconBubble,
  ListRow,
  MobileHeader,
  SecondaryButton,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { mobileApiFetch, toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { legacyColors, layout, spacing, typography } from "@/lib/theme";

type PlatformSubscriptionsPayload = {
  summary: {
    totalOrgs: number;
    onTrial: number;
    active: number;
    suspended: number;
    cancelled: number;
    totalReferrals: number;
  };
  rows: Array<{
    orgId: string;
    orgName: string;
    username: string;
    orgStatus: string;
    subscriptionStatus: string | null;
    tier?: string | null;
    billingCycle?: string | null;
    priceLockedPaise?: number | null;
    creditPaise?: number | null;
    nextBillingAt: string | null;
    mandateStatus: string | null;
    mandatePaidCount: number;
    referredCount: number;
  }>;
};

function formatInr(paise?: number | null) {
  if (!paise) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusTone(status?: string | null) {
  if (!status) return "amber" as const;
  if (["ACTIVE", "AUTHENTICATED", "TRIAL_ACTIVE"].includes(status)) return "lime" as const;
  if (["SUSPENDED", "CANCELLED", "FAILED", "PAST_DUE"].includes(status)) return "red" as const;
  return "amber" as const;
}

export default function PlatformMobile() {
  const { logout, session, token } = useAuth();
  const platformEmail = encodeURIComponent(session?.user.email || "platform@zook.local");
  const platformWebUrl = toWebUrl(
    `/login?redirect=${encodeURIComponent("/platform")}&email=${platformEmail}`,
  );
  const subscriptionsQuery = useQuery({
    queryKey: ["platform", "subscriptions"],
    queryFn: () =>
      mobileApiFetch<PlatformSubscriptionsPayload>("/platform/subscriptions", {
        token,
      }),
    enabled: Boolean(token && session?.user.isPlatformAdmin),
    staleTime: 60_000,
  });
  const summary = subscriptionsQuery.data?.summary;
  const rows = subscriptionsQuery.data?.rows.slice(0, 8) ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="platform-home-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            eyebrow="Platform operator"
            title="Platform billing"
            subtitle={`${session?.user.name ?? "Platform team"} · SaaS health and mandate state`}
            chip={<StatusChip status="Live overview" tone="lime" />}
            centered
            showProfileShortcut={false}
          />

          <ZookButton
            testID="platform-open-web-dashboard"
            icon="open-outline"
            onPress={() => void Linking.openURL(platformWebUrl)}
            style={styles.primaryAction}
          >
            Open Web Dashboard
          </ZookButton>

          <GlassCard contentStyle={styles.heroContent}>
            <IconBubble icon="shield-checkmark-outline" tone="amber" size={52} />
            <View style={styles.heroCopy}>
              <Text style={styles.title}>SaaS subscriptions are visible on mobile.</Text>
              <Text style={styles.body}>
                Use this screen for quick billing health checks. Pricing edits, trial extensions,
                credits, notes, and policy changes still open in the web console for full review.
              </Text>
            </View>
          </GlassCard>

          <GlassCard variant="compact" contentStyle={styles.stack}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>SaaS health</Text>
              {subscriptionsQuery.isFetching ? (
                <StatusChip status="Refreshing" tone="amber" />
              ) : (
                <StatusChip status="Cached" tone="lime" />
              )}
            </View>
            {summary ? (
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCell}>
                  <Text style={styles.metricValue}>{summary.totalOrgs}</Text>
                  <Text style={styles.metricLabel}>gyms</Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={styles.metricValue}>{summary.active}</Text>
                  <Text style={styles.metricLabel}>paying</Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={styles.metricValue}>{summary.onTrial}</Text>
                  <Text style={styles.metricLabel}>trial</Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={styles.metricValue}>{summary.totalReferrals}</Text>
                  <Text style={styles.metricLabel}>referrals</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.body}>
                {subscriptionsQuery.isError
                  ? "Unable to load platform subscriptions right now."
                  : "Loading subscription health..."}
              </Text>
            )}
          </GlassCard>

          <GlassCard variant="compact" contentStyle={styles.stack}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent gyms</Text>
              <StatusChip status={`${rows.length} shown`} tone="amber" />
            </View>
            {rows.map((row) => (
              <ListRow
                key={row.orgId}
                title={row.orgName}
                subtitle={`${row.tier ?? "FREE"} ${row.billingCycle ?? "MONTHLY"} · ${formatInr(row.priceLockedPaise)} · next ${formatDate(row.nextBillingAt)} · ${row.referredCount} referrals`}
                icon="business-outline"
                tone={statusTone(row.subscriptionStatus ?? row.orgStatus)}
                trailing={
                  <View style={styles.rowStatus}>
                    <StatusChip
                      status={row.subscriptionStatus ?? row.orgStatus}
                      tone={statusTone(row.subscriptionStatus ?? row.orgStatus)}
                    />
                    <Text style={styles.rowMeta}>
                      Mandate {row.mandateStatus ?? "missing"} · {row.mandatePaidCount} paid
                    </Text>
                  </View>
                }
              />
            ))}
          </GlassCard>

          <SecondaryButton testID="platform-sign-out" icon="log-out-outline" onPress={() => void logout()}>
            Sign out
          </SecondaryButton>
        </ScrollView>
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
    gap: 16,
    paddingBottom: layout.bottomNavContentPadding,
  },
  primaryAction: {
    alignSelf: "stretch",
  },
  heroContent: {
    gap: spacing.md,
  },
  heroCopy: {
    gap: 8,
  },
  title: {
    color: legacyColors.text,
    ...typography.screenTitle,
  },
  body: {
    color: legacyColors.muted,
    ...typography.body,
  },
  stack: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sectionTitle: {
    color: legacyColors.text,
    ...typography.sectionTitle,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  summaryCell: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 82,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: legacyColors.border,
    backgroundColor: legacyColors.surface,
    padding: spacing.md,
    justifyContent: "center",
  },
  metricValue: {
    color: legacyColors.text,
    ...typography.metric,
  },
  metricLabel: {
    color: legacyColors.muted,
    ...typography.caption,
  },
  rowStatus: {
    alignItems: "flex-end",
    gap: 4,
    maxWidth: 132,
  },
  rowMeta: {
    color: legacyColors.muted,
    textAlign: "right",
    ...typography.caption,
  },
});

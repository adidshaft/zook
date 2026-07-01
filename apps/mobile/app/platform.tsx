import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Card,
  ListRow,
  AppHeader,
  QueryErrorState,
  SecondaryButton,
  StatusChip,
  toneForStatusLabel,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { mobileApiFetch, toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatInr } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

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

function formatDate(value: string | null | undefined, notScheduled: string) {
  if (!value) return notScheduled;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function PlatformMobile() {
  const { logout, session, token } = useAuth();
  const { palette } = useTheme();
  const t = useT();
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
          <AppHeader
            eyebrow={t("platform.operator")}
            title={t("platform.billing")}
            centered
            showBack
          />

          <ZookButton
            testID="platform-open-web-dashboard"
            icon="open-outline"
            onPress={() => void Linking.openURL(platformWebUrl)}
            style={styles.primaryAction}
          >
            {t("platform.openWebDashboard")}
          </ZookButton>

          <Card contentStyle={styles.heroContent}>
            <View style={styles.heroCopy}>
              <Text style={[styles.title, { color: palette.text.primary }]}>{t("platform.mobileVisibilityTitle")}</Text>
              <Text style={[styles.body, { color: palette.text.secondary }]}>
                {t("platform.mobileVisibilityBody")}
              </Text>
            </View>
          </Card>

          <Card variant="compact" contentStyle={styles.stack}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>{t("platform.saasHealth")}</Text>
              {subscriptionsQuery.isFetching ? <StatusChip status={t("platform.updating")} tone="amber" /> : null}
            </View>
            {summary ? (
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryCell, { backgroundColor: palette.surface.raised, borderColor: palette.border.default }]}>
                  <Text style={[styles.metricValue, { color: palette.text.primary }]}>{summary.totalOrgs}</Text>
                  <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>{t("platform.gyms")}</Text>
                </View>
                <View style={[styles.summaryCell, { backgroundColor: palette.surface.raised, borderColor: palette.border.default }]}>
                  <Text style={[styles.metricValue, { color: palette.text.primary }]}>{summary.active}</Text>
                  <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>{t("platform.paying")}</Text>
                </View>
                <View style={[styles.summaryCell, { backgroundColor: palette.surface.raised, borderColor: palette.border.default }]}>
                  <Text style={[styles.metricValue, { color: palette.text.primary }]}>{summary.onTrial}</Text>
                  <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>{t("platform.trial")}</Text>
                </View>
                <View style={[styles.summaryCell, { backgroundColor: palette.surface.raised, borderColor: palette.border.default }]}>
                  <Text style={[styles.metricValue, { color: palette.text.primary }]}>{summary.totalReferrals}</Text>
                  <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>{t("platform.referrals")}</Text>
                </View>
              </View>
            ) : subscriptionsQuery.isError ? (
              <QueryErrorState
                error={subscriptionsQuery.error}
                onRetry={() => void subscriptionsQuery.refetch()}
              />
            ) : (
              <Text style={[styles.body, { color: palette.text.secondary }]}>{t("platform.loadingSubscriptionHealth")}</Text>
            )}
          </Card>

          <Card variant="compact" contentStyle={styles.stack}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>{t("platform.recentGyms")}</Text>
            </View>
            {rows.map((row) => {
              const status = row.subscriptionStatus ?? row.orgStatus;
              return (
                <ListRow
                  key={row.orgId}
                  title={row.orgName}
                  subtitle={t("platform.gymSubtitle", {
                    tier: row.tier ?? "FREE",
                    cycle: row.billingCycle ?? "MONTHLY",
                    amount: formatInr(row.priceLockedPaise),
                    next: formatDate(row.nextBillingAt, t("platform.notScheduled")),
                    referrals: row.referredCount,
                  })}
                  icon="business-outline"
                  tone={toneForStatusLabel(status)}
                  trailing={
                    <View style={styles.rowStatus}>
                      <StatusChip status={status} />
                      <Text style={[styles.rowMeta, { color: palette.text.secondary }]}>
                        {t("platform.mandateMeta", {
                          status: row.mandateStatus ?? t("platform.missing"),
                          count: row.mandatePaidCount,
                        })}
                      </Text>
                    </View>
                  }
                />
              );
            })}
          </Card>

          <SecondaryButton testID="platform-sign-out" icon="log-out-outline" onPress={() => void logout()}>
            {t("platform.signOut")}
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
    paddingTop: layout.screenContentTopPadding,
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
    ...typography.screenTitle,
  },
  body: {
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
    padding: spacing.md,
    justifyContent: "center",
  },
  metricValue: {
    ...typography.metric,
  },
  metricLabel: {
    ...typography.caption,
  },
  rowStatus: {
    alignItems: "flex-end",
    gap: 4,
    maxWidth: 132,
  },
  rowMeta: {
    textAlign: "right",
    ...typography.caption,
  },
});

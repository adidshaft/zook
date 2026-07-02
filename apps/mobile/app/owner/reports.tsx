import { Stack } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { MetricGrid, type MetricTileItem } from "@/components/domain/metric-grid";
import {
  BranchSelectorChip,
  Card,
  HeaderActions,
  QueryErrorState,
  ScreenHeader,
  SectionHeader,
  Skeleton,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { WebHandoffRow } from "@/components/web-handoff-row";
import { OwnerDashboardCharts } from "@/features/owner/components/dashboard-charts";
import { useOwnerReportsSummary } from "@/lib/domains/owner";
import { formatCompactNumber, formatInr } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { layout, spacing, useTheme } from "@/lib/theme";

export default function OwnerReportsScreen() {
  const { palette } = useTheme();
  const t = useT();
  const dashboardQuery = useOwnerReportsSummary();
  const dashboard = dashboardQuery.data;
  const metrics: MetricTileItem[] = [
    {
      label: t("owner.home.revenue"),
      value: formatInr(dashboard?.summary?.revenuePaise ?? 0),
      hint: t("owner.home.collectedPickup"),
      tone: "amber",
      icon: "trending-up-outline",
    },
    {
      label: t("owner.home.todayCheckIns"),
      value: formatCompactNumber(dashboard?.summary?.todayAttendance ?? 0),
      tone: "blue",
      icon: "qr-code-outline",
    },
    {
      label: t("owner.home.activeMembers"),
      value: formatCompactNumber(dashboard?.summary?.activeMembers ?? 0),
      tone: "blue",
      icon: "people-outline",
    },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-reports-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={dashboardQuery.isRefetching}
              onRefresh={() => void dashboardQuery.refetch()}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
        >
          <ScreenHeader
            title={t("owner.more.reports")}
            showBack
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip style={styles.headerBranchSelector} />
              </View>
            }
            trailing={<HeaderActions showBell />}
          />
          {dashboardQuery.isLoading ? (
            <Card variant="compact" contentStyle={styles.loadingCard}>
              <Skeleton height={18} width="50%" />
              <Skeleton height={72} />
            </Card>
          ) : null}
          {dashboardQuery.isError ? (
            <QueryErrorState error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} />
          ) : null}
          {dashboard ? (
            <>
              <MetricGrid items={metrics} />
              <OwnerDashboardCharts charts={dashboard.charts} />
              <SectionHeader title={t("owner.more.webControlRoom")} />
              <Card variant="compact" contentStyle={styles.webCard}>
                <WebHandoffRow
                  title={t("owner.more.reports")}
                  subtitle={t("webHandoff.opensInBrowser")}
                  path="/dashboard/reports"
                />
              </Card>
            </>
          ) : null}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  headerContext: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 0,
    width: "100%",
  },
  headerBranchSelector: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding + 32,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  loadingCard: {
    gap: spacing.sm,
  },
  webCard: {
    gap: spacing.xs,
  },
});

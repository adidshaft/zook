import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { MetricTile } from "@/components/primitives";
import type { OwnerDashboardData } from "@/lib/domains/shared/types";
import { formatCompactNumber, formatInr } from "@/lib/formatting";

export function CommandMetrics({
  dashboard,
  pendingApprovals,
}: {
  dashboard: OwnerDashboardData;
  pendingApprovals: number;
}) {
  const router = useRouter();
  const branchName =
    dashboard.branchScope?.selectedBranch?.name ??
    dashboard.branchScope?.defaultBranch?.name ??
    "Main branch";

  return (
    <View testID="owner-view-command" style={styles.metricGrid}>
      <Pressable
        onPress={() => router.replace("/owner/members")}
        accessibilityRole="button"
        accessibilityLabel="Open members"
        style={styles.metricHalf}
      >
        <MetricTile
          label="Active members"
          value={formatCompactNumber(dashboard.summary?.activeMembers ?? 0)}
          detail={branchName}
          tone="lime"
          icon="people-outline"
        />
      </Pressable>
      <Pressable
        onPress={() => router.replace("/owner/approvals")}
        accessibilityRole="button"
        accessibilityLabel="Open scan reviews"
        style={styles.metricHalf}
      >
        <MetricTile
          label="Today check-ins"
          value={formatCompactNumber(dashboard.summary?.todayAttendance ?? 0)}
          detail={`${dashboard.summary?.pendingAttendanceApprovals ?? 0} pending review`}
          tone="blue"
          icon="qr-code-outline"
        />
      </Pressable>
      <Pressable
        onPress={() => router.replace("/owner/revenue")}
        accessibilityRole="button"
        accessibilityLabel="Open revenue"
        style={styles.metricHalf}
      >
        <MetricTile
          label="Revenue"
          value={formatInr(dashboard.summary?.revenuePaise ?? 0)}
          detail="Collected + pickup"
          tone="amber"
          icon="trending-up-outline"
        />
      </Pressable>
      <Pressable
        onPress={() => router.replace("/owner/approvals")}
        accessibilityRole="button"
        accessibilityLabel="Open approvals"
        style={styles.metricHalf}
      >
        <MetricTile
          label="Approvals"
          value={String(pendingApprovals)}
          detail="Needs attention"
          tone="violet"
          icon="checkmark-done-outline"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricHalf: {
    flexBasis: "47%",
    flexGrow: 1,
  },
});

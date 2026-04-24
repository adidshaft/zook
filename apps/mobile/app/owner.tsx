import { ScrollView, StyleSheet, Text } from "react-native";
import { Card, Pill, Screen } from "@/components/primitives";
import { useOwnerDashboard } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

export default function Owner() {
  const dashboardQuery = useOwnerDashboard();
  const dashboard = dashboardQuery.data as { metrics?: Array<{ label: string; value: string; delta: string }>; organization?: { status?: string } } | undefined;
  const metrics = dashboard?.metrics ?? [];

  return (
    <Screen title="Owner">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Card>
          <Pill tone="lime">{dashboard?.organization?.status ?? "Loading"}</Pill>
          <Text style={styles.title} selectable>
            Owner command center
          </Text>
          <Text style={styles.body} selectable>
            Manage staff, permissions, plans, coupons, referrals, reports, shop, AI, billing, privacy, and public profile.
          </Text>
        </Card>
        {dashboardQuery.isLoading ? (
          <Card>
            <Text style={styles.body}>Loading owner dashboard...</Text>
          </Card>
        ) : null}
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <Text style={styles.body} selectable>
              {metric.label}
            </Text>
            <Text style={styles.metric} selectable>
              {metric.value}
            </Text>
            <Text style={styles.body} selectable>
              {metric.delta}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: 12 },
  body: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  metric: { color: colors.lime, fontSize: 38, fontWeight: "900", marginTop: 8 }
});

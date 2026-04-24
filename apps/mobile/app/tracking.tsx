import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { personalTrackingDashboard } from "@zook/core";
import { Card, PrimaryLink, Screen } from "@/components/primitives";
import {
  TrackingSectionHeader,
  TrackingSummaryTile,
  WorkoutLogCard
} from "@/components/tracking";
import { colors } from "@/lib/theme";

export default function TrackingDashboard() {
  return (
    <>
      <Stack.Screen options={{ title: "Tracking" }} />
      <Screen title="Tracking">
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          <View style={styles.heroHeader}>
            <Text style={styles.headline} selectable>
              {personalTrackingDashboard.headline}
            </Text>
            <Text style={styles.subheadline} selectable>
              {personalTrackingDashboard.subheadline}
            </Text>
          </View>

          <View style={styles.metricGrid}>
            {personalTrackingDashboard.summaryMetrics.map((metric) => (
              <TrackingSummaryTile key={metric.id} metric={metric} />
            ))}
          </View>

          <TrackingSectionHeader title="Today's workout" href="/tracking-entry" linkLabel="Add exercises" />
          <WorkoutLogCard entry={personalTrackingDashboard.todayLog} />

          <Card style={styles.weekCard}>
            <Text style={styles.weekEyebrow} selectable>
              Weekly summary
            </Text>
            <Text style={styles.weekValue} selectable>
              {personalTrackingDashboard.weekDurationLabel}
            </Text>
            <Text style={styles.weekBody} selectable>
              {personalTrackingDashboard.weekSessionsLabel} · {personalTrackingDashboard.streakLabel}
            </Text>
            <PrimaryLink href="/tracking-history">View history</PrimaryLink>
          </Card>

          <TrackingSectionHeader title="Recent logs" href="/tracking-history" />
          <View style={styles.logList}>
            {personalTrackingDashboard.recentLogs.map((entry) => (
              <WorkoutLogCard key={entry.id} entry={entry} compact />
            ))}
          </View>
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40
  },
  heroHeader: {
    gap: 8
  },
  headline: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 40
  },
  subheadline: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  metricGrid: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap"
  },
  weekCard: {
    gap: 10
  },
  weekEyebrow: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: "800"
  },
  weekValue: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900"
  },
  weekBody: {
    color: colors.muted,
    lineHeight: 20
  },
  logList: {
    gap: 14
  }
});

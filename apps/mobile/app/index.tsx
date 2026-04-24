import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { dashboardMetrics, personalTrackingDashboard } from "@zook/core";
import { Card, Dock, Pill, PrimaryLink, Screen } from "@/components/primitives";
import {
  TrackingSectionHeader,
  TrackingSummaryTile,
  WorkoutLogCard
} from "@/components/tracking";
import { useAuth } from "@/lib/auth";
import { useMemberHome } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

export default function Home() {
  const { activeOrgId, session } = useAuth();
  const homeQuery = useMemberHome();
  const memberHome = homeQuery.data;
  const activeOrganization =
    memberHome?.activeOrganization ??
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization;
  const initials =
    session?.user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "Z";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          <View style={styles.topbar}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.muted} selectable>
                Current gym
              </Text>
              <Text style={styles.gymName} selectable>
                {activeOrganization?.name ?? "Choose your gym"}
              </Text>
            </View>
            <Pill tone={session?.user.guardianPending ? "amber" : "lime"}>
              {session?.user.guardianPending ? "Consent pending" : "Active"}
            </Pill>
          </View>

          <Card style={styles.hero}>
            <View style={{ gap: 8 }}>
              <Text style={styles.heroEyebrow} selectable>
                Member home
              </Text>
              <Text style={styles.heroTitle} selectable>
                Ready for today?
              </Text>
              <Text style={styles.heroBody} selectable>
                Scan attendance, keep your membership in view, and track movement without leaving the gym flow.
              </Text>
            </View>
            <PrimaryLink href="/scan">Scan QR</PrimaryLink>
          </Card>

          <View style={styles.grid}>
            <Card style={styles.half}>
              <Text style={styles.muted} selectable>
                Active membership
              </Text>
              <Text style={styles.cardTitle} selectable>
                {memberHome?.activePlan?.name ?? "No active plan"}
              </Text>
              <Text style={styles.detail} selectable>
                {memberHome?.activeMembership?.endsAt
                  ? `Ends ${new Date(memberHome.activeMembership.endsAt).toLocaleDateString()}`
                  : "Choose a membership to get started"}
              </Text>
            </Card>
            <Card style={styles.half}>
              <Text style={styles.muted} selectable>
                Notifications
              </Text>
              <Text style={styles.metric} selectable>
                {memberHome?.unreadNotifications ?? 0}
              </Text>
              <Text style={styles.detail} selectable>
                {memberHome?.assignedPlans ?? 0} plans · {memberHome?.activeGoals ?? 0} goals
              </Text>
            </Card>
          </View>

          <TrackingSectionHeader title="Personal tracking" href="/tracking" linkLabel="Open" />

          <Text style={styles.trackingIntro} selectable>
            {personalTrackingDashboard.subheadline}
          </Text>

          <View style={styles.metricGrid}>
            {personalTrackingDashboard.summaryMetrics.slice(0, 2).map((metric) => (
              <TrackingSummaryTile key={metric.id} metric={metric} />
            ))}
          </View>

          <WorkoutLogCard entry={personalTrackingDashboard.todayLog} compact />

          <Card style={styles.goalCard}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={styles.goalEyebrow} selectable>
                This week
              </Text>
              <Text style={styles.goalValue} selectable>
                {personalTrackingDashboard.weekDurationLabel}
              </Text>
              <Text style={styles.detail} selectable>
                {personalTrackingDashboard.weekSessionsLabel} · {personalTrackingDashboard.streakLabel}
              </Text>
            </View>
            <PrimaryLink href="/tracking-entry">Add exercises</PrimaryLink>
          </Card>

          <View style={styles.metrics}>
            {dashboardMetrics.map((metric) => (
              <Card key={metric.label} style={styles.metricCard}>
                <Text style={styles.muted} selectable>
                  {metric.label}
                </Text>
                <Text style={styles.metricSmall} selectable>
                  {metric.value}
                </Text>
                <Text style={styles.detail} selectable>
                  {metric.delta}
                </Text>
              </Card>
            ))}
          </View>

          <View style={{ height: 96 }} />
        </ScrollView>
        <Dock />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 120
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatar: {
    height: 52,
    width: 52,
    borderRadius: 18,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: colors.bg,
    fontWeight: "900",
    fontSize: 20
  },
  muted: {
    color: colors.muted,
    fontSize: 12
  },
  gymName: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 18
  },
  hero: {
    gap: 20,
    minHeight: 236,
    justifyContent: "space-between"
  },
  heroEyebrow: {
    color: colors.amber,
    fontWeight: "800"
  },
  heroTitle: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "900",
    lineHeight: 44
  },
  heroBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  trackingIntro: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  grid: {
    flexDirection: "row",
    gap: 12
  },
  half: {
    flex: 1
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  detail: {
    marginTop: 8,
    color: colors.muted,
    lineHeight: 20
  },
  metric: {
    color: colors.lime,
    fontSize: 38,
    fontWeight: "900",
    marginTop: 8
  },
  metricGrid: {
    flexDirection: "row",
    gap: 12
  },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  goalEyebrow: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: "800"
  },
  goalValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900"
  },
  metrics: {
    gap: 12
  },
  metricCard: {
    minHeight: 96
  },
  metricSmall: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8
  }
});

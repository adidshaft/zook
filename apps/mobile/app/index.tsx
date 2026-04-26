import { Stack, Link } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { zookDemoFixtures } from "@zook/core";
import {
  ActiveGymPill,
  Card,
  Dock,
  IconBubble,
  MetricTile,
  Pill,
  PrimaryLink,
  Screen,
  SecondaryLink,
  SectionHeader,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { useMemberHome } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

const demoOrg = zookDemoFixtures.organizations[0];
const demoBranch = zookDemoFixtures.branches[0];
const demoMembership = zookDemoFixtures.memberships.find((membership) => membership.id === "membership-aarav-hybrid");
const demoPlan = zookDemoFixtures.trainingPlans.find((plan) => plan.id === "plan-push-day");

export default function Home() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { activeOrgId, session } = useAuth();
  const homeQuery = useMemberHome();
  const memberHome = homeQuery.data;
  const activeOrganization =
    memberHome?.activeOrganization ??
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization;
  const memberName = session?.user.name || "Aarav Mehta";
  const firstName = memberName.split(" ")[0] || "Aarav";
  const orgName = activeOrganization?.name ?? demoOrg?.name ?? "Iron Temple Gym";
  const city = activeOrganization?.city ?? demoOrg?.city ?? "Pune";
  const daysLeft = memberHome?.activeMembership?.endsAt ? demoMembership?.daysLeft : demoMembership?.daysLeft;
  const remainingVisits = memberHome?.activeMembership?.remainingVisits ?? demoMembership?.remainingVisits ?? 8;
  const planName = memberHome?.activePlan?.name ?? demoPlan?.title ?? "Push Day";
  const usedPct = 73;

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["me", "home"] });
    setRefreshing(false);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.lime}
              colors={[colors.lime]}
            />
          }
        >
          <View style={styles.topbar}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>AM</Text>
            </View>
            <View style={styles.topbarCopy}>
              <Text style={styles.greeting}>Good morning, {firstName}</Text>
              <ActiveGymPill label={`${orgName} · ${city}`} />
            </View>
            <Link href="/notifications" asChild>
              <Pressable style={styles.bellButton} accessibilityRole="button" accessibilityLabel="Open notifications">
                <Ionicons name="notifications-outline" size={22} color={colors.text} />
                <View style={styles.unreadDot} />
              </Pressable>
            </Link>
          </View>

          <Card style={styles.membershipCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardEyebrow}>Active Membership</Text>
                <Text style={styles.membershipTitle}>Hybrid Pro</Text>
              </View>
              <View style={styles.progressRing}>
                <Text style={styles.progressValue}>{usedPct}%</Text>
                <Text style={styles.progressLabel}>used</Text>
              </View>
            </View>
            <View style={styles.membershipMeta}>
              <Pill tone="lime">{daysLeft ?? 22} days left</Pill>
              <Pill tone="blue">{remainingVisits} visits remaining</Pill>
              <Pill tone="neutral">{demoBranch?.name ?? "Default Branch"}</Pill>
            </View>
            <View style={styles.actionRow}>
              <PrimaryLink href="/scan" style={styles.actionHalf}>
                Scan QR
              </PrimaryLink>
              <SecondaryLink href="/tracking" style={styles.actionHalf}>
                Start Workout
              </SecondaryLink>
            </View>
          </Card>

          <Card style={styles.planCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardEyebrow}>Today's Plan</Text>
                <Text style={styles.cardTitle}>{planName}</Text>
              </View>
              <Pill tone="lime">Assigned</Pill>
            </View>
            <Text style={styles.cardBody}>6 exercises · Coach Rhea · Chest, Shoulders, Triceps</Text>
            <View style={styles.planMetaRow}>
              <Pill tone="neutral">60-75 min</Pill>
              <Pill tone="blue">Intermediate</Pill>
            </View>
            <PrimaryLink href="/plans" tone="secondary">
              Open Plan
            </PrimaryLink>
          </Card>

          <SectionHeader title="Activity" subtitle="This week at Iron Temple." />
          <View style={styles.metricGrid}>
            <MetricTile
              label="Streak"
              value={`${demoMembership?.streakDays ?? 5} days`}
              detail="Consistent check-ins"
              tone="lime"
              style={styles.metricHalf}
            />
            <MetricTile
              label="Last check-in"
              value={demoMembership?.lastCheckInLabel ?? "7:12 AM"}
              detail="Default Branch"
              tone="blue"
              style={styles.metricHalf}
            />
            <MetricTile
              label="Weekly goal"
              value={`${demoMembership?.weeklyGoalCompleted ?? 3}/${demoMembership?.weeklyGoalTarget ?? 5}`}
              detail="Visits completed"
              tone="amber"
              style={styles.metricHalf}
            />
            <MetricTile
              label="Inbox"
              value={`${memberHome?.unreadNotifications ?? 1}`}
              detail="Unread updates"
              tone="violet"
              style={styles.metricHalf}
            />
          </View>

          <SectionHeader title="Quick Links" />
          <View style={styles.quickGrid}>
            <QuickLink href="/find-gyms" icon="calendar-outline" label="Book a class" />
            <QuickLink href="/tracking" icon="analytics-outline" label="Body stats" />
            <QuickLink href="/membership" icon="card-outline" label="Payments" />
            <QuickLink href="/profile" icon="help-circle-outline" label="Support" />
          </View>
        </ScrollView>
        <Dock />
      </Screen>
    </>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <Link href={href as never} asChild>
      <Pressable style={styles.quickLink} accessibilityRole="button" accessibilityLabel={label}>
        <IconBubble icon={icon} tone="lime" size={42} />
        <Text style={styles.quickLabel}>{label}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 18,
    paddingBottom: 120,
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    height: 56,
    width: 56,
    borderRadius: 20,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.bg,
    fontWeight: "900",
    fontSize: 18,
  },
  topbarCopy: {
    flex: 1,
    gap: 7,
  },
  greeting: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "900",
  },
  bellButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 11,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lime,
  },
  membershipCard: {
    gap: 18,
    backgroundColor: "rgba(185,244,85,0.08)",
    borderColor: "rgba(185,244,85,0.24)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardEyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  membershipTitle: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    marginTop: 6,
  },
  progressRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 7,
    borderColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(7,9,8,0.52)",
  },
  progressValue: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
  },
  progressLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  membershipMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionHalf: {
    flex: 1,
  },
  planCard: {
    gap: 14,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "900",
  },
  cardBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  planMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricHalf: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickLink: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 92,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 14,
    justifyContent: "space-between",
  },
  quickLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
});

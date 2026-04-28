import { Link, Stack } from "expo-router";
import type { Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { zookDemoFixtures } from "@zook/core";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  MetricTile,
  SectionHeader,
  StatusRing,
  ZookButton,
  ZookChip,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { useMemberHome } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

const demoOrg = zookDemoFixtures.organizations[0];
const demoMembership = zookDemoFixtures.memberships.find((membership) => membership.id === "membership-aarav-hybrid");
const demoPlan = zookDemoFixtures.trainingPlans.find((plan) => plan.id === "plan-push-day");

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AM";
}

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
  const initials = initialsFor(memberName);
  const orgName = activeOrganization?.name ?? demoOrg?.name ?? "Iron Temple Gym";
  const city = activeOrganization?.city ?? demoOrg?.city ?? "Pune";
  const daysLeft = demoMembership?.daysLeft ?? 22;
  const remainingVisits = memberHome?.activeMembership?.remainingVisits ?? demoMembership?.remainingVisits ?? 8;
  const planName = memberHome?.activePlan?.name ?? demoPlan?.title ?? "Push Day";
  const streakDays = demoMembership?.streakDays ?? 5;
  const weeklyGoalCompleted = demoMembership?.weeklyGoalCompleted ?? 3;
  const weeklyGoalTarget = demoMembership?.weeklyGoalTarget ?? 5;

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["me", "home"] });
    setRefreshing(false);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
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
          <View style={styles.homeHeader}>
            <Link href="/profile" asChild>
              <Pressable
                style={({ pressed }) => pressed ? styles.pressedAvatar : null}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              </Pressable>
            </Link>
            <View style={styles.headerCopy}>
              <Text style={styles.greeting}>Good morning, {firstName}</Text>
              <Text style={styles.gymLine}>{orgName} · {city}</Text>
            </View>
            <Link href="/notifications" asChild>
              <Pressable style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Open notifications">
                <Ionicons name="notifications-outline" size={21} color={colors.text} />
                <View style={styles.unreadDot} />
              </Pressable>
            </Link>
          </View>

          <GlassCard variant="success" contentStyle={styles.membershipContent}>
            <View style={styles.membershipTop}>
              <View style={styles.membershipCopy}>
                <View style={styles.membershipLabel}>
                  <IconBubble icon="shield-checkmark-outline" tone="lime" size={30} />
                  <Text style={styles.mutedSmall}>Active Membership</Text>
                </View>
                <View style={styles.membershipTitleRow}>
                  <Text style={styles.membershipTitle}>Hybrid Pro</Text>
                  <Text style={styles.daysLeft}>{daysLeft} days left</Text>
                </View>
                <Text style={styles.mutedBody}>{remainingVisits} visits remaining</Text>
              </View>
              <StatusRing tone="lime" value="73%" label="plan cycle" size={86} />
            </View>

            <View style={styles.divider} />

            <View style={styles.actionRow}>
              <ZookButton href="/scan" icon="qr-code-outline" style={styles.actionHalf}>
                Scan QR
              </ZookButton>
              <ZookButton href="/tracking" tone="secondary" icon="barbell-outline" style={styles.actionHalf}>
                Start Workout
              </ZookButton>
            </View>
          </GlassCard>

          <SectionHeader
            title="Today's Plan"
            action={
              <Link href="/plans" asChild>
                <Pressable accessibilityRole="link" style={styles.sectionAction}>
                  <Text style={styles.sectionActionText}>View all</Text>
                  <Ionicons name="chevron-forward" size={13} color={colors.lime} />
                </Pressable>
              </Link>
            }
          />

          <GlassCard contentStyle={styles.planContent}>
            <View style={styles.planRow}>
              <IconBubble icon="barbell-outline" tone="lime" size={44} />
              <View style={styles.planCopy}>
                <Text style={styles.planTitle}>{planName} · 6 exercises · Coach Rhea</Text>
                <Text style={styles.mutedSmall}>Chest · Shoulders · Triceps</Text>
              </View>
              <ZookChip tone="lime">Assigned</ZookChip>
            </View>
          </GlassCard>

          <GlassCard contentStyle={styles.metricsContent}>
            <MetricTile label="Streak" value={`${streakDays} days`} tone="lime" icon="flame-outline" />
            <MetricTile label="Check-in" value={demoMembership?.lastCheckInLabel ?? "7:12 AM"} tone="neutral" icon="time-outline" />
            <MetricTile label="Weekly goal" value={`${weeklyGoalCompleted}/${weeklyGoalTarget}`} tone="amber" icon="locate-outline" />
          </GlassCard>

          <GlassCard variant="compact" contentStyle={styles.quickContent}>
            <QuickAction href="/find-gyms" icon="search-outline" label="Find gyms" />
            <QuickAction href="/tracking" icon="analytics-outline" label="Progress" />
            <QuickAction href="/membership" icon="card-outline" label="Payments" />
          </GlassCard>

        </ScrollView>
        <BottomNav />
      </ZookScreen>
    </>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={label} style={styles.quickAction}>
        <Ionicons name={icon} size={18} color={colors.muted} />
        <Text style={styles.quickLabel}>{label}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    paddingBottom: 128,
    gap: 12,
  },
  homeHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressedAvatar: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  avatarText: {
    color: colors.lime,
    ...typography.h3,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    color: colors.text,
    ...typography.h3,
  },
  gymLine: {
    color: colors.muted,
    ...typography.body,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.lime,
  },
  membershipContent: {
    padding: 18,
    gap: 14,
  },
  membershipTop: {
    minHeight: 98,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  membershipCopy: {
    flex: 1,
    gap: 8,
  },
  membershipLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  mutedSmall: {
    color: colors.muted,
    ...typography.small,
  },
  mutedBody: {
    color: colors.muted,
    ...typography.body,
  },
  membershipTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 6,
  },
  membershipTitle: {
    color: colors.text,
    ...typography.h2,
  },
  daysLeft: {
    color: colors.lime,
    ...typography.bodyStrong,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionHalf: {
    flex: 1,
  },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 28,
  },
  sectionActionText: {
    color: colors.lime,
    ...typography.small,
  },
  planContent: {
    padding: 14,
  },
  planRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  planCopy: {
    flex: 1,
    gap: 2,
  },
  planTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  metricsContent: {
    padding: 14,
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
  },
  quickContent: {
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  quickLabel: {
    color: colors.muted,
    ...typography.caption,
    textAlign: "center",
  },
});

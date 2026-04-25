import { Stack, useLocalSearchParams } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Card,
  Dock,
  EmptyState,
  InfoRow,
  LoadingState,
  Pill,
  PrimaryLink,
  Screen,
  ScreenHeader,
  SecondaryLink,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { formatLongDate } from "@/lib/formatting";
import { useMemberHome } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function Home() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const routeParams = useLocalSearchParams<{
    attendanceRecordId?: string;
    focus?: string;
    notificationId?: string;
  }>();
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
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.topbarCopy}>
              <Text style={styles.eyebrow}>
                {activeOrganization?.name ?? "Choose your gym"}
              </Text>
              <Text style={styles.topbarTitle}>
                {session?.user.name?.split(" ")[0]
                  ? `Hey, ${session.user.name.split(" ")[0]}`
                  : "Welcome back"}
              </Text>
            </View>
            <Pill
              tone={
                session?.user.guardianPending
                  ? "amber"
                  : memberHome?.activeMembership
                    ? "lime"
                    : "blue"
              }
            >
              {session?.user.guardianPending
                ? "Consent pending"
                : memberHome?.activeMembership
                  ? "Active"
                  : "Ready to join"}
            </Pill>
          </View>

          {routeParams.focus === "attendance" ? (
            <Card style={styles.routeCalloutCard}>
              <Pill tone="blue">Attendance update</Pill>
              <Text style={styles.routeCalloutTitle}>
                Check-in recorded.
              </Text>
              <Text style={styles.cardBody}>
                {routeParams.attendanceRecordId
                  ? "Your attendance has been logged. See details below."
                  : "Your latest attendance context is ready."}
              </Text>
            </Card>
          ) : null}

          {homeQuery.isLoading && !memberHome ? (
            <LoadingState
              title="Loading your gym"
              body="Syncing memberships, attendance, and plans."
            />
          ) : null}

          {!homeQuery.isLoading && !memberHome ? (
            <EmptyState
              title="No gym selected"
              body="Pick a gym to unlock memberships, plans, and check-in."
              action={<PrimaryLink href="/find-gyms">Browse gyms</PrimaryLink>}
            />
          ) : null}

          {memberHome ? (
            <Card style={styles.heroCard}>
              <View style={styles.heroGlow} />
              <ScreenHeader
                title={memberHome?.activeMembership ? "Ready to train." : "Find your gym."}
              />
              
              <View style={styles.primaryActionWrapper}>
                {memberHome?.activeMembership ? (
                  <PrimaryLink href="/scan" style={styles.hugeButton} textStyle={styles.hugeButtonText}>
                    Scan In
                  </PrimaryLink>
                ) : (
                  <PrimaryLink href="/find-gyms" style={styles.hugeButton} textStyle={styles.hugeButtonText}>
                    Find Gyms
                  </PrimaryLink>
                )}
              </View>

              <View style={styles.heroActions}>
                <SecondaryLink href="/plans" style={styles.heroAction}>
                  Plans
                </SecondaryLink>
                <SecondaryLink href="/tracking" style={styles.heroAction}>
                  Log Workout
                </SecondaryLink>
              </View>

              <View style={styles.heroMeta}>
                <InfoRow
                  label="Gym"
                  value={activeOrganization?.name ?? "Not selected"}
                  tone={activeOrganization ? "lime" : "amber"}
                />
                <InfoRow
                  label="Plan"
                  value={memberHome?.activePlan?.name ?? "No active plan"}
                  tone={memberHome?.activePlan ? "lime" : "neutral"}
                />
                {(memberHome?.unreadNotifications ?? 0) > 0 ? (
                  <InfoRow
                    label="Inbox"
                    value={`${memberHome?.unreadNotifications} unread`}
                    tone="amber"
                  />
                ) : null}
              </View>
            </Card>
          ) : null}

          {memberHome?.activeMembership && memberHome.recentAttendance.length > 0 ? (() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const attendanceDays = new Set(
              memberHome.recentAttendance.map((a) => {
                const d = new Date(a.checkedInAt);
                d.setHours(0, 0, 0, 0);
                return d.getTime();
              })
            );
            let streak = 0;
            for (let i = 0; i < 60; i++) {
              const check = new Date(today);
              check.setDate(check.getDate() - i);
              if (attendanceDays.has(check.getTime())) {
                streak++;
              } else if (i > 0) {
                break;
              }
            }
            if (streak === 0) return null;
            return (
              <Card style={styles.streakCard}>
                <View style={styles.streakRow}>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <View>
                    <Text style={styles.streakTitle}>
                      {streak} Day Streak
                    </Text>
                    <Text style={styles.streakBody}>
                      Keep the momentum going.
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })() : null}

          {memberHome?.activeMembership ? (
            <Card style={styles.membershipCard}>
              <View style={styles.membershipHeader}>
                <Text style={styles.cardLabel}>Membership</Text>
                <Pill tone="lime">Active</Pill>
              </View>
              <Text style={styles.cardTitle}>{memberHome.activePlan?.name ?? "Current plan"}</Text>
              <Text style={styles.cardBody}>
                {memberHome.activeMembership.endsAt
                  ? `Valid until ${formatLongDate(memberHome.activeMembership.endsAt)}`
                  : "No expiry date"}
              </Text>
              {memberHome.activeMembership.remainingVisits != null ? (
                <Text style={styles.visitsText}>
                  {memberHome.activeMembership.remainingVisits} visits remaining
                </Text>
              ) : null}
            </Card>
          ) : null}

          {memberHome?.assignedPlans ? (
            <Card style={styles.recoveryCard}>
              <Text style={styles.cardLabel}>Coaching</Text>
              <Text style={styles.cardTitle}>{memberHome.assignedPlans} plans assigned</Text>
              <Text style={styles.cardBody}>Open Plans to see your training updates.</Text>
            </Card>
          ) : null}
          
          <View style={{ height: 110 }} />
        </ScrollView>
        <Dock />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    height: 54,
    width: 54,
    borderRadius: 18,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.bg,
    fontWeight: "900",
    fontSize: 20,
  },
  topbarCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
  },
  topbarTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 22,
  },
  heroCard: {
    gap: 20,
    position: "relative",
    paddingVertical: 24,
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(185,244,85,0.06)",
  },
  primaryActionWrapper: {
    marginTop: 8,
    marginBottom: 4,
  },
  hugeButton: {
    minHeight: 72,
    borderRadius: 24,
  },
  hugeButtonText: {
    fontSize: 22,
    fontWeight: "900",
  },
  heroActions: {
    flexDirection: "row",
    gap: 10,
  },
  heroAction: {
    flex: 1,
  },
  heroMeta: {
    gap: 12,
    marginTop: 12,
  },
  routeCalloutCard: {
    gap: 10,
  },
  routeCalloutTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  cardBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  recoveryCard: {
    gap: 8,
  },
  membershipCard: {
    gap: 8,
  },
  membershipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  visitsText: {
    color: colors.lime,
    fontSize: 14,
    fontWeight: "800",
  },
  streakCard: {
    backgroundColor: "rgba(255, 182, 80, 0.05)",
    borderColor: "rgba(255, 182, 80, 0.2)",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  streakEmoji: {
    fontSize: 28,
  },
  streakTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  streakBody: {
    color: colors.muted,
    fontSize: 13,
  },
});

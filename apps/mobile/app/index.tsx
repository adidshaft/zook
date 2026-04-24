import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Card,
  Dock,
  EmptyState,
  InfoRow,
  LoadingState,
  MetricTile,
  Pill,
  PrimaryLink,
  Screen,
  ScreenHeader,
  SectionHeader,
  SecondaryLink,
} from "@/components/primitives";
import { TrackingSectionHeader, TrackingSummaryTile, WorkoutLogCard } from "@/components/tracking";
import { useAuth } from "@/lib/auth";
import { formatLongDate, formatRelativeDate, titleCaseFromCode } from "@/lib/formatting";
import { useMemberHome, useMyTracking } from "@/lib/query-hooks";
import { buildTrackingSummaryMetrics, workoutToEntry } from "@/lib/tracking-view";
import { colors } from "@/lib/theme";

export default function Home() {
  const { activeOrgId, hasAnyRole, session } = useAuth();
  const homeQuery = useMemberHome();
  const trackingQuery = useMyTracking();
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
  const attendance = memberHome?.recentAttendance ?? [];
  const latestAttendance = attendance[0];
  const trackingSummary = trackingQuery.data?.summary;
  const recentWorkouts = (trackingQuery.data?.recentWorkouts ?? []) as Array<{
    id: string;
    title: string;
    workoutType: string;
    startedAt: string;
    endedAt?: string | null;
    durationMinutes?: number | null;
    intensity?: string | null;
    notes?: string | null;
    exercises?: Array<{
      id: string;
      exerciseName: string;
      setsCompleted?: number | null;
      reps?: number | null;
      weightKg?: string | number | null;
      completed: boolean;
    }>;
  }>;
  const latestWorkout = recentWorkouts[0] ? workoutToEntry(recentWorkouts[0]) : null;
  const trackingMetrics = buildTrackingSummaryMetrics({
    totalDuration: trackingSummary?.totalDuration ?? 0,
    weeklyCount: trackingSummary?.weeklyCount ?? 0,
    recentCount: trackingSummary?.recentCount ?? 0,
    latestWeightKg: (
      trackingQuery.data?.latestBodyProgress as { weightKg?: string | number | null } | null
    )?.weightKg,
    habitsCount: trackingQuery.data?.habits?.length ?? 0,
  });
  const staffLinks = [
    hasAnyRole("TRAINER")
      ? {
          href: "/trainer" as const,
          label: "Trainer desk",
          body: "Assigned clients, AI drafts, PT packs.",
        }
      : null,
    hasAnyRole("RECEPTIONIST")
      ? {
          href: "/reception" as const,
          label: "Reception desk",
          body: "Live approvals and front-desk triage.",
        }
      : null,
    hasAnyRole("OWNER", "ADMIN")
      ? {
          href: "/owner" as const,
          label: "Owner desk",
          body: "Join requests, stock watch, AI usage.",
        }
      : null,
  ].filter(Boolean) as Array<{
    href: "/trainer" | "/reception" | "/owner";
    label: string;
    body: string;
  }>;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
        >
          <View style={styles.topbar}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.topbarCopy}>
              <Text style={styles.eyebrow} selectable>
                {activeOrganization?.name ?? "Choose your gym"}
              </Text>
              <Text style={styles.topbarTitle} selectable>
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
                  ? "Member active"
                  : "Ready to join"}
            </Pill>
          </View>

          <Card style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <ScreenHeader
              eyebrow="Member home"
              title="Keep the whole gym day in one loop."
              subtitle="Attendance, membership health, plan momentum, and notifications stay visible without jumping between flows."
            />
            <View style={styles.heroActions}>
              <PrimaryLink href="/scan" style={styles.heroAction}>
                Scan in
              </PrimaryLink>
              <SecondaryLink href="/find-gyms" style={styles.heroAction}>
                Find gyms
              </SecondaryLink>
            </View>
            <View style={styles.heroMeta}>
              <InfoRow
                label="Membership"
                value={memberHome?.activePlan?.name ?? "No active plan"}
                tone={memberHome?.activePlan ? "lime" : "amber"}
              />
              <InfoRow
                label="Latest check-in"
                value={
                  latestAttendance
                    ? formatRelativeDate(latestAttendance.checkedInAt)
                    : "No visits yet"
                }
                tone={latestAttendance ? "blue" : "neutral"}
              />
              <InfoRow
                label="Unread inbox"
                value={`${memberHome?.unreadNotifications ?? 0} items`}
                tone={(memberHome?.unreadNotifications ?? 0) > 0 ? "amber" : "neutral"}
              />
            </View>
          </Card>

          {homeQuery.isLoading && !memberHome ? (
            <LoadingState
              title="Loading your gym snapshot"
              body="Syncing memberships, attendance, goals, and notifications."
            />
          ) : null}

          {!homeQuery.isLoading && !memberHome ? (
            <EmptyState
              title="No active gym selected"
              body="Pick a gym to unlock memberships, attendance, trainer plans, and the member notification center."
              action={<PrimaryLink href="/find-gyms">Browse public gyms</PrimaryLink>}
            />
          ) : null}

          <View style={styles.metricGrid}>
            <MetricTile
              label="Current plan"
              value={memberHome?.activePlan?.name ?? "Pick a plan"}
              detail={
                memberHome?.activeMembership?.endsAt
                  ? `Ends ${formatLongDate(memberHome.activeMembership.endsAt)}`
                  : "Choose a membership to unlock attendance"
              }
              tone={memberHome?.activeMembership ? "lime" : "amber"}
            />
            <MetricTile
              label="Weekly movement"
              value={trackingSummary ? `${trackingSummary.weeklyCount}` : "0"}
              detail={
                trackingSummary
                  ? `${trackingSummary.totalDuration} minutes logged`
                  : "Start logging sessions"
              }
              tone="blue"
            />
            <MetricTile
              label="Goals in motion"
              value={String(memberHome?.activeGoals ?? 0)}
              detail={`${memberHome?.assignedPlans ?? 0} assigned plans ready`}
              tone="amber"
            />
            <MetricTile
              label="Remaining visits"
              value={
                memberHome?.activeMembership?.remainingVisits !== null &&
                memberHome?.activeMembership?.remainingVisits !== undefined
                  ? String(memberHome.activeMembership.remainingVisits)
                  : "Open"
              }
              detail={
                latestAttendance
                  ? `Last scan ${formatRelativeDate(latestAttendance.checkedInAt)}`
                  : "No recent attendance"
              }
              tone="violet"
            />
          </View>

          <SectionHeader
            eyebrow="Today"
            title="Gym rhythm"
            subtitle="A tighter status view for your active organization, membership state, and next action."
            action={<SecondaryLink href="/profile">Profile</SecondaryLink>}
          />

          <Card style={styles.statusCard}>
            <View style={styles.statusColumn}>
              <Text style={styles.cardLabel} selectable>
                Active organization
              </Text>
              <Text style={styles.cardTitle} selectable>
                {activeOrganization?.name ?? "Not selected"}
              </Text>
              <Text style={styles.cardBody} selectable>
                {activeOrganization
                  ? `${activeOrganization.city ?? ""}${activeOrganization.city ? ", " : ""}${activeOrganization.state ?? ""}`
                  : "Switch gyms from profile or discover a new one from public search."}
              </Text>
            </View>
            <View style={styles.infoStack}>
              <InfoRow
                label="Organization status"
                value={titleCaseFromCode(activeOrganization?.status)}
                tone={activeOrganization?.status === "ACTIVE" ? "lime" : "amber"}
              />
              <InfoRow
                label="Plan type"
                value={titleCaseFromCode(memberHome?.activePlan?.type)}
                tone={memberHome?.activePlan ? "blue" : "neutral"}
              />
              <InfoRow
                label="Recent check-in"
                value={
                  latestAttendance
                    ? `${titleCaseFromCode(latestAttendance.status)} · ${formatLongDate(latestAttendance.checkedInAt)}`
                    : "No attendance yet"
                }
                tone={latestAttendance ? "lime" : "neutral"}
              />
            </View>
            <View style={styles.statusActions}>
              <SecondaryLink href="/notifications" style={styles.splitAction}>
                Inbox
              </SecondaryLink>
              <SecondaryLink href="/plans" style={styles.splitAction}>
                Plans
              </SecondaryLink>
            </View>
          </Card>

          <TrackingSectionHeader
            title="Personal tracking"
            href="/tracking"
            linkLabel="Open tracking"
          />

          <Text style={styles.trackingIntro} selectable>
            Keep workouts, body progress, and habit consistency close to your membership flow so it
            feels like one training system.
          </Text>

          <View style={styles.trackingMetricRow}>
            {trackingMetrics.slice(0, 2).map((metric) => (
              <TrackingSummaryTile key={metric.id} metric={metric} />
            ))}
          </View>

          {trackingQuery.isLoading && !latestWorkout ? (
            <LoadingState
              title="Loading training logs"
              body="Pulling the latest workout summary from your tracking feed."
            />
          ) : null}

          {latestWorkout ? (
            <WorkoutLogCard entry={latestWorkout} compact />
          ) : (
            <EmptyState
              title="No workout logged yet"
              body="Log your first session after you train to build a stronger weekly pattern and make assigned plans easier to follow."
              action={<PrimaryLink href="/tracking-entry">Add workout log</PrimaryLink>}
            />
          )}

          <Card style={styles.recoveryCard}>
            <Text style={styles.cardLabel} selectable>
              Membership + coaching
            </Text>
            <Text style={styles.cardTitle} selectable>
              {memberHome?.assignedPlans
                ? `${memberHome.assignedPlans} plans are waiting for you.`
                : "Your next training update lives here."}
            </Text>
            <Text style={styles.cardBody} selectable>
              {memberHome?.activeGoals
                ? `${memberHome.activeGoals} active goals are still in motion.`
                : "Assigned plans, goals, and coach prompts appear here as soon as your gym team publishes them."}
            </Text>
            <View style={styles.statusActions}>
              <PrimaryLink href="/plans" style={styles.splitAction}>
                Open plans
              </PrimaryLink>
              <SecondaryLink href="/notifications" style={styles.splitAction}>
                Open inbox
              </SecondaryLink>
            </View>
          </Card>

          {staffLinks.length ? (
            <>
              <SectionHeader
                eyebrow="Multi-role"
                title="Staff shortcuts"
                subtitle="You also have organization access beyond the member view. Jump straight into the right desk."
              />
              <View style={styles.staffGrid}>
                {staffLinks.map((item) => (
                  <Card key={item.href} style={styles.staffCard}>
                    <Text style={styles.cardTitle} selectable>
                      {item.label}
                    </Text>
                    <Text style={styles.cardBody} selectable>
                      {item.body}
                    </Text>
                    <SecondaryLink href={item.href}>Open</SecondaryLink>
                  </Card>
                ))}
              </View>
            </>
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
    paddingBottom: 132,
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
    gap: 18,
    position: "relative",
  },
  heroGlow: {
    position: "absolute",
    top: -56,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(185,244,85,0.08)",
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
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statusCard: {
    gap: 16,
  },
  statusColumn: {
    gap: 8,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
  },
  cardBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  infoStack: {
    gap: 10,
  },
  statusActions: {
    flexDirection: "row",
    gap: 10,
  },
  splitAction: {
    flex: 1,
  },
  trackingIntro: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  trackingMetricRow: {
    flexDirection: "row",
    gap: 12,
  },
  recoveryCard: {
    gap: 14,
  },
  staffGrid: {
    gap: 12,
  },
  staffCard: {
    gap: 14,
  },
});

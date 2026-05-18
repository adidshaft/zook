import { isOrgRole } from "@zook/core/permissions";
import type { Role } from "@zook/core/types";
import { resolvePlanName } from "@zook/ui";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ProfileExtraFields } from "@/components/profile/profile-extra-fields";
import { ProfilePhotoControl } from "@/components/profile/profile-photo-control";
import {
  BottomNav,
  EmptyState,
  GlassCard,
  IconBubble,
  MobileHeader,
  Pill,
  ProgressBar,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import {
  useActiveMembership,
  useMemberHome,
  useMyAttendance,
  useMyPlans,
  useMyProfile,
} from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";

type ActivityItem = {
  id: string;
  title: string;
  meta: string;
  icon: keyof typeof Ionicons.glyphMap;
};

/**
 * Compose "org · branch, city" without duplicating the org name when the
 * branch already starts with it (common in single-location gyms where the
 * branch label is e.g. "Aarogya Strength Koregaon Park").
 */
function formatOrgLocationLine(
  orgName: string | null | undefined,
  branchName: string | null | undefined,
  city: string | null | undefined,
): string {
  const org = orgName?.trim();
  const branch = branchName?.trim();
  if (!org && !branch) return "No active gym";
  let location: string;
  if (org && branch) {
    const branchWithoutOrgPrefix = branch.startsWith(org)
      ? branch.slice(org.length).replace(/^[\s\-·,]+/, "").trim()
      : branch;
    location = branchWithoutOrgPrefix ? `${org} · ${branchWithoutOrgPrefix}` : org;
  } else {
    location = org || branch || "";
  }
  return city ? `${location}, ${city}` : location;
}

function titleCaseRole(role: Role | string) {
  if (role === "RECEPTIONIST") return "Reception";
  if (role === "PLATFORM_ADMIN") return "Platform operator";
  return String(role)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function routeForRole(role?: Role) {
  if (role === "PLATFORM_ADMIN") return "/platform";
  if (role === "TRAINER") return "/trainer";
  if (role === "RECEPTIONIST") return "/reception";
  if (role === "OWNER" || role === "ADMIN") return "/owner";
  return "/";
}

function formatDate(value?: string | null) {
  if (!value) return "Syncing";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatActivityDate(value?: string | null) {
  if (!value) return "Recently";
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (left: Date, right: Date) => left.toDateString() === right.toDateString();
  const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (sameDay(date, today)) return `Today, ${time}`;
  if (sameDay(date, yesterday)) return `Yesterday, ${time}`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function normalizeRemoteUrl(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && /^https?:\/\//.test(trimmed) ? trimmed : undefined;
}

function percentFromMembership(input: {
  daysLeft?: number | null;
  durationDays?: number | null;
  remainingVisits?: number | null;
  visitLimit?: number | null;
}) {
  if (typeof input.daysLeft === "number" && input.durationDays) {
    return Math.max(0.06, Math.min(1, input.daysLeft / Math.max(input.durationDays, 1)));
  }
  if (typeof input.remainingVisits === "number" && input.visitLimit) {
    return Math.max(0.06, Math.min(1, input.remainingVisits / Math.max(input.visitLimit, 1)));
  }
  return 0.72;
}

export default function ProfileScreen() {
  const router = useRouter();
  const bottomPadding = useBottomScrollPadding({ hasStickyAction: true });
  const {
    activeOrgId,
    activeRole,
    biometricEnabled,
    logout,
    session,
    setBiometricEnabled,
    setActiveOrgId,
    setActiveRole,
    token,
  } = useAuth();
  const profileQuery = useMyProfile();
  const homeQuery = useMemberHome();
  const activeMembershipQuery = useActiveMembership();
  const attendanceQuery = useMyAttendance();
  const plansQuery = useMyPlans();
  const { selectedBranch } = useBranchSelection();
  const [refreshing, setRefreshing] = useState(false);
  const [roleBusy, setRoleBusy] = useState<Role | null>(null);

  const activeOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization ??
    null;
  const profile = profileQuery.data;
  const userName = profile?.user.name || session?.user.name || "Zook member";
  const userEmail = profile?.user.email || session?.user.email || "";
  const photoUrl = normalizeRemoteUrl(
    profile?.user.profilePhotoUrl ??
      profile?.profile?.profilePhotoUrl ??
      session?.user.profilePhotoUrl,
  );
  const roles = activeOrganization?.roles ?? [];
  useEffect(() => {
    if (!activeRole || !roles.length || (isOrgRole(activeRole) && roles.includes(activeRole))) {
      return;
    }
    const fallback = roles[0];
    void setActiveRole(fallback).catch(() => undefined);
  }, [activeRole, roles, setActiveRole]);
  const rolesInOtherGyms = useMemo(() => {
    const activeRoles = new Set(roles);
    return (session?.organizations ?? [])
      .filter((organization) => organization.orgId !== activeOrgId)
      .flatMap((organization) =>
        organization.roles
          .filter((role) => !activeRoles.has(role))
          .map((role) => ({
            orgId: organization.orgId,
            orgName: organization.name,
            role,
          })),
      );
  }, [activeOrgId, roles, session?.organizations]);
  const membership =
    activeMembershipQuery.data?.membership ?? homeQuery.data?.activeMembership ?? null;
  const membershipPlan =
    activeMembershipQuery.data?.membership?.plan ?? homeQuery.data?.activePlan ?? null;
  const planName = resolvePlanName(membershipPlan) ?? "Membership";
  const daysLeft =
    typeof membership?.daysLeft === "number"
      ? membership.daysLeft
      : membership?.endsAt
        ? Math.max(
            0,
            Math.ceil(
              (new Date(membership.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            ),
          )
        : null;
  const membershipProgress = percentFromMembership({
    daysLeft,
    durationDays: membershipPlan?.durationDays ?? membershipPlan?.validityDays,
    remainingVisits: membership?.remainingVisits,
    visitLimit: membershipPlan?.visitLimit,
  });

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const attendanceItems =
      attendanceQuery.data?.attendance?.map((record, index) => {
        const checkedInAt =
          typeof record.checkedInAt === "string"
            ? record.checkedInAt
            : typeof record.createdAt === "string"
              ? record.createdAt
              : null;
        return {
          id: String(record.id ?? `attendance-${index}`),
          title: "Checked in",
          meta: formatActivityDate(checkedInAt),
          icon: "checkmark-circle-outline" as const,
        };
      }) ?? [];
    const workoutItems =
      plansQuery.data?.plans?.map((assignment) => ({
        id: assignment.id,
        title: assignment.plan?.title ?? "Workout plan",
        meta:
          assignment.progress?.updatedAt || assignment.createdAt
            ? `${assignment.progress?.completionPct ?? 0}% complete - ${formatActivityDate(
                assignment.progress?.updatedAt ?? assignment.createdAt,
              )}`
            : `${assignment.progress?.completionPct ?? 0}% complete`,
        icon: "barbell-outline" as const,
      })) ?? [];
    return [...attendanceItems, ...workoutItems].slice(0, 3);
  }, [attendanceQuery.data?.attendance, plansQuery.data?.plans]);

  async function refreshProfile() {
    setRefreshing(true);
    await Promise.all([
      profileQuery.refetch(),
      homeQuery.refetch(),
      activeMembershipQuery.refetch(),
      attendanceQuery.refetch(),
      plansQuery.refetch(),
    ]);
    setRefreshing(false);
  }

  function confirmRoleSwitch(role: Role) {
    if (role === activeRole) return;
    Alert.alert(`Switch to ${titleCaseRole(role)}?`, "Zook will move you to that role's tools.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Switch",
        onPress: () => {
          setRoleBusy(role);
          void setActiveRole(role)
            .then(() => router.replace(routeForRole(role)))
            .catch((error) => {
              Alert.alert(
                "Role unavailable",
                error instanceof Error ? error.message : "That role is not available here.",
              );
            })
            .finally(() => setRoleBusy(null));
        },
      },
    ]);
  }

  function confirmOtherGymRoleSwitch(input: { orgId: string; orgName: string; role: Role }) {
    Alert.alert(
      `${titleCaseRole(input.role)} is in another gym`,
      `Switch gyms before opening ${titleCaseRole(input.role)} tools.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Switch to ${input.orgName} to access ${titleCaseRole(input.role)} tools`,
          onPress: () => {
            void setActiveOrgId(input.orgId)
              .then(() => setActiveRole(input.role))
              .then(() => router.replace(routeForRole(input.role)))
              .catch((error) => {
                Alert.alert(
                  "Switch failed",
                  error instanceof Error ? error.message : "Could not switch gyms right now.",
                );
              });
          },
        },
      ],
    );
  }

  function showRoleSwitcher() {
    if (!roles.length && !rolesInOtherGyms.length) {
      Alert.alert("No roles yet", "This account does not have another role in the active gym.");
      return;
    }
    Alert.alert(
      "Switch role",
      "Choose the role to use in this gym.",
      [
        ...roles.map((role) => ({
          text: role === activeRole ? `${titleCaseRole(role)} (active)` : titleCaseRole(role),
          onPress: () => confirmRoleSwitch(role),
        })),
        ...rolesInOtherGyms.map((option) => ({
          text: `${titleCaseRole(option.role)} at ${option.orgName}`,
          onPress: () => confirmOtherGymRoleSwitch(option),
        })),
        { text: "Cancel", style: "cancel" as const },
      ],
    );
  }

  function confirmGymSwitch(orgId: string, orgName: string) {
    if (orgId === activeOrgId) return;
    Alert.alert(`Switch to ${orgName}?`, "Your profile will refresh for that gym.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Switch",
        onPress: () => {
          void setActiveOrgId(orgId);
        },
      },
    ]);
  }

  function showGymSwitcher() {
    const gyms = session?.organizations ?? [];
    if (!gyms.length) {
      Alert.alert("No gyms yet", "Join or request access to a gym first.");
      return;
    }
    Alert.alert(
      "Switch gym",
      "Choose your active gym.",
      [
        ...gyms.map((gym) => ({
          text: gym.orgId === activeOrgId ? `${gym.name} (active)` : gym.name,
          onPress: () => confirmGymSwitch(gym.orgId, gym.name),
        })),
        { text: "Cancel", style: "cancel" as const },
      ],
    );
  }

  function confirmSignOut() {
    Alert.alert("Sign out?", "You can sign back in with OTP any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void logout();
        },
      },
    ]);
  }

  function toggleBiometricUnlock() {
    void setBiometricEnabled(!biometricEnabled).then((enabled) => {
      if (!enabled && !biometricEnabled) {
        Alert.alert("Biometric unlock", "Set up Face ID or device biometrics to enable this.");
      }
    });
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="profile-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshProfile()}
              tintColor={colors.lime}
              colors={[colors.lime]}
            />
          }
        >
          <MobileHeader
            title="Profile"
            showProfileShortcut={false}
            leading={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={12}
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
            }
          />

          <GlassCard contentStyle={styles.identityCard}>
            <ProfilePhotoControl
              token={token}
              orgId={activeOrgId}
              name={userName}
              profilePhotoUrl={photoUrl}
              size={72}
              onSaved={() => void refreshProfile()}
            />
            <View style={styles.identityCopy}>
              <Text numberOfLines={1} style={styles.name}>
                {userName}
              </Text>
              {userEmail ? (
                <Text numberOfLines={1} style={styles.email}>
                  {userEmail}
                </Text>
              ) : null}
              <Text numberOfLines={2} style={styles.gymLine}>
                {formatOrgLocationLine(
                  activeOrganization?.name,
                  selectedBranch?.name,
                  activeOrganization?.city,
                )}
              </Text>
              <View style={styles.roleRow}>
                {roles.length ? (
                  roles.map((role) => (
                    <Pressable
                      key={role}
                      accessibilityRole="button"
                      accessibilityLabel={`Use Zook as ${titleCaseRole(role)}`}
                      accessibilityState={{
                        selected: role === activeRole,
                        disabled: Boolean(roleBusy),
                        busy: roleBusy === role,
                      }}
                      disabled={Boolean(roleBusy)}
                      onPress={() => confirmRoleSwitch(role)}
                    >
                      <Pill tone={role === activeRole ? "lime" : "neutral"}>
                        {roleBusy === role ? "Switching..." : titleCaseRole(role)}
                      </Pill>
                    </Pressable>
                  ))
                ) : (
                  <Pill>No role assigned</Pill>
                )}
              </View>
            </View>
          </GlassCard>

          <ProfileExtraFields />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Membership</Text>
            <GlassCard variant="compact" contentStyle={styles.membershipCard}>
              {membership ? (
                <>
                  <View style={styles.membershipTop}>
                    <View style={styles.membershipCopy}>
                      <Text numberOfLines={1} style={styles.cardTitle}>
                        {planName}
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        Expires {formatDate(membership.endsAt)}
                      </Text>
                    </View>
                    <Pill
                      tone={
                        String(membership.status ?? "").toLowerCase().includes("expired")
                          ? "red"
                          : "lime"
                      }
                    >
                      {membership.status ?? "Active"}
                    </Pill>
                  </View>
                  <ProgressBar
                    value={membershipProgress}
                    label={
                      daysLeft === null ? "Membership syncing" : `${daysLeft} days remaining`
                    }
                  />
                  <View style={styles.actionRow}>
                    <ZookButton
                      href="/membership"
                      icon="refresh-outline"
                      size="sm"
                      style={styles.actionHalf}
                    >
                      Renew
                    </ZookButton>
                    <ZookButton
                      href="/membership"
                      tone="secondary"
                      icon="time-outline"
                      size="sm"
                      style={styles.actionHalf}
                    >
                      View history
                    </ZookButton>
                  </View>
                </>
              ) : (
                <EmptyState
                  icon="card-outline"
                  title="No active membership"
                  body="Your latest membership will appear here after a gym activates one."
                  action={
                    <ZookButton href="/find-gyms" tone="secondary" icon="search-outline" size="sm">
                      Find gyms
                    </ZookButton>
                  }
                />
              )}
            </GlassCard>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <GlassCard variant="compact" contentStyle={styles.activityCard}>
              {recentActivity.length ? (
                recentActivity.map((item) => (
                  <View key={item.id} style={styles.activityRow}>
                    <IconBubble icon={item.icon} tone="lime" size={36} />
                    <View style={styles.activityCopy}>
                      <Text numberOfLines={1} style={styles.activityTitle}>
                        {item.title}
                      </Text>
                      <Text numberOfLines={1} style={styles.activityMeta}>
                        {item.meta}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <EmptyState
                  icon="pulse-outline"
                  title="No activity yet"
                  body="Your last three check-ins and workouts will show here."
                />
              )}
            </GlassCard>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick actions</Text>
            <View style={styles.quickGrid}>
              <ZookButton
                testID="profile-switch-role"
                tone="secondary"
                icon="swap-horizontal-outline"
                onPress={showRoleSwitcher}
                style={styles.quickButton}
              >
                Switch role
              </ZookButton>
              <ZookButton
                testID="profile-switch-gym"
                tone="secondary"
                icon="business-outline"
                onPress={showGymSwitcher}
                style={styles.quickButton}
              >
                Switch gym
              </ZookButton>
              <ZookButton
                testID="profile-biometric-toggle"
                tone="secondary"
                icon={biometricEnabled ? "lock-closed-outline" : "lock-open-outline"}
                onPress={toggleBiometricUnlock}
                style={styles.quickButton}
              >
                Biometric {biometricEnabled ? "on" : "off"}
              </ZookButton>
              <ZookButton
                href="/settings"
                tone="secondary"
                icon="settings-outline"
                style={styles.quickButton}
              >
                Settings -&gt;
              </ZookButton>
              <ZookButton
                testID="profile-sign-out"
                tone="danger"
                icon="log-out-outline"
                onPress={confirmSignOut}
                style={styles.quickButton}
              >
                Sign out
              </ZookButton>
            </View>
          </View>
        </ScrollView>
        <BottomNav selectedPath="/profile" />
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: layout.bottomNavContentPadding,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  identityCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  identityCopy: {
    alignItems: "flex-start",
    alignSelf: "stretch",
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    ...typography.h1,
    color: colors.text,
    textAlign: "left",
  },
  email: {
    ...typography.body,
    color: colors.muted,
    textAlign: "left",
  },
  gymLine: {
    ...typography.bodyStrong,
    color: colors.text,
    marginTop: spacing.xs,
    textAlign: "left",
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-start",
    marginTop: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  membershipCard: {
    gap: spacing.md,
  },
  membershipTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  membershipCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
  },
  cardSubtitle: {
    ...typography.body,
    color: colors.muted,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionHalf: {
    flex: 1,
  },
  activityCard: {
    gap: spacing.md,
  },
  activityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  activityCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  activityTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  activityMeta: {
    ...typography.small,
    color: colors.muted,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  quickButton: {
    flexBasis: "48%",
    flexGrow: 1,
  },
});

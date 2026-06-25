import type { Role } from "@zook/core/types";
import { resolvePlanName } from "@zook/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { ReferralCard } from "@/features/member/profile/referral-card";
import { ProfileExtraFields } from "@/components/profile/profile-extra-fields";
import { ProfilePhotoControl } from "@/components/profile/profile-photo-control";
import {
  EmptyState,
  Card,
  IconBubble,
  AppHeader,
  Pill,
  ProgressBar,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { normalizeWebUrl, toWebUrl } from "@/lib/api";
import { useBranchSelection } from "@/lib/branch-selection";
import { useRoleContext } from "@/lib/role-context";
import { isMobileFeatureEnabled } from "@/lib/runtime-mode";
import {
  formatActivityDate,
  formatInr,
  formatLongDate,
  formatOrgLocationLine,
  formatRoleLabel,
  formatVisitLimit,
} from "@/lib/formatting";
import {
  useActiveMembership,
  useMemberHome,
  useMyReferralCodes,
  useMyAttendance,
  useMyPlans,
  useMyProfile,
} from "@/lib/domains";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";
import { useT } from "@/lib/i18n";

type ActivityItem = {
  id: string;
  title: string;
  meta: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function routeForRole(role?: Role) {
  if (role === "PLATFORM_ADMIN") return "/platform";
  if (role === "TRAINER") return "/trainer";
  if (role === "RECEPTIONIST") return "/reception";
  if (role === "OWNER" || role === "ADMIN") return "/owner";
  return "/";
}

function firstParam(value?: string | string[] | null) {
  return Array.isArray(value) ? value[0] : value ?? undefined;
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

function membershipProgressLabel(input: {
  daysLeft?: number | null;
  durationDays?: number | null;
  remainingVisits?: number | null;
  visitLimit?: number | null;
}, t: ReturnType<typeof useT>) {
  if (typeof input.remainingVisits === "number" && input.visitLimit) {
    return t("member.profile.visitsRemaining", { remaining: input.remainingVisits, total: formatVisitLimit(input.visitLimit) });
  }
  if (typeof input.daysLeft === "number" && input.durationDays) {
    return t("member.profile.daysRemainingOf", { remaining: input.daysLeft, total: input.durationDays });
  }
  if (typeof input.daysLeft === "number") {
    return t("member.profile.daysRemaining", { count: input.daysLeft });
  }
  return t("member.profile.membershipDetailsUnavailable");
}

export default function ProfileScreen() {
  const router = useRouter();
  const t = useT();
  const showQaShortcuts = __DEV__ && isMobileFeatureEnabled("QA_SHORTCUTS_ENABLED");
  const params = useLocalSearchParams<{ focus?: string | string[] }>();
  const { mode, palette } = useTheme();
  const bottomPadding = useBottomScrollPadding({ hasStickyAction: true });
  const {
    activeOrgId,
    biometricEnabled,
    logout,
    session,
    setBiometricEnabled,
    switchOrg,
    switchRole,
    token,
  } = useAuth();
  const roleContext = useRoleContext();
  const profileQuery = useMyProfile();
  const homeQuery = useMemberHome();
  const referralQuery = useMyReferralCodes();
  const activeMembershipQuery = useActiveMembership();
  const attendanceQuery = useMyAttendance();
  const plansQuery = useMyPlans();
  const { selectedBranch } = useBranchSelection();
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsetsRef = useRef<Partial<Record<"identity" | "details" | "membership" | "referral", number>>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [roleBusy, setRoleBusy] = useState<Role | null>(null);

  const activeOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization ??
    null;
  const profile = profileQuery.data;
  const userName = profile?.user.name || session?.user.name || t("member.profile.memberFallback");
  const userEmail = profile?.user.email || session?.user.email || "";
  const photoUrl = normalizeWebUrl(
    profile?.user.profilePhotoUrl ??
      profile?.profile?.profilePhotoUrl ??
      session?.user.profilePhotoUrl,
    { resolveRelative: false },
  );
  const roles = useMemo(() => activeOrganization?.roles ?? [], [activeOrganization?.roles]);
  const activeRole = roleContext?.role ?? "MEMBER";
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
  const planName = resolvePlanName(membershipPlan) ?? t("member.profile.membership");
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
  const membershipProgressCopy = membershipProgressLabel({
    daysLeft,
    durationDays: membershipPlan?.durationDays ?? membershipPlan?.validityDays,
    remainingVisits: membership?.remainingVisits,
    visitLimit: membershipPlan?.visitLimit,
  }, t);
  const referralCode = referralQuery.data?.referralCodes[0] ?? null;
  const referralPolicy = referralQuery.data?.policy as
    | { referrerRewardType?: string; referrerRewardValue?: number }
    | null
    | undefined;
  const pendingFriends =
    referralCode?.maxUses != null
      ? Math.max(0, referralCode.maxUses - (referralCode.redemptionCount ?? 0))
      : 0;
  const referralRewards = referralQuery.data?.rewards ?? [];
  const earnedCreditPaise = referralRewards
    .filter((reward) => reward.status === "applied")
    .reduce((total, reward) => total + (reward.rewardValue ?? 0), 0);
  const pendingCreditPaise = referralRewards
    .filter((reward) => reward.status === "pending")
    .reduce((total, reward) => total + (reward.rewardValue ?? 0), 0);
  const referralBenefit =
    activeRole === "TRAINER"
      ? t("member.profile.trainerReferralBenefit")
      : referralPolicy?.referrerRewardType === "DAYS"
      ? t("member.profile.daysReferralBenefit", { count: referralPolicy.referrerRewardValue ?? 7 })
      : referralPolicy?.referrerRewardType === "VISITS"
        ? t("member.profile.visitsReferralBenefit", { count: referralPolicy.referrerRewardValue ?? 1 })
        : t("member.profile.defaultReferralBenefit");

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
          title: t("member.profile.checkedIn"),
          meta: formatActivityDate(checkedInAt),
          icon: "checkmark-circle-outline" as const,
        };
      }) ?? [];
    const workoutItems =
      plansQuery.data?.plans?.map((assignment) => ({
        id: assignment.id,
        title: assignment.plan?.title ?? t("member.profile.workoutPlan"),
        meta:
          assignment.progress?.updatedAt || assignment.createdAt
            ? t("member.profile.percentCompleteWithDate", { percent: assignment.progress?.completionPct ?? 0, date: formatActivityDate(
                assignment.progress?.updatedAt ?? assignment.createdAt,
              ) })
            : t("member.profile.percentComplete", { percent: assignment.progress?.completionPct ?? 0 }),
        icon: "barbell-outline" as const,
      })) ?? [];
    return [...attendanceItems, ...workoutItems].slice(0, 3);
  }, [attendanceQuery.data?.attendance, plansQuery.data?.plans, t]);
  const focusTarget = firstParam(params.focus);

  function rememberSection(
    key: "identity" | "details" | "membership" | "referral",
    event: LayoutChangeEvent,
  ) {
    sectionOffsetsRef.current[key] = event.nativeEvent.layout.y;
  }

  useEffect(() => {
    const sectionKey =
      focusTarget === "photo"
        ? "identity"
        : focusTarget === "edit" || focusTarget === "details"
          ? "details"
          : focusTarget === "buy" || focusTarget === "history"
            ? "membership"
            : focusTarget === "referral"
              ? "referral"
              : null;
    if (!sectionKey) {
      return;
    }
    const offset = sectionOffsetsRef.current[sectionKey];
    if (typeof offset !== "number") {
      return;
    }
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, offset - spacing.lg), animated: true });
    }, 0);
    return () => clearTimeout(timer);
  }, [focusTarget]);

  async function refreshProfile() {
    setRefreshing(true);
    await Promise.all([
      profileQuery.refetch(),
      homeQuery.refetch(),
      activeMembershipQuery.refetch(),
      attendanceQuery.refetch(),
      plansQuery.refetch(),
      referralQuery.refetch(),
    ]);
    setRefreshing(false);
  }

  function confirmRoleSwitch(role: Role) {
    if (role === activeRole) return;
    Alert.alert(t("member.profile.switchRoleConfirmTitle", { role: formatRoleLabel(role) }), t("member.profile.switchRoleConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("member.profile.switch"),
        onPress: () => {
          setRoleBusy(role);
          void switchRole(role)
            .then(() => router.replace(routeForRole(role)))
            .catch((error) => {
              Alert.alert(
                t("member.profile.roleUnavailable"),
                error instanceof Error ? error.message : t("member.profile.roleUnavailableBody"),
              );
            })
            .finally(() => setRoleBusy(null));
        },
      },
    ]);
  }

  function confirmOtherGymRoleSwitch(input: { orgId: string; orgName: string; role: Role }) {
    Alert.alert(
      t("member.profile.otherGymRoleTitle", { role: formatRoleLabel(input.role) }),
      t("member.profile.otherGymRoleBody", { role: formatRoleLabel(input.role) }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("member.profile.switchGymForRole", { gym: input.orgName, role: formatRoleLabel(input.role) }),
          onPress: () => {
            void switchOrg(input.orgId)
              .then(() => switchRole(input.role))
              .then(() => router.replace(routeForRole(input.role)))
              .catch((error) => {
                Alert.alert(
                  t("member.profile.switchFailed"),
                  error instanceof Error ? error.message : t("member.profile.switchFailedBody"),
                );
              });
          },
        },
      ],
    );
  }

  function showRoleSwitcher() {
    if (!roles.length && !rolesInOtherGyms.length) {
      Alert.alert(t("member.profile.noRoles"), t("member.profile.noRolesBody"));
      return;
    }
    Alert.alert(
      t("member.profile.switchRole"),
      t("member.profile.switchRoleBody"),
      [
        ...roles.map((role) => ({
          text: role === activeRole ? t("member.profile.activeRoleOption", { role: formatRoleLabel(role) }) : formatRoleLabel(role),
          onPress: () => confirmRoleSwitch(role),
        })),
        ...rolesInOtherGyms.map((option) => ({
          text: t("member.profile.roleAtGym", { role: formatRoleLabel(option.role), gym: option.orgName }),
          onPress: () => confirmOtherGymRoleSwitch(option),
        })),
        { text: t("common.cancel"), style: "cancel" as const },
      ],
    );
  }

  function confirmGymSwitch(orgId: string, orgName: string) {
    if (orgId === activeOrgId) return;
    Alert.alert(t("member.profile.switchGymConfirmTitle", { gym: orgName }), t("member.profile.switchGymConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("member.profile.switch"),
        onPress: () => {
          void switchOrg(orgId);
        },
      },
    ]);
  }

  function showGymSwitcher() {
    const gyms = session?.organizations ?? [];
    if (!gyms.length) {
      Alert.alert(t("member.profile.noGyms"), t("member.profile.noGymsBody"));
      return;
    }
    Alert.alert(
      t("member.profile.switchGym"),
      t("member.profile.switchGymBody"),
      [
        ...gyms.map((gym) => ({
          text: gym.orgId === activeOrgId ? t("member.profile.activeGymOption", { gym: gym.name }) : gym.name,
          onPress: () => confirmGymSwitch(gym.orgId, gym.name),
        })),
        { text: t("common.cancel"), style: "cancel" as const },
      ],
    );
  }

  function confirmSignOut() {
    Alert.alert(t("member.profile.signOutConfirmTitle"), t("member.profile.signOutConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("member.profile.signOut"),
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
        Alert.alert(t("member.profile.biometricUnlock"), t("member.profile.biometricUnlockBody"));
      }
    });
  }

  async function shareReferral() {
    if (!referralCode) return;
    const rawLink = referralQuery.data?.links?.web ?? referralQuery.data?.links?.short ?? "";
    const link = rawLink
      ? /^https?:\/\//i.test(rawLink)
        ? rawLink
        : toWebUrl(rawLink)
      : "";
    await Share.share({
      message: link
        ? t("member.profile.shareReferralWithLink", { gym: activeOrganization?.name ?? t("member.profile.myGym"), code: referralCode.code, link })
        : t("member.profile.shareReferralCode", { gym: activeOrganization?.name ?? t("member.profile.myGym"), code: referralCode.code }),
    });
  }

  async function copyReferral() {
    if (!referralCode) return;
    const rawLink = referralQuery.data?.links?.web ?? referralQuery.data?.links?.short ?? "";
    const link = rawLink
      ? /^https?:\/\//i.test(rawLink)
        ? rawLink
        : toWebUrl(rawLink)
      : referralCode.code;
    await Clipboard.setStringAsync(link);
    Alert.alert(t("member.profile.referralCopied"), link === referralCode.code ? t("member.profile.referralCodeCopied") : t("member.profile.referralLinkCopied"));
  }

  return (
    <>
      <ZookScreen testID="profile-screen">
        <ScrollView
          ref={scrollRef}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshProfile()}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
        >
          <AppHeader
            title={t("member.profile.title")}
            showProfileShortcut={false}
            leading={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("settings.goBack")}
                hitSlop={12}
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace(routeForRole(activeRole));
                  }
                }}
                style={({ pressed }) => [
                  styles.backButton,
                  {
                    backgroundColor: mode === "dark" ? palette.surface.raised : palette.bg.elevated,
                    borderColor: palette.border.default,
                  },
                  pressed ? styles.backButtonPressed : null,
                ]}
              >
                <Ionicons name="chevron-back" size={22} color={palette.text.primary} />
              </Pressable>
            }
          />

          {referralCode ? (
            <View style={styles.section} onLayout={(event) => rememberSection("referral", event)}>
              <ReferralCard
                code={referralCode.code}
                maxUses={referralCode.maxUses}
                redemptions={referralCode.redemptionCount ?? 0}
                rewardsCount={referralQuery.data?.rewards.length ?? 0}
                onShare={() => void shareReferral()}
                onCopy={() => void copyReferral()}
              />
              <Text style={[styles.referralStat, { color: palette.text.primary }]}>
                {t("member.profile.friendsStat", { joined: referralCode.redemptionCount ?? 0, pending: pendingFriends })}
              </Text>
              {earnedCreditPaise > 0 || pendingCreditPaise > 0 ? (
                <Text style={[styles.referralStat, { color: palette.accent.base }]}>
                  {t("member.profile.earnedCredit", { amount: formatInr(earnedCreditPaise) })}
                  {pendingCreditPaise > 0 ? ` · ${t("member.profile.pendingCredit", { amount: formatInr(pendingCreditPaise) })}` : ""}
                </Text>
              ) : null}
              <Text style={[styles.referralBenefit, { color: palette.text.secondary }]}>{referralBenefit}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("member.profile.referGymAccessibility")}
            onPress={() => router.push("/rewards" as never)}
            style={({ pressed }) => (pressed ? { opacity: 0.92 } : null)}
          >
            <Card variant="compact" contentStyle={styles.referGymRow}>
              <IconBubble icon="gift" tone="lime" size={42} />
              <View style={styles.referGymCopy}>
                <Text style={[styles.referGymTitle, { color: palette.text.primary }]}>{t("member.profile.referGymTitle")}</Text>
                <Text style={[styles.referGymBody, { color: palette.text.secondary }]} numberOfLines={2}>
                  {t("member.profile.referGymBody")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={palette.text.tertiary} />
            </Card>
          </Pressable>

          <View onLayout={(event) => rememberSection("identity", event)}>
            <Card contentStyle={styles.identityCard}>
              <ProfilePhotoControl
                token={token}
                orgId={activeOrgId}
                name={userName}
                profilePhotoUrl={photoUrl}
                size={72}
                onSaved={() => void refreshProfile()}
              />
              <View style={styles.identityCopy}>
                <Text numberOfLines={1} style={[styles.name, { color: palette.text.primary }]}>
                  {userName}
                </Text>
                {userEmail ? (
                  <Text numberOfLines={1} style={[styles.email, { color: palette.text.secondary }]}>
                    {userEmail}
                  </Text>
                ) : null}
                <Text numberOfLines={2} style={[styles.gymLine, { color: palette.text.primary }]}>
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
                        accessibilityLabel={t("member.profile.useRoleAccessibility", { role: formatRoleLabel(role) })}
                        accessibilityState={{
                          selected: role === activeRole,
                          disabled: Boolean(roleBusy),
                          busy: roleBusy === role,
                        }}
                        disabled={Boolean(roleBusy)}
                        onPress={() => confirmRoleSwitch(role)}
                      >
                        <Pill tone={role === activeRole ? "blue" : "neutral"}>
                          {roleBusy === role ? t("member.profile.switching") : formatRoleLabel(role)}
                        </Pill>
                      </Pressable>
                    ))
                  ) : (
                    <Pill>{t("member.profile.noRoleAssigned")}</Pill>
                  )}
                </View>
              </View>
            </Card>
          </View>

          <View onLayout={(event) => rememberSection("details", event)}>
            <ProfileExtraFields />
          </View>

          {activeRole === "OWNER" || activeRole === "ADMIN" ? null : (
          <View style={styles.section} onLayout={(event) => rememberSection("membership", event)}>
            <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>{t("member.profile.membership")}</Text>
            <Card variant="compact" contentStyle={styles.membershipCard}>
              {membership ? (
                <>
                  <View style={styles.membershipTop}>
                    <View style={styles.membershipCopy}>
                      <Text numberOfLines={1} style={[styles.cardTitle, { color: palette.text.primary }]}>
                        {planName}
                      </Text>
                      <Text style={[styles.cardSubtitle, { color: palette.text.secondary }]}>
                        {t("member.profile.expires", { date: formatLongDate(membership.endsAt, t("member.profile.updating")) })}
                      </Text>
                    </View>
                    <Pill
                      tone={
                        String(membership.status ?? "").toLowerCase().includes("expired")
                          ? "red"
                          : "lime"
                      }
                    >
                      {membership.status ?? t("member.profile.active")}
                    </Pill>
                  </View>
                  <ProgressBar
                    value={membershipProgress}
                    label={membershipProgressCopy}
                  />
                  <View style={styles.actionRow}>
                    <ZookButton
                      href="/membership"
                      icon="refresh-outline"
                      size="sm"
                      style={styles.actionHalf}
                    >
                      {t("member.profile.renew")}
                    </ZookButton>
                    <ZookButton
                      href="/membership"
                      variant="secondary"
                      icon="time-outline"
                      size="sm"
                      style={styles.actionHalf}
                    >
                      {t("member.profile.viewHistory")}
                    </ZookButton>
                  </View>
                </>
              ) : (
                <EmptyState
                  icon="card-outline"
                  title={t("member.profile.noActiveMembership")}
                  action={
                    <ZookButton href="/gyms" variant="secondary" icon="search-outline" size="sm">
                      {t("member.profile.findGyms")}
                    </ZookButton>
                  }
                />
              )}
            </Card>
          </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>{t("member.profile.recentActivity")}</Text>
            <Card variant="compact" contentStyle={styles.activityCard}>
              {recentActivity.length ? (
                recentActivity.map((item) => (
                  <View key={item.id} style={styles.activityRow}>
                    <IconBubble icon={item.icon} tone="neutral" size={36} />
                    <View style={styles.activityCopy}>
                      <Text numberOfLines={1} style={[styles.activityTitle, { color: palette.text.primary }]}>
                        {item.title}
                      </Text>
                      <Text numberOfLines={1} style={[styles.activityMeta, { color: palette.text.secondary }]}>
                        {item.meta}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <EmptyState
                  icon="time-outline"
                  title={t("member.profile.noActivity")}
                />
              )}
            </Card>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>{t("member.profile.quickActions")}</Text>
            <View style={styles.quickGrid}>
              <ZookButton
                testID="profile-switch-role"
                variant="secondary"
                icon="swap-horizontal-outline"
                onPress={showRoleSwitcher}
                style={styles.quickButton}
              >
                {t("member.profile.switchRole")}
              </ZookButton>
              <ZookButton
                testID="profile-switch-gym"
                variant="secondary"
                icon="business-outline"
                onPress={showGymSwitcher}
                style={styles.quickButton}
              >
                {t("member.profile.switchGym")}
              </ZookButton>
              <ZookButton
                variant="secondary"
                icon="calendar-outline"
                onPress={() => router.push("/classes" as never)}
                style={styles.quickButton}
              >
                {t("member.profile.classes")}
              </ZookButton>
              <ZookButton
                testID="profile-biometric-toggle"
                variant="secondary"
                icon={biometricEnabled ? "lock-closed-outline" : "lock-open-outline"}
                onPress={toggleBiometricUnlock}
                style={styles.quickButton}
              >
                {biometricEnabled ? t("member.profile.biometricOn") : t("member.profile.biometric")}
              </ZookButton>
              <ZookButton
                href="/settings"
                variant="secondary"
                icon="settings-outline"
                style={styles.quickButton}
              >
                {t("member.profile.settings")}
              </ZookButton>
              {showQaShortcuts ? (
                <ZookButton
                  testID="profile-qa-shortcuts"
                  variant="secondary"
                  icon="flask-outline"
                  onPress={() => router.push("/qa" as never)}
                  style={styles.quickButton}
                >
                  {t("member.profile.qaShortcuts")}
                </ZookButton>
              ) : null}
              <ZookButton
                testID="profile-sign-out"
                variant="destructive"
                icon="log-out-outline"
                onPress={confirmSignOut}
                style={styles.quickButton}
              >
                {t("member.profile.signOut")}
              </ZookButton>
            </View>
          </View>
        </ScrollView>
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
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  backButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
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
    ...typography.screenTitle,
    textAlign: "left",
  },
  email: {
    ...typography.body,
    textAlign: "left",
  },
  gymLine: {
    ...typography.bodyStrong,
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
  },
  referralStat: {
    ...typography.bodyStrong,
  },
  referralBenefit: {
    ...typography.body,
  },
  referGymRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  referGymCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  referGymTitle: {
    ...typography.cardTitle,
  },
  referGymBody: {
    ...typography.small,
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
    ...typography.cardTitle,
  },
  cardSubtitle: {
    ...typography.body,
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
  },
  activityMeta: {
    ...typography.small,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  quickButton: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
});

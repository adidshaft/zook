import type { Role } from "@zook/core/types";
import { resolvePlanName } from "@zook/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
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
  ScreenHeader,
  BranchSelectorChip,
  Pill,
  ProgressBar,
  ZookButton,
  ZookScreen,
  useConfirmSheet,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { normalizeWebUrl, toWebUrl } from "@/lib/api";
import { useRoleContext } from "@/lib/role-context";
import { isMobileFeatureEnabled } from "@/lib/runtime-mode";
import {
  formatInr,
  formatLongDate,
  formatRoleLabel,
} from "@/lib/formatting";
import { useFormatters } from "@/lib/formatting-i18n";
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
import { showToast } from "@/lib/toast";

type ActivityItem = {
  id: string;
  title: string;
  meta: string;
  icon: keyof typeof Ionicons.glyphMap;
};
type ProfileSectionKey = "identity" | "details" | "membership" | "referral";

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
}, t: ReturnType<typeof useT>, formatVisitLimit: ReturnType<typeof useFormatters>["formatVisitLimit"]) {
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
  const { formatActivityDate, formatVisitLimit } = useFormatters();
  const showQaShortcuts = __DEV__ && isMobileFeatureEnabled("QA_SHORTCUTS_ENABLED");
  const params = useLocalSearchParams<{ focus?: string | string[] }>();
  const { mode, palette } = useTheme();
  const bottomPadding = useBottomScrollPadding({ hasStickyAction: true });
  const { confirm, sheet } = useConfirmSheet();
  const {
    activeOrgId,
    biometricEnabled,
    logout,
    session,
    setBiometricEnabled,
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
  const activeOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization ??
    null;
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsetsRef = useRef<Partial<Record<ProfileSectionKey, number>>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [roleBusy, setRoleBusy] = useState<Role | null>(null);

  const profile = profileQuery.data;
  const userName = profile?.user.name || session?.user.name || t("member.profile.memberFallback");
  const userEmail = profile?.user.email || session?.user.email || "";
  const userPhone = profile?.user.phone ?? "";
  const photoUrl = normalizeWebUrl(
    profile?.user.profilePhotoUrl ??
      profile?.profile?.profilePhotoUrl ??
      session?.user.profilePhotoUrl,
    { resolveRelative: false },
  );
  const roles = useMemo(() => activeOrganization?.roles ?? [], [activeOrganization?.roles]);
  const activeRole = roleContext?.role ?? "MEMBER";
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
  }, t, formatVisitLimit);
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
  const readinessItems = useMemo(
    () => [
      {
        id: "photo",
        done: Boolean(photoUrl),
        label: t("member.profile.readinessPhoto"),
      },
      {
        id: "contact",
        done: Boolean(userEmail || userPhone),
        label: t("member.profile.readinessContact"),
      },
      {
        id: "membership",
        done: Boolean(membership),
        label: t("member.profile.readinessMembership"),
      },
    ],
    [membership, photoUrl, t, userEmail, userPhone],
  );
  const readinessMissing = readinessItems.filter((item) => !item.done);
  const visibleReadinessMissing = readinessMissing.slice(0, 2);
  const hiddenReadinessMissingCount = Math.max(0, readinessMissing.length - visibleReadinessMissing.length);
  const readinessComplete = readinessMissing.length === 0;
  const readinessTitle = readinessComplete
    ? t("member.profile.readinessReadyTitle")
    : t("member.profile.readinessNeedsTitle");
  const readinessBody = readinessComplete
    ? t("member.profile.readinessReadyBody")
    : t("member.profile.readinessNeedsBody", { count: readinessMissing.length });

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
  }, [attendanceQuery.data?.attendance, formatActivityDate, plansQuery.data?.plans, t]);
  const focusTarget = firstParam(params.focus);
  const profileSections = useMemo(
    () => [
      { key: "identity" as const, label: t("member.profile.accountTab"), icon: "person-outline" as const },
      { key: "details" as const, label: t("member.profile.detailsTab"), icon: "create-outline" as const },
      ...(activeRole === "OWNER" || activeRole === "ADMIN"
        ? []
        : [{ key: "membership" as const, label: t("member.profile.membership"), icon: "card-outline" as const }]),
      { key: "referral" as const, label: t("member.profile.rewardsTab"), icon: "gift-outline" as const },
    ],
    [activeRole, t],
  );

  function rememberSection(
    key: ProfileSectionKey,
    event: LayoutChangeEvent,
  ) {
    sectionOffsetsRef.current[key] = event.nativeEvent.layout.y;
  }

  function scrollToSection(key: ProfileSectionKey) {
    const offset = sectionOffsetsRef.current[key];
    if (typeof offset !== "number") {
      return;
    }
    scrollRef.current?.scrollTo({ y: Math.max(0, offset - spacing.md), animated: true });
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
    confirm({
      title: t("member.profile.switchRoleConfirmTitle", { role: formatRoleLabel(role) }),
      body: t("member.profile.switchRoleConfirmBody"),
      destructiveLabel: t("member.profile.switch"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        setRoleBusy(role);
        try {
          await switchRole(role);
          router.replace(routeForRole(role));
        } catch (error) {
          showToast({
            title: t("member.profile.roleUnavailable"),
            message: error instanceof Error ? error.message : t("member.profile.roleUnavailableBody"),
            tone: "danger",
            haptic: "error",
          });
        } finally {
          setRoleBusy(null);
        }
      },
    });
  }

  function confirmSignOut() {
    confirm({
      title: t("member.profile.signOutConfirmTitle"),
      body: t("member.profile.signOutConfirmBody"),
      destructiveLabel: t("member.profile.signOut"),
      cancelLabel: t("common.cancel"),
      onConfirm: () => void logout(),
    });
  }

  function toggleBiometricUnlock() {
    void setBiometricEnabled(!biometricEnabled).then((enabled) => {
      if (!enabled && !biometricEnabled) {
        showToast({
          title: t("member.profile.biometricUnlock"),
          message: t("member.profile.biometricUnlockBody"),
          tone: "amber",
          haptic: "warning",
        });
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
    showToast({
      title: t("member.profile.referralCopied"),
      message: link === referralCode.code ? t("member.profile.referralCodeCopied") : t("member.profile.referralLinkCopied"),
      tone: "success",
      haptic: "success",
    });
  }

  return (
    <>
      <ZookScreen testID="profile-screen">
        <ScrollView
          ref={scrollRef}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]}
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
          <View style={[styles.stickyHeader, { backgroundColor: palette.bg.app }]}>
            <ScreenHeader
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
          </View>

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
                <BranchSelectorChip style={styles.identityGymSelector} />
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sectionRail}
          >
            {profileSections.map((section) => (
              <Pressable
                key={section.key}
                accessibilityRole="button"
                accessibilityLabel={section.label}
                onPress={() => scrollToSection(section.key)}
                style={({ pressed }) => [
                  styles.sectionChip,
                  {
                    backgroundColor: palette.surface.default,
                    borderColor: palette.border.subtle,
                  },
                  pressed ? styles.sectionChipPressed : null,
                ]}
              >
                <Ionicons name={section.icon} size={15} color={palette.text.secondary} />
                <Text numberOfLines={1} style={[styles.sectionChipText, { color: palette.text.primary }]}>
                  {section.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {readinessComplete ? null : (
            <Card variant="compact" padding={12} contentStyle={styles.readinessCard}>
              <View style={styles.readinessTop}>
                <IconBubble icon="person-circle-outline" tone="blue" size={36} />
                <View style={styles.readinessCopy}>
                  <Text numberOfLines={1} style={[styles.readinessTitle, { color: palette.text.primary }]}>
                    {readinessTitle}
                  </Text>
                  <Text numberOfLines={1} style={[styles.readinessBody, { color: palette.text.secondary }]}>
                    {readinessBody}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("member.profile.finishProfile")}
                  onPress={() => router.push("/profile?focus=details" as never)}
                  style={({ pressed }) => [
                    styles.readinessAction,
                    {
                      backgroundColor: palette.bg.sunken,
                      borderColor: palette.border.default,
                    },
                    pressed ? styles.readinessActionPressed : null,
                  ]}
                >
                  <Ionicons name="create-outline" size={17} color={palette.text.primary} />
                </Pressable>
              </View>
              <View style={styles.readinessList}>
                {visibleReadinessMissing.map((item) => (
                  <View key={item.id} style={styles.readinessItem}>
                    <Ionicons name="ellipse-outline" size={14} color={palette.text.tertiary} />
                    <Text numberOfLines={1} style={[styles.readinessItemText, { color: palette.text.primary }]}>
                      {item.label}
                    </Text>
                  </View>
                ))}
                {hiddenReadinessMissingCount > 0 ? (
                  <Text style={[styles.readinessMore, { color: palette.text.secondary }]}>
                    {t("member.profile.readinessMore", { count: hiddenReadinessMissingCount })}
                  </Text>
                ) : null}
              </View>
            </Card>
          )}

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
                  <ZookButton href="/membership" icon="card-outline" size="sm">
                    {t("member.you.viewMembership")}
                  </ZookButton>
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

          <View style={styles.section} onLayout={(event) => rememberSection("referral", event)}>
            <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>{t("member.profile.rewardsTab")}</Text>
            {referralCode ? (
              <>
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
              </>
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
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>{t("member.profile.quickActions")}</Text>
            <Card variant="compact" contentStyle={styles.quickList}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("member.profile.classes")}
                onPress={() => router.push("/classes" as never)}
                style={({ pressed }) => [styles.quickRow, pressed ? styles.quickRowPressed : null]}
              >
                <View style={[styles.quickIcon, { backgroundColor: palette.surface.default }]}>
                  <Ionicons name="calendar-outline" size={18} color={palette.text.secondary} />
                </View>
                <Text style={[styles.quickLabel, { color: palette.text.primary }]} numberOfLines={1}>
                  {t("member.profile.classes")}
                </Text>
                <Ionicons name="chevron-forward" size={17} color={palette.text.tertiary} />
              </Pressable>
              <Pressable
                testID="profile-biometric-toggle"
                accessibilityRole="button"
                accessibilityLabel={biometricEnabled ? t("member.profile.biometricOn") : t("member.profile.biometric")}
                onPress={toggleBiometricUnlock}
                style={({ pressed }) => [styles.quickRow, pressed ? styles.quickRowPressed : null]}
              >
                <View style={[styles.quickIcon, { backgroundColor: palette.surface.default }]}>
                  <Ionicons name={biometricEnabled ? "lock-closed-outline" : "lock-open-outline"} size={18} color={palette.text.secondary} />
                </View>
                <Text style={[styles.quickLabel, { color: palette.text.primary }]} numberOfLines={1}>
                  {biometricEnabled ? t("member.profile.biometricOn") : t("member.profile.biometric")}
                </Text>
                <Ionicons name="chevron-forward" size={17} color={palette.text.tertiary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("member.profile.settings")}
                onPress={() => router.push("/settings" as never)}
                style={({ pressed }) => [styles.quickRow, pressed ? styles.quickRowPressed : null]}
              >
                <View style={[styles.quickIcon, { backgroundColor: palette.surface.default }]}>
                  <Ionicons name="settings-outline" size={18} color={palette.text.secondary} />
                </View>
                <Text style={[styles.quickLabel, { color: palette.text.primary }]} numberOfLines={1}>
                  {t("member.profile.settings")}
                </Text>
                <Ionicons name="chevron-forward" size={17} color={palette.text.tertiary} />
              </Pressable>
              {showQaShortcuts ? (
                <Pressable
                  testID="profile-qa-shortcuts"
                  accessibilityRole="button"
                  accessibilityLabel={t("member.profile.qaShortcuts")}
                  onPress={() => router.push("/qa" as never)}
                  style={({ pressed }) => [styles.quickRow, pressed ? styles.quickRowPressed : null]}
                >
                  <View style={[styles.quickIcon, { backgroundColor: palette.surface.default }]}>
                    <Ionicons name="flask-outline" size={18} color={palette.text.secondary} />
                  </View>
                  <Text style={[styles.quickLabel, { color: palette.text.primary }]} numberOfLines={1}>
                    {t("member.profile.qaShortcuts")}
                  </Text>
                  <Ionicons name="chevron-forward" size={17} color={palette.text.tertiary} />
                </Pressable>
              ) : null}
              <Pressable
                testID="profile-sign-out"
                accessibilityRole="button"
                accessibilityLabel={t("member.profile.signOut")}
                onPress={confirmSignOut}
                style={({ pressed }) => [styles.quickRow, pressed ? styles.quickRowPressed : null]}
              >
                <View style={[styles.quickIcon, { backgroundColor: palette.surface.dangerSoft }]}>
                  <Ionicons name="log-out-outline" size={18} color={palette.feedback.danger} />
                </View>
                <Text style={[styles.quickLabel, { color: palette.feedback.danger }]} numberOfLines={1}>
                  {t("member.profile.signOut")}
                </Text>
                <Ionicons name="chevron-forward" size={17} color={palette.text.tertiary} />
              </Pressable>
            </Card>
          </View>
        </ScrollView>
      </ZookScreen>
      {sheet}
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
  stickyHeader: {
    marginHorizontal: -layout.screenPadding,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xs,
    zIndex: 2,
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
  identityGymSelector: {
    marginTop: spacing.xs,
    maxWidth: "100%",
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-start",
    marginTop: spacing.sm,
  },
  sectionRail: {
    gap: spacing.sm,
    paddingRight: layout.screenPadding,
  },
  sectionChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.md,
  },
  sectionChipPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  sectionChipText: {
    ...typography.caption,
    maxWidth: 110,
  },
  readinessCard: {
    gap: spacing.md,
  },
  readinessTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  readinessCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  readinessTitle: {
    ...typography.cardTitle,
  },
  readinessBody: {
    ...typography.body,
  },
  readinessAction: {
    alignItems: "center",
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  readinessActionPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.96 }],
  },
  readinessList: {
    gap: spacing.sm,
  },
  readinessItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  readinessItemText: {
    ...typography.bodyStrong,
    flex: 1,
  },
  readinessMore: {
    ...typography.caption,
    paddingLeft: 22,
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
  quickList: {
    gap: 4,
  },
  quickRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 50,
    paddingVertical: spacing.xs,
  },
  quickRowPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  quickIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  quickLabel: {
    ...typography.bodyStrong,
    flex: 1,
    minWidth: 0,
  },
});

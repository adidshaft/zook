import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  IconBubble,
  AppHeader,
  Pill,
  QueryErrorState,
  SectionHeader,
  Skeleton,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { membershipStatusLabel, toneForStatus } from "@/components/membership/helpers";
import { useAuth } from "@/lib/auth";
import { apiClient, ownerApi } from "@/lib/domain-api";
import { toWebUrl } from "@/lib/api";
import { formatInitials, formatLongDate, formatRedactedPhone } from "@/lib/formatting";
import { getStoredValue, phoneRevealStorageKey, setStoredValue } from "@/lib/storage";
import type { OrgMemberRecord } from "@/lib/domains/shared/types";
import { useT } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { useEffect, useState } from "react";

type OrgMemberDetailResponse = {
  member: OrgMemberRecord & {
    subscriptions?: Array<{
      id?: string;
      status?: string;
      endsAt?: string | null;
      remainingVisits?: number | null;
    }>;
  };
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.ceil((timestamp - Date.now()) / 86_400_000);
}

function BackButton({ accessibilityLabel, onPress }: { accessibilityLabel: string; onPress: () => void }) {
  const { palette, mode } = useTheme();
  const chromeSurface = mode === "dark" ? palette.surface.default : palette.bg.elevated;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.iconButton,
        {
          borderColor: palette.border.subtle,
          backgroundColor: chromeSurface,
        },
        pressed ? styles.iconButtonPressed : null,
      ]}
    >
      <Ionicons name="chevron-back" size={21} color={palette.text.primary} />
    </Pressable>
  );
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: "mail-outline" | "call-outline";
  label: string;
  value: string;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.contactRow}>
      <IconBubble icon={icon} tone="neutral" size={40} />
      <View style={styles.contactCopy}>
        <Text style={[styles.rowLabel, { color: palette.text.secondary }]}>{label}</Text>
        <Text selectable style={[styles.rowValue, { color: palette.text.primary }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function OwnerMemberDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = firstParam(params.id);
  const { activeOrgId: resolvedOrgId, token } = useAuth();
  const { palette } = useTheme();
  const t = useT();
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const memberQuery = useQuery({
    queryKey: ["org", resolvedOrgId, "members", id],
    queryFn: () =>
      ownerApi.member<OrgMemberDetailResponse>({
        token,
        orgId: resolvedOrgId,
        memberUserId: id!,
      }),
    enabled: Boolean(token) && Boolean(resolvedOrgId) && Boolean(id),
    select: (data) => data.member,
    retry: false,
  });
  const member = memberQuery.data;
  const name = member?.user?.name ?? t("owner.member.memberFallback");
  const email = member?.user?.email ?? "";
  const phone = member?.user?.phone ?? "";
  const goal = member?.user?.fitnessGoal ?? member?.profile.fitnessGoal ?? t("owner.member.notSet");
  const notes = member?.profile.notes;
  const subscriptionStatus = member?.activeSubscription?.status ?? null;
  const subscriptionStatusLabel = subscriptionStatus ? membershipStatusLabel(subscriptionStatus, t) : t("owner.member.noActivePlan");
  const subscriptions = member?.subscriptions ?? [];
  const activePlanDaysLeft = daysUntil(member?.activeSubscription?.endsAt);
  const isPlanExpiring = activePlanDaysLeft != null && activePlanDaysLeft >= 0 && activePlanDaysLeft <= 14;
  const needsContact = !email || !phone;
  const needsPlan = !member?.activeSubscription || subscriptionStatus !== "ACTIVE";
  const nextAction = needsPlan
    ? {
        id: "recordPayment" as const,
        icon: "card-outline" as const,
        title: t("owner.member.actionPlanTitle"),
        body: t("owner.member.actionPlanBody"),
        cta: t("owner.member.recordPayment"),
        onPress: recordPayment,
      }
    : needsContact
      ? {
          id: "viewFullProfile" as const,
          icon: "call-outline" as const,
          title: t("owner.member.actionContactTitle"),
          body: t("owner.member.actionContactBody"),
          cta: t("owner.member.viewFullProfile"),
          onPress: openWebProfile,
        }
      : isPlanExpiring
        ? {
            id: "sendReminder" as const,
            icon: "notifications-outline" as const,
            title: t("owner.member.actionExpiringTitle"),
            body: t("owner.member.actionExpiringBody", { count: activePlanDaysLeft ?? 0 }),
            cta: t("owner.member.sendReminder"),
            onPress: sendReminder,
          }
        : {
            id: "viewFullProfile" as const,
            icon: "checkmark-circle-outline" as const,
            title: t("owner.member.actionHealthyTitle"),
            body: t("owner.member.actionHealthyBody"),
            cta: t("owner.member.viewFullProfile"),
            onPress: openWebProfile,
          };
  const secondaryActions = [
    {
      id: "sendReminder",
      icon: "notifications-outline" as const,
      label: t("owner.member.sendReminder"),
      onPress: sendReminder,
    },
    {
      id: "recordPayment",
      icon: "card-outline" as const,
      label: t("owner.member.recordPayment"),
      onPress: recordPayment,
    },
    {
      id: "viewFullProfile",
      icon: "open-outline" as const,
      label: t("owner.member.viewFullProfile"),
      onPress: openWebProfile,
    },
  ].filter((action) => action.id !== nextAction.id);

  useEffect(() => {
    let mounted = true;
    setPhoneRevealed(false);
    void getStoredValue(phoneRevealStorageKey("owner", resolvedOrgId)).then((stored) => {
      if (!mounted || !id || !stored) return;
      try {
        const parsed = JSON.parse(stored);
        setPhoneRevealed(Array.isArray(parsed) && parsed.includes(id));
      } catch {
        setPhoneRevealed(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [id, resolvedOrgId]);

  async function revealPhone() {
    if (!id) return;
    setPhoneRevealed(true);
    try {
      const stored = await getStoredValue(phoneRevealStorageKey("owner", resolvedOrgId));
      const parsed = stored ? JSON.parse(stored) : [];
      const next = new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
      next.add(id);
      await setStoredValue(phoneRevealStorageKey("owner", resolvedOrgId), JSON.stringify(Array.from(next)));
      if (token && resolvedOrgId) {
        await apiClient.request("/audit-logs", {
          method: "POST",
          token,
          orgId: resolvedOrgId,
          body: { action: "MEMBER_PHONE_REVEALED", targetId: id },
        });
      }
    } catch {
      showToast({
        title: t("owner.member.revealNotLogged"),
        message: t("owner.member.revealNotLoggedBody"),
        tone: "amber",
      });
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await memberQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  async function sendReminder() {
    if (!token || !resolvedOrgId || !id || reminderSending) return;
    setReminderSending(true);
    try {
      const endsAt = member?.activeSubscription?.endsAt ?? null;
      const dateLabel = formatLongDate(endsAt, t("owner.members.soon"));
      await ownerApi.sendMemberNotification({
        token,
        orgId: resolvedOrgId,
        memberUserId: id,
        title: t("owner.members.expiringReminderTitle"),
        body: t("owner.members.expiringReminderBody", { date: dateLabel }),
        metadata: { reason: "manual_member_detail_reminder", endsAt },
      });
      showToast({
        tone: "success",
        haptic: "success",
        message: t("owner.members.reminderSent", { name }),
      });
    } catch (error) {
      showToast({
        title: t("owner.members.reminderNotSent"),
        message: error instanceof Error ? error.message : t("owner.members.tryAgain"),
        tone: "danger",
        haptic: "error",
      });
    } finally {
      setReminderSending(false);
    }
  }

  function recordPayment() {
    showToast({ tone: "neutral", message: t("owner.member.openingPaymentTools") });
    if (id) {
      void Linking.openURL(toWebUrl(`/dashboard/payments/new?memberId=${encodeURIComponent(id)}`));
    }
  }

  function openWebProfile() {
    if (!id) return;
    void Linking.openURL(toWebUrl(`/dashboard/members/${encodeURIComponent(id)}`));
  }

  return (
    <>
      <ZookScreen testID="owner-member-detail-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
        >
          <AppHeader
            title={name}
            leading={
              <BackButton
                accessibilityLabel={t("common.back")}
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace("/owner/members")
                }
              />
            }
            showProfileShortcut={false}
          />

          {memberQuery.isLoading ? (
            <Card variant="compact" contentStyle={styles.stateContent}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={styles.stateSkeletonCopy}>
                <Skeleton width="72%" height={16} borderRadius={8} />
                <Skeleton width="48%" height={12} borderRadius={6} />
              </View>
            </Card>
          ) : null}

          {memberQuery.isError ? (
            <Card variant="compact">
              <QueryErrorState
                error={memberQuery.error}
                onRetry={() => void memberQuery.refetch()}
                title={t("owner.member.couldNotLoadMember")}
              />
            </Card>
          ) : null}

          {!memberQuery.isLoading && !memberQuery.isError && !member ? (
            <Card variant="compact" contentStyle={styles.stateContent}>
              <Text style={[styles.stateText, { color: palette.text.primary }]}>
                {t("owner.member.notFound")}
              </Text>
            </Card>
          ) : null}

          {member ? (
            <>
              <Card variant="compact" contentStyle={styles.profileContent}>
                <View style={[styles.largeAvatar, { backgroundColor: palette.accent.fill }]}>
                  <Text style={[styles.largeAvatarText, { color: palette.text.onAccent }]}>
                    {formatInitials(name, email)}
                  </Text>
                </View>
                <View style={styles.profileCopy}>
                  <Text style={[styles.memberName, { color: palette.text.primary }]}>
                    {t("owner.member.memberSince")}
                  </Text>
                  <Text style={[styles.memberEmail, { color: palette.text.secondary }]}>
                    {formatLongDate(member.profile.createdAt)}
                  </Text>
                  <Pill tone={toneForStatus(subscriptionStatus)}>{subscriptionStatusLabel}</Pill>
                </View>
              </Card>

              <Card contentStyle={styles.nextActionCard}>
                <View style={styles.sectionRow}>
                  <IconBubble icon={nextAction.icon} tone={needsPlan || isPlanExpiring ? "amber" : "neutral"} size={42} />
                  <View style={styles.sectionCopy}>
                    <Text style={[styles.sectionLabel, { color: palette.text.secondary }]}>
                      {t("owner.member.nextBestAction")}
                    </Text>
                    <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>
                      {nextAction.title}
                    </Text>
                    <Text style={[styles.nextActionBody, { color: palette.text.secondary }]}>
                      {nextAction.body}
                    </Text>
                  </View>
                </View>
                <ZookButton
                  variant={needsPlan ? "primary" : "secondary"}
                  icon={nextAction.icon}
                  onPress={nextAction.onPress}
                  disabled={nextAction.id === "sendReminder" && reminderSending}
                  busy={nextAction.id === "sendReminder" && reminderSending}
                >
                  {nextAction.cta}
                </ZookButton>
              </Card>

              <Card contentStyle={styles.sectionContent}>
                <View style={styles.sectionRow}>
                  <IconBubble icon="barbell-outline" tone="neutral" size={42} />
                  <View style={styles.sectionCopy}>
                    <Text style={[styles.sectionLabel, { color: palette.text.secondary }]}>
                      {t("owner.member.fitnessGoal")}
                    </Text>
                    <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>
                      {goal}
                    </Text>
                  </View>
                </View>
                {notes ? (
                  <View style={[styles.notesBox, { borderTopColor: palette.border.subtle }]}>
                    <Text style={[styles.rowLabel, { color: palette.text.secondary }]}>{t("owner.member.notes")}</Text>
                    <Text selectable style={[styles.notesText, { color: palette.text.primary }]}>
                      {notes}
                    </Text>
                  </View>
                ) : null}
              </Card>

              <Card contentStyle={styles.sectionContent}>
                <ContactRow icon="mail-outline" label={t("owner.member.email")} value={email || t("owner.member.notAvailable")} />
                {phone ? (
                  <View style={styles.contactRow}>
                    <IconBubble icon="call-outline" tone="neutral" size={40} />
                    <View style={styles.contactCopy}>
                      <Text style={[styles.rowLabel, { color: palette.text.secondary }]}>
                        {t("owner.member.phone")}
                      </Text>
                      <Text
                        selectable={phoneRevealed}
                        style={[styles.rowValue, { color: palette.text.primary }]}
                      >
                        {phoneRevealed ? phone : formatRedactedPhone(phone, t("owner.member.notAvailable"))}
                      </Text>
                    </View>
                    {!phoneRevealed ? (
                      <Pressable
                        onPress={() => void revealPhone()}
                        accessibilityRole="button"
                        accessibilityLabel={t("owner.member.revealPhoneFor", { name })}
                        style={({ pressed }) => [
                          styles.revealPhoneButton,
                          { borderColor: palette.border.default, backgroundColor: palette.surface.raised },
                          pressed ? styles.revealPhoneButtonPressed : null,
                        ]}
                      >
                        <Ionicons name="eye-outline" size={15} color={palette.accent.base} />
                        <Text style={[styles.revealPhoneText, { color: palette.accent.base }]}>
                          {t("owner.member.reveal")}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </Card>

              <Card contentStyle={styles.actionCard}>
                {secondaryActions.map((action) => (
                  <Pressable
                    key={action.id}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    onPress={action.onPress}
                    disabled={action.id === "sendReminder" && reminderSending}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.secondaryIconAction,
                      { borderColor: palette.border.default, backgroundColor: palette.surface.default },
                      action.id === "sendReminder" && reminderSending ? styles.secondaryIconActionDisabled : null,
                      pressed ? styles.secondaryIconActionPressed : null,
                    ]}
                  >
                    <Ionicons name={action.icon} size={19} color={palette.text.primary} />
                  </Pressable>
                ))}
              </Card>

              {subscriptions.length > 1 ? (
                <>
                  <SectionHeader title={t("owner.member.subscriptionHistory")} />
                  <Card contentStyle={styles.sectionContent}>
                    {subscriptions.map((subscription, index) => (
                      <View key={subscription.id ?? index} style={styles.subRow}>
                        <Pill tone={toneForStatus(subscription.status ?? null)}>
                          {membershipStatusLabel(subscription.status, t)}
                        </Pill>
                        {subscription.endsAt ? (
                          <Text style={[styles.rowLabel, { color: palette.text.secondary }]}>
                            {t("owner.member.untilDate", { date: formatLongDate(subscription.endsAt) })}
                          </Text>
                        ) : null}
                        {subscription.remainingVisits != null ? (
                          <Text style={[styles.rowLabel, { color: palette.text.secondary }]}>
                            {t("owner.member.visitsLeft", { count: subscription.remainingVisits })}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </Card>
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: layout.screenContentTopPadding,
    gap: spacing.md,
    paddingBottom: 96,
  },
  iconButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  iconButtonPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  stateContent: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: spacing.md },
  stateSkeletonCopy: { flex: 1, gap: 8 },
  stateText: typography.cardTitle,
  profileContent: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  largeAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  largeAvatarText: typography.headerTitle,
  profileCopy: { flex: 1, gap: 5, alignItems: "flex-start" },
  memberName: typography.headerTitle,
  memberEmail: typography.small,
  sectionContent: { gap: spacing.md },
  nextActionCard: { gap: spacing.md },
  nextActionBody: { ...typography.body, marginTop: 2 },
  actionCard: { alignSelf: "flex-end", flexDirection: "row", gap: spacing.sm },
  secondaryIconAction: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  secondaryIconActionPressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  secondaryIconActionDisabled: { opacity: 0.48 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  sectionCopy: { flex: 1, gap: 3 },
  sectionLabel: typography.caption,
  sectionTitle: typography.cardTitle,
  notesBox: { borderTopWidth: 1, paddingTop: spacing.md, gap: 4 },
  notesText: typography.body,
  contactRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  contactCopy: { flex: 1, gap: 3 },
  rowLabel: typography.caption,
  rowValue: typography.bodyStrong,
  revealPhoneButton: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  revealPhoneButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  revealPhoneText: typography.caption,
  subRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});

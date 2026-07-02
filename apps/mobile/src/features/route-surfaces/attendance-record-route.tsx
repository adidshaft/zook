import { Link, type Href, useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { showToast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  IconBubble,
  ListRow,
  ScreenHeader,
  Skeleton,
  StatusRing,
  StatusChip,
  ZookButton,
  ZookChip,
  ZookScreen,
} from "@/components/primitives";
import { useHideBottomNav } from "@/components/primitives/bottom-nav-context";
import { useAuth } from "@/lib/auth";
import { attendanceApi } from "@/lib/domain-api";
import { useMemberHome } from "@/lib/domains";
import type { MemberHomeData } from "@/lib/domains/shared/types";
import { formatDurationSeconds, formatTime, titleCaseFromCode } from "@/lib/formatting";
import { type TranslationKey, useT } from "@/lib/i18n";
import { useRoleContext } from "@/lib/role-context";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

type AttendanceRecord = {
  id: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  checkoutReason?: string | null;
  durationSeconds?: number | null;
  status?: string | null;
  entryCode?: string | null;
  branchName?: string | null;
  planName?: string | null;
  reason?: string | null;
  source?: string | null;
};

const attendanceStatusLabelKeys: Record<string, TranslationKey> = {
  APPROVED: "member.attendance.approved",
  FAILED: "member.receipt.statusFailed",
  FLAGGED: "reception.desk.flagged",
  PENDING_APPROVAL: "member.attendance.pendingApproval",
  RECORDED: "reception.desk.statusRecorded",
  REJECTED: "reception.desk.statusRejected",
};

function attendanceStatusLabel(status: string | null | undefined, t: ReturnType<typeof useT>) {
  const normalized = (status ?? "RECORDED").toUpperCase();
  const labelKey = attendanceStatusLabelKeys[normalized];
  return labelKey ? t(labelKey) : titleCaseFromCode(status ?? "RECORDED");
}

function toAttendanceFallbackRecord(
  home: MemberHomeData,
  attendanceRecordId?: string,
): AttendanceRecord | null {
  if (!attendanceRecordId) {
    return null;
  }
  if (home.activeCheckIn?.id === attendanceRecordId) {
    return {
      id: home.activeCheckIn.id,
      checkedInAt: home.activeCheckIn.checkedInAt,
      checkedOutAt: home.activeCheckIn.checkedOutAt,
      checkoutReason: home.activeCheckIn.checkoutReason,
      durationSeconds: home.activeCheckIn.durationSeconds,
      status: home.activeCheckIn.status,
      branchName: home.activeCheckIn.branchName ?? null,
      source: home.activeCheckIn.source ?? null,
      reason: home.activeMembership?.status === "ACTIVE" ? "Membership active." : undefined,
    };
  }
  const recent = home.recentAttendance.find((record) => record.id === attendanceRecordId);
  if (!recent) {
    return null;
  }
  return {
    id: recent.id,
    checkedInAt: recent.checkedInAt,
    checkedOutAt: recent.checkedOutAt,
    checkoutReason: recent.checkoutReason,
    durationSeconds: recent.durationSeconds,
    status: recent.status,
    source: recent.source ?? null,
  };
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const fallbackDefaultBranchName = ["Default", "Branch"].join(" ");

export default function AttendanceResultScreen() {
  useHideBottomNav();
  const router = useRouter();
  const routeParams = useLocalSearchParams<{
    attendanceRecordId?: string | string[];
  }>();
  const { activeOrgId, status, token } = useAuth();
  const { palette } = useTheme();
  const t = useT();
  const activeRole = useRoleContext()?.role;
  const queryClient = useQueryClient();
  const memberHomeQuery = useMemberHome();
  const attendanceRecordId = firstParam(routeParams.attendanceRecordId);
  const attendanceQuery = useQuery({
    queryKey: ["me", "attendance", attendanceRecordId],
    queryFn: () =>
      attendanceApi.detail<{ attendance: AttendanceRecord }>({
        token,
        attendanceRecordId: attendanceRecordId!,
      }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(attendanceRecordId),
    retry: false,
  });
  const { refetch: refetchAttendance } = attendanceQuery;
  const recordFromApi = attendanceQuery.data?.attendance ?? null;
  const memberHomeSnapshot =
    memberHomeQuery.data ??
    queryClient.getQueryData<MemberHomeData>(["me", "home", activeOrgId ?? null]) ??
    null;
  const fallbackAttendance = memberHomeSnapshot
    ? toAttendanceFallbackRecord(memberHomeSnapshot, attendanceRecordId)
    : null;
  const warning =
    queryClient.getQueryData<string>(["me", "attendanceWarning", attendanceRecordId]) ?? "";
  const dismissAttendance = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/scan");
  };
  const dismissButton = (
    <Pressable
      onPress={dismissAttendance}
      accessibilityRole="button"
      accessibilityLabel={t("member.attendance.dismissDetails")}
      hitSlop={{ top: 4, right: 4, bottom: 4, left: 4 }}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: palette.surface.raised, borderColor: palette.border.default },
        pressed ? styles.controlPressed : null,
      ]}
    >
      <Ionicons name="close" size={20} color={palette.text.primary} />
    </Pressable>
  );

  useEffect(() => {
    if (!attendanceRecordId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "attendance", attendanceRecordId] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
      if (!cancelled) {
        await refetchAttendance();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attendanceRecordId, queryClient, refetchAttendance]);

  if (attendanceQuery.isLoading && !recordFromApi) {
    return (
      <>
        <ZookScreen>
          <ScrollView
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, styles.contentWithoutNav]}
          >
            <ScreenHeader title={t("member.attendance.title")} leading={dismissButton} showProfileShortcut={false} />
            <Card variant="compact" contentStyle={styles.notFoundContent}>
              <Skeleton width={48} height={48} borderRadius={24} />
              <Skeleton width="62%" height={22} borderRadius={11} />
              <Skeleton width="38%" height={14} borderRadius={7} />
            </Card>
          </ScrollView>
        </ZookScreen>
      </>
    );
  }

  if (!attendanceRecordId || (!recordFromApi && !fallbackAttendance)) {
    return (
      <>
        <ZookScreen>
          <ScrollView
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, styles.contentWithoutNav]}
          >
            <ScreenHeader title={t("member.attendance.title")} leading={dismissButton} showProfileShortcut={false} />
            <Card variant="compact" contentStyle={styles.notFoundContent}>
              <IconBubble icon="alert-circle-outline" tone="amber" size={48} />
              <Text style={[styles.notFoundTitle, { color: palette.text.primary }]}>{t("member.attendance.notFound")}</Text>
              <ZookButton
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                variant="secondary"
                icon="chevron-back"
              >
                {t("shop.back")}
              </ZookButton>
            </Card>
          </ScrollView>
        </ZookScreen>
      </>
    );
  }

  const record: AttendanceRecord = recordFromApi ?? fallbackAttendance!;

  const pending = record.status === "PENDING_APPROVAL";
  const blocked = record.status === "REJECTED" || record.status === "FLAGGED";
  const approved = !pending && !blocked;
  const checkedOut = Boolean(record.checkedOutAt);
  const tone = pending ? "amber" : approved ? "lime" : "red";
  const code = record.entryCode?.trim() || null;
  const branchName =
    record.branchName === fallbackDefaultBranchName
      ? t("member.attendance.mainBranch")
      : (record.branchName ?? t("member.attendance.assignedBranch"));
  const planName = record.planName ?? t("member.attendance.activeMembership");
  const reason = record.reason === "Membership active." ? t("member.attendance.membershipActive") : record.reason;
  const planTarget: Href =
    activeRole === "TRAINER" ? ("/trainer/plans" as Href) : ("/plan?view=detail" as Href);

  return (
    <>
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, pending ? styles.contentWithoutNav : null]}
        >
          <ScreenHeader
            title={t("member.attendance.title")}
            subtitle={pending ? branchName : undefined}
            leading={dismissButton}
            showProfileShortcut={false}
          />

          <View style={styles.hero}>
            <StatusRing
              tone={tone}
              icon={pending ? "time-outline" : blocked ? "alert-circle-outline" : "checkmark"}
              size={pending ? 88 : 92}
              progress={pending ? 0.52 : blocked ? 0.66 : 1}
            />
            <Text style={[styles.heroTitle, { color: palette.text.primary }]}>
              {pending
                ? t("member.attendance.waitingDeskApproval")
                : blocked
                  ? t("member.attendance.deskHelpNeeded")
                  : checkedOut
                    ? t("member.attendance.checkedOut")
                    : t("member.attendance.checkedIn")}
            </Text>
            <Text style={[styles.heroBody, { color: palette.text.secondary }]}>
              {pending
                ? t("member.attendance.pendingBody")
                : blocked
                  ? (reason ?? t("member.attendance.reviewAtDesk"))
                  : checkedOut
                    ? t("member.attendance.gymTimeRecorded")
                    : (reason ?? t("member.attendance.entryApproved"))}
            </Text>
          </View>

          {approved && warning ? (
            <Card contentStyle={styles.warningContent}>
              <IconBubble icon="person-circle-outline" tone="amber" size={42} />
              <View style={styles.warningCopy}>
                <Text style={[styles.warningTitle, { color: palette.text.primary }]}>{t("member.attendance.profilePhotoRecommended")}</Text>
                <Text style={[styles.warningBody, { color: palette.text.secondary }]}>{warning}</Text>
              </View>
            </Card>
          ) : null}

          {pending ? (
            <>
              <Card variant="warning" contentStyle={styles.pendingCodeContent}>
                <Text style={[styles.entryLabel, { color: palette.text.secondary }]}>{t("member.attendance.entryCode")}</Text>
                {code ? (
                  <>
                    <Pressable
                      onPress={async () => {
                        try {
                          await Clipboard.setStringAsync(code);
                          showToast({ tone: "success", message: t("member.attendance.entryCodeCopied") });
                        } catch {
                          showToast({ tone: "danger", message: t("member.attendance.copyCodeFailed") });
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t("member.attendance.copyEntryCodeAccessibility", { code })}
                      hitSlop={8}
                      style={({ pressed }) => (pressed ? styles.codePressed : null)}
                    >
                      <Text style={[styles.pendingCode, { color: palette.feedback.warning }]}>{code}</Text>
                    </Pressable>
                    <View style={styles.pendingChips}>
                      <StatusChip status={t("member.attendance.pendingApproval")} />
                      <StatusChip status={t("member.attendance.membershipActive")} icon="checkmark" />
                    </View>
                    <StatusChip status={t("member.attendance.deskConfirmationNeeded")} icon="alert-circle-outline" />
                  </>
                ) : (
                  <Text style={[styles.codeUnavailable, { color: palette.text.secondary }]}>
                    {t("member.attendance.entryCodeUnavailable")}
                  </Text>
                )}
              </Card>

              <Card contentStyle={styles.reasonContent}>
                <IconBubble icon="alert-circle-outline" tone="amber" size={48} />
                <View style={styles.reasonCopy}>
                  <Text style={[styles.reasonTitle, { color: palette.text.primary }]}>{t("member.attendance.whyConfirmation")}</Text>
                  <Text style={[styles.reasonBody, { color: palette.text.secondary }]}>
                    {t("member.attendance.whyConfirmationBody")}
                  </Text>
                </View>
              </Card>

              <ZookButton
                onPress={() => void attendanceQuery.refetch()}
                disabled={attendanceQuery.isFetching}
                icon="refresh-outline"
              >
                {attendanceQuery.isFetching ? t("member.attendance.updating") : t("member.attendance.refreshStatus")}
              </ZookButton>
              <ZookButton href="/" variant="secondary" icon="home-outline">
                {t("member.attendance.backToHome")}
              </ZookButton>
            </>
          ) : blocked ? (
            <>
              <Card variant="warning" contentStyle={styles.reasonContent}>
                <IconBubble icon="alert-circle-outline" tone="amber" size={48} />
                <View style={styles.reasonCopy}>
                  <Text style={[styles.reasonTitle, { color: palette.text.primary }]}>{t("member.attendance.notApproved")}</Text>
                  <Text style={[styles.reasonBody, { color: palette.text.secondary }]}>
                    {reason || t("member.attendance.deskCanHelp")}
                  </Text>
                </View>
              </Card>
              <ZookButton href="/scan" variant="secondary" icon="qr-code-outline">
                {t("shop.tryAgain")}
              </ZookButton>
            </>
          ) : (
            <>
              <Card contentStyle={styles.approvedCodeContent}>
                <View style={styles.approvedCodeHero}>
                  <Text style={[styles.entryLabel, { color: palette.text.secondary }]}>{t("member.attendance.entryCode")}</Text>
                  {code ? (
                    <>
                      <Text style={[styles.approvedCode, { color: palette.accent.base }]}>{code}</Text>
                      <ZookChip tone="lime">{t("member.attendance.approved")}</ZookChip>
                      <Text style={[styles.codeDetail, { color: palette.text.secondary }]}>{t("member.attendance.showToDesk")}</Text>
                    </>
                  ) : (
                    <Text style={[styles.codeUnavailable, { color: palette.text.secondary }]}>
                      {t("member.attendance.entryCodeUnavailable")}
                    </Text>
                  )}
                </View>
                <View style={[styles.divider, { backgroundColor: palette.border.subtle }]} />
                <DetailLine
                  label={t("member.attendance.checkIn")}
                  value={formatTime(record.checkedInAt, "--:--")}
                  icon="time-outline"
                />
                <DetailLine
                  label={t("member.attendance.checkOut")}
                  value={record.checkedOutAt ? formatTime(record.checkedOutAt, "--:--") : t("member.attendance.inProgress")}
                  icon="stop-circle-outline"
                />
                <DetailLine
                  label={t("member.attendance.duration")}
                  value={formatDurationSeconds(record.durationSeconds, {
                    includeZeroMinutes: true,
                    minimumMinutes: 1,
                    separator: " ",
                  })}
                  icon="timer-outline"
                />
                <DetailLine label={t("member.attendance.branch")} value={branchName} icon="shield-checkmark-outline" />
                <DetailLine label={t("member.attendance.plan")} value={planName} icon="reader-outline" />
                <DetailLine
                  label={t("member.attendance.status")}
                  value={attendanceStatusLabel(record.status, t)}
                  icon="checkmark-circle-outline"
                  highlight
                />
              </Card>

              <Card contentStyle={styles.nextContent}>
                <IconBubble icon="barbell-outline" tone="neutral" size={44} />
                <View style={styles.nextCopy}>
                  <Text style={[styles.nextTitle, { color: palette.text.primary }]}>{t("member.attendance.nextUp")}</Text>
                  <Text style={[styles.nextBody, { color: palette.text.secondary }]}>
                    {t("member.attendance.openAssignedPlanBody")}
                  </Text>
                </View>
                <Link href={planTarget} asChild>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={t("member.attendance.openAssignedPlanAccessibility")}
                    style={({ pressed }) => (pressed ? styles.controlPressed : null)}
                    hitSlop={6}
                  >
                    <ZookChip tone="blue" icon="chevron-forward">
                      {t("member.attendance.openPlan")}
                    </ZookChip>
                  </Pressable>
                </Link>
              </Card>
              <ZookButton onPress={() => router.replace("/")} icon="home-outline">
                {t("common.done")}
              </ZookButton>
            </>
          )}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

function DetailLine({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  highlight?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <ListRow
      title={label}
      leading={<IconBubble icon={icon} tone={highlight ? "blue" : "neutral"} size={28} />}
      trailing={
        <Text style={[styles.detailValue, { color: highlight ? palette.feedback.info : palette.text.primary }]}>
          {value}
        </Text>
      }
      style={styles.detailLine}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 28,
    paddingBottom: layout.bottomNavContentPadding,
    gap: 12,
  },
  contentWithoutNav: {
    paddingBottom: 40,
  },
  notFoundContent: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    gap: spacing.md,
  },
  notFoundTitle: {
    ...typography.cardTitle,
    textAlign: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  controlPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  hero: {
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: layout.cardGap,
  },
  heroTitle: {
    ...typography.headerTitle,
    textAlign: "center",
  },
  heroBody: {
    ...typography.body,
    textAlign: "center",
  },
  pendingCodeContent: {
    alignItems: "center",
    padding: 14,
    gap: spacing.md,
  },
  entryLabel: {
    ...typography.small,
  },
  pendingCode: {
    ...typography.heroTitle,
    fontVariant: ["tabular-nums"],
  },
  codePressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  pendingChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  reasonContent: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  reasonCopy: {
    flex: 1,
    gap: 4,
  },
  reasonTitle: {
    ...typography.cardTitle,
  },
  reasonBody: {
    ...typography.small,
  },
  warningContent: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  warningCopy: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    ...typography.bodyStrong,
  },
  warningBody: {
    ...typography.small,
  },
  approvedCodeContent: {
    padding: 14,
    gap: spacing.md,
  },
  approvedCodeHero: {
    alignItems: "center",
    gap: spacing.sm,
  },
  approvedCode: {
    ...typography.heroTitle,
    fontVariant: ["tabular-nums"],
  },
  codeDetail: {
    ...typography.small,
    textAlign: "center",
  },
  codeUnavailable: {
    ...typography.body,
    textAlign: "center",
  },
  divider: {
    height: 1,
  },
  detailLine: {
    minHeight: 38,
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  detailValue: {
    ...typography.bodyStrong,
  },
  nextContent: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  nextCopy: {
    flex: 1,
    gap: 4,
  },
  nextTitle: {
    ...typography.cardTitle,
  },
  nextBody: {
    ...typography.small,
  },
});

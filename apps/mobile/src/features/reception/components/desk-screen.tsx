import { Pressable, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApprovalQueue } from "@/components/domain/approval-queue";
import { Card, EmptyState, FormField, IconBubble, Pill, PrimaryButton, SectionHeader } from "@/components/primitives";
import { ReceptionQueueSkeleton } from "@/components/skeletons";
import { useMyClasses } from "@/lib/domains";
import { formatDateTime, formatTime, titleCaseFromCode } from "@/lib/formatting";
import { type TranslationKey, useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useReceptionWorkspace, receptionWorkspaceStyles as styles } from "../reception-workspace";
import type { PillTone } from "@/components/primitives";

function toneForAttendanceStatus(status?: string | null): PillTone {
  if (status === "APPROVED") return "lime";
  if (status === "REJECTED" || status === "FAILED") return "red";
  if (status === "FLAGGED") return "red";
  if (status === "PENDING_APPROVAL") return "amber";
  return "neutral";
}

function iconForAttendanceStatus(status?: string | null) {
  if (status === "APPROVED") return "checkmark-circle-outline" as const;
  if (status === "REJECTED" || status === "FAILED") return "close-circle-outline" as const;
  return "alert-circle-outline" as const;
}

const attendanceStatusLabelKeys: Record<string, TranslationKey> = {
  APPROVED: "reception.desk.statusApproved",
  FAILED: "reception.desk.statusFailed",
  FLAGGED: "reception.desk.flagged",
  PENDING_APPROVAL: "reception.desk.statusPendingApproval",
  RECORDED: "reception.desk.statusRecorded",
  REJECTED: "reception.desk.statusRejected",
};

function attendanceStatusLabel(status: string | null | undefined, t: ReturnType<typeof useI18n>["t"]) {
  const normalized = (status ?? "RECORDED").toUpperCase();
  const labelKey = attendanceStatusLabelKeys[normalized];
  return labelKey ? t(labelKey) : titleCaseFromCode(status ?? "RECORDED");
}

const classTypeLabelKeys: Record<string, TranslationKey> = {
  boxing: "trainer.classes.typeBoxing",
  cycling: "trainer.classes.typeCycling",
  dance: "trainer.classes.typeDance",
  hiit: "trainer.classes.typeHiit",
  mobility: "trainer.classes.typeMobility",
  strength: "trainer.classes.typeStrength",
  yoga: "trainer.classes.typeYoga",
};

function classTypeLabel(classType: string | null | undefined, t: ReturnType<typeof useI18n>["t"]) {
  const key = (classType ?? "").trim().toLowerCase();
  const labelKey = classTypeLabelKeys[key];
  return labelKey ? t(labelKey) : classType;
}

export function ReceptionDeskScreenBody() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const classesQuery = useMyClasses();
  const todayClasses = (classesQuery.data?.classes ?? []).filter((entry) => {
    const start = new Date(entry.startTime);
    const now = new Date();
    return start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth() && start.getDate() === now.getDate();
  });
  const {
    approvalItems,
    approvalQueue,
    approveAttendanceMutation,
    canApproveAttendance,
    canVerifyCode,
    flaggedCount,
    handleVerifyCodeChange,
    openDecisionSheet,
    pendingCount,
    queueQuery,
    recentScans,
    rejectAttendanceMutation,
    selectedDecisionAttempt,
    showOwnerApprovalRequired,
    todayAttendanceQuery,
    todayCount,
    verifyingCode,
    verifyCode,
    verifyEntryCode,
  } = useReceptionWorkspace();
  const firstQueueItem =
    approvalQueue.find((attempt) => attempt.status === "FLAGGED") ?? approvalQueue[0] ?? null;
  const hasQueueWork = pendingCount > 0 || flaggedCount > 0;

  return (
    <>
            <Card variant="compact" padding={12} contentStyle={styles.verifyCodeCard}>
              <FormField
                testID="reception-verify-code"
                label={t("reception.desk.code")}
                value={verifyCode}
                onChangeText={handleVerifyCodeChange}
                placeholder={t("reception.desk.enterCode")}
                autoCapitalize="characters"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => verifyEntryCode()}
              />
              <View style={styles.verifyActionRow}>
                <PrimaryButton
                  testID="reception-verify-code-button"
                  icon="scan-outline"
                  disabled={!canVerifyCode || verifyingCode}
                  onPress={verifyEntryCode}
                  style={styles.verifyPrimaryAction}
                >
                  {verifyingCode ? t("reception.desk.verifying") : t("reception.desk.verifyCode")}
                </PrimaryButton>
                <Pressable
                  testID="reception-entry-qr-button"
                  accessibilityRole="button"
                  accessibilityLabel={t("reception.desk.displayEntryQr")}
                  onPress={() => router.push("/reception/entry-qr")}
                  style={({ pressed }) => [
                    styles.verifyQrButton,
                    {
                      borderColor: palette.border.default,
                      backgroundColor: palette.surface.raised,
                    },
                    pressed ? styles.verifyQrButtonPressed : null,
                  ]}
                >
                  <Ionicons name="qr-code-outline" size={21} color={palette.text.primary} />
                </Pressable>
              </View>
            </Card>
            {hasQueueWork ? (
              <Card
                variant={flaggedCount ? "danger" : "warning"}
                padding={10}
                contentStyle={styles.compactAlertRow}
                pressable={Boolean(firstQueueItem)}
                onPress={
                  firstQueueItem
                    ? () => {
                        if (!canApproveAttendance) {
                          showOwnerApprovalRequired();
                          return;
                      }
                      openDecisionSheet(firstQueueItem);
                    }
                  : undefined
                }
                accessibilityLabel={[
                  t("reception.desk.queueNeedsAction"),
                  t("reception.desk.reviewRequired"),
                  t("reception.desk.queueMeta", { pending: pendingCount, flagged: flaggedCount }),
                ].join(", ")}
                accessibilityHint={t("reception.desk.openApprovalQueue")}
              >
                <IconBubble
                  icon={flaggedCount ? "alert-circle-outline" : "shield-checkmark-outline"}
                  tone={flaggedCount ? "red" : "amber"}
                  size={34}
                />
                <View style={styles.compactAlertCopy}>
                  <Text
                    numberOfLines={1}
                    style={[styles.compactAlertTitle, { color: palette.text.primary }]}
                  >
                    {t("reception.desk.openApprovalQueue")}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.cardBody, { color: palette.text.secondary }]}
                  >
                    {t("reception.desk.queueMeta", { pending: pendingCount, flagged: flaggedCount })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.text.secondary} />
              </Card>
            ) : null}

            <SectionHeader
              title={t("reception.desk.recentActivity")}
              action={<Pill tone="neutral">{t("reception.desk.todayCount", { count: todayCount })}</Pill>}
            />
            <View style={styles.liveFeed}>
              {todayAttendanceQuery.isLoading ? <ReceptionQueueSkeleton /> : null}
              {!todayAttendanceQuery.isLoading && !recentScans.length ? (
                <EmptyState icon="scan-outline" title={t("reception.desk.noCheckIns")} body={t("reception.desk.noCheckInsBody")} />
              ) : null}
              {recentScans.map((scan) => {
                const statusTone = toneForAttendanceStatus(scan.status);
                return (
                  <Card
                    key={scan.id}
                    variant="compact"
                    padding={12}
                    contentStyle={styles.liveFeedItem}
                  >
                    <IconBubble
                      icon={iconForAttendanceStatus(scan.status)}
                      tone={statusTone}
                      size={34}
                    />
                    <View style={styles.liveFeedCopy}>
                      <Text numberOfLines={1} style={[styles.queueTitle, { color: palette.text.primary }]}>
                        {scan.user?.name ?? scan.user?.email ?? t("reception.members.memberTitle")}
                      </Text>
                      <Text numberOfLines={1} style={[styles.cardBody, { color: palette.text.secondary }]}>
                        {formatDateTime(scan.checkedInAt)} · {scan.branchName ?? t("reception.desk.branch")} ·{" "}
                        {scan.plan?.name ?? t("reception.members.membership")}
                      </Text>
                    </View>
                    <Pill tone={statusTone}>{attendanceStatusLabel(scan.status, t)}</Pill>
                  </Card>
                );
              })}
            </View>

            {hasQueueWork || queueQuery.isLoading || queueQuery.isError ? (
              <>
                <SectionHeader
                  title={t("reception.desk.needsApprovalQueue")}
                  action={<Pill tone="amber">{t("reception.desk.pendingCount", { count: pendingCount })}</Pill>}
                />
                <ApprovalQueue
                  testID="reception-approval-queue"
                  items={approvalItems}
                  isLoading={queueQuery.isLoading}
                  isError={queueQuery.isError}
                  onRetry={() => void queueQuery.refetch()}
                  approvingId={approveAttendanceMutation.isPending ? selectedDecisionAttempt?.id : undefined}
                  rejectingId={rejectAttendanceMutation.isPending ? selectedDecisionAttempt?.id : undefined}
                  emptyState={{
                    title: t("reception.desk.gateQueueClear"),
                    subtitle: t("reception.desk.queueClearBody"),
                  }}
                  onApprove={(attemptId) => {
                    const attempt = approvalQueue.find((item) => item.id === attemptId);
                    if (!attempt) return;
                    if (!canApproveAttendance) {
                      showOwnerApprovalRequired();
                      return;
                    }
                    openDecisionSheet(attempt);
                  }}
                  onReject={(attemptId) => {
                    const attempt = approvalQueue.find((item) => item.id === attemptId);
                    if (!attempt) return;
                    if (!canApproveAttendance) {
                      showOwnerApprovalRequired();
                      return;
                    }
                    openDecisionSheet(attempt);
                  }}
                />
              </>
            ) : null}

            {todayClasses.length ? (
              <>
                <SectionHeader
                  title={t("reception.desk.todaysClasses")}
                  action={<Pill tone="neutral">{todayClasses.length}</Pill>}
                />
                <View style={styles.liveFeed}>
                  {todayClasses.map((entry) => (
                    <Pressable
                      key={entry.id}
                      testID={`reception-class-${entry.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={t("reception.desk.viewRosterFor", { name: entry.name })}
                      onPress={() =>
                        router.push(`/reception/class-roster?classId=${entry.id}&name=${encodeURIComponent(entry.name)}` as never)
                      }
                      style={({ pressed }) => (pressed ? { opacity: 0.9 } : null)}
                    >
                      <Card variant="compact" padding={12} contentStyle={styles.liveFeedItem}>
                        <IconBubble icon="calendar-outline" tone="blue" size={34} />
                        <View style={styles.liveFeedCopy}>
                          <Text style={[styles.queueTitle, { color: palette.text.primary }]} numberOfLines={1}>
                            {entry.name}
                          </Text>
                          <Text style={[styles.cardBody, { color: palette.text.secondary }]} numberOfLines={1}>
                            {formatTime(entry.startTime)} · {entry.trainerName ? t("reception.desk.coachName", { name: entry.trainerName }) : classTypeLabel(entry.classType, t)}
                          </Text>
                        </View>
                        <Pill tone={entry.remainingCapacity <= 0 ? "red" : "neutral"}>
                          {entry.enrollmentCount}/{entry.maxCapacity}
                        </Pill>
                      </Card>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
    </>
  );
}

import { Pressable, View, Text } from "react-native";
import { useRouter } from "expo-router";

import { ApprovalQueue } from "@/components/domain/approval-queue";
import { MetricGrid } from "@/components/domain/metric-grid";
import { Card, EmptyState, FormField, IconBubble, OperationalQueueCard, Pill, PrimaryButton, SectionHeader, ZookButton } from "@/components/primitives";
import { ReceptionQueueSkeleton } from "@/components/skeletons";
import { useMyClasses } from "@/lib/domains";
import { formatDateTime, formatTime, titleCaseFromCode } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
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

  return (
    <>
            <OperationalQueueCard
              title={pendingCount || flaggedCount ? t("reception.desk.queueNeedsAction") : t("reception.desk.queueClear")}
              subtitle={
                pendingCount || flaggedCount
                  ? t("reception.desk.queueNeedsActionBody")
                  : t("reception.desk.queueClearBody")
              }
              meta={t("reception.desk.queueMeta", { pending: pendingCount, flagged: flaggedCount })}
              status={pendingCount || flaggedCount ? t("reception.desk.reviewRequired") : t("reception.desk.active")}
              tone={flaggedCount ? "red" : pendingCount ? "amber" : "neutral"}
              icon={flaggedCount ? "alert-circle-outline" : "shield-checkmark-outline"}
              actionLabel={t("reception.desk.openApprovalQueue")}
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
            />
            <MetricGrid
              columns={3}
              items={[
                {
                  label: t("reception.desk.today"),
                  value: todayCount,
                  tone: "neutral",
                  icon: "qr-code-outline",
                },
                {
                  label: t("reception.desk.pending"),
                  value: pendingCount,
                  tone: "amber",
                  icon: "flash-outline",
                },
                {
                  label: t("reception.desk.flagged"),
                  value: flaggedCount,
                  tone: "red",
                  icon: "alert-circle-outline",
                },
              ]}
            />

            <Card variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader title={t("reception.desk.verifyEntryCode")} />
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
              <PrimaryButton
                testID="reception-verify-code-button"
                icon="scan-outline"
                disabled={!canVerifyCode || verifyingCode}
                onPress={verifyEntryCode}
              >
                {verifyingCode ? t("reception.desk.verifying") : t("reception.desk.verifyCode")}
              </PrimaryButton>
              <ZookButton
                testID="reception-entry-qr-button"
                variant="secondary"
                icon="qr-code-outline"
                onPress={() => router.push("/reception/entry-qr")}
              >
                {t("reception.desk.displayEntryQr")}
              </ZookButton>
            </Card>

            <Pressable
              testID="reception-rewards"
              accessibilityRole="button"
              accessibilityLabel={t("reception.desk.referGymAccessibility")}
              onPress={() => router.push("/rewards")}
              style={({ pressed }) => (pressed ? { opacity: 0.9 } : null)}
            >
              <Card variant="compact" padding={14} contentStyle={styles.liveFeedItem}>
                <IconBubble icon="gift-outline" tone="lime" size={34} />
                <View style={styles.liveFeedCopy}>
                  <Text style={[styles.queueTitle, { color: palette.text.primary }]}>
                    {t("reception.desk.referGym")}
                  </Text>
                  <Text style={[styles.cardBody, { color: palette.text.secondary }]} numberOfLines={1}>
                    {t("reception.desk.referGymBody")}
                  </Text>
                </View>
              </Card>
            </Pressable>

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
                      <Text style={[styles.queueTitle, { color: palette.text.primary }]}>
                        {scan.user?.name ?? scan.user?.email ?? t("reception.members.memberTitle")}
                      </Text>
                      <Text style={[styles.cardBody, { color: palette.text.secondary }]}>
                        {formatDateTime(scan.checkedInAt)} · {scan.branchName ?? t("reception.desk.branch")} ·{" "}
                        {scan.plan?.name ?? t("reception.members.membership")}
                      </Text>
                    </View>
                    <Pill tone={statusTone}>{titleCaseFromCode(scan.status)}</Pill>
                  </Card>
                );
              })}
            </View>

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
                            {formatTime(entry.startTime)} · {entry.trainerName ? t("reception.desk.coachName", { name: entry.trainerName }) : entry.classType}
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

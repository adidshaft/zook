import { View, Text } from "react-native";

import { ApprovalQueue } from "@/components/domain/approval-queue";
import { MetricGrid } from "@/components/domain/metric-grid";
import { Card, EmptyState, FormField, IconBubble, OperationalQueueCard, Pill, PrimaryButton, SectionHeader } from "@/components/primitives";
import { ReceptionQueueSkeleton } from "@/components/skeletons";
import { formatDateTime, titleCaseFromCode } from "@/lib/formatting";
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
              title={pendingCount || flaggedCount ? "Desk queue needs action" : "Desk queue clear"}
              subtitle={
                pendingCount || flaggedCount
                  ? "Review pending and flagged entry attempts before they age out."
                  : "No pending or flagged scans need the desk right now."
              }
              meta={`${pendingCount} pending · ${flaggedCount} flagged`}
              status={pendingCount || flaggedCount ? "Review required" : "Active"}
              tone={flaggedCount ? "red" : pendingCount ? "amber" : "neutral"}
              icon={flaggedCount ? "alert-circle-outline" : "shield-checkmark-outline"}
              actionLabel="Open approval queue"
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
                  label: "Today",
                  value: todayCount,
                  tone: "neutral",
                  icon: "qr-code-outline",
                },
                {
                  label: "Pending",
                  value: pendingCount,
                  tone: "amber",
                  icon: "flash-outline",
                },
                {
                  label: "Flagged",
                  value: flaggedCount,
                  tone: "red",
                  icon: "alert-circle-outline",
                },
              ]}
            />

            <Card variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader title="Verify Entry Code" />
              <FormField
                testID="reception-verify-code"
                label="Code"
                value={verifyCode}
                onChangeText={handleVerifyCodeChange}
                placeholder="Enter code"
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
                {verifyingCode ? "Verifying..." : "Verify Code"}
              </PrimaryButton>
            </Card>

            <SectionHeader
              title="Recent activity"
              action={<Pill tone="neutral">{todayCount} today</Pill>}
            />
            <View style={styles.liveFeed}>
              {todayAttendanceQuery.isLoading ? <ReceptionQueueSkeleton /> : null}
              {!todayAttendanceQuery.isLoading && !recentScans.length ? (
                <EmptyState title="No scans yet" body="No approved check-ins today." />
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
                        {scan.user?.name ?? scan.user?.email ?? "Member"}
                      </Text>
                      <Text style={[styles.cardBody, { color: palette.text.secondary }]}>
                        {formatDateTime(scan.checkedInAt)} · {scan.branchName ?? "Branch"} ·{" "}
                        {scan.plan?.name ?? "Membership"}
                      </Text>
                    </View>
                    <Pill tone={statusTone}>{titleCaseFromCode(scan.status)}</Pill>
                  </Card>
                );
              })}
            </View>

            <SectionHeader
              title="Needs Approval queue"
              action={<Pill tone="amber">{pendingCount} pending</Pill>}
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
                title: "Gate queue clear",
                subtitle: "No pending or flagged scans need the desk.",
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
  );
}

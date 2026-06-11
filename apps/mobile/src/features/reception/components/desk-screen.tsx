import { View, Text } from "react-native";

import { ApprovalQueue } from "@/components/domain/approval-queue";
import { MetricGrid } from "@/components/domain/metric-grid";
import { Card, FormField, IconBubble, ListRow, Pill, PrimaryButton, SectionHeader } from "@/components/primitives";
import { ReceptionQueueSkeleton } from "@/components/skeletons";
import { formatDateTime } from "@/lib/formatting";
import { useTheme } from "@/lib/theme";
import { useReceptionWorkspace, receptionWorkspaceStyles as styles } from "../reception-workspace";

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

  return (
    <>
            <MetricGrid
              columns={3}
              items={[
                {
                  label: "Today",
                  value: todayCount,
                  hint: "Check-ins",
                  tone: "lime",
                  icon: "qr-code-outline",
                },
                {
                  label: "Pending",
                  value: pendingCount,
                  hint: "Awaiting approval",
                  tone: "amber",
                  icon: "flash-outline",
                },
                {
                  label: "Flagged",
                  value: flaggedCount,
                  hint: "Needs attention",
                  tone: "red",
                  icon: "alert-circle-outline",
                },
              ]}
            />

            <Card variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader
                title="Verify Entry Code"
                subtitle="Enter ZK code for attendance or pickup lookup without leaving the desk."
              />
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
              title="Live feed"
              subtitle="Recent check-ins for this gym."
              action={<Pill tone="lime">{todayCount} today</Pill>}
            />
            <View style={styles.liveFeed}>
              {todayAttendanceQuery.isLoading ? <ReceptionQueueSkeleton /> : null}
              {!todayAttendanceQuery.isLoading && !recentScans.length ? (
                <Card variant="compact" padding={14} contentStyle={styles.queueCard}>
                  <ListRow
                    title="No scans yet"
                    subtitle="Approved check-ins will appear here as members enter."
                    icon="radio-outline"
                    tone="neutral"
                  />
                </Card>
              ) : null}
              {recentScans.map((scan) => (
                <Card
                  key={scan.id}
                  variant="compact"
                  padding={12}
                  contentStyle={styles.liveFeedItem}
                >
                  <IconBubble
                    icon={scan.status === "APPROVED" ? "checkmark-circle-outline" : "alert-circle-outline"}
                    tone={scan.status === "APPROVED" ? "lime" : "amber"}
                    size={34}
                  />
                  <View style={styles.liveFeedCopy}>
                    <Text numberOfLines={1} style={[styles.queueTitle, { color: palette.text.primary }]}>
                      {scan.user?.name ?? scan.user?.email ?? "Member"}
                    </Text>
                    <Text numberOfLines={1} style={[styles.cardBody, { color: palette.text.secondary }]}>
                      {formatDateTime(scan.checkedInAt)} · {scan.branchName ?? "Branch"} ·{" "}
                      {scan.plan?.name ?? "Membership"}
                    </Text>
                  </View>
                  <Pill tone={scan.status === "APPROVED" ? "lime" : "amber"}>
                    {scan.status.replace(/_/g, " ")}
                  </Pill>
                </Card>
              ))}
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

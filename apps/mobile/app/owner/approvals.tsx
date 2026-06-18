import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { Alert, RefreshControl, StyleSheet } from "react-native";
import { useState } from "react";
import { View } from "react-native";

import { ApprovalQueue, type ApprovalItem } from "@/components/domain/approval-queue";
import { MetricGrid } from "@/components/domain/metric-grid";
import { BranchSelectorChip, EmptyState, Card, PrimaryButton, QueryErrorState, ScreenHeader, SectionHeader, ZookScreen } from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { useHasPermission, useAuth } from "@/lib/auth";
import { ownerApi } from "@/lib/domain-api";
import { useApproveAttendance, useOrgAttendancePending } from "@/lib/domains/attendance";
import { useApproveJoinRequest, useOrgJoinRequests, useRejectJoinRequest } from "@/lib/domains/owner";
import { formatReviewReason, titleCaseFromCode } from "@/lib/formatting";
import { layout, spacing, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

export default function OwnerApprovalsScreen() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { palette } = useTheme();
  const canApproveAttendance = useHasPermission("ATTENDANCE_APPROVE");
  const joinRequestsQuery = useOrgJoinRequests();
  const attentionQuery = useOrgAttendancePending();
  const approveAttendanceMutation = useApproveAttendance();
  const approveJoinRequestMutation = useApproveJoinRequest();
  const rejectJoinRequestMutation = useRejectJoinRequest();
  const [batchApproving, setBatchApproving] = useState(false);
  const joinRequests = (joinRequestsQuery.data?.joinRequests ?? []).filter((request) => String(request.status ?? "").toLowerCase() === "pending");
  // Only scans that still need a decision belong in the review queue —
  // exclude already-approved/resolved records so the count and list match the
  // "Pending and flagged scans" label.
  const attentionAttempts = (attentionQuery.data?.records ?? []).filter((record) => {
    const status = String(record.status ?? "").toUpperCase();
    return status === "PENDING_APPROVAL" || status === "FLAGGED";
  });
  const pendingApprovals = joinRequests.length + attentionAttempts.length;
  const joinItems: ApprovalItem[] = joinRequests.map((request) => ({
    id: request.id,
    primaryText: request.userName ?? "Join request",
    secondaryText: `${request.userEmail ?? request.userId} · Referral ${request.referralCode ?? "none"}`,
    metaText: "Pending",
  }));
  const attendanceItems: ApprovalItem[] = attentionAttempts.map((record) => ({
    id: record.id,
    primaryText: record.user?.name ?? record.user?.email ?? "Member check-in",
    secondaryText: `${record.branchName ?? "Main branch"} · ${titleCaseFromCode(record.status)}`,
    reason: formatReviewReason(
      Array.isArray(record.suspiciousFlags) ? record.suspiciousFlags.join(", ") : null,
    ),
  }));

  async function approveAllJoinRequests() {
    if (!token || !activeOrgId || !joinRequests.length) return;
    setBatchApproving(true);
    try {
      const result = await ownerApi.approveJoinRequestsBatch<{ approved?: string[]; failed?: Array<{ id: string; message?: string }> }>({
        token,
        orgId: activeOrgId,
        joinRequestIds: joinRequests.map((request) => request.id),
      });
      const approved = result.approved?.length ?? joinRequests.length;
      const failed = result.failed?.length ?? 0;
      showToast({ tone: failed ? "amber" : "success", haptic: failed ? "warning" : "success", message: failed ? `Approved ${approved} of ${joinRequests.length}.` : `Approved ${approved} join ${approved === 1 ? "request" : "requests"}.` });
      await queryClient.invalidateQueries({ queryKey: activeOrgId ? ["org", activeOrgId] : ["org"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to approve join requests.";
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
    } finally {
      setBatchApproving(false);
    }
  }

  function confirmApproveAllJoinRequests() {
    Alert.alert(
      "Approve all join requests?",
      `${joinRequests.length} pending ${joinRequests.length === 1 ? "member" : "members"} will be added to this gym.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Approve all", onPress: () => void approveAllJoinRequests() },
      ],
    );
  }

  function confirmRejectJoinRequest(id: string) {
    Alert.alert(
      "Reject join request?",
      "This person won't be added to the gym and would need to request again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            void rejectJoinRequestMutation
              .mutateAsync(id)
              .then(() => {
                showToast({
                  tone: "success",
                  haptic: "success",
                  message: "Join request rejected.",
                });
              })
              .catch((error) => {
                const message =
                  error instanceof Error ? error.message : "Unable to reject join request.";
                showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
              });
          },
        },
      ],
    );
  }

  const onRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: activeOrgId ? ["org", activeOrgId] : ["org"] });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-approvals-screen">
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
            refreshControl: (
              <RefreshControl
                refreshing={joinRequestsQuery.isRefetching || attentionQuery.isRefetching}
                onRefresh={onRefresh}
                tintColor={palette.accent.base}
                colors={[palette.accent.base]}
              />
            ),
          }}
        >
          <ScreenHeader
            title="Approvals"
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip />
              </View>
            }
          />
          <MetricGrid
            items={[
              {
                label: "Join requests",
                value: joinRequests.length,
                hint: "Awaiting owner action",
                tone: "amber",
              },
              {
                label: "Scan reviews",
                value: attentionAttempts.length,
                hint: "Pending or flagged",
                tone: "red",
              },
            ]}
          />
          {joinRequestsQuery.isError || attentionQuery.isError ? (
            <QueryErrorState error={joinRequestsQuery.error ?? attentionQuery.error} onRetry={() => { void joinRequestsQuery.refetch(); void attentionQuery.refetch(); }} />
          ) : pendingApprovals === 0 ? (
            <Card variant="compact">
              <EmptyState
                title="All caught up"
                body="New join requests and scan reviews will appear here"
              />
            </Card>
          ) : null}
          {joinRequests.length ? (
            <>
              <SectionHeader
                title={`Request list (${joinRequests.length})`}
                subtitle="Pending join decisions"
                action={<PrimaryButton disabled={approveJoinRequestMutation.isPending || batchApproving} onPress={confirmApproveAllJoinRequests}>Approve all</PrimaryButton>}
              />
              <ApprovalQueue
                testID="pending-approvals-list"
                items={joinItems}
                onApprove={(id) => approveJoinRequestMutation.mutate(id)}
                onReject={(id) => confirmRejectJoinRequest(id)}
              />
            </>
          ) : null}
          {attendanceItems.length ? (
            <>
              <SectionHeader title={`Scan review queue (${attendanceItems.length})`} subtitle="Pending and flagged scans." />
              <ApprovalQueue
                items={attendanceItems}
                onApprove={(id) => {
                  if (!canApproveAttendance) {
                    showToast({ title: "Owner approval required", tone: "amber" });
                    return;
                  }
                  approveAttendanceMutation.mutate(id);
                }}
              />
            </>
          ) : null}
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  headerContext: {
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: layout.screenContentTopPadding,
    gap: spacing.lg,
    paddingBottom: 96,
  },
});

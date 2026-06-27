import { useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { Alert, RefreshControl, StyleSheet } from "react-native";
import { useState } from "react";
import { View } from "react-native";

import { ApprovalQueue, type ApprovalItem } from "@/components/domain/approval-queue";
import { MetricGrid } from "@/components/domain/metric-grid";
import { BranchSelectorChip, EmptyState, Card, HeaderActions, PrimaryButton, QueryErrorState, ScreenHeader, SectionHeader, ZookScreen } from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { useHasPermission, useAuth } from "@/lib/auth";
import { ownerApi } from "@/lib/domain-api";
import { useApproveAttendance, useOrgAttendancePending } from "@/lib/domains/attendance";
import { useApproveJoinRequest, useOrgJoinRequests, useRejectJoinRequest } from "@/lib/domains/owner";
import { formatReviewReason, titleCaseFromCode } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { layout, spacing, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

export default function OwnerApprovalsScreen() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const canApproveAttendance = useHasPermission("ATTENDANCE_APPROVE");
  const joinRequestsQuery = useOrgJoinRequests();
  const attentionQuery = useOrgAttendancePending();
  const approveAttendanceMutation = useApproveAttendance();
  const approveJoinRequestMutation = useApproveJoinRequest();
  const rejectJoinRequestMutation = useRejectJoinRequest();
  const [batchApproving, setBatchApproving] = useState(false);
  const joinRequests = (joinRequestsQuery.data?.joinRequests ?? []).filter((request) => String(request.status ?? "").toLowerCase() === "pending");
  // Only scans that still need a decision belong in the review queue, so the
  // count and list stay aligned.
  const attentionAttempts = (attentionQuery.data?.records ?? []).filter((record) => {
    const status = String(record.status ?? "").toUpperCase();
    return status === "PENDING_APPROVAL" || status === "FLAGGED";
  });
  const pendingApprovals = joinRequests.length + attentionAttempts.length;
  const joinItems: ApprovalItem[] = joinRequests.map((request) => ({
    id: request.id,
    primaryText: request.userName ?? t("owner.approvals.joinRequest"),
    secondaryText: `${request.userEmail ?? request.userId} · ${t("owner.approvals.referral")}: ${request.referralCode ?? t("owner.approvals.none")}`,
    metaText: t("owner.approvals.pending"),
  }));
  const attendanceItems: ApprovalItem[] = attentionAttempts.map((record) => ({
    id: record.id,
    primaryText: record.user?.name ?? record.user?.email ?? t("owner.approvals.memberCheckIn"),
    secondaryText: `${record.branchName ?? t("owner.home.mainBranch")} · ${titleCaseFromCode(record.status)}`,
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
      showToast({
        tone: failed ? "amber" : "success",
        haptic: failed ? "warning" : "success",
        message: failed
          ? t("owner.approvals.approvedPartial", { approved, total: joinRequests.length })
          : t("owner.approvals.approvedJoinRequests", { count: approved }),
      });
      await queryClient.invalidateQueries({ queryKey: activeOrgId ? ["org", activeOrgId] : ["org"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("owner.approvals.approveFailed");
      showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
    } finally {
      setBatchApproving(false);
    }
  }

  function confirmApproveAllJoinRequests() {
    Alert.alert(
      t("owner.approvals.approveAllTitle"),
      t("owner.approvals.approveAllBody", { count: joinRequests.length }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("owner.approvals.approveAll"), onPress: () => void approveAllJoinRequests() },
      ],
    );
  }

  function confirmRejectJoinRequest(id: string) {
    Alert.alert(
      t("owner.approvals.rejectTitle"),
      t("owner.approvals.rejectBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("owner.approvals.reject"),
          style: "destructive",
          onPress: () => {
            void rejectJoinRequestMutation
              .mutateAsync(id)
              .then(() => {
                showToast({
                  tone: "success",
                  haptic: "success",
                  message: t("owner.approvals.rejected"),
                });
              })
              .catch((error) => {
                const message =
                  error instanceof Error ? error.message : t("owner.approvals.rejectFailed");
                showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
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
            title={t("owner.approvals.title")}
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip />
              </View>
            }
            trailing={<HeaderActions showBell />}
          />
          <MetricGrid
            items={[
              {
                label: t("owner.approvals.joinRequests"),
                value: joinRequests.length,
                tone: "amber",
              },
              {
                label: t("owner.approvals.scanReviews"),
                value: attentionAttempts.length,
                tone: "red",
              },
            ]}
          />
          {joinRequestsQuery.isError || attentionQuery.isError ? (
            <QueryErrorState error={joinRequestsQuery.error ?? attentionQuery.error} onRetry={() => { void joinRequestsQuery.refetch(); void attentionQuery.refetch(); }} />
          ) : pendingApprovals === 0 ? (
            <Card variant="compact">
              <EmptyState icon="checkmark-done-outline" title={t("owner.approvals.allCaughtUp")} body={t("owner.approvals.allCaughtUpBody")} />
            </Card>
          ) : null}
          {joinRequests.length ? (
            <>
              <SectionHeader
                title={t("owner.approvals.requestListCount", { count: joinRequests.length })}
                action={<PrimaryButton disabled={approveJoinRequestMutation.isPending || batchApproving} onPress={confirmApproveAllJoinRequests}>{t("owner.approvals.approveAll")}</PrimaryButton>}
              />
              <ApprovalQueue
                testID="pending-approvals-list"
                items={joinItems}
                highlightedId={highlight}
                onApprove={(id) => approveJoinRequestMutation.mutate(id)}
                onReject={(id) => confirmRejectJoinRequest(id)}
              />
            </>
          ) : null}
          {attendanceItems.length ? (
            <>
              <SectionHeader title={t("owner.approvals.scanReviewQueueCount", { count: attendanceItems.length })} />
              <ApprovalQueue
                items={attendanceItems}
                highlightedId={highlight}
                onApprove={(id) => {
                  if (!canApproveAttendance) {
                    showToast({ title: t("owner.approvals.ownerApprovalRequired"), tone: "amber" });
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

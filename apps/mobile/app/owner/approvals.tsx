import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { RefreshControl, StyleSheet, View } from "react-native";

import { EmptyState, GlassCard, MetricTile, PrimaryButton, QueryErrorState, SectionHeader, ZookScreen } from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { AttendanceApprovalCard, JoinRequestCard } from "@/features/owner/components/approval-card";
import { useHasPermission, useAuth } from "@/lib/auth";
import { ownerApi } from "@/lib/domain-api";
import { useApproveAttendance, useOrgAttendancePending } from "@/lib/domains/attendance";
import { useApproveJoinRequest, useOrgJoinRequests, useRejectJoinRequest } from "@/lib/domains/owner";
import { colors, layout } from "@/lib/theme";
import { showToast } from "@/lib/toast";

export default function OwnerApprovalsScreen() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const canApproveAttendance = useHasPermission("ATTENDANCE_APPROVE");
  const joinRequestsQuery = useOrgJoinRequests();
  const attentionQuery = useOrgAttendancePending();
  const approveAttendanceMutation = useApproveAttendance();
  const approveJoinRequestMutation = useApproveJoinRequest();
  const rejectJoinRequestMutation = useRejectJoinRequest();
  const joinRequests = (joinRequestsQuery.data?.joinRequests ?? []).filter((request) => String(request.status ?? "").toLowerCase() === "pending");
  const attentionAttempts = attentionQuery.data?.records ?? [];
  const pendingApprovals = joinRequests.length + attentionAttempts.length;

  async function approveAllJoinRequests() {
    if (!token || !activeOrgId || !joinRequests.length) return;
    const result = await ownerApi.approveJoinRequestsBatch<{ approved?: string[]; failed?: Array<{ id: string; message?: string }> }>({
      token,
      orgId: activeOrgId,
      joinRequestIds: joinRequests.map((request) => request.id),
    });
    const approved = result.approved?.length ?? joinRequests.length;
    const failed = result.failed?.length ?? 0;
    showToast({ tone: failed ? "amber" : "success", haptic: failed ? "warning" : "success", message: failed ? `Approved ${approved} of ${joinRequests.length}.` : `Approved ${approved} join ${approved === 1 ? "request" : "requests"}.` });
    await queryClient.invalidateQueries({ queryKey: activeOrgId ? ["org", activeOrgId] : ["org"] });
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
            refreshControl: <RefreshControl refreshing={joinRequestsQuery.isRefetching || attentionQuery.isRefetching} onRefresh={onRefresh} tintColor={colors.brandLime} colors={[colors.brandLime]} />,
          }}
        >
          <View style={styles.metricGrid}>
            <MetricTile label="Join requests" value={String(joinRequests.length)} detail="Awaiting owner action" tone="amber" style={styles.metricHalf} />
            <MetricTile label="Scan reviews" value={String(attentionAttempts.length)} detail="Pending or flagged" tone="red" style={styles.metricHalf} />
          </View>
          {joinRequestsQuery.isError || attentionQuery.isError ? (
            <QueryErrorState error={joinRequestsQuery.error ?? attentionQuery.error} onRetry={() => { void joinRequestsQuery.refetch(); void attentionQuery.refetch(); }} />
          ) : pendingApprovals === 0 ? (
            <GlassCard variant="compact"><EmptyState title="All caught up" body="No pending join requests or scan reviews." /></GlassCard>
          ) : null}
          <SectionHeader title="Request list" subtitle="Pending join decisions" action={joinRequests.length ? <PrimaryButton size="sm" disabled={approveJoinRequestMutation.isPending} onPress={() => void approveAllJoinRequests()}>Approve all</PrimaryButton> : undefined} />
          <View testID="pending-approvals-list" style={styles.stack}>
            {joinRequests.map((request, index) => (
              <JoinRequestCard
                key={request.id}
                testID={index === 0 ? "pending-row-first" : `pending-row-${request.id}`}
                request={request}
                disabled={approveJoinRequestMutation.isPending || rejectJoinRequestMutation.isPending}
                onApprove={() => void approveJoinRequestMutation.mutateAsync(request.id)}
                onReject={() => void rejectJoinRequestMutation.mutateAsync(request.id)}
              />
            ))}
            {!joinRequests.length ? <GlassCard variant="compact"><EmptyState title="No join requests" body="New public join requests will show up here for owner approval." /></GlassCard> : null}
          </View>
          <SectionHeader title="Scan review queue" subtitle="Pending and flagged scans." />
          <View style={styles.stack}>
            {attentionAttempts.map((record, index) => (
              <AttendanceApprovalCard
                key={record.id}
                testID={index === 0 ? "attendance-pending-row-first" : `attendance-pending-row-${record.id}`}
                record={record}
                disabled={!canApproveAttendance || approveAttendanceMutation.isPending}
                onApprove={() => void approveAttendanceMutation.mutateAsync(record.id)}
                onLongPress={!canApproveAttendance ? () => showToast({ title: "Owner approval required", tone: "amber" }) : undefined}
              />
            ))}
            {!attentionAttempts.length ? <GlassCard variant="compact"><EmptyState title="Attendance queue clear" body="Pending and flagged scans will appear here when the desk needs help." /></GlassCard> : null}
          </View>
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { width: "100%", maxWidth: layout.contentWidth, alignSelf: "center", paddingTop: 14, gap: 14, paddingBottom: 96 },
  stack: { gap: 12 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricHalf: { flexBasis: "47%", flexGrow: 1 },
});

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  LoadingState,
  MetricTile,
  Pill,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SectionHeader,
  SecondaryButton,
} from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { formatInr, formatRelativeDate, titleCaseFromCode } from "@/lib/formatting";
import type { OwnerDashboardData } from "@/lib/query-hooks";
import { useOwnerDashboard } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

export default function Owner() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const dashboardQuery = useOwnerDashboard();
  const dashboard = dashboardQuery.data;
  const summary = dashboard?.summary;
  const joinRequests = dashboard?.joinRequests ?? [];
  const products = dashboard?.products ?? [];
  const notifications = dashboard?.notifications ?? [];
  const aiUsage = dashboard?.aiUsage ?? [];

  async function updateJoinRequest(joinRequestId: string, action: "approve" | "reject") {
    if (!token || !activeOrgId) {
      return;
    }
    await mobileApiFetch(`/orgs/${activeOrgId}/join-requests/${joinRequestId}/${action}`, {
      method: "POST",
      token,
      orgId: activeOrgId,
    });
    await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "dashboard"] });
  }

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Owner desk"
          title="Command center"
          subtitle="Your gym at a glance."
          trailing={
            <Pill tone="lime">
              {titleCaseFromCode(dashboard?.organization?.status ?? "loading")}
            </Pill>
          }
        />

        <View style={styles.metricGrid}>
          <MetricTile
            label="Active members"
            value={String(summary?.activeMembers ?? 0)}
            detail={`${summary?.joinRequests ?? 0} join requests still waiting`}
            tone="lime"
          />
          <MetricTile
            label="Today attendance"
            value={String(summary?.todayAttendance ?? 0)}
            detail={`${summary?.pendingAttendanceApprovals ?? 0} pending approvals`}
            tone="blue"
          />
          <MetricTile
            label="Revenue today"
            value={formatInr(summary?.revenuePaise ?? 0)}
            detail={`${formatInr(summary?.cashCollectedPaise ?? 0)} recorded offline`}
            tone="amber"
          />
          <MetricTile
            label="AI this month"
            value={String(summary?.aiUsageThisMonth ?? 0)}
            detail={`${summary?.notificationQueueCount ?? 0} notifications failed or scheduled`}
            tone="violet"
          />
        </View>

        {dashboardQuery.isLoading ? (
          <LoadingState
            title="Loading owner dashboard"
            body="Pulling the latest command-center summary for the active organization."
          />
        ) : null}

        <SectionHeader
          eyebrow="Membership funnel"
          title="Join requests"
          subtitle="Approve or reject new members."

        {!dashboardQuery.isLoading && !joinRequests.length ? (
          <EmptyState
            title="No join requests waiting"
            body="When new members request approval, they’ll appear here with quick action controls."
          />
        ) : null}

        <View style={styles.stack}>
          {joinRequests.map((request) => (
            <JoinRequestCard key={request.id} request={request} onUpdate={updateJoinRequest} />
          ))}
        </View>

        <SectionHeader
          eyebrow="Watchlist"
          title="Stock and messaging"
          subtitle="Products and recent messages."
        />

        <View style={styles.splitStack}>
          <Card style={styles.splitCard}>
            <Text style={styles.cardTitle}>
              Low stock
            </Text>
            <View style={styles.stack}>
              {products.length ? (
                products.map((product) => (
                  <View key={product.id} style={styles.rowCard}>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>
                        {product.name}
                      </Text>
                      <Text style={styles.rowBody}>
                        {formatInr(product.pricePaise ?? 0)} ·{" "}
                        {titleCaseFromCode(product.category ?? "OTHER")}
                      </Text>
                    </View>
                    <Pill tone={(product.stock ?? 0) <= 3 ? "red" : "amber"}>
                      {product.stock ?? 0} left
                    </Pill>
                  </View>
                ))
              ) : (
                <Text style={styles.rowBody}>
                  No low-stock products in the current organization.
                </Text>
              )}
            </View>
          </Card>

          <Card style={styles.splitCard}>
            <Text style={styles.cardTitle}>
              Notifications
            </Text>
            <View style={styles.stack}>
              {notifications.length ? (
                notifications.map((notification) => (
                  <View key={notification.id} style={styles.rowCard}>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>
                        {notification.title ?? "Notification"}
                      </Text>
                      <Text style={styles.rowBody}>
                        {titleCaseFromCode(notification.type)} ·{" "}
                        {formatRelativeDate(notification.createdAt)}
                      </Text>
                    </View>
                    <Pill
                      tone={
                        notification.status === "FAILED"
                          ? "red"
                          : notification.status === "SCHEDULED"
                            ? "amber"
                            : "blue"
                      }
                    >
                      {titleCaseFromCode(notification.status)}
                    </Pill>
                  </View>
                ))
              ) : (
                <Text style={styles.rowBody}>
                  No notifications have been sent from this organization yet.
                </Text>
              )}
            </View>
          </Card>
        </View>

        <SectionHeader
          eyebrow="AI activity"
          title="Recent usage"
          subtitle="Recent AI requests in your gym."
        />

        <Card style={styles.splitCard}>
          <View style={styles.stack}>
            {aiUsage.length ? (
              aiUsage.map((usage) => (
                <View key={usage.id} style={styles.rowCard}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>
                      {usage.promptSummary ?? "AI request"}
                    </Text>
                    <Text style={styles.rowBody}>
                      {titleCaseFromCode(usage.requestType)} · {formatRelativeDate(usage.createdAt)}
                    </Text>
                  </View>
                  <Pill tone="lime">{titleCaseFromCode(usage.role)}</Pill>
                </View>
              ))
            ) : (
              <Text style={styles.rowBody}>
                No AI usage has been logged for this organization yet.
              </Text>
            )}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function JoinRequestCard({
  request,
  onUpdate,
}: {
  request: NonNullable<OwnerDashboardData["joinRequests"]>[number];
  onUpdate: (joinRequestId: string, action: "approve" | "reject") => Promise<void>;
}) {
  const [busyAction, setBusyAction] = useState<"approve" | "reject" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleUpdate(action: "approve" | "reject") {
    try {
      setBusyAction(action);
      setErrorMessage(null);
      await onUpdate(request.id, action);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <Card style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.rowCopy}>
          <Text style={styles.cardTitle}>
            Member {request.userName ?? request.userEmail ?? request.userId.slice(0, 8)}
          </Text>
          <Text style={styles.rowBody}>
            Requested {formatRelativeDate(request.createdAt)}
            {request.planId ? " · plan selected" : ""}
          </Text>
        </View>
        <Pill tone="amber">{titleCaseFromCode(request.status ?? "pending")}</Pill>
      </View>
      {request.referralCode ? <Pill tone="blue">Referral {request.referralCode}</Pill> : null}
      {errorMessage ? (
        <Text style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <PrimaryButton onPress={() => void handleUpdate("approve")} style={styles.actionHalf}>
          {busyAction === "approve" ? "Approving..." : "Approve"}
        </PrimaryButton>
        <SecondaryButton onPress={() => void handleUpdate("reject")} style={styles.actionHalf}>
          {busyAction === "reject" ? "Rejecting..." : "Reject"}
        </SecondaryButton>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  stack: {
    gap: 12,
  },
  splitStack: {
    gap: 12,
  },
  splitCard: {
    gap: 12,
  },
  requestCard: {
    gap: 12,
  },
  requestHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  rowCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 14,
  },
  rowCopy: {
    flex: 1,
    gap: 6,
  },
  rowTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
  },
  rowBody: {
    color: colors.muted,
    lineHeight: 19,
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionHalf: {
    flex: 1,
  },
  errorText: {
    color: colors.red,
    lineHeight: 20,
  },
});

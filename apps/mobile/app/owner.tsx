import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Card,
  CollapsibleSection,
  Dock,
  EmptyState,
  LoadingState,
  MetricTile,
  Pill,
  PrimaryButton,
  Screen,
  ScreenHeader,
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
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "dashboard"] });
    setRefreshing(false);
  };

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
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.lime}
            colors={[colors.lime]}
          />
        }
      >
        <ScreenHeader
          eyebrow="Owner desk"
          title="Web command center"
          subtitle="Mobile preview of owner queues. Full setup lives in the web dashboard."
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
            style={styles.metricHalf}
          />
          <MetricTile
            label="Today attendance"
            value={String(summary?.todayAttendance ?? 0)}
            detail="QR check-ins create visible entry codes"
            tone="blue"
            style={styles.metricHalf}
          />
          <MetricTile
            label="Revenue today"
            value={formatInr(summary?.revenuePaise ?? 0)}
            detail={`${formatInr(summary?.cashCollectedPaise ?? 0)} recorded offline`}
            tone="amber"
            style={styles.metricHalf}
          />
          <MetricTile
            label="Trainer AI logs"
            value={String(summary?.aiUsageThisMonth ?? 0)}
            detail={`${summary?.notificationQueueCount ?? 0} notification jobs`}
            tone="violet"
            style={styles.metricHalf}
          />
        </View>

        {dashboardQuery.isLoading ? (
          <LoadingState
            title="Loading owner dashboard"
            body="Pulling the latest command-center summary for the active organization."
          />
        ) : null}

        <Card style={styles.webCard}>
          <Text style={styles.cardTitle}>Owner web app focus</Text>
          <Text style={styles.rowBody}>
            Use web for multi-gym profiles, referral discounts, trainer attendance summaries, inventory, staff roles, and broadcasts.
          </Text>
        </Card>

        <CollapsibleSection
          eyebrow="Membership funnel"
          title="Join requests"
          subtitle="Approval-required gyms only."
          count={joinRequests.length}
          defaultOpen={joinRequests.length > 0}
        >
          {!dashboardQuery.isLoading && !joinRequests.length ? (
            <EmptyState
              title="No join requests waiting"
              body="Open-join memberships can skip this queue."
            />
          ) : (
            <View style={styles.stack}>
              {joinRequests.map((request) => (
                <JoinRequestCard key={request.id} request={request} onUpdate={updateJoinRequest} />
              ))}
            </View>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="Watchlist"
          title="Stock"
          subtitle="Low inventory and gym shop pressure."
          count={products.length}
          defaultOpen={products.length > 0}
        >
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
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="Messaging"
          title="Recent notifications"
          subtitle="Limited sends and automatic triggers belong in web."
          count={notifications.length}
          defaultOpen={false}
        >
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
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="AI oversight"
          title="Recent usage"
          subtitle="AI use remains member and trainer facing."
          count={aiUsage.length}
          defaultOpen={false}
        >
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
        </CollapsibleSection>

      </ScrollView>
      <Dock />
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
    paddingBottom: 120,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricHalf: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  webCard: {
    gap: 10,
    backgroundColor: "rgba(125,211,252,0.08)",
    borderColor: "rgba(125,211,252,0.18)",
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

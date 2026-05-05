import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  BottomNav,
  EmptyState,
  GlassCard,
  GlassInput,
  IconBubble,
  ListRow,
  MetricTile,
  Pill,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  ZookScreen,
} from "@/components/primitives";
import { isOfflineDemoMode } from "@/lib/demo-mode";
import { formatCompactNumber, formatInr } from "@/lib/formatting";
import {
  useApproveAttendance,
  useApproveJoinRequest,
  useOrgActiveShopOrders,
  useOrgAttendancePending,
  useOrgJoinRequests,
  useOrgMembers,
  useOrgRecentPayments,
  useOwnerDashboard,
  useRejectJoinRequest,
} from "@/lib/query-hooks";
import { useAuth } from "@/lib/auth";
import { colors, layout, spacing, typography } from "@/lib/theme";

type OwnerView = "command" | "approvals" | "revenue" | "stock" | "members";
type Drilldown = Exclude<OwnerView, "command">;

function normalizeView(value: string | string[] | undefined): OwnerView {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "approvals" || raw === "revenue" || raw === "stock" || raw === "members") return raw;
  return "command";
}

function offlineDemoViewOverride() {
  return isOfflineDemoMode() ? process.env.EXPO_PUBLIC_OFFLINE_DEMO_VIEW : undefined;
}

function cleanReviewReason(reason?: string | null) {
  if (!reason) return "Desk approval is required.";
  return reason.replace("Attendance approval mode is enabled.", "Desk approval is required.");
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function titleForView(view: OwnerView) {
  if (view === "command") return "Needs attention";
  if (view === "approvals") return "Approvals";
  if (view === "revenue") return "Revenue";
  if (view === "members") return "Members";
  return "Stock";
}

function memberInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "Member";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function Owner() {
  const router = useRouter();
  const { activeRole } = useAuth();
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const view = normalizeView(params.view ?? offlineDemoViewOverride());
  const [memberSearch, setMemberSearch] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const shellRole = activeRole === "ADMIN" ? "ADMIN" : "OWNER";
  const dashboardQuery = useOwnerDashboard();
  const membersQuery = useOrgMembers();
  const joinRequestsQuery = useOrgJoinRequests();
  const attentionQuery = useOrgAttendancePending();
  const paymentsQuery = useOrgRecentPayments();
  const ordersQuery = useOrgActiveShopOrders();
  const approveAttendanceMutation = useApproveAttendance();
  const approveJoinRequestMutation = useApproveJoinRequest();
  const rejectJoinRequestMutation = useRejectJoinRequest();
  const dashboard = dashboardQuery.data;
  const joinRequests = (
    joinRequestsQuery.data?.joinRequests ??
    dashboard?.joinRequests ??
    []
  ).filter((request) => String(request.status ?? "").toLowerCase() === "pending");
  const attentionAttempts = attentionQuery.data?.records ?? [];
  const lowStock = dashboard?.products ?? [];
  const payments = paymentsQuery.data?.payments ?? [];
  const orders = ordersQuery.data?.orders ?? [];
  const activeMembers = dashboard?.summary?.activeMembers ?? 0;
  const todayCheckIns = dashboard?.summary?.todayAttendance ?? 0;
  const expiringSoon = dashboard?.summary?.expiringMemberships ?? 0;
  const pendingApprovals = joinRequests.length + attentionAttempts.length;
  const revenuePaise =
    dashboard?.summary?.revenuePaise ??
    payments.reduce((sum, payment) => sum + payment.amountPaise, 0) +
      orders.reduce((sum, order) => sum + order.totalPaise, 0);
  const branchName =
    dashboard?.branchScope?.selectedBranch?.name ??
    dashboard?.branchScope?.defaultBranch?.name ??
    "Default Branch";
  const memberSearchTerm = memberSearch.trim().toLowerCase();
  const members = membersQuery.data?.members ?? [];
  const paymentExceptionCount = payments.filter((payment) => payment.status !== "SUCCEEDED").length;
  const filteredMembers = members.filter((member) => {
    const name = member.user?.name.toLowerCase() ?? "";
    const email = member.user?.email.toLowerCase() ?? "";
    return !memberSearchTerm || name.includes(memberSearchTerm) || email.includes(memberSearchTerm);
  });
  const needsAttention = [
    {
      id: "approvals",
      title: "Approvals waiting",
      subtitle: `${joinRequests.length} join ${joinRequests.length === 1 ? "request" : "requests"} · ${attentionAttempts.length} scan ${attentionAttempts.length === 1 ? "review" : "reviews"}`,
      count: pendingApprovals,
      tone: pendingApprovals ? "amber" : "lime",
      icon: "checkmark-done-outline",
      target: "approvals",
    },
    {
      id: "revenue",
      title: "Payment exceptions",
      subtitle:
        paymentExceptionCount > 0
          ? `${paymentExceptionCount} ${
              paymentExceptionCount === 1 ? "transaction needs" : "transactions need"
            } review`
          : "No transactions need review",
      count: paymentExceptionCount,
      tone: paymentExceptionCount ? "amber" : "lime",
      icon: "card-outline",
      target: "revenue",
    },
    {
      id: "stock",
      title: "Low stock",
      subtitle: `${lowStock.length} ${lowStock.length === 1 ? "product is" : "products are"} under threshold`,
      count: lowStock.length,
      tone: lowStock.length ? "amber" : "lime",
      icon: "cube-outline",
      target: "stock",
    },
    {
      id: "memberships",
      title: "Expiring soon",
      subtitle: `${expiringSoon} active ${expiringSoon === 1 ? "membership" : "memberships"} in the next 7 days`,
      count: expiringSoon,
      tone: expiringSoon ? "blue" : "neutral",
      icon: "time-outline",
      target: "revenue",
    },
  ] as const satisfies ReadonlyArray<{
    id: string;
    title: string;
    subtitle: string;
    count: number;
    tone: "neutral" | "lime" | "amber" | "red" | "blue" | "violet";
    icon: "checkmark-done-outline" | "card-outline" | "cube-outline" | "time-outline";
    target: Drilldown;
  }>;
  async function approveAttendance(attemptId: string) {
    await approveAttendanceMutation.mutateAsync(attemptId);
    setActionStatus("Check-in approved.");
  }

  async function approveJoinRequest(joinRequestId: string) {
    await approveJoinRequestMutation.mutateAsync(joinRequestId);
    setActionStatus("Join request approved.");
  }

  async function rejectJoinRequest(joinRequestId: string) {
    await rejectJoinRequestMutation.mutateAsync(joinRequestId);
    setActionStatus("Join request rejected.");
  }

  return (
    <ZookScreen>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text numberOfLines={1} style={styles.headerMeta}>
              {dashboard?.organization?.name ?? "Active gym"} · {shellRole === "ADMIN" ? "Admin" : "Owner"}
            </Text>
            <Text style={styles.title}>{titleForView(view)}</Text>
          </View>
        </View>

        <View style={styles.utilityRow}>
          <Pressable
            onPress={() => router.replace(view === "members" ? "/owner" : "/owner?view=members")}
            accessibilityRole="button"
            accessibilityLabel={view === "members" ? "Back to command" : "Open members"}
            style={[styles.utilityPill, view === "members" ? styles.utilityPillActive : null]}
          >
            <Ionicons
              name={view === "members" ? "pulse-outline" : "people-outline"}
              size={15}
              color={view === "members" ? colors.lime : colors.muted}
            />
            <Text
              style={[styles.utilityText, view === "members" ? styles.utilityTextActive : null]}
            >
              {view === "members" ? "Back to command" : "Members"}
            </Text>
          </Pressable>
        </View>

        {view === "command" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile
                label="Active members"
                value={formatCompactNumber(activeMembers)}
                detail={branchName}
                tone="lime"
                icon="people-outline"
                style={styles.metricHalf}
              />
              <MetricTile
                label="Today check-ins"
                value={formatCompactNumber(todayCheckIns)}
                detail={`${attentionAttempts.length} pending review`}
                tone="blue"
                icon="qr-code-outline"
                style={styles.metricHalf}
              />
              <MetricTile
                label="Revenue"
                value={formatInr(revenuePaise)}
                detail="Collected + pickup"
                tone="amber"
                icon="trending-up-outline"
                style={styles.metricHalf}
              />
              <MetricTile
                label="Approvals"
                value={String(pendingApprovals)}
                detail="Needs attention"
                tone="violet"
                icon="checkmark-done-outline"
                style={styles.metricHalf}
              />
            </View>

            <SectionHeader title="Needs attention" />
            <GlassCard contentStyle={styles.stack}>
              {needsAttention.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.replace(`/owner?view=${item.target}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.title}`}
                  style={styles.attentionRow}
                >
                  <ListRow
                    title={item.title}
                    subtitle={item.subtitle}
                    leading={<IconBubble icon={item.icon} tone={item.tone} />}
                    trailing={
                      <View style={styles.attentionTrailing}>
                        <Text style={item.count ? styles.attentionAction : styles.attentionQuiet}>
                          {item.count ? "Review" : "Open"}
                        </Text>
                        <Ionicons name="chevron-forward" size={17} color={colors.muted} />
                      </View>
                    }
                  />
                </Pressable>
              ))}
            </GlassCard>
          </>
        ) : null}

        {view === "members" ? (
          <>
            <GlassInput
              value={memberSearch}
              onChangeText={setMemberSearch}
              placeholder="Search by name or email"
              leading={<Ionicons name="search-outline" size={17} color={colors.muted} />}
            />

            <SectionHeader title="Members" subtitle={`${filteredMembers.length} members`} />
            <View style={styles.membersStack}>
              {membersQuery.isLoading ? (
                <GlassCard variant="compact" contentStyle={styles.membersStateContent}>
                  <IconBubble icon="hourglass-outline" tone="amber" size={40} />
                  <Text style={styles.membersStateText}>Loading members...</Text>
                </GlassCard>
              ) : null}

              {!membersQuery.isLoading && !filteredMembers.length ? (
                <GlassCard variant="compact" contentStyle={styles.membersStateContent}>
                  <IconBubble icon="people-outline" tone="neutral" size={40} />
                  <Text style={styles.membersStateText}>No members found</Text>
                </GlassCard>
              ) : null}

              {!membersQuery.isLoading
                ? filteredMembers.map((member) => {
                    const name = member.user?.name ?? "Member";
                    const email = member.user?.email ?? "No email";
                    const photoUrl = member.user?.profilePhotoUrl ?? member.profile.profilePhotoUrl;
                    const goal = member.user?.fitnessGoal ?? member.profile.fitnessGoal;
                    return (
                      <GlassCard
                        key={member.profile.userId}
                        variant="compact"
                        pressable
                        onPress={() => router.push(`/owner/member/${member.profile.userId}`)}
                        contentStyle={styles.memberCardContent}
                      >
                        {photoUrl ? (
                          <Image
                            source={{ uri: photoUrl }}
                            style={styles.memberAvatarImage}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={styles.memberAvatar}>
                            <Text style={styles.memberAvatarText}>
                              {memberInitials(name, email)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.memberCopy}>
                          <View style={styles.memberTopRow}>
                            <Text numberOfLines={1} style={styles.memberName}>
                              {name}
                            </Text>
                          </View>
                          <Text numberOfLines={1} style={styles.memberEmail}>
                            {goal ? `${email} · ${goal}` : email}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={17} color={colors.muted} />
                      </GlassCard>
                    );
                  })
                : null}
            </View>
          </>
        ) : null}

        {view === "approvals" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile
                label="Join requests"
                value={String(joinRequests.length)}
                detail="Awaiting owner action"
                tone="amber"
                style={styles.metricHalf}
              />
              <MetricTile
                label="Scan reviews"
                value={String(attentionAttempts.length)}
                detail="Pending or flagged"
                tone="red"
                style={styles.metricHalf}
              />
            </View>

            <SectionHeader title="Request list" subtitle="Pending join decisions" />
            <View style={styles.stack}>
              {joinRequests.length ? (
                joinRequests.map((request) => (
                  <GlassCard key={request.id} contentStyle={styles.stack}>
                    <ListRow
                      title={request.userName ?? "Join request"}
                      subtitle={`${request.userEmail ?? request.userId} · Referral ${request.referralCode ?? "none"}`}
                      leading={<IconBubble icon="person-add-outline" tone="amber" />}
                      trailing={<Pill tone="amber">Pending</Pill>}
                    />
                    <View style={styles.actionRow}>
                      <PrimaryButton
                        onPress={() => void approveJoinRequest(request.id)}
                        disabled={approveJoinRequestMutation.isPending}
                        style={styles.actionHalf}
                      >
                        Approve
                      </PrimaryButton>
                      <SecondaryButton
                        onPress={() => void rejectJoinRequest(request.id)}
                        disabled={rejectJoinRequestMutation.isPending}
                        style={styles.actionHalf}
                      >
                        Reject
                      </SecondaryButton>
                    </View>
                  </GlassCard>
                ))
              ) : (
                <GlassCard variant="compact">
                  <EmptyState
                    title="No join requests"
                    body="New public join requests will show up here for owner approval."
                  />
                </GlassCard>
              )}
            </View>

            <SectionHeader title="Scan review queue" subtitle="Pending and flagged scans." />
            <View style={styles.stack}>
              {attentionAttempts.length ? (
                attentionAttempts.map((attempt) => (
                  <GlassCard key={attempt.id} contentStyle={styles.stack}>
                    <ListRow
                      title={attempt.user?.name ?? attempt.user?.email ?? "Member check-in"}
                      subtitle={`${attempt.branchName ?? "Default Branch"} · ${titleCase(attempt.status)} · ${cleanReviewReason(Array.isArray(attempt.suspiciousFlags) ? attempt.suspiciousFlags.join(", ") : null)}`}
                      leading={
                        <IconBubble
                          icon={attempt.status === "FLAGGED" ? "alert-outline" : "qr-code-outline"}
                          tone={attempt.status === "FLAGGED" ? "red" : "amber"}
                        />
                      }
                      trailing={
                        <Pill tone={attempt.status === "FLAGGED" ? "red" : "amber"}>
                          {titleCase(attempt.status)}
                        </Pill>
                      }
                    />
                    <PrimaryButton
                      onPress={() => void approveAttendance(attempt.id)}
                      disabled={approveAttendanceMutation.isPending}
                      icon="checkmark-outline"
                    >
                      Approve Check-in
                    </PrimaryButton>
                  </GlassCard>
                ))
              ) : (
                <GlassCard variant="compact">
                  <EmptyState
                    title="Attendance queue clear"
                    body="Pending and flagged scans will appear here when the desk needs help."
                  />
                </GlassCard>
              )}
            </View>
          </>
        ) : null}

        {view === "revenue" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile
                label="Revenue today"
                value={formatInr(revenuePaise)}
                detail="Membership + shop"
                tone="lime"
                style={styles.metricHalf}
              />
              <MetricTile
                label="Manual records"
                value={formatInr(payments.reduce((sum, payment) => sum + payment.amountPaise, 0))}
                detail="Cash and direct UPI"
                tone="amber"
                style={styles.metricHalf}
              />
            </View>
            <SectionHeader title="Recent transactions" subtitle="Today" />
            <GlassCard contentStyle={styles.stack}>
              {payments.length ? (
                payments.map((payment) => (
                  <ListRow
                    key={payment.id}
                    title={payment.user?.name ?? titleCase(payment.purpose)}
                    subtitle={`${titleCase(payment.mode)} · ${titleCase(payment.status)}`}
                    leading={
                      <IconBubble
                        icon="card-outline"
                        tone={payment.status === "SUCCEEDED" ? "lime" : "amber"}
                      />
                    }
                    trailing={<Text style={styles.rowAmount}>{formatInr(payment.amountPaise)}</Text>}
                  />
                ))
              ) : (
                <EmptyState
                  title="No payments yet"
                  body="Offline collections and checkout confirmations will appear here."
                />
              )}
              {orders.map((order) => (
                <ListRow
                  key={order.id}
                  title={order.user?.name ?? "Shop pickup order"}
                  subtitle={`${order.pickupCode ?? "Pickup pending"} · ${titleCase(order.status)}`}
                  leading={<IconBubble icon="bag-outline" tone="lime" />}
                  trailing={<Text style={styles.rowAmount}>{formatInr(order.totalPaise)}</Text>}
                />
              ))}
            </GlassCard>
          </>
        ) : null}

        {view === "stock" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile
                label="Low stock"
                value={String(lowStock.length)}
                detail="Under threshold"
                tone="amber"
                style={styles.metricHalf}
              />
              <MetricTile
                label="Pickups"
                value={String(orders.length)}
                detail="Paid or ready"
                tone="lime"
                style={styles.metricHalf}
              />
            </View>
            <SectionHeader title="Products to reorder" subtitle="Below threshold" />
            <GlassCard contentStyle={styles.stack}>
              {lowStock.length ? (
                lowStock.map((product) => (
                  <ListRow
                    key={product.id}
                    title={product.name}
                    subtitle={`${formatInr(product.pricePaise)} · threshold ${product.lowStockThreshold}`}
                    leading={<IconBubble icon="cube-outline" tone="amber" />}
                    trailing={<Text style={styles.rowAmount}>{product.stock} left</Text>}
                  />
                ))
              ) : (
                <EmptyState
                  title="Stock looks healthy"
                  body="Products below their threshold will appear here."
                />
              )}
            </GlassCard>
            <SectionHeader title="Orders awaiting handoff" />
            <GlassCard contentStyle={styles.stack}>
              {orders.length ? (
                orders.map((order) => (
                  <ListRow
                    key={order.id}
                    title={order.user?.name ?? "Member pickup"}
                    subtitle={`${order.pickupCode ?? "Pickup pending"} · ${titleCase(order.status)}`}
                    leading={<IconBubble icon="bag-check-outline" tone="lime" />}
                    trailing={<Text style={styles.rowAmount}>{formatInr(order.totalPaise)}</Text>}
                  />
                ))
              ) : (
                <EmptyState
                  title="No pickups waiting"
                  body="Paid shop orders will show up here until reception fulfills them."
                />
              )}
            </GlassCard>
          </>
        ) : null}
        {actionStatus ? <Text style={styles.statusText}>{actionStatus}</Text> : null}
      </ScrollView>
      <BottomNav role={shellRole} activeView={view === "command" ? undefined : view} />
    </ZookScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 14,
    paddingBottom: layout.bottomNavContentPadding + 64,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  headerMeta: {
    color: colors.muted,
    ...typography.caption,
  },
  utilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  utilityPill: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  utilityPillActive: {
    borderColor: "rgba(185,244,85,0.34)",
    backgroundColor: "rgba(185,244,85,0.14)",
  },
  utilityText: {
    color: colors.muted,
    ...typography.caption,
  },
  utilityTextActive: {
    color: colors.lime,
  },
  title: {
    color: colors.text,
    ...typography.screenTitle,
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
  attentionRow: {
    borderRadius: 16,
  },
  attentionTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attentionAction: {
    color: colors.lime,
    ...typography.caption,
  },
  attentionQuiet: {
    color: colors.muted,
    ...typography.caption,
  },
  rowAmount: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  stack: {
    gap: 12,
  },
  membersStack: {
    gap: spacing.md,
  },
  membersStateContent: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  membersStateText: {
    color: colors.text,
    ...typography.cardTitle,
  },
  memberCardContent: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.panel,
  },
  memberAvatarText: {
    color: colors.bg,
    ...typography.caption,
  },
  memberCopy: {
    flex: 1,
    gap: 3,
  },
  memberTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  memberName: {
    flex: 1,
    color: colors.text,
    ...typography.cardTitle,
  },
  memberEmail: {
    color: colors.muted,
    ...typography.small,
  },
  statusText: {
    color: colors.lime,
    ...typography.caption,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionHalf: {
    flex: 1,
  },
});

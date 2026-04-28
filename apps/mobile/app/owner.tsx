import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { zookDemoFixtures, zookMockServices } from "@zook/core";
import {
  ActiveGymPill,
  BottomNav,
  Card,
  EmptyState,
  IconBubble,
  ListRow,
  MetricTile,
  Pill,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionHeader,
} from "@/components/primitives";
import { isOfflineDemoMode } from "@/lib/demo-mode";
import { formatCompactNumber, formatInr } from "@/lib/formatting";
import { colors } from "@/lib/theme";

type OwnerView = "command" | "approvals" | "revenue" | "stock";
type Drilldown = Exclude<OwnerView, "command">;

function normalizeView(value: string | string[] | undefined): OwnerView {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "approvals" || raw === "revenue" || raw === "stock") return raw;
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

export default function Owner() {
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const view = normalizeView(params.view ?? offlineDemoViewOverride());
  const [, setVersion] = useState(0);
  const joinRequests = zookDemoFixtures.joinRequests.filter((request) => request.status === "PENDING");
  const attentionAttempts = zookMockServices.state.attendanceAttempts.filter(
    (attempt) => attempt.status === "PENDING_APPROVAL" || attempt.status === "FLAGGED",
  );
  const lowStock = zookDemoFixtures.shopProducts.filter((product) => product.stock <= product.lowStockThreshold);
  const payments = zookMockServices.state.payments;
  const orders = zookMockServices.state.shopOrders.filter((order) => order.status === "READY_FOR_PICKUP" || order.status === "PAID");
  const activeMembers = zookDemoFixtures.memberships.filter((membership) => membership.status === "ACTIVE").length;
  const todayCheckIns = zookMockServices.state.attendanceAttempts.filter((attempt) => attempt.status === "APPROVED").length;
  const expiringSoon = zookDemoFixtures.memberships.filter((membership) => membership.status === "ACTIVE" && membership.daysLeft <= 7).length;
  const pendingApprovals = joinRequests.length + attentionAttempts.length;
  const revenuePaise = payments.reduce((sum, payment) => sum + payment.amountPaise, 0) + orders.reduce((sum, order) => sum + order.totalPaise, 0);
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
      subtitle: `${payments.filter((payment) => payment.status !== "SUCCEEDED").length} transaction ${payments.filter((payment) => payment.status !== "SUCCEEDED").length === 1 ? "needs" : "need"} confirmation`,
      count: payments.filter((payment) => payment.status !== "SUCCEEDED").length,
      tone: payments.some((payment) => payment.status !== "SUCCEEDED") ? "amber" : "lime",
      icon: "card-outline",
      target: "revenue",
    },
    {
      id: "stock",
      title: "Low stock",
      subtitle: `${lowStock.length} product ${lowStock.length === 1 ? "is" : "are"} under threshold`,
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
  const recentActivity = [
    {
      id: "payment",
      title: "Priya recorded offline payment",
      subtitle: payments[0] ? `${payments[0].summary} · ${titleCase(payments[0].mode)}` : "Manual payments will appear here",
      tone: "lime",
      label: "Audit",
    },
    {
      id: "plan",
      title: "Coach Rhea assigned Push Day",
      subtitle: "Aarav Mehta · visible to member",
      tone: "blue",
      label: "Plan",
    },
    {
      id: "stock",
      title: lowStock[0] ? `${lowStock[0].name} stock needs review` : "Stock levels healthy",
      subtitle: lowStock[0] ? `${lowStock[0].stock} left · threshold ${lowStock[0].lowStockThreshold}` : "All products are above threshold",
      tone: lowStock[0] ? "amber" : "neutral",
      label: "Shop",
    },
  ] as const;

  async function approveAttendance(attemptId: string) {
    await zookMockServices.receptionistService.approveAttendance(attemptId, "Owner approved from mobile command view");
    setVersion((current) => current + 1);
  }

  function bumpVersion() {
    setVersion((current) => current + 1);
  }

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <ActiveGymPill label="Iron Temple Gym · Pune" />
            <Text style={styles.title}>
              {view === "command" ? "Command" : view === "approvals" ? "Approvals" : view === "revenue" ? "Revenue" : "Stock"}
            </Text>
            <Text style={styles.subtitle}>Owner mobile command view · web handles full configuration.</Text>
          </View>
          <Pill tone="lime">Owner</Pill>
        </View>

        {view === "command" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile label="Active members" value={formatCompactNumber(activeMembers)} detail="Main Branch" tone="lime" icon="people-outline" style={styles.metricHalf} />
              <MetricTile label="Today check-ins" value={formatCompactNumber(todayCheckIns)} detail={`${attentionAttempts.length} pending review`} tone="blue" icon="qr-code-outline" style={styles.metricHalf} />
              <MetricTile label="Revenue" value={formatInr(revenuePaise)} detail="Collected + pickup" tone="amber" icon="trending-up-outline" style={styles.metricHalf} />
              <MetricTile label="Approvals" value={String(pendingApprovals)} detail="Needs attention" tone="violet" icon="checkmark-done-outline" style={styles.metricHalf} />
            </View>

            <SectionHeader title="Needs attention" />
            <Card style={styles.stack}>
              {needsAttention.map((item) => (
                <ListRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  leading={<IconBubble icon={item.icon} tone={item.tone} />}
                  trailing={<Pill tone={item.tone}>{String(item.count)}</Pill>}
                />
              ))}
            </Card>

            <SectionHeader title="Recent activity" />
            <Card style={styles.stack}>
              {recentActivity.map((activity) => (
                <ListRow key={activity.id} title={activity.title} subtitle={activity.subtitle} trailing={<Pill tone={activity.tone}>{activity.label}</Pill>} />
              ))}
            </Card>

            <View style={styles.drilldownGrid}>
              <PrimaryButton href="/owner?view=approvals" icon="checkmark-done-outline" style={styles.drilldownButton}>
                Approvals
              </PrimaryButton>
              <SecondaryButton href="/owner?view=revenue" icon="trending-up-outline" style={styles.drilldownButton}>
                Revenue
              </SecondaryButton>
              <SecondaryButton href="/owner?view=stock" icon="cube-outline" style={styles.drilldownButton}>
                Stock
              </SecondaryButton>
            </View>
            <Card variant="compact" style={styles.noteCard}>
              <Text style={styles.noteText}>Mobile command is for fast decisions. Full gym configuration stays on web.</Text>
            </Card>
          </>
        ) : null}

        {view === "approvals" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile label="Join requests" value={String(joinRequests.length)} detail="Awaiting owner action" tone="amber" style={styles.metricHalf} />
              <MetricTile label="Scan reviews" value={String(attentionAttempts.length)} detail="Pending or flagged" tone="red" style={styles.metricHalf} />
            </View>

            <SectionHeader title="Join requests" subtitle="Approve to create checkout link and member notification." />
            <View style={styles.stack}>
              {joinRequests.length ? (
                joinRequests.map((request) => (
                  <Card key={request.id} style={styles.stack}>
                    <ListRow
                      title={request.userName}
                      subtitle={`${request.userEmail} · Referral ${request.referralCode}`}
                      leading={<IconBubble icon="person-add-outline" tone="amber" />}
                      trailing={<Pill tone="amber">Pending</Pill>}
                    />
                    <View style={styles.actionRow}>
                      <PrimaryButton onPress={bumpVersion} style={styles.actionHalf}>Approve</PrimaryButton>
                      <SecondaryButton onPress={bumpVersion} style={styles.actionHalf}>Reject</SecondaryButton>
                    </View>
                  </Card>
                ))
              ) : (
                <Card variant="compact">
                  <EmptyState title="No join requests" body="New public join requests will show up here for owner approval." />
                </Card>
              )}
            </View>

            <SectionHeader title="Attendance review" subtitle="Pending and flagged scans." />
            <View style={styles.stack}>
              {attentionAttempts.length ? (
                attentionAttempts.map((attempt) => (
                  <Card key={attempt.id} style={styles.stack}>
                    <ListRow
                      title={attempt.memberName}
                      subtitle={`${titleCase(attempt.status)} · ${cleanReviewReason(attempt.reason)}`}
                      leading={<IconBubble icon={attempt.status === "FLAGGED" ? "alert-outline" : "qr-code-outline"} tone={attempt.status === "FLAGGED" ? "red" : "amber"} />}
                      trailing={<Pill tone={attempt.status === "FLAGGED" ? "red" : "amber"}>{attempt.entryCode}</Pill>}
                    />
                    <PrimaryButton onPress={() => void approveAttendance(attempt.id)} icon="checkmark-outline">Approve Check-in</PrimaryButton>
                  </Card>
                ))
              ) : (
                <Card variant="compact">
                  <EmptyState title="Attendance queue clear" body="Pending and flagged scans will appear here when the desk needs help." />
                </Card>
              )}
            </View>
          </>
        ) : null}

        {view === "revenue" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile label="Revenue today" value={formatInr(revenuePaise)} detail="Membership + shop" tone="lime" style={styles.metricHalf} />
              <MetricTile label="Manual records" value={formatInr(payments.reduce((sum, payment) => sum + payment.amountPaise, 0))} detail="Cash and direct UPI" tone="amber" style={styles.metricHalf} />
            </View>
            <SectionHeader title="Recent transactions" subtitle="A quick audit trail for owner review." />
            <Card style={styles.stack}>
              {payments.length ? (
                payments.map((payment) => (
                  <ListRow
                    key={payment.id}
                    title={payment.summary}
                    subtitle={`${titleCase(payment.mode)} · ${payment.reason}`}
                    leading={<IconBubble icon="card-outline" tone={payment.status === "SUCCEEDED" ? "lime" : "amber"} />}
                    trailing={<Pill tone={payment.status === "SUCCEEDED" ? "lime" : "amber"}>{formatInr(payment.amountPaise)}</Pill>}
                  />
                ))
              ) : (
                <EmptyState title="No payments yet" body="Offline collections and checkout confirmations will appear here." />
              )}
              {orders.map((order) => (
                <ListRow
                  key={order.id}
                  title="Shop pickup order"
                  subtitle={`${order.pickupCode} · ${titleCase(order.status)}`}
                  leading={<IconBubble icon="bag-outline" tone="lime" />}
                  trailing={<Pill tone="lime">{formatInr(order.totalPaise)}</Pill>}
                />
              ))}
            </Card>

            <Card variant="compact" style={styles.noteCard}>
              <Text style={styles.noteText}>Use the web dashboard for refunds, exports, and detailed reconciliation.</Text>
            </Card>
          </>
        ) : null}

        {view === "stock" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile label="Low stock" value={String(lowStock.length)} detail="Under threshold" tone="amber" style={styles.metricHalf} />
              <MetricTile label="Pickups" value={String(orders.length)} detail="Paid or ready" tone="lime" style={styles.metricHalf} />
            </View>
            <SectionHeader title="Low-stock products" subtitle="Quick stock visibility. Full inventory lives on web." />
            <Card style={styles.stack}>
              {lowStock.length ? (
                lowStock.map((product) => (
                  <ListRow
                    key={product.id}
                    title={product.name}
                    subtitle={`${formatInr(product.pricePaise)} · threshold ${product.lowStockThreshold}`}
                    leading={<IconBubble icon="cube-outline" tone="amber" />}
                    trailing={<Pill tone="amber">{product.stock} left</Pill>}
                  />
                ))
              ) : (
                <EmptyState title="Stock looks healthy" body="Products below their threshold will appear here." />
              )}
            </Card>
            <SectionHeader title="Pending pickups" />
            <Card style={styles.stack}>
              {orders.length ? (
                orders.map((order) => (
                  <ListRow
                    key={order.id}
                    title="Aarav Mehta"
                    subtitle={`${order.pickupCode} · ${titleCase(order.status)}`}
                    leading={<IconBubble icon="bag-check-outline" tone="lime" />}
                    trailing={<Pill tone="lime">{formatInr(order.totalPaise)}</Pill>}
                  />
                ))
              ) : (
                <EmptyState title="No pickups waiting" body="Paid shop orders will show up here until reception fulfills them." />
              )}
            </Card>
          </>
        ) : null}
      </ScrollView>
      <BottomNav role="OWNER" activeView={view === "command" ? undefined : view} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 120,
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
  title: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 20,
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
  stack: {
    gap: 12,
  },
  drilldownGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  drilldownButton: {
    flexGrow: 1,
    minWidth: 104,
  },
  noteCard: {
    gap: 0,
  },
  noteText: {
    color: colors.muted,
    lineHeight: 21,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionHalf: {
    flex: 1,
  },
});

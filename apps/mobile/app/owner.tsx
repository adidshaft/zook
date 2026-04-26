import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { zookDemoFixtures, zookMockServices } from "@zook/core";
import {
  ActiveGymPill,
  Card,
  Dock,
  IconBubble,
  ListRow,
  MetricTile,
  Pill,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionHeader,
} from "@/components/primitives";
import { formatInr } from "@/lib/formatting";
import { colors } from "@/lib/theme";

type OwnerView = "command" | "approvals" | "revenue" | "stock";

function normalizeView(value: string | string[] | undefined): OwnerView {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "approvals" || raw === "revenue" || raw === "stock") return raw;
  return "command";
}

export default function Owner() {
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const view = normalizeView(params.view);
  const [version, setVersion] = useState(0);
  const joinRequests = zookDemoFixtures.joinRequests.filter((request) => request.status === "PENDING");
  const attentionAttempts = zookMockServices.state.attendanceAttempts.filter(
    (attempt) => attempt.status === "PENDING_APPROVAL" || attempt.status === "FLAGGED",
  );
  const lowStock = zookDemoFixtures.shopProducts.filter((product) => product.stock <= product.lowStockThreshold);
  const payments = zookMockServices.state.payments;
  const orders = zookMockServices.state.shopOrders.filter((order) => order.status === "READY_FOR_PICKUP" || order.status === "PAID");

  async function approveAttendance(attemptId: string) {
    await zookMockServices.receptionistService.approveAttendance(attemptId, "Owner approved from mobile command view");
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
              <MetricTile label="Active members" value="412" detail="Across default branch" tone="lime" style={styles.metricHalf} />
              <MetricTile label="Today check-ins" value="48" detail="7 pending review" tone="blue" style={styles.metricHalf} />
              <MetricTile label="Revenue" value="₹82.4k" detail="Today collected" tone="amber" style={styles.metricHalf} />
              <MetricTile label="Approvals" value="7" detail="Needs attention" tone="violet" style={styles.metricHalf} />
            </View>

            <SectionHeader title="Needs attention" />
            <Card style={styles.stack}>
              <ListRow title="Join requests waiting" subtitle="3 members waiting for approval" leading={<IconBubble icon="person-add-outline" tone="amber" />} trailing={<Pill tone="amber">3</Pill>} />
              <ListRow title="Flagged check-in" subtitle="Replay protection needs review" leading={<IconBubble icon="alert-outline" tone="red" />} trailing={<Pill tone="red">1</Pill>} />
              <ListRow title="Expiring soon" subtitle="5 memberships in next 7 days" leading={<IconBubble icon="time-outline" tone="blue" />} trailing={<Pill tone="blue">5</Pill>} />
              <ListRow title="Low stock" subtitle="2 products under threshold" leading={<IconBubble icon="cube-outline" tone="amber" />} trailing={<Pill tone="amber">2</Pill>} />
            </Card>

            <SectionHeader title="Recent activity" />
            <Card style={styles.stack}>
              <ListRow title="Priya recorded offline payment" subtitle="Hybrid Pro renewal · Direct UPI" trailing={<Pill tone="lime">Audit</Pill>} />
              <ListRow title="Coach Rhea assigned Push Day" subtitle="Aarav Mehta · visible to member" trailing={<Pill tone="blue">Plan</Pill>} />
              <ListRow title="Protein Shake stock updated" subtitle="18 units ready at desk" trailing={<Pill tone="neutral">Shop</Pill>} />
            </Card>
          </>
        ) : null}

        {view === "approvals" ? (
          <>
            <SectionHeader title="Join requests" subtitle="Approve to create checkout link and member notification." />
            <View style={styles.stack}>
              {joinRequests.map((request) => (
                <Card key={request.id} style={styles.stack}>
                  <ListRow title={request.userName} subtitle={`${request.userEmail} · Referral ${request.referralCode}`} trailing={<Pill tone="amber">Pending</Pill>} />
                  <View style={styles.actionRow}>
                    <PrimaryButton onPress={() => setVersion(version + 1)} style={styles.actionHalf}>Approve</PrimaryButton>
                    <SecondaryButton onPress={() => setVersion(version + 1)} style={styles.actionHalf}>Reject</SecondaryButton>
                  </View>
                </Card>
              ))}
            </View>

            <SectionHeader title="Attendance review" subtitle="Pending and flagged scans." />
            <View style={styles.stack}>
              {attentionAttempts.map((attempt) => (
                <Card key={attempt.id} style={styles.stack}>
                  <ListRow title={attempt.memberName} subtitle={`${attempt.status.replace(/_/g, " ")} · ${attempt.reason}`} trailing={<Pill tone={attempt.status === "FLAGGED" ? "red" : "amber"}>{attempt.entryCode}</Pill>} />
                  <PrimaryButton onPress={() => void approveAttendance(attempt.id)}>Approve Check-in</PrimaryButton>
                </Card>
              ))}
            </View>
          </>
        ) : null}

        {view === "revenue" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile label="Revenue today" value="₹82.4k" detail="Online + offline" tone="lime" style={styles.metricHalf} />
              <MetricTile label="Manual records" value="₹18.6k" detail="Cash and direct UPI" tone="amber" style={styles.metricHalf} />
            </View>
            <SectionHeader title="Recent transactions" />
            <Card style={styles.stack}>
              {payments.map((payment) => (
                <ListRow key={payment.id} title={payment.summary} subtitle={`${payment.mode.replace(/_/g, " ")} · ${payment.reason}`} trailing={<Pill tone={payment.status === "SUCCEEDED" ? "lime" : "amber"}>{formatInr(payment.amountPaise)}</Pill>} />
              ))}
              <ListRow title="Shop pickup order" subtitle="Protein Shake + Zook Shaker" trailing={<Pill tone="lime">₹548</Pill>} />
            </Card>
          </>
        ) : null}

        {view === "stock" ? (
          <>
            <SectionHeader title="Low-stock products" subtitle="Quick stock visibility. Full inventory lives on web." />
            <Card style={styles.stack}>
              {lowStock.map((product) => (
                <ListRow key={product.id} title={product.name} subtitle={`${formatInr(product.pricePaise)} · threshold ${product.lowStockThreshold}`} trailing={<Pill tone="amber">{product.stock} left</Pill>} />
              ))}
            </Card>
            <SectionHeader title="Pending pickups" />
            <Card style={styles.stack}>
              {orders.map((order) => (
                <ListRow key={order.id} title="Aarav Mehta" subtitle={`${order.pickupCode} · ${order.status.replace(/_/g, " ")}`} trailing={<Pill tone="lime">{formatInr(order.totalPaise)}</Pill>} />
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
      <Dock />
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
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 22,
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
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionHalf: {
    flex: 1,
  },
});

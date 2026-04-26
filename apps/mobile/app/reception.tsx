import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { zookDemoFixtures, zookMockServices, type PaymentMode } from "@zook/core";
import {
  ActiveGymPill,
  AuditWarning,
  Card,
  Dock,
  FormField,
  IconBubble,
  ListRow,
  MetricTile,
  Pill,
  PrimaryButton,
  Screen,
  SearchField,
  SecondaryButton,
  SegmentedControl,
  SectionHeader,
} from "@/components/primitives";
import { formatInr } from "@/lib/formatting";
import { colors } from "@/lib/theme";

type DeskView = "desk" | "members" | "payments" | "orders";

const paymentModes: Array<{ label: string; value: PaymentMode }> = [
  { label: "Cash", value: "CASH" },
  { label: "Direct UPI", value: "DIRECT_UPI" },
  { label: "Bank", value: "BANK_TRANSFER" },
  { label: "Card", value: "CARD" },
  { label: "Manual", value: "OTHER" },
];

function normalizeView(value: string | string[] | undefined): DeskView {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "members" || raw === "payments" || raw === "orders") return raw;
  return "desk";
}

export default function Reception() {
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const view = normalizeView(params.view);
  const [version, setVersion] = useState(0);
  const [reason, setReason] = useState("Desk confirmed member identity");
  const [verifyCode, setVerifyCode] = useState("ZK-7319");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [memberSearch, setMemberSearch] = useState("Aarav");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("DIRECT_UPI");
  const [amount, setAmount] = useState("2499");
  const [referenceId, setReferenceId] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentReason, setPaymentReason] = useState("Desk collected payment");
  const [paymentStatus, setPaymentStatus] = useState("");
  const attempts = zookMockServices.state.attendanceAttempts;
  const approvalQueue = attempts.filter((attempt) => attempt.status === "PENDING_APPROVAL" || attempt.status === "FLAGGED");
  const pendingCount = attempts.filter((attempt) => attempt.status === "PENDING_APPROVAL").length;
  const flaggedCount = attempts.filter((attempt) => attempt.status === "FLAGGED").length;
  const orders = zookMockServices.state.shopOrders;
  const readyOrders = orders.filter((order) => order.status === "READY_FOR_PICKUP" || order.status === "PAID");
  const member = zookDemoFixtures.users.find((user) => user.id === "user-aarav");
  const membership = zookDemoFixtures.memberships.find((item) => item.memberUserId === "user-aarav");
  const profile = zookDemoFixtures.memberProfiles.find((item) => item.userId === "user-aarav");
  const filteredMembers = useMemo(() => {
    const query = memberSearch.toLowerCase();
    return zookDemoFixtures.users.filter((user) => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query));
  }, [memberSearch, version]);

  async function approveAttendance(attemptId: string) {
    await zookMockServices.receptionistService.approveAttendance(attemptId, reason);
    setVersion((current) => current + 1);
  }

  async function rejectAttendance(attemptId: string) {
    await zookMockServices.receptionistService.rejectAttendance(attemptId, reason || "Reception rejected scan after review");
    setVersion((current) => current + 1);
  }

  async function verifyEntryCode() {
    const result = await zookMockServices.attendanceService.verifyEntryCode(verifyCode);
    setVerifyMessage(result ? "Code verified. Match member identity before entry or pickup." : "No active entry or pickup code found.");
  }

  async function recordPayment() {
    const payment = await zookMockServices.receptionistService.recordOfflinePayment({
      memberUserId: "user-aarav",
      amountPaise: Math.round(Number(amount || "0") * 100),
      mode: paymentMode,
      reason: paymentReason,
      referenceId,
      note: paymentNote,
    });
    setPaymentStatus(`Recorded ${formatInr(payment.amountPaise)} by ${payment.mode.replace(/_/g, " ")}.`);
    setVersion((current) => current + 1);
  }

  async function fulfillOrder(orderId: string) {
    await zookMockServices.shopService.fulfillOrder(orderId);
    setVersion((current) => current + 1);
  }

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <ActiveGymPill label="Iron Temple Gym · Pune" />
            <Text style={styles.title}>
              {view === "desk" ? "Desk" : view === "members" ? "Members" : view === "payments" ? "Payments" : "Orders"}
            </Text>
            <Text style={styles.subtitle}>Receptionist execution mode · Priya Sharma</Text>
          </View>
          <Pill tone="blue">Receptionist</Pill>
        </View>

        {view === "desk" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile label="Today" value="48" detail="Check-ins" tone="lime" style={styles.metricThird} />
              <MetricTile label="Pending" value={String(pendingCount || 3)} detail="Need approval" tone="amber" style={styles.metricThird} />
              <MetricTile label="Flagged" value={String(flaggedCount || 1)} detail="Review now" tone="red" style={styles.metricThird} />
            </View>

            <SectionHeader title="Needs Approval" subtitle="Pending and flagged scans from the rolling QR gate." />
            <View style={styles.stack}>
              {approvalQueue.map((attempt) => (
                <Card key={attempt.id} style={styles.queueCard}>
                  <View style={styles.queueHeader}>
                    <IconBubble icon="person-outline" tone={attempt.status === "FLAGGED" ? "red" : "amber"} />
                    <View style={styles.queueCopy}>
                      <Text style={styles.queueTitle}>{attempt.memberName}</Text>
                      <Text style={styles.cardBody}>{attempt.planName} · 7:14 AM · {attempt.reason}</Text>
                    </View>
                    <Pill tone={attempt.status === "FLAGGED" ? "red" : "amber"}>{attempt.status.replace(/_/g, " ")}</Pill>
                  </View>
                  <FormField label="Decision reason" value={reason} onChangeText={setReason} />
                  <View style={styles.actionRow}>
                    <PrimaryButton onPress={() => void approveAttendance(attempt.id)} style={styles.actionHalf}>
                      Approve
                    </PrimaryButton>
                    <SecondaryButton onPress={() => void rejectAttendance(attempt.id)} style={styles.actionHalf}>
                      Reject
                    </SecondaryButton>
                  </View>
                </Card>
              ))}
            </View>

            <Card style={styles.stack}>
              <SectionHeader title="Verify Entry Code" subtitle="Use this for approved, pending, or pickup codes." />
              <FormField label="Entry or pickup code" value={verifyCode} onChangeText={setVerifyCode} placeholder="Enter ZK code" autoCapitalize="characters" />
              <PrimaryButton onPress={() => void verifyEntryCode()}>Verify</PrimaryButton>
              {verifyMessage ? <Text style={styles.statusText}>{verifyMessage}</Text> : null}
            </Card>
          </>
        ) : null}

        {view === "members" ? (
          <>
            <SearchField value={memberSearch} onChangeText={setMemberSearch} placeholder="Search member by name, email, phone, member ID" />
            <View style={styles.stack}>
              {filteredMembers.slice(0, 4).map((user) => (
                <ListRow
                  key={user.id}
                  title={user.name}
                  subtitle={`${user.email} · ${user.phone}`}
                  leading={<IconBubble icon="person-outline" tone={user.id === "user-aarav" ? "lime" : "neutral"} />}
                  trailing={<Pill tone={user.id === "user-riya" ? "amber" : "lime"}>{user.id === "user-riya" ? "Minor gate" : "Active"}</Pill>}
                />
              ))}
            </View>
            <Card style={styles.stack}>
              <SectionHeader title="Member Snapshot" subtitle="Front desk view for fast decisions." />
              <ListRow title={member?.name ?? "Aarav Mehta"} subtitle={`${profile?.memberId ?? "ZK-M-10234"} · ${profile?.goal ?? "Muscle gain"}`} trailing={<Pill tone="lime">{membership?.status ?? "ACTIVE"}</Pill>} />
              <ListRow title="Due amount" subtitle="Hybrid Pro renewal" trailing={<Pill tone="amber">₹2,499</Pill>} />
              <ListRow title="Last check-in" subtitle="Today 7:12 AM" trailing={<Pill tone="blue">Default Branch</Pill>} />
              <AuditWarning>Manual attendance requires a reason and writes an audit log.</AuditWarning>
              <FormField label="Manual attendance reason" value={reason} onChangeText={setReason} />
              <PrimaryButton onPress={() => void approveAttendance("attendance-pending")}>Record Manual Attendance</PrimaryButton>
            </Card>
          </>
        ) : null}

        {view === "payments" ? (
          <Card style={styles.stack}>
            <SectionHeader title="Record Payment" subtitle="Offline collection for membership renewal." />
            <ListRow title="Member" subtitle="Aarav Mehta · ZK-M-10234" trailing={<Pill tone="lime">Active member</Pill>} />
            <ListRow title="Summary" subtitle="Hybrid Pro renewal · Membership expired yesterday" trailing={<Pill tone="amber">₹2,499 due</Pill>} />
            <SegmentedControl options={paymentModes} value={paymentMode} onChange={setPaymentMode} />
            <FormField label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
            <FormField label="Reference ID optional" value={referenceId} onChangeText={setReferenceId} />
            <FormField label="Payment note optional" value={paymentNote} onChangeText={setPaymentNote} />
            <AuditWarning>Manual records require reason and are saved in audit logs.</AuditWarning>
            <FormField label="Reason" value={paymentReason} onChangeText={setPaymentReason} />
            <PrimaryButton onPress={() => void recordPayment()}>Record Payment</PrimaryButton>
            {paymentStatus ? <Text style={styles.statusText}>{paymentStatus}</Text> : null}
          </Card>
        ) : null}

        {view === "orders" ? (
          <>
            <Card style={styles.stack}>
              <SectionHeader title="Pickup Code Verify" subtitle="Confirm code before handing items over." />
              <FormField label="Pickup code" value={verifyCode} onChangeText={setVerifyCode} autoCapitalize="characters" />
              <PrimaryButton onPress={() => void verifyEntryCode()}>Verify Code</PrimaryButton>
              {verifyMessage ? <Text style={styles.statusText}>{verifyMessage}</Text> : null}
            </Card>
            <SectionHeader title="Pickup Orders" subtitle="Paid orders awaiting desk handoff." />
            <View style={styles.stack}>
              {readyOrders.map((order) => (
                <Card key={order.id} style={styles.queueCard}>
                  <ListRow title="Aarav Mehta" subtitle={`${order.pickupCode} · ${formatInr(order.totalPaise)} · ${order.status.replace(/_/g, " ")}`} trailing={<Pill tone="lime">Paid</Pill>} />
                  <PrimaryButton onPress={() => void fulfillOrder(order.id)}>Fulfill Order</PrimaryButton>
                </Card>
              ))}
            </View>
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
  metricThird: {
    minWidth: 104,
    flexGrow: 1,
  },
  stack: {
    gap: 12,
  },
  queueCard: {
    gap: 12,
  },
  queueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  queueCopy: {
    flex: 1,
    gap: 5,
  },
  queueTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  cardBody: {
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
  statusText: {
    color: colors.lime,
    lineHeight: 21,
    fontWeight: "800",
  },
});

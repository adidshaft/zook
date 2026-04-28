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
  const fulfilledCount = orders.filter((order) => order.status === "FULFILLED").length;
  const member = zookDemoFixtures.users.find((user) => user.id === "user-aarav");
  const membership = zookDemoFixtures.memberships.find((item) => item.memberUserId === "user-aarav");
  const profile = zookDemoFixtures.memberProfiles.find((item) => item.userId === "user-aarav");
  const dueAmount = zookDemoFixtures.payments.find((payment) => payment.memberUserId === "user-aarav")?.amountPaise ?? 249900;
  const amountPaise = Math.round(Number(amount || "0") * 100);
  const canRecordPayment = amountPaise > 0 && paymentReason.trim().length > 0;
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
              <MetricTile label="Scans" value="48" detail="Today" tone="lime" icon="qr-code-outline" style={styles.metricThird} />
              <MetricTile label="Queue" value={String(approvalQueue.length)} detail="Open tasks" tone="amber" icon="flash-outline" style={styles.metricThird} />
              <MetricTile label="Flagged" value={String(flaggedCount)} detail="Needs care" tone="red" icon="alert-circle-outline" style={styles.metricThird} />
            </View>

            <SectionHeader title="Speed Queue" subtitle="Clear the gate one scan at a time." action={<Pill tone="amber">{pendingCount} pending</Pill>} />
            <View style={styles.stack}>
              {approvalQueue.length ? approvalQueue.map((attempt, index) => (
                <Card key={attempt.id} variant={index === 0 ? "selected" : "compact"} padding={14} style={styles.queueCard}>
                  <View style={styles.queueHeader}>
                    <IconBubble icon={attempt.status === "FLAGGED" ? "alert-circle-outline" : "person-outline"} tone={attempt.status === "FLAGGED" ? "red" : "amber"} size={38} />
                    <View style={styles.queueCopy}>
                      <Text style={styles.queueTitle}>{attempt.memberName}</Text>
                      <Text style={styles.cardBody}>{attempt.entryCode} · {attempt.planName} · {attempt.reason}</Text>
                    </View>
                    <Pill tone={attempt.status === "FLAGGED" ? "red" : "amber"}>{attempt.status.replace(/_/g, " ")}</Pill>
                  </View>
                  <View style={styles.auditTrail}>
                    {attempt.auditTrail.slice(-3).map((item) => (
                      <Pill key={item} tone="neutral" style={styles.auditPill}>{item}</Pill>
                    ))}
                  </View>
                  {index === 0 ? <FormField label="Decision reason" value={reason} onChangeText={setReason} /> : null}
                  <View style={styles.actionRow}>
                    <PrimaryButton icon="checkmark-circle-outline" onPress={() => void approveAttendance(attempt.id)} style={styles.actionHalf}>
                      Approve
                    </PrimaryButton>
                    <SecondaryButton icon="close-circle-outline" onPress={() => void rejectAttendance(attempt.id)} style={styles.actionHalf}>
                      Reject
                    </SecondaryButton>
                  </View>
                </Card>
              )) : (
                <Card variant="compact" padding={14} style={styles.queueCard}>
                  <ListRow title="Gate queue clear" subtitle="No pending or flagged scans need the desk." icon="checkmark-done-outline" tone="lime" trailing={<Pill tone="lime">Done</Pill>} />
                </Card>
              )}
            </View>

            <Card variant="compact" padding={14} style={styles.stack}>
              <SectionHeader title="Code Check" subtitle="Entry or pickup lookup without leaving the desk." />
              <FormField label="Entry or pickup code" value={verifyCode} onChangeText={setVerifyCode} placeholder="Enter ZK or PK code" autoCapitalize="characters" />
              <PrimaryButton icon="scan-outline" onPress={() => void verifyEntryCode()}>Verify Code</PrimaryButton>
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
            <Card variant="compact" padding={14} style={styles.stack}>
              <SectionHeader title="Member Snapshot" subtitle="Front desk view for fast decisions." />
              <ListRow title={member?.name ?? "Aarav Mehta"} subtitle={`${profile?.memberId ?? "ZK-M-10234"} · ${profile?.goal ?? "Muscle gain"}`} trailing={<Pill tone="lime">{membership?.status ?? "ACTIVE"}</Pill>} />
              <ListRow title="Due amount" subtitle="Hybrid Pro renewal" trailing={<Pill tone="amber">{formatInr(dueAmount)}</Pill>} />
              <ListRow title="Last check-in" subtitle="Today 7:12 AM" trailing={<Pill tone="blue">Default Branch</Pill>} />
              <AuditWarning>Manual attendance requires a reason and writes an audit log.</AuditWarning>
              <FormField label="Manual attendance reason" value={reason} onChangeText={setReason} />
              <PrimaryButton icon="create-outline" onPress={() => void approveAttendance("attendance-pending")}>Record Manual Attendance</PrimaryButton>
            </Card>
          </>
        ) : null}

        {view === "payments" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile label="Due" value={formatInr(dueAmount)} detail="Hybrid Pro" tone="amber" icon="receipt-outline" style={styles.metricHalf} />
              <MetricTile label="Mode" value={paymentModes.find((mode) => mode.value === paymentMode)?.label ?? "Manual"} detail="Offline record" tone="blue" icon="reader-outline" style={styles.metricHalf} />
            </View>
            <Card variant="compact" padding={14} style={styles.stack}>
              <SectionHeader title="Audited Collection" subtitle="Record only money received at the desk." />
              <ListRow title="Member" subtitle="Aarav Mehta · ZK-M-10234" leading={<IconBubble icon="person-outline" tone="lime" size={38} />} trailing={<Pill tone="lime">Verified</Pill>} />
              <ListRow title="Invoice" subtitle="Hybrid Pro renewal · Membership expired yesterday" leading={<IconBubble icon="document-text-outline" tone="amber" size={38} />} trailing={<Pill tone="amber">{formatInr(dueAmount)} due</Pill>} />
              <View style={styles.formStack}>
                <Text style={styles.fieldGroupLabel}>Collection mode</Text>
                <SegmentedControl options={paymentModes} value={paymentMode} onChange={setPaymentMode} />
                <FormField label="Amount received" value={amount} onChangeText={setAmount} keyboardType="numeric" required />
                <FormField label="Reference ID" value={referenceId} onChangeText={setReferenceId} optional autoCapitalize="characters" placeholder="UPI ref, bank UTR, card slip" />
                <FormField label="Desk note" value={paymentNote} onChangeText={setPaymentNote} optional multiline placeholder="Anything finance should see" />
              </View>
              <AuditWarning>Reason is required. This writes an immutable audit event under Priya Sharma.</AuditWarning>
              <FormField label="Audit reason" value={paymentReason} onChangeText={setPaymentReason} required />
              <PrimaryButton icon="shield-checkmark-outline" disabled={!canRecordPayment} onPress={() => void recordPayment()}>Record Audited Payment</PrimaryButton>
              {paymentStatus ? <Text style={styles.statusText}>{paymentStatus}</Text> : null}
            </Card>
          </>
        ) : null}

        {view === "orders" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile label="Ready" value={String(readyOrders.length)} detail="Pickup queue" tone="lime" icon="bag-check-outline" style={styles.metricHalf} />
              <MetricTile label="Done" value={String(fulfilledCount)} detail="Fulfilled" tone="blue" icon="checkmark-done-outline" style={styles.metricHalf} />
            </View>
            <Card variant="compact" padding={14} style={styles.stack}>
              <SectionHeader title="Pickup Verification" subtitle="Match code and member before handoff." />
              <FormField label="Pickup code" value={verifyCode} onChangeText={setVerifyCode} autoCapitalize="characters" placeholder="PK-9142" />
              <PrimaryButton icon="scan-outline" onPress={() => void verifyEntryCode()}>Verify Pickup Code</PrimaryButton>
              {verifyMessage ? <Text style={styles.statusText}>{verifyMessage}</Text> : null}
            </Card>
            <SectionHeader title="Fulfillment Queue" subtitle="Paid orders awaiting desk handoff." />
            <View style={styles.stack}>
              {readyOrders.length ? readyOrders.map((order) => (
                <Card key={order.id} variant="compact" padding={14} style={styles.queueCard}>
                  <View style={styles.queueHeader}>
                    <IconBubble icon="bag-handle-outline" tone="lime" size={38} />
                    <View style={styles.queueCopy}>
                      <Text style={styles.queueTitle}>Aarav Mehta</Text>
                      <Text style={styles.cardBody}>{order.pickupCode} · {formatInr(order.totalPaise)} · {order.items.length} items</Text>
                    </View>
                    <Pill tone="lime">{order.status.replace(/_/g, " ")}</Pill>
                  </View>
                  <View style={styles.itemGrid}>
                    {order.items.map((item) => {
                      const product = zookDemoFixtures.shopProducts.find((candidate) => candidate.id === item.productId);
                      return (
                        <View key={item.productId} style={styles.itemPill}>
                          <Text style={styles.itemName}>{product?.name ?? item.productId}</Text>
                          <Text style={styles.itemMeta}>x{item.quantity} · {formatInr(item.quantity * item.unitPaise)}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <PrimaryButton icon="bag-check-outline" onPress={() => void fulfillOrder(order.id)}>Mark Picked Up</PrimaryButton>
                </Card>
              )) : (
                <Card variant="compact" padding={14} style={styles.queueCard}>
                  <ListRow title="No pickups waiting" subtitle="Ready orders will appear here after payment." icon="bag-check-outline" tone="lime" trailing={<Pill tone="lime">Clear</Pill>} />
                </Card>
              )}
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
  metricHalf: {
    minWidth: 152,
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
  auditTrail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  auditPill: {
    maxWidth: "100%",
  },
  formStack: {
    gap: 12,
  },
  fieldGroupLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  itemGrid: {
    gap: 8,
  },
  itemPill: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  itemName: {
    color: colors.text,
    fontWeight: "900",
  },
  itemMeta: {
    color: colors.muted,
    marginTop: 3,
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

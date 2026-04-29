import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { PaymentMode } from "@zook/core";
import {
  ActiveGymPill,
  AuditWarning,
  BottomNav,
  FormField,
  GlassCard,
  IconBubble,
  ListRow,
  MetricTile,
  Pill,
  PrimaryButton,
  SearchField,
  SecondaryButton,
  SegmentedControl,
  SectionHeader,
  ZookScreen,
} from "@/components/primitives";
import { formatInr } from "@/lib/formatting";
import {
  useApproveAttendance,
  useFulfillShopOrder,
  useManualAttendance,
  useOrgActiveShopOrders,
  useOrgAttendanceToday,
  useOrgMembers,
  useReceptionQueue,
  useRecordManualPayment,
  useRejectAttendance,
} from "@/lib/query-hooks";
import { useAuth } from "@/lib/auth";
import { colors, layout, spacing, typography } from "@/lib/theme";

type DeskView = "desk" | "members" | "payments" | "orders";
type DeskPaymentMode = Extract<PaymentMode, "CASH" | "DIRECT_UPI" | "BANK_TRANSFER" | "CARD" | "OTHER">;

const paymentModes: Array<{ label: string; value: DeskPaymentMode }> = [
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

function deskReasonCopy(reason?: string | null) {
  if (!reason) return "Desk approval required.";
  return reason.replace("Attendance approval mode is enabled.", "Desk approval is required.");
}

export default function Reception() {
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const { session } = useAuth();
  const view = normalizeView(params.view);
  const [reason, setReason] = useState("Desk confirmed member identity");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [paymentMode, setPaymentMode] = useState<DeskPaymentMode>("DIRECT_UPI");
  const [amount, setAmount] = useState("2499");
  const [referenceId, setReferenceId] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentReason, setPaymentReason] = useState("Desk collected payment");
  const [paymentStatus, setPaymentStatus] = useState("");
  const queueQuery = useReceptionQueue();
  const todayAttendanceQuery = useOrgAttendanceToday();
  const membersQuery = useOrgMembers();
  const ordersQuery = useOrgActiveShopOrders();
  const approveAttendanceMutation = useApproveAttendance();
  const rejectAttendanceMutation = useRejectAttendance();
  const manualAttendanceMutation = useManualAttendance();
  const recordPaymentMutation = useRecordManualPayment();
  const fulfillOrderMutation = useFulfillShopOrder();
  const approvalQueue = queueQuery.data?.records ?? [];
  const pendingCount = approvalQueue.filter((attempt) => attempt.status === "PENDING_APPROVAL").length;
  const flaggedCount = approvalQueue.filter((attempt) => attempt.status === "FLAGGED").length;
  const todayCount = todayAttendanceQuery.data?.records.length ?? 0;
  const readyOrders = ordersQuery.data?.orders ?? [];
  const fulfilledCount = 0;
  const amountPaise = Math.round(Number(amount || "0") * 100);
  const filteredMembers = useMemo(() => {
    const query = memberSearch.toLowerCase();
    return (membersQuery.data?.members ?? []).filter((member) => {
      const name = member.user?.name.toLowerCase() ?? "";
      const email = member.user?.email.toLowerCase() ?? "";
      const phone = member.user?.phone?.toLowerCase() ?? "";
      return !query || name.includes(query) || email.includes(query) || phone.includes(query);
    });
  }, [memberSearch, membersQuery.data?.members]);
  const memberRecord = filteredMembers[0] ?? membersQuery.data?.members[0] ?? null;
  const member = memberRecord?.user ?? null;
  const membership = memberRecord?.activeSubscription ?? null;
  const profile = memberRecord?.profile ?? null;
  const activeOrganization = session?.activeOrganization ?? session?.organizations[0] ?? null;
  const dueAmount = amountPaise;
  const canRecordPayment = amountPaise > 0 && paymentReason.trim().length > 0 && Boolean(member?.id) && Boolean(membership?.id);

  async function approveAttendance(attemptId: string) {
    await approveAttendanceMutation.mutateAsync(attemptId);
  }

  async function rejectAttendance(attemptId: string) {
    await rejectAttendanceMutation.mutateAsync({
      recordId: attemptId,
      reason: reason || "Reception rejected scan after review",
    });
  }

  async function verifyEntryCode() {
    const normalized = verifyCode.trim().toUpperCase();
    const pickup = readyOrders.find((order) => order.pickupCode?.toUpperCase() === normalized);
    setVerifyMessage(pickup ? "Pickup code verified. Match member identity before handoff." : "No active pickup code found.");
  }

  async function recordPayment() {
    if (!member?.id || !membership?.id) return;
    const payment = await recordPaymentMutation.mutateAsync({
      memberUserId: member.id,
      subscriptionId: membership.id,
      amountPaise,
      mode: paymentMode,
      ...(referenceId ? { receiptNumber: referenceId } : {}),
      notes: [paymentReason, paymentNote].filter(Boolean).join(" · "),
    });
    setPaymentStatus(`Recorded ${formatInr(payment.payment.amountPaise)} by ${payment.payment.mode.replace(/_/g, " ")}.`);
  }

  async function fulfillOrder(orderId: string) {
    await fulfillOrderMutation.mutateAsync(orderId);
  }

  return (
    <ZookScreen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <ActiveGymPill label={activeOrganization ? `${activeOrganization.name} · ${activeOrganization.city}` : "Active gym"} />
            <Text style={styles.title}>
              {view === "desk" ? "Desk" : view === "members" ? "Members" : view === "payments" ? "Payments" : "Orders"}
            </Text>
            <Text style={styles.subtitle}>Receptionist execution mode · {session?.user.name ?? "Signed-in staff"}</Text>
          </View>
          <Pill tone="blue">Receptionist</Pill>
        </View>

        {view === "desk" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile label="Scans" value={String(todayCount)} detail="Today" tone="lime" icon="qr-code-outline" style={styles.metricThird} />
              <MetricTile label="Queue" value={String(approvalQueue.length)} detail="Open tasks" tone="amber" icon="flash-outline" style={styles.metricThird} />
              <MetricTile label="Flagged" value={String(flaggedCount)} detail="Needs care" tone="red" icon="alert-circle-outline" style={styles.metricThird} />
            </View>

            <SectionHeader title="Speed Queue" subtitle="Clear the gate one scan at a time." action={<Pill tone="amber">{pendingCount} pending</Pill>} />
            <View style={styles.stack}>
              {approvalQueue.length ? approvalQueue.map((attempt, index) => (
                <GlassCard key={attempt.id} variant={index === 0 ? "selected" : "compact"} padding={14} contentStyle={styles.queueCard}>
                  <View style={styles.queueHeader}>
                    <IconBubble icon={attempt.status === "FLAGGED" ? "alert-circle-outline" : "person-outline"} tone={attempt.status === "FLAGGED" ? "red" : "amber"} size={38} />
                    <View style={styles.queueCopy}>
                      <Text style={styles.queueTitle}>{attempt.user?.name ?? attempt.user?.email ?? "Member check-in"}</Text>
                      <Text style={styles.cardBody}>{attempt.plan?.name ?? "Membership"} · {deskReasonCopy(Array.isArray(attempt.suspiciousFlags) ? attempt.suspiciousFlags.join(", ") : null)}</Text>
                    </View>
                    <Pill tone={attempt.status === "FLAGGED" ? "red" : "amber"}>{attempt.status.replace(/_/g, " ")}</Pill>
                  </View>
                  <View style={styles.auditTrail}>
                    {(Array.isArray(attempt.suspiciousFlags) ? attempt.suspiciousFlags : [attempt.source ?? "scan"]).slice(-3).map((item) => (
                      <Pill key={item} tone="neutral" style={styles.auditPill}>{item}</Pill>
                    ))}
                  </View>
                  {index === 0 ? <FormField label="Decision reason" value={reason} onChangeText={setReason} /> : null}
                  <View style={styles.actionRow}>
                    <PrimaryButton icon="checkmark-circle-outline" disabled={approveAttendanceMutation.isPending} onPress={() => void approveAttendance(attempt.id)} style={styles.actionHalf}>
                      Approve
                    </PrimaryButton>
                    <SecondaryButton icon="close-circle-outline" disabled={rejectAttendanceMutation.isPending} onPress={() => void rejectAttendance(attempt.id)} style={styles.actionHalf}>
                      Reject
                    </SecondaryButton>
                  </View>
                </GlassCard>
              )) : (
                <GlassCard variant="compact" padding={14} contentStyle={styles.queueCard}>
                  <ListRow title="Gate queue clear" subtitle="No pending or flagged scans need the desk." icon="checkmark-done-outline" tone="lime" trailing={<Pill tone="lime">Done</Pill>} />
                </GlassCard>
              )}
            </View>

            <GlassCard variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader title="Code Check" subtitle="Entry or pickup lookup without leaving the desk." />
              <FormField label="Pickup code" value={verifyCode} onChangeText={setVerifyCode} placeholder="Enter pickup code" autoCapitalize="characters" />
              <PrimaryButton icon="scan-outline" onPress={() => void verifyEntryCode()}>Verify Code</PrimaryButton>
              {verifyMessage ? <Text style={styles.statusText}>{verifyMessage}</Text> : null}
            </GlassCard>
          </>
        ) : null}

        {view === "members" ? (
          <>
            <SearchField value={memberSearch} onChangeText={setMemberSearch} placeholder="Search member by name, email, phone, member ID" />
            <View style={styles.stack}>
              {filteredMembers.slice(0, 4).map((user) => (
                <ListRow
                  key={user.profile.userId}
                  title={user.user?.name ?? "Member"}
                  subtitle={`${user.user?.email ?? "No email"} · ${user.user?.phone ?? "No phone"}`}
                  leading={<IconBubble icon="person-outline" tone={user.activeSubscription?.status === "ACTIVE" ? "lime" : "neutral"} />}
                  trailing={<Pill tone={user.activeSubscription?.status === "ACTIVE" ? "lime" : "amber"}>{user.activeSubscription?.status ?? "No membership"}</Pill>}
                />
              ))}
            </View>
            <GlassCard variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader title="Member Snapshot" subtitle="Front desk view for fast decisions." />
              <ListRow title={member?.name ?? "Select a member"} subtitle={`${member?.email ?? "Search by name, email, or phone"} · ${member?.fitnessGoal ?? profile?.fitnessGoal ?? "General fitness"}`} trailing={<Pill tone={membership?.status === "ACTIVE" ? "lime" : "amber"}>{membership?.status ?? "No membership"}</Pill>} />
              <ListRow title="Manual amount" subtitle="Entered by desk" trailing={<Pill tone="amber">{formatInr(dueAmount)}</Pill>} />
              <ListRow title="Last check-in" subtitle={memberRecord?.lastCheckIn?.checkedInAt ?? "Not available"} trailing={<Pill tone="blue">{memberRecord?.lastCheckIn?.status ?? "None"}</Pill>} />
              <AuditWarning>Manual attendance requires a reason and writes an audit log.</AuditWarning>
              <FormField label="Manual attendance reason" value={reason} onChangeText={setReason} />
              <PrimaryButton
                icon="create-outline"
                disabled={!member?.id || manualAttendanceMutation.isPending}
                onPress={() => member?.id ? void manualAttendanceMutation.mutateAsync({ memberUserId: member.id, reason }) : undefined}
              >
                Record Manual Attendance
              </PrimaryButton>
            </GlassCard>
          </>
        ) : null}

        {view === "payments" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile label="Amount" value={formatInr(dueAmount)} detail="Manual entry" tone="amber" icon="receipt-outline" style={styles.metricHalf} />
              <MetricTile label="Mode" value={paymentModes.find((mode) => mode.value === paymentMode)?.label ?? "Manual"} detail="Offline record" tone="blue" icon="reader-outline" style={styles.metricHalf} />
            </View>
            <GlassCard variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader title="Audited Collection" subtitle="Record only money received at the desk." />
              <ListRow title="Member" subtitle={member?.name ?? "Select a member"} leading={<IconBubble icon="person-outline" tone="lime" size={38} />} trailing={<Pill tone={member ? "lime" : "amber"}>{member ? "Verified" : "Missing"}</Pill>} />
              <ListRow title="Invoice" subtitle={membership?.id ? "Active subscription record" : "No active subscription selected"} leading={<IconBubble icon="document-text-outline" tone="amber" size={38} />} trailing={<Pill tone="amber">{formatInr(dueAmount)} due</Pill>} />
              <View style={styles.formStack}>
                <Text style={styles.fieldGroupLabel}>Collection mode</Text>
                <SegmentedControl options={paymentModes} value={paymentMode} onChange={setPaymentMode} />
                <FormField label="Amount received" value={amount} onChangeText={setAmount} keyboardType="numeric" required />
                <FormField label="Reference ID" value={referenceId} onChangeText={setReferenceId} optional autoCapitalize="characters" placeholder="UPI ref, bank UTR, card slip" />
                <FormField label="Desk note" value={paymentNote} onChangeText={setPaymentNote} optional multiline placeholder="Anything finance should see" />
              </View>
              <AuditWarning>Reason is required. This writes an immutable audit event under the signed-in staff account.</AuditWarning>
              <FormField label="Audit reason" value={paymentReason} onChangeText={setPaymentReason} required />
              <PrimaryButton icon="shield-checkmark-outline" disabled={!canRecordPayment || recordPaymentMutation.isPending} onPress={() => void recordPayment()}>Record Audited Payment</PrimaryButton>
              {paymentStatus ? <Text style={styles.statusText}>{paymentStatus}</Text> : null}
            </GlassCard>
          </>
        ) : null}

        {view === "orders" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile label="Ready" value={String(readyOrders.length)} detail="Pickup queue" tone="lime" icon="bag-check-outline" style={styles.metricHalf} />
              <MetricTile label="Done" value={String(fulfilledCount)} detail="Fulfilled" tone="blue" icon="checkmark-done-outline" style={styles.metricHalf} />
            </View>
            <GlassCard variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader title="Pickup Verification" subtitle="Match code and member before handoff." />
              <FormField label="Pickup code" value={verifyCode} onChangeText={setVerifyCode} autoCapitalize="characters" placeholder="PK-9142" />
              <PrimaryButton icon="scan-outline" onPress={() => void verifyEntryCode()}>Verify Pickup Code</PrimaryButton>
              {verifyMessage ? <Text style={styles.statusText}>{verifyMessage}</Text> : null}
            </GlassCard>
            <SectionHeader title="Fulfillment Queue" subtitle="Paid orders awaiting desk handoff." />
            <View style={styles.stack}>
              {readyOrders.length ? readyOrders.map((order) => (
                <GlassCard key={order.id} variant="compact" padding={14} contentStyle={styles.queueCard}>
                  <View style={styles.queueHeader}>
                    <IconBubble icon="bag-handle-outline" tone="lime" size={38} />
                    <View style={styles.queueCopy}>
                      <Text style={styles.queueTitle}>{order.user?.name ?? "Member pickup"}</Text>
                      <Text style={styles.cardBody}>{order.pickupCode ?? "Pickup pending"} · {formatInr(order.totalPaise)} · {order.items.length} items</Text>
                    </View>
                    <Pill tone="lime">{order.status.replace(/_/g, " ")}</Pill>
                  </View>
                  <View style={styles.itemGrid}>
                    {order.items.map((item) => {
                      const product = item.product;
                      return (
                        <View key={item.productId} style={styles.itemPill}>
                          <Text style={styles.itemName}>{product?.name ?? item.productId}</Text>
                          <Text style={styles.itemMeta}>x{item.quantity} · {formatInr(item.quantity * item.unitPaise)}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <PrimaryButton icon="bag-check-outline" disabled={fulfillOrderMutation.isPending} onPress={() => void fulfillOrder(order.id)}>Mark Picked Up</PrimaryButton>
                </GlassCard>
              )) : (
                <GlassCard variant="compact" padding={14} contentStyle={styles.queueCard}>
                  <ListRow title="No pickups waiting" subtitle="Ready orders will appear here after payment." icon="bag-check-outline" tone="lime" trailing={<Pill tone="lime">Clear</Pill>} />
                </GlassCard>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
      <BottomNav role="RECEPTIONIST" />
    </ZookScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 16,
    paddingBottom: layout.bottomNavHeight + 40,
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
    ...typography.screenTitle,
  },
  subtitle: {
    color: colors.muted,
    ...typography.body,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
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
    gap: spacing.md,
  },
  queueCard: {
    gap: spacing.md,
  },
  queueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  queueCopy: {
    flex: 1,
    gap: 5,
  },
  queueTitle: {
    color: colors.text,
    ...typography.headerTitle,
  },
  cardBody: {
    color: colors.muted,
    ...typography.body,
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
    gap: spacing.md,
  },
  fieldGroupLabel: {
    color: colors.muted,
    ...typography.eyebrow,
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
    ...typography.bodyStrong,
  },
  itemMeta: {
    color: colors.muted,
    marginTop: 3,
    ...typography.small,
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
    ...typography.bodyStrong,
  },
});

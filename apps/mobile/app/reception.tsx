import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import Reanimated from "@/lib/reanimated-lite";
import type { PaymentMode } from "@zook/core";
import {
  AuditWarning,
  BottomNav,
  EmptyState,
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
import { ReceptionQueueSkeleton, TrainerClientsSkeleton } from "@/components/skeletons";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { formatDateTime, formatInr } from "@/lib/formatting";
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
  type ReceptionQueueRecord,
} from "@/lib/query-hooks";
import { getApiErrorMessage, useAuth, useHasPermission } from "@/lib/auth";
import { apiClient, receptionApi } from "@/lib/domain-api";
import { useScalePulse, useShake } from "@/lib/motion";
import { requirePrivilegedAuth } from "@/lib/privileged-action";
import { colors, layout, spacing, typography } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { getStoredValue, setStoredValue } from "@/lib/storage";

type DeskView = "desk" | "members" | "payments" | "orders";
type DeskPaymentMode = Extract<
  PaymentMode,
  "CASH" | "DIRECT_UPI" | "BANK_TRANSFER" | "CARD" | "OTHER"
>;
type ReceptionCodeVerification = {
  match: null | {
    type: "attendance" | "pickup";
    valid: boolean;
    record?: { status?: string | null; entryCode?: string | null } | null;
    pickupCode?: { status?: string | null; code?: string | null } | null;
    order?: { status?: string | null; totalPaise?: number | null } | null;
    user?: { name?: string | null; email?: string | null } | null;
  };
};

const paymentModes: Array<{ label: string; value: DeskPaymentMode }> = [
  { label: "Cash", value: "CASH" },
  { label: "Direct UPI", value: "DIRECT_UPI" },
  { label: "Bank", value: "BANK_TRANSFER" },
  { label: "Card", value: "CARD" },
  { label: "Manual", value: "OTHER" },
];

const reasonSuggestions = [
  "Desk confirmed member identity",
  "Member showed active membership",
  "QR was unreadable at entry",
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

function redactPhone(phone?: string | null) {
  if (!phone) return "No phone";
  return `****${phone.slice(-4)}`;
}

function phoneRevealStorageKey(orgId?: string | null) {
  return `zook_revealed_reception_phones_${orgId ?? "none"}`;
}

export default function Reception() {
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, logout, session, token } = useAuth();
  const canApproveAttendance = useHasPermission("ATTENDANCE_APPROVE");
  const canRecordManualAttendance = useHasPermission("ATTENDANCE_MANUAL_OVERRIDE");
  const canRecordOfflinePayment = useHasPermission("PAYMENTS_RECORD_OFFLINE");
  const view = normalizeView(params.view);
  const [reason, setReason] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [selectedDecisionAttempt, setSelectedDecisionAttempt] =
    useState<ReceptionQueueRecord | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [paymentMode, setPaymentMode] = useState<DeskPaymentMode>("DIRECT_UPI");
  const [amount, setAmount] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentReason, setPaymentReason] = useState("Desk collected payment");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(() => new Set());
  const queueQuery = useReceptionQueue();
  const todayAttendanceQuery = useOrgAttendanceToday();
  const membersQuery = useOrgMembers();
  const ordersQuery = useOrgActiveShopOrders();
  const approveAttendanceMutation = useApproveAttendance();
  const rejectAttendanceMutation = useRejectAttendance();
  const manualAttendanceMutation = useManualAttendance();
  const recordPaymentMutation = useRecordManualPayment();
  const fulfillOrderMutation = useFulfillShopOrder();
  const decisionSheetRef = useRef<BottomSheetModal>(null);
  const approvalQueue = queueQuery.data?.records ?? [];
  const pendingCount = approvalQueue.filter(
    (attempt) => attempt.status === "PENDING_APPROVAL",
  ).length;
  const flaggedCount = approvalQueue.filter((attempt) => attempt.status === "FLAGGED").length;
  const todayRecords = todayAttendanceQuery.data?.records ?? [];
  const todayCount = todayRecords.length;
  const recentScans = todayRecords.slice(0, 5);
  const readyOrders = ordersQuery.data?.orders ?? [];
  const fulfilledCount = ordersQuery.data?.summary?.fulfilledToday ?? 0;
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
  const selectedMemberRecord =
    (membersQuery.data?.members ?? []).find(
      (record) => record.profile.userId === selectedMemberId,
    ) ?? null;
  const memberRecord = selectedMemberRecord;
  const member = memberRecord?.user ?? null;
  const membership = memberRecord?.activeSubscription ?? null;
  const profile = memberRecord?.profile ?? null;
  const activeOrganization = session?.activeOrganization ?? session?.organizations[0] ?? null;
  const activeOrgLabel = activeOrganization
    ? `${activeOrganization.name} · ${activeOrganization.city}`
    : "Active gym";
  const dueAmount = amountPaise;
  const canRecordPayment =
    amountPaise > 0 &&
    paymentReason.trim().length > 0 &&
    Boolean(member?.id) &&
    Boolean(membership?.id);
  const canVerifyCode = Boolean(verifyCode.trim() && token && activeOrgId);
  const amountInvalid =
    amount.trim().length > 0 && (!Number.isFinite(amountPaise) || amountPaise <= 0);
  const showOwnerApprovalRequired = () => {
    showToast({ title: "Owner approval required", tone: "amber" });
  };
  const showAuthenticationRequired = () => {
    showToast({ title: "Authentication required to perform this action." });
  };

  function confirmSignOut() {
    Alert.alert("Sign out?", "You can sign back in with OTP any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void logout();
        },
      },
    ]);
  }

  const renderDecisionBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  function openDecisionSheet(attempt: ReceptionQueueRecord) {
    setSelectedDecisionAttempt(attempt);
    setDecisionReason(
      attempt.rejectionReason ??
        deskReasonCopy(
          Array.isArray(attempt.suspiciousFlags) ? attempt.suspiciousFlags.join(", ") : null,
        ),
    );
    decisionSheetRef.current?.present();
  }

  function closeDecisionSheet() {
    decisionSheetRef.current?.dismiss();
    setSelectedDecisionAttempt(null);
    setDecisionReason("");
  }

  function revealMemberPhone(memberId: string) {
    setRevealedPhones((current) => {
      const next = new Set(current);
      next.add(memberId);
      void setStoredValue(phoneRevealStorageKey(activeOrgId), JSON.stringify(Array.from(next)));
      return next;
    });
    if (token && activeOrgId) {
      void apiClient
        .request("/audit-logs", {
          method: "POST",
          token,
          orgId: activeOrgId,
          body: { action: "MEMBER_PHONE_REVEALED", targetId: memberId },
        })
        .catch(() => undefined);
    }
  }

  useEffect(() => {
    let mounted = true;
    setRevealedPhones(new Set());
    void getStoredValue(phoneRevealStorageKey(activeOrgId)).then((stored) => {
      if (!mounted) return;
      if (!stored) {
        setRevealedPhones(new Set());
        return;
      }
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRevealedPhones(new Set(parsed.filter((item): item is string => typeof item === "string")));
        }
      } catch {
        setRevealedPhones(new Set());
      }
    });
    return () => {
      mounted = false;
    };
  }, [activeOrgId]);

  useEffect(() => {
    setVerifyMessage("");
  }, [view]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "members"] }),
        queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "shop", "orders"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [activeOrgId, queryClient]);

  function handleVerifyCodeChange(value: string) {
    setVerifyCode(value.toUpperCase());
    setVerifyMessage("");
  }

  async function approveAttendance(attemptId: string, approvalReason: string) {
    try {
      await approveAttendanceMutation.mutateAsync({
        recordId: attemptId,
        reason: approvalReason || "Reception approved scan after review",
      });
      const message = "Check-in approved.";
      setAttendanceStatus(message);
      showToast({ tone: "success", haptic: "success", message });
      closeDecisionSheet();
    } catch (error) {
      const message = getApiErrorMessage(error) || "Could not approve. Please try again.";
      setAttendanceStatus(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
    }
  }

  async function rejectAttendance(attemptId: string, rejectionReason: string) {
    try {
      await rejectAttendanceMutation.mutateAsync({
        recordId: attemptId,
        reason: rejectionReason || "Reception rejected scan after review",
      });
      const message = "Check-in rejected.";
      setAttendanceStatus(message);
      showToast({ tone: "success", haptic: "success", message });
      closeDecisionSheet();
    } catch (error) {
      const message = getApiErrorMessage(error) || "Could not reject. Please try again.";
      setAttendanceStatus(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
    }
  }

  async function verifyEntryCode() {
    const normalized = verifyCode.trim().toUpperCase();
    if (!normalized) {
      setVerifyMessage("Enter a code first.");
      return;
    }
    if (!token || !activeOrgId) {
      setVerifyMessage("Sign in and select a gym before verifying.");
      return;
    }
    let result: ReceptionCodeVerification;
    try {
      result = await receptionApi.verifyCode<ReceptionCodeVerification>({
        token,
        orgId: activeOrgId,
        code: normalized,
      });
    } catch (error) {
      setVerifyMessage(getApiErrorMessage(error) || "Could not verify this code.");
      return;
    }
    if (!result.match) {
      setVerifyMessage("No active entry or pickup code found.");
      return;
    }
    const name = result.match.user?.name ?? result.match.user?.email ?? "member";
    if (result.match.type === "attendance") {
      setVerifyMessage(
        result.match.valid
          ? `Entry code verified for ${name}. Status: ${(result.match.record?.status ?? "approved").replace(/_/g, " ")}.`
          : `Entry code found for ${name}, but it is not valid for entry.`,
      );
      return;
    }
    setVerifyMessage(
      result.match.valid
        ? `Pickup code verified for ${name}. Match the member before giving out the order.`
        : `Pickup code found for ${name}, but status is ${(result.match.pickupCode?.status ?? result.match.order?.status ?? "not ready").replace(/_/g, " ")}.`,
    );
  }

  async function recordPayment() {
    if (!member?.id || !membership?.id) return;
    setPaymentStatus("");
    if (!(await requirePrivilegedAuth("Record manual payment"))) {
      showAuthenticationRequired();
      return;
    }
    try {
      const payment = await recordPaymentMutation.mutateAsync({
        memberUserId: member.id,
        subscriptionId: membership.id,
        amountPaise,
        mode: paymentMode,
        ...(referenceId ? { receiptNumber: referenceId } : {}),
        notes: [paymentReason, paymentNote].filter(Boolean).join(" · "),
      });
      const message = `Recorded ${formatInr(payment.payment.amountPaise)} by ${payment.payment.mode.replace(/_/g, " ")}.`;
      setPaymentStatus(message);
      showToast({ tone: "success", haptic: "success", message });
    } catch (error) {
      const message = getApiErrorMessage(error);
      const statusMessage =
        /already active/i.test(message)
          ? "This membership is already active. Choose a pending subscription or create a new manual activation."
          : message;
      setPaymentStatus(statusMessage);
      showToast({ title: "Action failed", message: statusMessage, tone: "danger", haptic: "error" });
    }
  }

  async function fulfillOrder(orderId: string) {
    if (!(await requirePrivilegedAuth("Fulfill pickup without code"))) {
      showAuthenticationRequired();
      return;
    }
    try {
      await fulfillOrderMutation.mutateAsync({
        orderId,
        skipCode: true,
        skipReason: "Reception manually fulfilled pickup after local re-auth.",
      });
      const message = "Pickup fulfilled.";
      setPaymentStatus(message);
      showToast({ tone: "success", haptic: "success", message });
    } catch (error) {
      const message = getApiErrorMessage(error) || "Could not fulfill this order.";
      setPaymentStatus(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
    }
  }

  async function recordManualAttendance() {
    if (!member?.id) {
      return;
    }
    setAttendanceStatus("");
    if (!(await requirePrivilegedAuth("Record manual attendance"))) {
      showAuthenticationRequired();
      return;
    }
    try {
      await manualAttendanceMutation.mutateAsync({ memberUserId: member.id, reason });
      const message = "Manual attendance recorded.";
      setAttendanceStatus(message);
      showToast({ tone: "success", haptic: "success", message });
    } catch (error) {
      const message = getApiErrorMessage(error);
      const statusMessage =
        /already has an attendance record/i.test(message)
          ? "This member is already checked in today."
          : message;
      setAttendanceStatus(statusMessage);
      showToast({ title: "Action failed", message: statusMessage, tone: "danger", haptic: "error" });
    }
  }

  return (
    <ZookScreen>
      <KeyboardAwareScreen
        scrollViewProps={{
          contentInsetAdjustmentBehavior: "never",
          showsVerticalScrollIndicator: false,
          contentContainerStyle: styles.content,
          refreshControl: (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.lime}
              colors={[colors.lime]}
            />
          ),
        }}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text numberOfLines={1} style={styles.headerMeta}>
              {activeOrgLabel} · Reception
            </Text>
            <Text style={styles.title}>
              {view === "desk"
                ? "Desk"
                : view === "members"
                  ? "Members"
                  : view === "payments"
                    ? "Payments"
                    : "Orders"}
            </Text>
            <Text style={styles.subtitle}>Signed in as {session?.user.name ?? "staff"}</Text>
          </View>
        </View>

        <View style={styles.utilityRow}>
          <Pressable
            onPress={() => router.push("/settings")}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            style={styles.utilityPill}
          >
            <IconBubble icon="settings-outline" tone="blue" size={28} />
            <Text style={styles.utilityText}>Settings</Text>
          </Pressable>
          <Pressable
            onPress={confirmSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={[styles.utilityPill, styles.signOutPill]}
          >
            <IconBubble icon="log-out-outline" tone="red" size={28} />
            <Text style={[styles.utilityText, styles.signOutText]}>Sign out</Text>
          </Pressable>
        </View>

        <GlassCard variant="compact" padding={12} contentStyle={styles.memberContext}>
          <IconBubble
            icon={member ? "person-outline" : "person-add-outline"}
            tone={member ? "lime" : "amber"}
            size={34}
          />
          <View style={styles.memberContextCopy}>
            <Text numberOfLines={1} style={styles.memberContextTitle}>
              {member?.name ?? "No member selected"}
            </Text>
            <Text numberOfLines={1} style={styles.memberContextBody}>
              {member?.email ?? "Search members before recording payments or attendance"}
              {membership?.status ? ` · ${membership.status.replace(/_/g, " ")}` : ""}
            </Text>
          </View>
          {member ? (
            <Pressable
              onPress={() => setSelectedMemberId(null)}
              accessibilityRole="button"
              accessibilityLabel="Clear selected member"
              style={styles.clearMemberButton}
            >
              <Text style={styles.clearMemberText}>Clear</Text>
            </Pressable>
          ) : null}
        </GlassCard>

        {view === "desk" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile
                label="Scans"
                value={String(todayCount)}
                detail="Today"
                tone="lime"
                icon="qr-code-outline"
                style={styles.metricThird}
              />
              <MetricTile
                label="Queue"
                value={String(approvalQueue.length)}
                detail="Open tasks"
                tone="amber"
                icon="flash-outline"
                style={styles.metricThird}
              />
              <MetricTile
                label="Flagged"
                value={String(flaggedCount)}
                detail="Needs care"
                tone="red"
                icon="alert-circle-outline"
                style={styles.metricThird}
              />
            </View>

            <GlassCard variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader
                title="Code Check"
                subtitle="Entry or pickup lookup without leaving the desk."
              />
              <FormField
                label="Code"
                value={verifyCode}
                onChangeText={handleVerifyCodeChange}
                placeholder="Enter code"
                autoCapitalize="characters"
              />
              <PrimaryButton
                icon="scan-outline"
                disabled={!canVerifyCode}
                onPress={verifyEntryCode}
              >
                Verify Code
              </PrimaryButton>
              {verifyMessage ? <VerificationResult message={verifyMessage} /> : null}
            </GlassCard>

            <SectionHeader
              title="Live feed"
              subtitle="Recent check-ins for this gym."
              action={<Pill tone="lime">{todayCount} today</Pill>}
            />
            <View style={styles.liveFeed}>
              {todayAttendanceQuery.isLoading ? <ReceptionQueueSkeleton /> : null}
              {!todayAttendanceQuery.isLoading && !recentScans.length ? (
                <GlassCard variant="compact" padding={14} contentStyle={styles.queueCard}>
                  <ListRow
                    title="No scans yet"
                    subtitle="Approved check-ins will appear here as members enter."
                    icon="radio-outline"
                    tone="neutral"
                  />
                </GlassCard>
              ) : null}
              {recentScans.map((scan) => (
                <GlassCard
                  key={scan.id}
                  variant="compact"
                  padding={12}
                  contentStyle={styles.liveFeedItem}
                >
                  <IconBubble
                    icon={scan.status === "APPROVED" ? "checkmark-circle-outline" : "alert-circle-outline"}
                    tone={scan.status === "APPROVED" ? "lime" : "amber"}
                    size={34}
                  />
                  <View style={styles.liveFeedCopy}>
                    <Text numberOfLines={1} style={styles.queueTitle}>
                      {scan.user?.name ?? scan.user?.email ?? "Member"}
                    </Text>
                    <Text numberOfLines={1} style={styles.cardBody}>
                      {formatDateTime(scan.checkedInAt)} · {scan.branchName ?? "Branch"} ·{" "}
                      {scan.plan?.name ?? "Membership"}
                    </Text>
                  </View>
                  <Pill tone={scan.status === "APPROVED" ? "lime" : "amber"}>
                    {scan.status.replace(/_/g, " ")}
                  </Pill>
                </GlassCard>
              ))}
            </View>

            <SectionHeader
              title="Review queue"
              action={<Pill tone="amber">{pendingCount} pending</Pill>}
            />
            <View style={styles.stack}>
              {queueQuery.isLoading ? (
                <ReceptionQueueSkeleton />
              ) : approvalQueue.length ? (
                approvalQueue.map((attempt, index) => (
                  <GlassCard
                    key={attempt.id}
                    variant={index === 0 ? "selected" : "compact"}
                    padding={14}
                    contentStyle={styles.queueCard}
                  >
                    <View style={styles.queueHeader}>
                      <IconBubble
                        icon={
                          attempt.status === "FLAGGED" ? "alert-circle-outline" : "person-outline"
                        }
                        tone={attempt.status === "FLAGGED" ? "red" : "amber"}
                        size={38}
                      />
                      <View style={styles.queueCopy}>
                        <Text style={styles.queueTitle}>
                          {attempt.user?.name ?? attempt.user?.email ?? "Member check-in"}
                        </Text>
                        <Text style={styles.cardBody}>
                          {attempt.branchName ?? "Main branch"} ·{" "}
                          {attempt.plan?.name ?? "Membership"} ·{" "}
                          {deskReasonCopy(
                            Array.isArray(attempt.suspiciousFlags)
                              ? attempt.suspiciousFlags.join(", ")
                              : null,
                          )}
                        </Text>
                      </View>
                      <Pill tone={attempt.status === "FLAGGED" ? "red" : "amber"}>
                        {attempt.status.replace(/_/g, " ")}
                      </Pill>
                    </View>
                    <View style={styles.auditTrail}>
                      {(Array.isArray(attempt.suspiciousFlags)
                        ? attempt.suspiciousFlags
                        : [attempt.source ?? "scan"]
                      )
                        .slice(-3)
                        .map((item) => (
                          <Text key={item} style={styles.auditText}>
                            {item}
                          </Text>
                        ))}
                    </View>
                    <View style={styles.actionRow}>
                      <PrimaryButton
                        icon="checkmark-circle-outline"
                        disabled={!canApproveAttendance || approveAttendanceMutation.isPending}
                        onLongPress={!canApproveAttendance ? showOwnerApprovalRequired : undefined}
                        onPress={() => openDecisionSheet(attempt)}
                        style={styles.actionHalf}
                      >
                        Approve
                      </PrimaryButton>
                      <SecondaryButton
                        icon="close-circle-outline"
                        disabled={!canApproveAttendance || rejectAttendanceMutation.isPending}
                        onLongPress={!canApproveAttendance ? showOwnerApprovalRequired : undefined}
                        onPress={() => openDecisionSheet(attempt)}
                        style={styles.actionHalf}
                      >
                        Reject
                      </SecondaryButton>
                    </View>
                  </GlassCard>
                ))
              ) : (
                <GlassCard variant="compact" padding={14} contentStyle={styles.queueCard}>
                  <ListRow
                    title="Gate queue clear"
                    subtitle="No pending or flagged scans need the desk."
                    icon="checkmark-done-outline"
                    tone="lime"
                  />
                </GlassCard>
              )}
            </View>
          </>
        ) : null}

        {view === "members" ? (
          <>
            <SearchField
              value={memberSearch}
              onChangeText={setMemberSearch}
              placeholder="Search member by name, email, phone, member ID"
            />
            <View style={styles.stack}>
              {membersQuery.isLoading ? <TrainerClientsSkeleton /> : null}
              {!membersQuery.isLoading && !filteredMembers.length ? (
                <GlassCard variant="compact" padding={14}>
                  <EmptyState title="No members found" body="Try a different name or email." />
                </GlassCard>
              ) : null}
              {filteredMembers.slice(0, 4).map((user) => {
                const selected = user.profile.userId === selectedMemberRecord?.profile.userId;
                const phone = user.user?.phone ?? null;
                const phoneRevealed = revealedPhones.has(user.profile.userId);
                return (
                  <GlassCard
                    key={user.profile.userId}
                    variant={selected ? "selected" : "compact"}
                    padding={12}
                    pressable
                    onPress={() => setSelectedMemberId(user.profile.userId)}
                  >
                    <ListRow
                      title={user.user?.name ?? "Member"}
                      subtitle={user.user?.email ?? "No email"}
                      leading={
                        <IconBubble
                          icon="person-outline"
                          tone={user.activeSubscription?.status === "ACTIVE" ? "lime" : "neutral"}
                        />
                      }
                      trailing={
                        <Text
                          style={[
                            styles.rowStateText,
                            user.activeSubscription?.status === "ACTIVE" || selected
                              ? styles.rowStateGood
                              : null,
                          ]}
                        >
                          {selected
                            ? "Selected"
                            : (user.activeSubscription?.status ?? "No membership")}
                        </Text>
                      }
                    />
                    <View style={styles.memberPhoneRow}>
                      <Text numberOfLines={1} style={styles.memberPhoneText}>
                        {phoneRevealed ? (phone ?? "No phone") : redactPhone(phone)}
                      </Text>
                      {phone && !phoneRevealed ? (
                        <Pressable
                          onPress={() => revealMemberPhone(user.profile.userId)}
                          accessibilityRole="button"
                          accessibilityLabel={`Reveal phone for ${user.user?.name ?? "member"}`}
                          style={styles.revealPhoneButton}
                        >
                          <Text style={styles.revealPhoneText}>Reveal</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </GlassCard>
                );
              })}
            </View>
            <GlassCard variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader
                title="Desk actions"
                subtitle={member?.name ? `${member.name} selected` : "Search or select a member"}
              />
              <ListRow
                title="Membership"
                subtitle={member?.fitnessGoal ?? profile?.fitnessGoal ?? "General fitness"}
                trailing={
                  <Pill tone={membership?.status === "ACTIVE" ? "lime" : "amber"}>
                    {membership?.status ?? "No membership"}
                  </Pill>
                }
              />
              <ListRow
                title="Manual amount"
                subtitle="Entered by desk"
                trailing={<Text style={styles.rowAmount}>{formatInr(dueAmount)}</Text>}
              />
              <ListRow
                title="Last check-in"
                subtitle={formatDateTime(memberRecord?.lastCheckIn?.checkedInAt)}
                trailing={
                  <Text style={styles.rowStateText}>
                    {memberRecord?.lastCheckIn?.status ?? "None"}
                  </Text>
                }
              />
              <AuditWarning>Add a reason so the gym has a clear record.</AuditWarning>
              <FormField label="Attendance note" value={reason} onChangeText={setReason} />
              <PrimaryButton
                icon="create-outline"
                disabled={
                  !canRecordManualAttendance || !member?.id || manualAttendanceMutation.isPending
                }
                onLongPress={!canRecordManualAttendance ? showOwnerApprovalRequired : undefined}
                onPress={recordManualAttendance}
              >
                {manualAttendanceMutation.isPending ? "Recording..." : "Record Attendance"}
              </PrimaryButton>
              {attendanceStatus ? <Text style={styles.statusText}>{attendanceStatus}</Text> : null}
            </GlassCard>
          </>
        ) : null}

        {view === "payments" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile
                label="Amount"
                value={formatInr(dueAmount)}
                detail="Manual entry"
                tone="amber"
                icon="receipt-outline"
                style={styles.metricHalf}
              />
              <MetricTile
                label="Mode"
                value={paymentModes.find((mode) => mode.value === paymentMode)?.label ?? "Manual"}
                detail="Offline record"
                tone="blue"
                icon="reader-outline"
                style={styles.metricHalf}
              />
            </View>
            <GlassCard variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader
                title="Payment collection"
                subtitle="Record only money received at the desk."
              />
              <ListRow
                title="Member"
                subtitle={member?.name ?? "Select a member"}
                leading={<IconBubble icon="person-outline" tone="lime" size={38} />}
                trailing={
                  <Pill tone={member ? "lime" : "amber"}>{member ? "Verified" : "Missing"}</Pill>
                }
              />
              <ListRow
                title="Invoice"
                subtitle={membership?.id ? "Active membership selected" : "No membership selected"}
                leading={<IconBubble icon="document-text-outline" tone="amber" size={38} />}
                trailing={<Text style={styles.rowAmount}>{formatInr(dueAmount)} due</Text>}
              />
              <View style={styles.formStack}>
                <Text style={styles.fieldGroupLabel}>Collection mode</Text>
                <SegmentedControl
                  options={paymentModes}
                  value={paymentMode}
                  onChange={setPaymentMode}
                />
                <FormField
                  label="Amount received"
                  value={amount}
                  onChangeText={(value) => setAmount(value.replace(/[^\d.]/g, ""))}
                  keyboardType="decimal-pad"
                  placeholder="₹0"
                  returnKeyType="next"
                  required
                  error={amountInvalid ? "Enter an amount greater than 0." : undefined}
                />
                <FormField
                  label="Receipt or reference"
                  value={referenceId}
                  onChangeText={setReferenceId}
                  optional
                  autoCapitalize="characters"
                  placeholder="UPI ref, bank UTR, card slip"
                />
                <FormField
                  label="Desk note"
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                  optional
                  multiline
                  placeholder="Anything finance should see"
                />
              </View>
              <AuditWarning>
                Add a short note so finance can review this desk payment later.
              </AuditWarning>
              <FormField
                label="Staff note"
                value={paymentReason}
                onChangeText={setPaymentReason}
                required
              />
              <PrimaryButton
                icon="shield-checkmark-outline"
                disabled={
                  !canRecordOfflinePayment || !canRecordPayment || recordPaymentMutation.isPending
                }
                onLongPress={!canRecordOfflinePayment ? showOwnerApprovalRequired : undefined}
                onPress={recordPayment}
              >
                Record Payment
              </PrimaryButton>
              {paymentStatus ? <Text style={styles.statusText}>{paymentStatus}</Text> : null}
            </GlassCard>
          </>
        ) : null}

        {view === "orders" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile
                label="Ready"
                value={String(readyOrders.length)}
                detail="Pickup queue"
                tone="lime"
                icon="bag-check-outline"
                style={styles.metricHalf}
              />
              <MetricTile
                label="Done"
                value={String(fulfilledCount)}
                detail="Fulfilled"
                tone="blue"
                icon="checkmark-done-outline"
                style={styles.metricHalf}
              />
            </View>
            <GlassCard variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader
                title="Pickup Verification"
                subtitle="Match the code and member before giving out the order."
              />
              <FormField
                label="Pickup code"
                value={verifyCode}
                onChangeText={handleVerifyCodeChange}
                autoCapitalize="characters"
                placeholder="Enter pickup code"
              />
              <PrimaryButton
                icon="scan-outline"
                disabled={!canVerifyCode}
                onPress={verifyEntryCode}
              >
                Verify Pickup Code
              </PrimaryButton>
              {verifyMessage ? <VerificationResult message={verifyMessage} /> : null}
            </GlassCard>
            <SectionHeader title="Fulfillment Queue" subtitle="Paid orders ready at the desk." />
            <View style={styles.stack}>
              {readyOrders.length ? (
                readyOrders.map((order) => (
                  <GlassCard
                    key={order.id}
                    variant="compact"
                    padding={14}
                    contentStyle={styles.queueCard}
                  >
                    <View style={styles.queueHeader}>
                      <IconBubble icon="bag-handle-outline" tone="lime" size={38} />
                      <View style={styles.queueCopy}>
                        <Text style={styles.queueTitle}>{order.user?.name ?? "Member pickup"}</Text>
                        <Text style={styles.cardBody}>
                          {order.pickupCode ?? "Pickup pending"} · {formatInr(order.totalPaise)} ·{" "}
                          {order.items.length} items
                        </Text>
                      </View>
                      <Pill tone="lime">{order.status.replace(/_/g, " ")}</Pill>
                    </View>
                    <View style={styles.itemGrid}>
                      {order.items.map((item) => {
                        const product = item.product;
                        return (
                          <View key={item.productId} style={styles.itemPill}>
                            <Text style={styles.itemName}>{product?.name ?? item.productId}</Text>
                            <Text style={styles.itemMeta}>
                              x{item.quantity} · {formatInr(item.quantity * item.unitPaise)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    <PrimaryButton
                      icon="bag-check-outline"
                      disabled={fulfillOrderMutation.isPending}
                      onPress={() => fulfillOrder(order.id)}
                    >
                      Mark Picked Up
                    </PrimaryButton>
                  </GlassCard>
                ))
              ) : (
                <GlassCard variant="compact" padding={14} contentStyle={styles.queueCard}>
                  <ListRow
                    title="No pickups waiting"
                    subtitle="Ready orders will appear here after payment."
                    icon="bag-check-outline"
                    tone="lime"
                  />
                </GlassCard>
              )}
            </View>
          </>
        ) : null}
      </KeyboardAwareScreen>
      <BottomSheetModal
        ref={decisionSheetRef}
        snapPoints={["48%"]}
        enablePanDownToClose
        backdropComponent={renderDecisionBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
        onDismiss={() => {
          setSelectedDecisionAttempt(null);
          setDecisionReason("");
        }}
      >
        <BottomSheetView style={styles.decisionSheetContent}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleCopy}>
              <Text style={styles.sheetEyebrow}>Decision reason</Text>
              <Text style={styles.sheetTitle}>
                {selectedDecisionAttempt?.user?.name ??
                  selectedDecisionAttempt?.user?.email ??
                  "Member check-in"}
              </Text>
              <Text style={styles.cardBody}>
                Add the desk note before approving or rejecting this scan.
              </Text>
            </View>
            <Pressable
              onPress={closeDecisionSheet}
              accessibilityRole="button"
              accessibilityLabel="Close decision sheet"
              style={styles.sheetCloseButton}
            >
              <Text style={styles.sheetCloseText}>Close</Text>
            </Pressable>
          </View>
          <FormField
            label="Decision reason"
            value={decisionReason}
            onChangeText={setDecisionReason}
            multiline
          />
          <View style={styles.suggestionRow}>
            {reasonSuggestions.map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => setDecisionReason(suggestion)}
                accessibilityRole="button"
                style={[
                  styles.suggestionChip,
                  decisionReason === suggestion ? styles.suggestionChipSelected : null,
                ]}
              >
                <Text
                  style={[
                    styles.suggestionText,
                    decisionReason === suggestion ? styles.suggestionTextSelected : null,
                  ]}
                >
                  {suggestion}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.actionRow}>
            <PrimaryButton
              icon="checkmark-circle-outline"
              disabled={!selectedDecisionAttempt || approveAttendanceMutation.isPending}
              onPress={() => {
                if (selectedDecisionAttempt) {
                  void approveAttendance(selectedDecisionAttempt.id, decisionReason);
                }
              }}
              style={styles.actionHalf}
            >
              {approveAttendanceMutation.isPending ? "Approving..." : "Approve"}
            </PrimaryButton>
            <SecondaryButton
              icon="close-circle-outline"
              disabled={!selectedDecisionAttempt || rejectAttendanceMutation.isPending}
              onPress={() => {
                if (selectedDecisionAttempt) {
                  void rejectAttendance(selectedDecisionAttempt.id, decisionReason);
                }
              }}
              style={styles.actionHalf}
            >
              {rejectAttendanceMutation.isPending ? "Rejecting..." : "Reject"}
            </SecondaryButton>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
      <BottomNav role="RECEPTIONIST" />
    </ZookScreen>
  );
}

function VerificationResult({ message }: { message: string }) {
  const success =
    /verified|match/i.test(message) && !/not valid|no active|not ready/i.test(message);
  const { animatedStyle: pulseStyle, pulse } = useScalePulse();
  const { animatedStyle: shakeStyle, shake } = useShake();
  useEffect(() => {
    if (success) pulse();
    else shake();
  }, [pulse, shake, success]);
  return (
    <Reanimated.View style={success ? pulseStyle : shakeStyle}>
      <GlassCard
        variant={success ? "success" : "warning"}
        padding={12}
        contentStyle={styles.verificationResult}
      >
        <IconBubble
          icon={success ? "checkmark-circle-outline" : "alert-circle-outline"}
          tone={success ? "lime" : "amber"}
          size={34}
        />
        <Text style={styles.verificationText}>{message}</Text>
      </GlassCard>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 16,
    paddingBottom: layout.bottomNavContentPadding + 80,
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
    gap: spacing.sm,
  },
  utilityPill: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    paddingLeft: 6,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flex: 1,
  },
  utilityText: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  signOutPill: {
    borderColor: "rgba(255,90,61,0.28)",
    backgroundColor: "rgba(255,90,61,0.08)",
  },
  signOutText: {
    color: colors.red,
  },
  memberContext: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  memberContextCopy: {
    flex: 1,
    gap: 3,
  },
  memberContextTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  memberContextBody: {
    color: colors.muted,
    ...typography.small,
  },
  clearMemberButton: {
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  clearMemberText: {
    color: colors.muted,
    ...typography.caption,
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
  liveFeed: {
    gap: 8,
  },
  liveFeedItem: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  liveFeedCopy: {
    flex: 1,
    gap: 3,
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
  auditText: {
    color: colors.muted,
    ...typography.small,
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  suggestionChipSelected: {
    borderColor: colors.lime,
    backgroundColor: "rgba(185,244,85,0.14)",
  },
  suggestionText: {
    color: colors.muted,
    ...typography.caption,
  },
  suggestionTextSelected: {
    color: colors.lime,
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
  verificationResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  verificationText: {
    flex: 1,
    color: colors.text,
    ...typography.bodyStrong,
  },
  rowAmount: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  rowStateText: {
    color: colors.muted,
    ...typography.caption,
  },
  rowStateGood: {
    color: colors.lime,
  },
  memberPhoneRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingLeft: 52,
  },
  memberPhoneText: {
    color: colors.muted,
    ...typography.small,
  },
  revealPhoneButton: {
    minHeight: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  revealPhoneText: {
    color: colors.lime,
    ...typography.caption,
  },
  sheetBackground: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  sheetHandle: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  decisionSheetContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  sheetTitleCopy: {
    flex: 1,
    gap: 5,
  },
  sheetEyebrow: {
    color: colors.lime,
    ...typography.eyebrow,
  },
  sheetTitle: {
    color: colors.text,
    ...typography.headerTitle,
  },
  sheetCloseButton: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseText: {
    color: colors.muted,
    ...typography.caption,
  },
});

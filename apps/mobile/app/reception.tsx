import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  SectionHeader,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherChip } from "@/components/role-switcher";
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
import { useRoleContext } from "@/lib/role-context";
import { useBranchSelection } from "@/lib/branch-selection";
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
    user?: {
      name?: string | null;
      email?: string | null;
      profilePhotoUrl?: string | null;
    } | null;
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

function ageLabel(dateOfBirth?: string | null) {
  if (!dateOfBirth) return "DOB not added";
  const parsed = new Date(dateOfBirth);
  if (Number.isNaN(parsed.getTime())) return "DOB not added";
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDelta = today.getMonth() - parsed.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return `${age} years`;
}

function phoneRevealStorageKey(orgId?: string | null) {
  return `zook_revealed_reception_phones_${orgId ?? "none"}`;
}

export default function Reception() {
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const roleContext = useRoleContext();
  const { branches, selectedBranch, selectBranch } = useBranchSelection();
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
  const [verifiedUser, setVerifiedUser] = useState<{
    name?: string | null;
    profilePhotoUrl?: string | null;
  } | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [paymentMode, setPaymentMode] = useState<DeskPaymentMode>("DIRECT_UPI");
  const [amount, setAmount] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentReason, setPaymentReason] = useState("Desk collected payment");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(() => new Set());
  const [bulkAttendanceStatus, setBulkAttendanceStatus] = useState("");
  const [paymentMemberSearch, setPaymentMemberSearch] = useState("");
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
  const attendanceReason = reason.trim();
  const attendanceReasonInvalid = attendanceReason.length > 0 && attendanceReason.length < 2;

  useEffect(() => {
    setVerifyCode("");
    setVerifyMessage("");
    setVerifiedUser(null);
  }, [view]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.toLowerCase();
    return (membersQuery.data?.members ?? []).filter((member) => {
      const name = member.user?.name.toLowerCase() ?? "";
      const email = member.user?.email.toLowerCase() ?? "";
      const phone = member.user?.phone?.toLowerCase() ?? "";
      return !query || name.includes(query) || email.includes(query) || phone.includes(query);
    });
  }, [memberSearch, membersQuery.data?.members]);
  const memberResultLimit = memberSearch.trim().length ? 25 : 10;
  const visibleMembers = filteredMembers.slice(0, memberResultLimit);
  const hiddenMemberCount = Math.max(0, filteredMembers.length - visibleMembers.length);
  const selectedMemberRecord =
    (membersQuery.data?.members ?? []).find(
      (record) => record.profile.userId === selectedMemberId,
    ) ?? null;
  const memberRecord = selectedMemberRecord;
  const member = memberRecord?.user ?? null;
  const membership = memberRecord?.activeSubscription ?? null;
  const profile = memberRecord?.profile ?? null;
  const activeOrganization = session?.activeOrganization ?? session?.organizations[0] ?? null;
  const activeRole = roleContext?.role;
  const canSwitchBranches = branches.length > 1;
  const activeOrgLabel = activeOrganization
    ? `${activeOrganization.name} · ${activeOrganization.city}`
    : "Active gym";
  const gymSelectorLabel = selectedBranch?.name ?? activeOrgLabel;

  function openBranchSwitcher() {
    if (!canSwitchBranches) {
      Alert.alert("Only one branch", "This gym has no other branches to switch to.");
      return;
    }
    Alert.alert(
      "Switch branch",
      "Choose the branch you are at.",
      [
        ...branches.map((branch) => ({
          text: branch.id === selectedBranch?.id ? `${branch.name} (active)` : branch.name,
          onPress: () => {
            if (branch.id === selectedBranch?.id) return;
            void selectBranch(branch.id);
          },
        })),
        { text: "Cancel", style: "cancel" as const },
      ],
    );
  }

  function goBackFromDesk() {
    if (activeRole === "OWNER" || activeRole === "ADMIN") {
      router.replace("/owner");
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }

  function toggleMemberSelection(userId: string) {
    setSelectedMemberIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  async function recordBulkAttendance() {
    if (!selectedMemberIds.size) {
      return;
    }
    if (attendanceReason.length < 2) {
      setBulkAttendanceStatus("Add an attendance note before recording.");
      return;
    }
    if (!(await requirePrivilegedAuth("Record manual attendance"))) {
      showAuthenticationRequired();
      return;
    }
    setBulkAttendanceStatus("Recording...");
    const ids = Array.from(selectedMemberIds);
    let successes = 0;
    const failures: string[] = [];
    for (const memberUserId of ids) {
      try {
        await manualAttendanceMutation.mutateAsync({
          memberUserId,
          reason: attendanceReason,
        });
        successes += 1;
      } catch (error) {
        failures.push(getApiErrorMessage(error) || "Could not record one entry.");
      }
    }
    const summary = failures.length
      ? `Recorded ${successes} of ${ids.length}. ${failures.length} failed.`
      : `Recorded attendance for ${successes} member${successes === 1 ? "" : "s"}.`;
    setBulkAttendanceStatus(summary);
    showToast({
      tone: failures.length ? "amber" : "success",
      haptic: failures.length ? "warning" : "success",
      message: summary,
    });
    if (!failures.length) {
      setSelectedMemberIds(new Set());
      setMultiSelectMode(false);
    }
  }
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
    setVerifiedUser(null);
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
    setVerifiedUser(null);
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
    if (verifyingCode) return;
    const normalized = verifyCode.trim().toUpperCase();
    if (!normalized) {
      setVerifyMessage("Enter a code first.");
      setVerifiedUser(null);
      return;
    }
    if (!token || !activeOrgId) {
      setVerifyMessage("Sign in and select a gym before verifying.");
      setVerifiedUser(null);
      return;
    }
    setVerifyingCode(true);
    try {
      let result: ReceptionCodeVerification;
      try {
        result = await receptionApi.verifyCode<ReceptionCodeVerification>({
          token,
          orgId: activeOrgId,
          code: normalized,
        });
      } catch (error) {
        const message = getApiErrorMessage(error) || "Could not verify this code.";
        setVerifyMessage(message);
        setVerifiedUser(null);
        showToast({ tone: "danger", haptic: "error", title: "Verify failed", message });
        return;
      }
      if (!result.match) {
        const message = "No active entry or pickup code found.";
        setVerifyMessage(message);
        setVerifiedUser(null);
        showToast({ tone: "amber", haptic: "warning", message });
        return;
      }
      setVerifiedUser(
        result.match.user
          ? { name: result.match.user.name, profilePhotoUrl: result.match.user.profilePhotoUrl }
          : null,
      );
      const name = result.match.user?.name ?? result.match.user?.email ?? "member";
      if (result.match.type === "attendance") {
        if (result.match.valid) {
          const message = `Entry code verified for ${name}. Status: ${(result.match.record?.status ?? "approved").replace(/_/g, " ")}.`;
          setVerifyMessage(message);
          showToast({ tone: "success", haptic: "success", message: `Verified ${name}` });
        } else {
          const message = `Entry code found for ${name}, but it is not valid for entry.`;
          setVerifyMessage(message);
          showToast({ tone: "amber", haptic: "warning", title: "Not valid for entry", message: name });
        }
        return;
      }
      if (result.match.valid) {
        const message = `Pickup code verified for ${name}. Match the member before giving out the order.`;
        setVerifyMessage(message);
        showToast({ tone: "success", haptic: "success", message: `Pickup ready for ${name}` });
      } else {
        const status = (result.match.pickupCode?.status ?? result.match.order?.status ?? "not ready").replace(/_/g, " ");
        const message = `Pickup code found for ${name}, but status is ${status}.`;
        setVerifyMessage(message);
        showToast({ tone: "amber", haptic: "warning", title: `Pickup ${status}`, message: name });
      }
    } finally {
      setVerifyingCode(false);
    }
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
    if (attendanceReason.length < 2) {
      setAttendanceStatus("Add an attendance note before recording.");
      return;
    }
    if (!(await requirePrivilegedAuth("Record manual attendance"))) {
      showAuthenticationRequired();
      return;
    }
    try {
      await manualAttendanceMutation.mutateAsync({ memberUserId: member.id, reason: attendanceReason });
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
    <ZookScreen testID="reception-home-screen">
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
        <View style={styles.deskHeader}>
          <Pressable
            testID="reception-back"
            onPress={goBackFromDesk}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>
              {view === "desk"
                ? "Desk"
                : view === "members"
                  ? "Members"
                  : view === "payments"
                    ? "Record Payment"
                    : "Orders"}
            </Text>
            <Text style={styles.subtitle}>
              {view === "desk" ? "Receptionist Desk" : session?.user.name ?? "Reception"}
            </Text>
          </View>
          <RoleSwitcherChip />
        </View>

        <Pressable
          testID="reception-gym-selector"
          onPress={openBranchSwitcher}
          accessibilityRole="button"
          accessibilityLabel={canSwitchBranches ? "Switch branch" : "Active branch"}
          disabled={!canSwitchBranches}
          style={({ pressed }) => [
            styles.gymSelector,
            pressed && canSwitchBranches ? { opacity: 0.82 } : null,
          ]}
        >
          <Ionicons name="business-outline" size={22} color={colors.text} />
          <Text numberOfLines={1} style={styles.gymSelectorText}>
            {gymSelectorLabel}
          </Text>
          {canSwitchBranches ? (
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          ) : null}
        </Pressable>

        {view !== "desk" ? (
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
              <Text numberOfLines={2} style={styles.memberContextBody}>
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
        ) : null}

        {view === "desk" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile
                label="Today"
                value={String(todayCount)}
                detail="Check-ins"
                tone="lime"
                icon="qr-code-outline"
                style={styles.metricThird}
              />
              <MetricTile
                label="Pending"
                value={String(pendingCount)}
                detail="Awaiting approval"
                tone="amber"
                icon="flash-outline"
                style={styles.metricThird}
              />
              <MetricTile
                label="Flagged"
                value={String(flaggedCount)}
                detail="Needs attention"
                tone="red"
                icon="alert-circle-outline"
                style={styles.metricThird}
              />
            </View>

            <GlassCard variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader
                title="Verify Entry Code"
                subtitle="Enter ZK code for attendance or pickup lookup without leaving the desk."
              />
              <FormField
                testID="reception-verify-code"
                label="Code"
                value={verifyCode}
                onChangeText={handleVerifyCodeChange}
                placeholder="Enter code"
                autoCapitalize="characters"
              />
              <PrimaryButton
                testID="reception-verify-code-button"
                icon="scan-outline"
                disabled={!canVerifyCode || verifyingCode}
                onPress={verifyEntryCode}
              >
                {verifyingCode ? "Verifying..." : "Verify Code"}
              </PrimaryButton>
              {verifyMessage ? (
                <VerificationResult message={verifyMessage} user={verifiedUser} />
              ) : null}
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
              title="Needs Approval queue"
              action={<Pill tone="amber">{pendingCount} pending</Pill>}
            />
            <View testID="reception-approval-queue" style={styles.stack}>
              {queueQuery.isLoading ? (
                <ReceptionQueueSkeleton />
              ) : approvalQueue.length ? (
                approvalQueue.map((attempt, index) => (
                  <GlassCard
                    testID={
                      index === 0 ? "reception-queue-row-first" : `reception-queue-row-${attempt.id}`
                    }
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
                        testID={index === 0 ? "approve-button-first" : `approve-button-${attempt.id}`}
                        icon="checkmark-circle-outline"
                        disabled={!canApproveAttendance || approveAttendanceMutation.isPending}
                        onLongPress={!canApproveAttendance ? showOwnerApprovalRequired : undefined}
                        onPress={() => openDecisionSheet(attempt)}
                        style={styles.actionHalf}
                      >
                        Approve
                      </PrimaryButton>
                      <SecondaryButton
                        testID={index === 0 ? "deny-button-first" : `deny-button-${attempt.id}`}
                        icon="eye-outline"
                        disabled={!canApproveAttendance || rejectAttendanceMutation.isPending}
                        onLongPress={!canApproveAttendance ? showOwnerApprovalRequired : undefined}
                        onPress={() => openDecisionSheet(attempt)}
                        style={styles.actionHalf}
                      >
                        Reject / Review
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
              testID="reception-member-search"
              value={memberSearch}
              onChangeText={setMemberSearch}
              placeholder="Search member by name, email, phone, member ID"
            />
            <View style={styles.membersToolbar}>
              <Pressable
                testID="reception-member-multi-toggle"
                onPress={() => {
                  setMultiSelectMode((value) => {
                    if (value) setSelectedMemberIds(new Set());
                    return !value;
                  });
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: multiSelectMode }}
                style={[
                  styles.membersToolbarChip,
                  multiSelectMode ? styles.membersToolbarChipActive : null,
                ]}
              >
                <Ionicons
                  name={multiSelectMode ? "checkbox-outline" : "square-outline"}
                  size={16}
                  color={multiSelectMode ? colors.lime : colors.muted}
                />
                <Text
                  style={[
                    styles.membersToolbarText,
                    multiSelectMode ? styles.membersToolbarTextActive : null,
                  ]}
                >
                  {multiSelectMode
                    ? `Multi-select · ${selectedMemberIds.size}`
                    : "Select multiple"}
                </Text>
              </Pressable>
              {memberRecord && !multiSelectMode ? (
                <Pressable
                  onPress={() => setSelectedMemberId(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Clear selected member"
                  style={styles.membersToolbarChip}
                >
                  <Ionicons name="close-outline" size={16} color={colors.muted} />
                  <Text style={styles.membersToolbarText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
            {multiSelectMode && selectedMemberIds.size ? (
              <GlassCard variant="compact" padding={14} contentStyle={styles.stack}>
                <SectionHeader
                  title={`${selectedMemberIds.size} member${selectedMemberIds.size === 1 ? "" : "s"} selected`}
                  subtitle="Record attendance for everyone in one tap."
                />
                <FormField
                  testID="reception-bulk-attendance-reason"
                  label="Attendance note"
                  value={reason}
                  onChangeText={setReason}
                  required
                  error={attendanceReasonInvalid ? "Add at least 2 characters." : undefined}
                />
                <PrimaryButton
                  testID="reception-bulk-record-attendance"
                  icon="checkmark-done-outline"
                  disabled={
                    !canRecordManualAttendance ||
                    attendanceReason.length < 2 ||
                    manualAttendanceMutation.isPending
                  }
                  onLongPress={!canRecordManualAttendance ? showOwnerApprovalRequired : undefined}
                  onPress={() => void recordBulkAttendance()}
                >
                  {manualAttendanceMutation.isPending ? "Recording..." : "Record for all"}
                </PrimaryButton>
                {bulkAttendanceStatus ? (
                  <Text style={styles.statusText}>{bulkAttendanceStatus}</Text>
                ) : null}
              </GlassCard>
            ) : null}
            {!multiSelectMode && memberRecord ? (
              <GlassCard variant="compact" padding={14} contentStyle={styles.stack}>
                <SectionHeader
                  title="Desk actions"
                  subtitle={
                    member?.name
                      ? `${member.name} selected · ${ageLabel(member.dateOfBirth)}`
                      : "Search or select a member"
                  }
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
                <AuditWarning>Add a reason so the gym has a clear record.</AuditWarning>
                <FormField
                  testID="reception-attendance-reason"
                  label="Attendance note"
                  value={reason}
                  onChangeText={setReason}
                  required
                  error={attendanceReasonInvalid ? "Add at least 2 characters." : undefined}
                />
                <PrimaryButton
                  testID="reception-record-attendance"
                  icon="create-outline"
                  disabled={
                    !canRecordManualAttendance ||
                    !member?.id ||
                    attendanceReason.length < 2 ||
                    manualAttendanceMutation.isPending
                  }
                  onLongPress={!canRecordManualAttendance ? showOwnerApprovalRequired : undefined}
                  onPress={recordManualAttendance}
                >
                  {manualAttendanceMutation.isPending ? "Recording..." : "Record Attendance"}
                </PrimaryButton>
                {attendanceStatus ? (
                  <Text testID="reception-attendance-status" style={styles.statusText}>
                    {attendanceStatus}
                  </Text>
                ) : null}
              </GlassCard>
            ) : null}
            <View style={styles.stack}>
              {membersQuery.isLoading ? <TrainerClientsSkeleton /> : null}
              {!membersQuery.isLoading && !filteredMembers.length ? (
                <GlassCard variant="compact" padding={14}>
                  <EmptyState title="No members found" body="Try a different name or email." />
                </GlassCard>
              ) : null}
              {visibleMembers.map((user, index) => {
                const isSelectedSingle =
                  user.profile.userId === selectedMemberRecord?.profile.userId;
                const isMultiChecked = selectedMemberIds.has(user.profile.userId);
                const selected = multiSelectMode ? isMultiChecked : isSelectedSingle;
                const phone = user.user?.phone ?? null;
                const phoneRevealed = revealedPhones.has(user.profile.userId);
                return (
                  <GlassCard
                    testID={
                      index === 0
                        ? "reception-member-row-first"
                        : `reception-member-row-${user.profile.userId}`
                    }
                    key={user.profile.userId}
                    variant={selected ? "selected" : "compact"}
                    padding={12}
                    pressable
                    onPress={() => {
                      if (multiSelectMode) {
                        toggleMemberSelection(user.profile.userId);
                      } else {
                        setSelectedMemberId(user.profile.userId);
                      }
                    }}
                  >
                    <ListRow
                      title={user.user?.name ?? "Member"}
                      subtitle={user.user?.email ?? "No email"}
                      leading={
                        multiSelectMode ? (
                          <Ionicons
                            name={isMultiChecked ? "checkbox" : "square-outline"}
                            size={22}
                            color={isMultiChecked ? colors.lime : colors.muted}
                          />
                        ) : (
                          <IconBubble
                            icon="person-outline"
                            tone={user.activeSubscription?.status === "ACTIVE" ? "lime" : "neutral"}
                          />
                        )
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
                            ? multiSelectMode
                              ? "Picked"
                              : "Selected"
                            : (user.activeSubscription?.status ?? "No membership")}
                        </Text>
                      }
                    />
                    <View style={styles.memberPhoneRow}>
                      <Text numberOfLines={1} style={styles.memberPhoneText}>
                        {phoneRevealed ? (phone ?? "No phone") : redactPhone(phone)}
                      </Text>
                      <Text style={styles.memberPhoneText}>·</Text>
                      <Text numberOfLines={1} style={styles.memberPhoneText}>
                        {ageLabel(user.user?.dateOfBirth)}
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
              {hiddenMemberCount ? (
                <Text style={styles.resultHint}>
                  Showing {visibleMembers.length} of {filteredMembers.length} matches. Refine the search
                  to find a specific member faster.
                </Text>
              ) : null}
            </View>
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
            {!memberRecord ? (
              <GlassCard variant="compact" padding={14} contentStyle={styles.stack}>
                <SectionHeader
                  title="Find a member"
                  subtitle="Search to attach this payment to a member."
                />
                <SearchField
                  testID="reception-payment-member-search"
                  value={paymentMemberSearch}
                  onChangeText={setPaymentMemberSearch}
                  placeholder="Name, email, or phone"
                />
                {paymentMemberSearch.trim().length >= 2 ? (
                  <View style={styles.stack}>
                    {(membersQuery.data?.members ?? [])
                      .filter((record) => {
                        const term = paymentMemberSearch.toLowerCase();
                        const name = record.user?.name?.toLowerCase() ?? "";
                        const email = record.user?.email?.toLowerCase() ?? "";
                        const phone = record.user?.phone?.toLowerCase() ?? "";
                        return name.includes(term) || email.includes(term) || phone.includes(term);
                      })
                      .slice(0, 8)
                      .map((record) => (
                        <Pressable
                          key={record.profile.userId}
                          onPress={() => {
                            setSelectedMemberId(record.profile.userId);
                            setPaymentMemberSearch("");
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Select ${record.user?.name ?? "member"}`}
                          style={styles.paymentMemberRow}
                        >
                          <IconBubble icon="person-outline" tone="neutral" size={32} />
                          <View style={styles.paymentMemberCopy}>
                            <Text numberOfLines={1} style={styles.paymentMemberName}>
                              {record.user?.name ?? "Member"}
                            </Text>
                            <Text numberOfLines={1} style={styles.paymentMemberMeta}>
                              {record.user?.email ?? record.user?.phone ?? "No contact"}
                            </Text>
                          </View>
                          <Pill
                            tone={record.activeSubscription?.status === "ACTIVE" ? "lime" : "amber"}
                          >
                            {record.activeSubscription?.status ?? "No plan"}
                          </Pill>
                        </Pressable>
                      ))}
                  </View>
                ) : null}
              </GlassCard>
            ) : null}
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
                subtitle={
                  membership?.status
                    ? `${membership.status.replace(/_/g, " ")} membership selected`
                    : "No membership selected"
                }
                leading={<IconBubble icon="document-text-outline" tone="amber" size={38} />}
                trailing={<Text style={styles.rowAmount}>{formatInr(dueAmount)} due</Text>}
              />
              <View style={styles.formStack}>
                <Text style={styles.fieldGroupLabel}>Collection mode</Text>
                <View style={styles.paymentModeGrid}>
                  {paymentModes.map((mode) => {
                    const selected = mode.value === paymentMode;
                    return (
                      <Pressable
                        key={mode.value}
                        onPress={() => setPaymentMode(mode.value)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={[styles.paymentModeTile, selected ? styles.paymentModeTileActive : null]}
                      >
                        <Ionicons
                          name={
                            mode.value === "CASH"
                              ? "cash-outline"
                              : mode.value === "DIRECT_UPI"
                                ? "arrow-up-outline"
                                : mode.value === "BANK_TRANSFER"
                                  ? "business-outline"
                                  : mode.value === "CARD"
                                    ? "card-outline"
                                    : "create-outline"
                          }
                          size={22}
                          color={selected ? colors.lime : colors.muted}
                        />
                        <Text style={[styles.paymentModeText, selected ? styles.paymentModeTextActive : null]}>
                          {mode.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <FormField
                  testID="reception-payment-amount"
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
                  testID="reception-payment-reference"
                  label="Receipt or reference"
                  value={referenceId}
                  onChangeText={setReferenceId}
                  optional
                  autoCapitalize="characters"
                  placeholder="UPI ref, bank UTR, card slip"
                />
                <FormField
                  testID="reception-payment-note"
                  label="Desk note"
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                  optional
                  multiline
                  placeholder="Anything finance should see"
                />
              </View>
              <AuditWarning>
                All offline payments are recorded with audit logs. Ensure payment is received before recording.
              </AuditWarning>
              <FormField
                testID="reception-payment-staff-note"
                label="Staff note"
                value={paymentReason}
                onChangeText={setPaymentReason}
                required
              />
              <PrimaryButton
                testID="reception-record-payment"
                icon="shield-checkmark-outline"
                disabled={
                  !canRecordOfflinePayment || !canRecordPayment || recordPaymentMutation.isPending
                }
                onLongPress={!canRecordOfflinePayment ? showOwnerApprovalRequired : undefined}
                onPress={recordPayment}
              >
                Record Payment
              </PrimaryButton>
              {paymentStatus ? (
                <Text testID="reception-payment-status" style={styles.statusText}>
                  {paymentStatus}
                </Text>
              ) : null}
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
                testID="reception-pickup-code"
                label="Pickup code"
                value={verifyCode}
                onChangeText={handleVerifyCodeChange}
                autoCapitalize="characters"
                placeholder="Enter pickup code"
              />
              <PrimaryButton
                testID="reception-verify-pickup-code"
                icon="scan-outline"
                disabled={!canVerifyCode || verifyingCode}
                onPress={verifyEntryCode}
              >
                {verifyingCode ? "Verifying..." : "Verify Pickup Code"}
              </PrimaryButton>
              {verifyMessage ? (
                <VerificationResult message={verifyMessage} user={verifiedUser} />
              ) : null}
            </GlassCard>
            <SectionHeader title="Fulfillment Queue" subtitle="Paid orders ready at the desk." />
            <View style={styles.stack}>
              {readyOrders.length ? (
                readyOrders.map((order, index) => (
                  <GlassCard
                    testID={
                      index === 0 ? "reception-order-row-first" : `reception-order-row-${order.id}`
                    }
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
                      testID={index === 0 ? "fulfill-button-first" : `fulfill-button-${order.id}`}
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
            {paymentStatus ? (
              <Text testID="reception-payment-status" style={styles.statusText}>
                {paymentStatus}
              </Text>
            ) : null}
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
              testID="reception-decision-approve"
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
              testID="reception-decision-reject"
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

function VerificationResult({
  message,
  user,
}: {
  message: string;
  user?: { name?: string | null; profilePhotoUrl?: string | null } | null;
}) {
  const success =
    /verified|match/i.test(message) && !/not valid|no active|not ready/i.test(message);
  const { animatedStyle: pulseStyle, pulse } = useScalePulse();
  const { animatedStyle: shakeStyle, shake } = useShake();
  useEffect(() => {
    if (success) pulse();
    else shake();
  }, [pulse, shake, success]);
  const photo = user?.profilePhotoUrl;
  return (
    <Reanimated.View style={success ? pulseStyle : shakeStyle}>
      <GlassCard
        variant={success ? "success" : "warning"}
        padding={12}
        contentStyle={styles.verificationResult}
      >
        {photo ? (
          <Image
            source={{ uri: photo }}
            contentFit="cover"
            style={styles.verificationPhoto}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <IconBubble
            icon={success ? "checkmark-circle-outline" : "alert-circle-outline"}
            tone={success ? "lime" : "amber"}
            size={34}
          />
        )}
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
  deskHeader: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  roleChip: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 14,
  },
  roleChipText: {
    color: colors.lime,
    ...typography.bodyStrong,
  },
  gymSelector: {
    minHeight: 66,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.035)",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: 17,
  },
  gymSelectorText: {
    flex: 1,
    color: colors.text,
    ...typography.sectionTitle,
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
  paymentModeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  paymentModeTile: {
    minWidth: 76,
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.035)",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
  },
  paymentModeTileActive: {
    borderColor: colors.lime,
    backgroundColor: "rgba(185,244,85,0.12)",
  },
  paymentModeText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  paymentModeTextActive: {
    color: colors.lime,
    fontFamily: "Inter_600SemiBold",
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
  verificationPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
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
  resultHint: {
    color: colors.muted,
    ...typography.small,
  },
  membersToolbar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  membersToolbarChip: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  membersToolbarChipActive: {
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.12)",
  },
  membersToolbarText: {
    color: colors.muted,
    ...typography.caption,
  },
  membersToolbarTextActive: {
    color: colors.lime,
  },
  paymentMemberRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  paymentMemberCopy: {
    flex: 1,
    gap: 3,
  },
  paymentMemberName: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  paymentMemberMeta: {
    color: colors.muted,
    ...typography.small,
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

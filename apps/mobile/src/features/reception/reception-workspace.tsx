import { useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated from "@/lib/reanimated-lite";
import { ApprovalQueue, type ApprovalItem } from "@/components/domain/approval-queue";
import { MemberList } from "@/components/domain/member-list";
import { MetricGrid } from "@/components/domain/metric-grid";
import {
  AuditWarning,
  EmptyState,
  FormField,
  GlassCard,
  IconBubble,
  ListRow,
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
  useManualAttendance,
  useOrgAttendanceToday,
  useRejectAttendance,
} from "@/lib/domains/attendance";
import { useOrgMembers } from "@/lib/domains/owner";
import { useRecordManualPayment } from "@/lib/domains/payments";
import { useReceptionQueue } from "@/lib/domains/reception";
import { useFulfillShopOrder, useOrgActiveShopOrders } from "@/lib/domains/shop";
import type { ReceptionQueueRecord } from "@/lib/domains/shared/types";
import { getApiErrorMessage, useAuth, useHasPermission } from "@/lib/auth";
import { useRoleContext } from "@/lib/role-context";
import { useBranchSelection } from "@/lib/branch-selection";
import { apiClient, receptionApi } from "@/lib/domain-api";
import { useScalePulse, useShake } from "@/lib/motion";
import { requirePrivilegedAuth } from "@/lib/privileged-action";
import { colors, layout, spacing, typography } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { getStoredValue, setStoredValue } from "@/lib/storage";
import { paymentModes, reasonSuggestions, type DeskPaymentMode } from "./constants";
import { ageLabel, deskReasonCopy, phoneRevealStorageKey } from "./helpers";

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

type DomainMemberItem = ComponentProps<typeof MemberList>["items"][number];

type ReceptionWorkspaceValue = ReturnType<typeof useReceptionWorkspaceState>;

const ReceptionWorkspaceContext = createContext<ReceptionWorkspaceValue | null>(null);

export function useReceptionWorkspace() {
  const value = useContext(ReceptionWorkspaceContext);
  if (!value) {
    throw new Error("useReceptionWorkspace must be used inside ReceptionWorkspace");
  }
  return value;
}

function useReceptionWorkspaceState({
  initialMemberId = null,
}: {
  initialMemberId?: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const roleContext = useRoleContext();
  const { branches, selectedBranch, selectBranch } = useBranchSelection();
  const canApproveAttendance = useHasPermission("ATTENDANCE_APPROVE");
  const canRecordManualAttendance = useHasPermission("ATTENDANCE_MANUAL_OVERRIDE");
  const canRecordOfflinePayment = useHasPermission("PAYMENTS_RECORD_OFFLINE");
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
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(initialMemberId);
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
    if (initialMemberId) {
      setSelectedMemberId(initialMemberId);
    }
  }, [initialMemberId]);

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
  const receptionMemberItems = useMemo<DomainMemberItem[]>(
    () =>
      visibleMembers.map((record) => {
        const subscriptionStatus = String(record.activeSubscription?.status ?? "").toLowerCase();
        const status: DomainMemberItem["status"] =
          subscriptionStatus === "active"
            ? "active"
            : subscriptionStatus === "pending_payment"
              ? "pending"
              : "expired";
        const isMultiChecked = selectedMemberIds.has(record.profile.userId);
        const isSelectedSingle = record.profile.userId === selectedMemberId;
        return {
          id: record.profile.userId,
          name: record.user?.name ?? "Member",
          email: record.user?.email,
          phone: record.user?.phone,
          avatarUrl: record.user?.profilePhotoUrl ?? record.profile.profilePhotoUrl,
          status,
          meta: ageLabel(record.user?.dateOfBirth),
          phoneRevealed: revealedPhones.has(record.profile.userId),
          badges:
            multiSelectMode && isMultiChecked
              ? [{ label: "Picked", tone: "lime" }]
              : !multiSelectMode && isSelectedSingle
                ? [{ label: "Selected", tone: "lime" }]
                : undefined,
        };
      }),
    [multiSelectMode, revealedPhones, selectedMemberId, selectedMemberIds, visibleMembers],
  );
  const approvalItems = useMemo<ApprovalItem[]>(
    () =>
      approvalQueue.map((attempt) => {
        const flags = Array.isArray(attempt.suspiciousFlags)
          ? attempt.suspiciousFlags
          : [attempt.source ?? "scan"];
        return {
          id: attempt.id,
          primaryText: attempt.user?.name ?? attempt.user?.email ?? "Member check-in",
          secondaryText: `${attempt.branchName ?? "Main branch"} · ${attempt.plan?.name ?? "Membership"}`,
          metaText: attempt.status.replace(/_/g, " "),
          reason: deskReasonCopy(
            Array.isArray(attempt.suspiciousFlags) ? attempt.suspiciousFlags.join(", ") : null,
          ),
          context: (
            <View style={styles.auditTrail}>
              {flags.slice(-3).map((item) => (
                <Text key={item} style={styles.auditText}>
                  {item}
                </Text>
              ))}
            </View>
          ),
        };
      }),
    [approvalQueue],
  );
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

  return {
    activeRole,
    approvalItems,
    approvalQueue,
    approveAttendance,
    approveAttendanceMutation,
    attendanceReason,
    attendanceReasonInvalid,
    attendanceStatus,
    bulkAttendanceStatus,
    canApproveAttendance,
    canRecordManualAttendance,
    canRecordOfflinePayment,
    canRecordPayment,
    canSwitchBranches,
    canVerifyCode,
    closeDecisionSheet,
    decisionReason,
    decisionSheetRef,
    dueAmount,
    filteredMembers,
    flaggedCount,
    fulfillOrder,
    fulfillOrderMutation,
    fulfilledCount,
    gymSelectorLabel,
    handleVerifyCodeChange,
    hiddenMemberCount,
    member,
    memberRecord,
    memberSearch,
    membersQuery,
    membership,
    multiSelectMode,
    onRefresh,
    openBranchSwitcher,
    openDecisionSheet,
    paymentMemberSearch,
    paymentMode,
    paymentNote,
    paymentReason,
    paymentStatus,
    pendingCount,
    profile,
    queueQuery,
    readyOrders,
    reason,
    recentScans,
    recordBulkAttendance,
    recordManualAttendance,
    recordPayment,
    recordPaymentMutation,
    refreshControlTint: colors.lime,
    refreshing,
    rejectAttendance,
    rejectAttendanceMutation,
    revealMemberPhone,
    router,
    selectedMemberIds,
    selectedMemberRecord,
    selectedDecisionAttempt,
    setAmount,
    setMemberSearch,
    setMultiSelectMode,
    setPaymentMemberSearch,
    setPaymentMode,
    setPaymentNote,
    setPaymentReason,
    setReason,
    setReferenceId,
    setDecisionReason,
    setSelectedMemberId,
    setSelectedMemberIds,
    setSelectedDecisionAttempt,
    showOwnerApprovalRequired,
    todayAttendanceQuery,
    todayCount,
    toggleMemberSelection,
    verifyCode,
    verifiedUser,
    verifyingCode,
    verifyEntryCode,
    verifyMessage,
    visibleMembers,
    manualAttendanceMutation,
    renderDecisionBackdrop,
    receptionMemberItems,
    amount,
    amountInvalid,
    referenceId,
    paymentModes,
  };
}

export function ReceptionWorkspace({
  children,
  initialMemberId = null,
  showMemberContext = false,
  subtitle,
  title,
  testID = "reception-home-screen",
}: {
  children: ReactNode;
  initialMemberId?: string | null;
  showMemberContext?: boolean;
  subtitle: string;
  title: string;
  testID?: string;
}) {
  const state = useReceptionWorkspaceState({ initialMemberId });

  return (
    <ReceptionWorkspaceContext.Provider value={state}>
      <ZookScreen testID={testID}>
      <KeyboardAwareScreen
        scrollViewProps={{
          contentInsetAdjustmentBehavior: "never",
          showsVerticalScrollIndicator: false,
          contentContainerStyle: styles.content,
          refreshControl: (
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={state.onRefresh}
              tintColor={state.refreshControlTint}
              colors={[state.refreshControlTint]}
            />
          ),
        }}
      >
        <View style={styles.deskHeader}>
          <Pressable
            testID="reception-back"
            onPress={state.activeRole === "OWNER" || state.activeRole === "ADMIN"
              ? () => state.router.replace("/owner")
              : () => {
                  if (state.router.canGoBack()) {
                    state.router.back();
                  } else {
                    state.router.replace("/");
                  }
                }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <RoleSwitcherChip />
        </View>

        <Pressable
          testID="reception-gym-selector"
          onPress={state.openBranchSwitcher}
          accessibilityRole="button"
          accessibilityLabel={state.canSwitchBranches ? "Switch branch" : "Active branch"}
          disabled={!state.canSwitchBranches}
          style={({ pressed }) => [
            styles.gymSelector,
            pressed && state.canSwitchBranches ? { opacity: 0.82 } : null,
          ]}
        >
          <Ionicons name="business-outline" size={22} color={colors.text} />
          <Text numberOfLines={1} style={styles.gymSelectorText}>
            {state.gymSelectorLabel}
          </Text>
          {state.canSwitchBranches ? (
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          ) : null}
        </Pressable>

        {showMemberContext ? (
          <GlassCard variant="compact" padding={12} contentStyle={styles.memberContext}>
            <IconBubble
              icon={state.member ? "person-outline" : "person-add-outline"}
              tone={state.member ? "lime" : "amber"}
              size={34}
            />
            <View style={styles.memberContextCopy}>
              <Text numberOfLines={1} style={styles.memberContextTitle}>
                {state.member?.name ?? "No member selected"}
              </Text>
              <Text numberOfLines={2} style={styles.memberContextBody}>
                {state.member?.email ?? "Search members before recording payments or attendance"}
                {state.membership?.status ? ` · ${state.membership.status.replace(/_/g, " ")}` : ""}
              </Text>
            </View>
            {state.member ? (
              <Pressable
                onPress={() => state.setSelectedMemberId(null)}
                accessibilityRole="button"
                accessibilityLabel="Clear selected member"
                style={styles.clearMemberButton}
              >
                <Text style={styles.clearMemberText}>Clear</Text>
              </Pressable>
            ) : null}
          </GlassCard>
        ) : null}
        {children}
      </KeyboardAwareScreen>
      <ApprovalDecisionSheet />
    </ZookScreen>
    </ReceptionWorkspaceContext.Provider>
  );
}

export function ReceptionDeskBody() {
  const {
    approvalItems,
    approvalQueue,
    approveAttendanceMutation,
    canApproveAttendance,
    canVerifyCode,
    flaggedCount,
    handleVerifyCodeChange,
    openDecisionSheet,
    pendingCount,
    queueQuery,
    recentScans,
    rejectAttendanceMutation,
    selectedDecisionAttempt,
    showOwnerApprovalRequired,
    todayAttendanceQuery,
    todayCount,
    verifiedUser,
    verifyingCode,
    verifyCode,
    verifyEntryCode,
    verifyMessage,
  } = useReceptionWorkspace();

  return (
    <>
            <MetricGrid
              columns={3}
              items={[
                {
                  label: "Today",
                  value: todayCount,
                  hint: "Check-ins",
                  tone: "lime",
                  icon: "qr-code-outline",
                },
                {
                  label: "Pending",
                  value: pendingCount,
                  hint: "Awaiting approval",
                  tone: "amber",
                  icon: "flash-outline",
                },
                {
                  label: "Flagged",
                  value: flaggedCount,
                  hint: "Needs attention",
                  tone: "red",
                  icon: "alert-circle-outline",
                },
              ]}
            />

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
            <ApprovalQueue
              testID="reception-approval-queue"
              items={approvalItems}
              isLoading={queueQuery.isLoading}
              isError={queueQuery.isError}
              onRetry={() => void queueQuery.refetch()}
              approvingId={approveAttendanceMutation.isPending ? selectedDecisionAttempt?.id : undefined}
              rejectingId={rejectAttendanceMutation.isPending ? selectedDecisionAttempt?.id : undefined}
              emptyState={{
                title: "Gate queue clear",
                subtitle: "No pending or flagged scans need the desk.",
              }}
              onApprove={(attemptId) => {
                const attempt = approvalQueue.find((item) => item.id === attemptId);
                if (!attempt) return;
                if (!canApproveAttendance) {
                  showOwnerApprovalRequired();
                  return;
                }
                openDecisionSheet(attempt);
              }}
              onReject={(attemptId) => {
                const attempt = approvalQueue.find((item) => item.id === attemptId);
                if (!attempt) return;
                if (!canApproveAttendance) {
                  showOwnerApprovalRequired();
                  return;
                }
                openDecisionSheet(attempt);
              }}
            />
    </>
  );
}

export function ReceptionMembersBody() {
  const {
    attendanceReason,
    attendanceReasonInvalid,
    attendanceStatus,
    bulkAttendanceStatus,
    canRecordManualAttendance,
    filteredMembers,
    hiddenMemberCount,
    manualAttendanceMutation,
    member,
    memberRecord,
    memberSearch,
    membersQuery,
    membership,
    multiSelectMode,
    profile,
    reason,
    receptionMemberItems,
    recordBulkAttendance,
    recordManualAttendance,
    revealMemberPhone,
    router,
    selectedMemberIds,
    setMemberSearch,
    setMultiSelectMode,
    setReason,
    setSelectedMemberId,
    setSelectedMemberIds,
    showOwnerApprovalRequired,
    toggleMemberSelection,
    visibleMembers,
  } = useReceptionWorkspace();

  return (
    <>
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
              <MemberList
                testID="reception-member-list"
                items={receptionMemberItems}
                isLoading={membersQuery.isLoading}
                isError={membersQuery.isError}
                onRetry={() => void membersQuery.refetch()}
                searchValue={memberSearch}
                onSearchChange={setMemberSearch}
                emptyState={{ title: "No members found", subtitle: "Try a different name or email." }}
                onPressMember={(user) => {
                  if (multiSelectMode) {
                    toggleMemberSelection(user.id);
                  } else {
                    setSelectedMemberId(user.id);
                    router.push(`/reception/members/${user.id}`);
                  }
                }}
                onRevealPhone={(user) => revealMemberPhone(user.id)}
              />
              {hiddenMemberCount ? (
                <Text style={styles.resultHint}>
                  Showing {visibleMembers.length} of {filteredMembers.length} matches. Refine the search
                  to find a specific member faster.
                </Text>
              ) : null}
            </View>
    </>
  );
}

export function ReceptionPaymentsBody() {
  const {
    amount,
    amountInvalid,
    canRecordOfflinePayment,
    canRecordPayment,
    dueAmount,
    member,
    memberRecord,
    membersQuery,
    membership,
    paymentMemberSearch,
    paymentMode,
    paymentNote,
    paymentReason,
    paymentStatus,
    recordPayment,
    recordPaymentMutation,
    referenceId,
    setAmount,
    setPaymentMemberSearch,
    setPaymentMode,
    setPaymentNote,
    setPaymentReason,
    setReferenceId,
    setSelectedMemberId,
    showOwnerApprovalRequired,
  } = useReceptionWorkspace();

  return (
    <>
            <MetricGrid
              items={[
                {
                  label: "Amount",
                  value: formatInr(dueAmount),
                  hint: "Manual entry",
                  tone: "amber",
                  icon: "receipt-outline",
                },
                {
                  label: "Mode",
                  value: paymentModes.find((mode) => mode.value === paymentMode)?.label ?? "Manual",
                  hint: "Offline record",
                  tone: "blue",
                  icon: "reader-outline",
                },
              ]}
            />
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
                          style={styles.paymentPersonRow}
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
  );
}

export function ReceptionOrdersBody() {
  const {
    canVerifyCode,
    fulfillOrder,
    fulfillOrderMutation,
    fulfilledCount,
    handleVerifyCodeChange,
    paymentStatus,
    readyOrders,
    verifiedUser,
    verifyingCode,
    verifyCode,
    verifyEntryCode,
    verifyMessage,
  } = useReceptionWorkspace();

  return (
    <>
            <MetricGrid
              items={[
                {
                  label: "Ready",
                  value: readyOrders.length,
                  hint: "Pickup queue",
                  tone: "lime",
                  icon: "bag-check-outline",
                },
                {
                  label: "Done",
                  value: fulfilledCount,
                  hint: "Fulfilled",
                  tone: "blue",
                  icon: "checkmark-done-outline",
                },
              ]}
            />
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
  );
}

function ApprovalDecisionSheet() {
  const {
    approveAttendance,
    approveAttendanceMutation,
    closeDecisionSheet,
    decisionReason,
    decisionSheetRef,
    rejectAttendance,
    rejectAttendanceMutation,
    renderDecisionBackdrop,
    selectedDecisionAttempt,
    setDecisionReason,
    setSelectedDecisionAttempt,
  } = useReceptionWorkspace();

  return (
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
  paymentPersonRow: {
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

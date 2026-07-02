import { useRouter } from "expo-router";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
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
import {
  Keyboard,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSharedValue } from "@/lib/reanimated-lite";
import { membershipStatusLabel } from "@/components/membership/helpers";
import { type ApprovalItem } from "@/components/domain/approval-queue";
import { MemberList } from "@/components/domain/member-list";
import {
  BranchSelectorChip,
  Card,
  AnimatedAppear,
  HeaderActions,
  IconBubble,
  ScreenHeader,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import {
  formatAgeLabel,
  formatReviewReason,
  titleCaseFromCode,
} from "@/lib/formatting";
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
import { type TranslationKey, useT } from "@/lib/i18n";
import { useRoleContext } from "@/lib/role-context";
import { useBranchSelection } from "@/lib/branch-selection";
import { apiClient, receptionApi } from "@/lib/domain-api";
import { requirePrivilegedAuth } from "@/lib/privileged-action";
import { useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { getStoredValue, phoneRevealStorageKey, setStoredValue } from "@/lib/storage";
import { paymentModes, type DeskPaymentMode } from "./constants";
import {
  buildVerificationPresentation,
  bulkAttendanceSummary,
  filterReceptionMembers,
  manualAttendanceFailureMessage,
  paymentFailureMessage,
  receptionMemberResultLimit,
  recordedPaymentMessage,
  resolveDeskPaymentState,
  selectReceptionMemberRecord,
  sortReceptionApprovalQueue,
} from "./desk-logic";
import { ApprovalDecisionSheet, VerificationResultModal } from "./reception-overlays";
import { receptionWorkspaceStyles as styles } from "./styles";

export { receptionWorkspaceStyles } from "./styles";

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

type VerificationResultState = {
  detail?: string;
  message: string;
  name?: string | null;
  photoUrl?: string | null;
  tone: "success" | "danger";
  type?: "attendance" | "pickup";
};

type DomainMemberItem = ComponentProps<typeof MemberList>["items"][number];

type ReceptionWorkspaceValue = ReturnType<typeof useReceptionWorkspaceState>;

const ReceptionWorkspaceContext = createContext<ReceptionWorkspaceValue | null>(null);
let lastReceptionMemberId: string | null = null;

const attendanceStatusLabelKeys: Record<string, TranslationKey> = {
  APPROVED: "reception.desk.statusApproved",
  FAILED: "reception.desk.statusFailed",
  FLAGGED: "reception.desk.flagged",
  PENDING_APPROVAL: "reception.desk.statusPendingApproval",
  RECORDED: "reception.desk.statusRecorded",
  REJECTED: "reception.desk.statusRejected",
};

const pickupStatusLabelKeys: Record<string, TranslationKey> = {
  CANCELLED: "reception.orders.statusCancelled",
  FAILED: "reception.orders.statusFailed",
  FULFILLED: "reception.orders.statusFulfilled",
  PAID: "reception.orders.statusPaid",
  PENDING_PAYMENT: "reception.orders.statusPendingPayment",
  READY_FOR_PICKUP: "shop.readyForPickup",
  REFUNDED: "reception.orders.statusRefunded",
};

const deskPaymentModeLabelKeys: Partial<Record<DeskPaymentMode, TranslationKey>> = {
  BANK_TRANSFER: "reception.payments.modeBank",
  CARD: "reception.payments.modeCard",
  CASH: "reception.payments.modeCash",
  DIRECT_UPI: "reception.payments.modeUpi",
  OTHER: "reception.payments.modeManual",
};

function attendanceStatusLabel(status: string | null | undefined, t: ReturnType<typeof useT>) {
  const normalized = (status ?? "RECORDED").toUpperCase();
  const labelKey = attendanceStatusLabelKeys[normalized];
  return labelKey ? t(labelKey) : titleCaseFromCode(status ?? "RECORDED");
}

function pickupStatusLabel(status: string | null | undefined, t: ReturnType<typeof useT>) {
  const normalized = (status ?? "READY_FOR_PICKUP").toUpperCase();
  const labelKey = pickupStatusLabelKeys[normalized];
  return labelKey ? t(labelKey) : titleCaseFromCode(status ?? "READY_FOR_PICKUP");
}

function deskPaymentModeLabel(mode: string | null | undefined, t: ReturnType<typeof useT>) {
  const normalized = (mode ?? "OTHER").toUpperCase() as DeskPaymentMode;
  const labelKey = deskPaymentModeLabelKeys[normalized];
  return labelKey ? t(labelKey) : titleCaseFromCode(mode ?? "OTHER");
}

export function useReceptionWorkspace() {
  const value = useContext(ReceptionWorkspaceContext);
  if (!value) {
    throw new Error("useReceptionWorkspace must be used inside ReceptionWorkspace");
  }
  return value;
}

function useReceptionWorkspaceState({
  initialMemberId = null,
  initialRecordId = null,
}: {
  initialMemberId?: string | null;
  initialRecordId?: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { palette } = useTheme();
  const t = useT();
  const roleContext = useRoleContext();
  const { selectedBranch } = useBranchSelection();
  const canApproveAttendance = useHasPermission("ATTENDANCE_APPROVE");
  const canRecordManualAttendance = useHasPermission("ATTENDANCE_MANUAL_OVERRIDE");
  const canRecordOfflinePayment = useHasPermission("PAYMENTS_RECORD_OFFLINE");
  const [reason, setReason] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [selectedDecisionAttempt, setSelectedDecisionAttempt] =
    useState<ReceptionQueueRecord | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verificationResult, setVerificationResult] = useState<VerificationResultState | null>(
    null,
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState("");
  const [paymentMode, setPaymentMode] = useState<DeskPaymentMode>("DIRECT_UPI");
  const [amount, setAmount] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentReason, setPaymentReason] = useState(t("reception.payments.desk"));
  const [paymentStatus, setPaymentStatus] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    initialMemberId ?? lastReceptionMemberId,
  );
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
  const lastAutoSubmittedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedMemberId) {
      lastReceptionMemberId = selectedMemberId;
    }
  }, [selectedMemberId]);
  const approvalQueue = useMemo(
    () => sortReceptionApprovalQueue(queueQuery.data?.records ?? []),
    [queueQuery.data?.records],
  );
  const pendingCount = approvalQueue.filter(
    (attempt) => attempt.status === "PENDING_APPROVAL",
  ).length;
  const flaggedCount = approvalQueue.filter((attempt) => attempt.status === "FLAGGED").length;
  const todayRecords = todayAttendanceQuery.data?.records ?? [];
  const todayCount = todayRecords.length;
  const recentScans = todayRecords.slice(0, 5);
  const readyOrders = ordersQuery.data?.orders ?? [];
  const fulfilledCount = ordersQuery.data?.summary?.fulfilledToday ?? 0;
  const attendanceReason = reason.trim();
  const attendanceReasonInvalid = attendanceReason.length > 0 && attendanceReason.length < 2;

  useEffect(() => {
    if (initialMemberId) {
      setSelectedMemberId(initialMemberId);
    }
  }, [initialMemberId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMemberSearch(memberSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  const filteredMembers = useMemo(() => {
    return filterReceptionMembers(membersQuery.data?.members ?? [], debouncedMemberSearch);
  }, [debouncedMemberSearch, membersQuery.data?.members]);
  const memberResultLimit = receptionMemberResultLimit(memberSearch);
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
          name: record.user?.name ?? t("reception.workspace.memberFallback"),
          email: record.user?.email,
          phone: record.user?.phone,
          avatarUrl: record.user?.profilePhotoUrl ?? record.profile.profilePhotoUrl,
          status,
          meta: formatAgeLabel(record.user?.dateOfBirth),
          phoneRevealed: revealedPhones.has(record.profile.userId),
          badges:
            multiSelectMode && isMultiChecked
              ? [{ label: t("reception.workspace.pickedBadge"), tone: "neutral" }]
              : !multiSelectMode && isSelectedSingle
                ? [{ label: t("reception.workspace.selectedBadge"), tone: "neutral" }]
                : undefined,
        };
      }),
    [multiSelectMode, revealedPhones, selectedMemberId, selectedMemberIds, t, visibleMembers],
  );
  const approvalItems = useMemo<ApprovalItem[]>(
    () =>
      approvalQueue
        .filter((attempt) => {
          const status = String(attempt.status ?? "").toUpperCase();
          return status === "PENDING_APPROVAL" || status === "FLAGGED";
        })
        .map((attempt) => {
        const flags = Array.isArray(attempt.suspiciousFlags)
          ? attempt.suspiciousFlags
          : [attempt.source ?? "scan"];
        return {
          id: attempt.id,
          primaryText:
            attempt.user?.name ?? attempt.user?.email ?? t("reception.workspace.memberCheckInFallback"),
          secondaryText: `${attempt.branchName ?? t("reception.workspace.mainBranchFallback")} · ${
            attempt.plan?.name ?? t("reception.workspace.membershipFallback")
          }`,
          metaText: titleCaseFromCode(attempt.status),
          reason: formatReviewReason(
            Array.isArray(attempt.suspiciousFlags) ? attempt.suspiciousFlags.join(", ") : null,
            t("reception.workspace.deskApprovalRequired"),
          ),
          context: (
            <View style={styles.auditTrail}>
              {flags.slice(-3).map((item) => (
                <Text key={item} style={[styles.auditText, { color: palette.text.secondary }]}>
                  {item}
                </Text>
              ))}
            </View>
          ),
        };
      }),
    [approvalQueue, palette.text.secondary, t],
  );
  const selectedMemberRecord = selectReceptionMemberRecord(
    membersQuery.data?.members ?? [],
    selectedMemberId,
  );
  useEffect(() => {
    if (!initialMemberId || selectedMemberRecord || !(membersQuery.data?.members.length)) {
      return;
    }
    const fallbackMemberId = membersQuery.data.members[0]?.profile.userId ?? null;
    if (fallbackMemberId) {
      setSelectedMemberId(fallbackMemberId);
    }
  }, [initialMemberId, membersQuery.data?.members, selectedMemberRecord]);
  const memberRecord = selectReceptionMemberRecord(
    membersQuery.data?.members ?? [],
    selectedMemberId,
    initialMemberId,
  );
  const member = memberRecord?.user ?? null;
  const membership = memberRecord?.activeSubscription ?? null;
  const profile = memberRecord?.profile ?? null;
  const activeRole = roleContext?.role;
  const isDemo = Boolean(roleContext?.isDemo);
  const paymentState = resolveDeskPaymentState({
    amount,
    memberId: member?.id,
    membershipId: membership?.id,
    paymentReason,
  });
  const { amountInvalid, amountPaise, canRecordPayment, dueAmount } = paymentState;

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
      setBulkAttendanceStatus(t("reception.workspace.addAttendanceNote"));
      return;
    }
    if (!(await requirePrivilegedAuth(t("reception.workspace.recordManualAttendanceAuth")))) {
      showAuthenticationRequired();
      return;
    }
    setBulkAttendanceStatus(t("reception.workspace.recording"));
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
        failures.push(getApiErrorMessage(error) || t("reception.workspace.couldNotRecordOne"));
      }
    }
    const summary = bulkAttendanceSummary(
      { failures: failures.length, successes, total: ids.length },
      t,
    );
    setBulkAttendanceStatus(summary.message);
    showToast(summary);
    if (!failures.length) {
      setSelectedMemberIds(new Set());
      setMultiSelectMode(false);
    }
  }
  const canVerifyCode = Boolean(verifyCode.trim() && token && activeOrgId);
  const showOwnerApprovalRequired = () => {
    showToast({ title: t("reception.workspace.ownerApprovalRequired"), tone: "amber" });
  };
  const showAuthenticationRequired = () => {
    showToast({ title: t("reception.workspace.authenticationRequiredAction") });
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

  const openDecisionSheet = useCallback((attempt: ReceptionQueueRecord) => {
    setSelectedDecisionAttempt(attempt);
    setDecisionReason(
      attempt.rejectionReason ??
        formatReviewReason(
          Array.isArray(attempt.suspiciousFlags) ? attempt.suspiciousFlags.join(", ") : null,
          t("reception.workspace.deskApprovalRequired"),
        ),
    );
  }, [t]);

  useEffect(() => {
    if (!initialRecordId) {
      return;
    }
    const attempt =
      approvalQueue.find((item) => item.id === initialRecordId) ?? approvalQueue[0] ?? null;
    if (!attempt || selectedDecisionAttempt?.id === attempt.id) {
      return;
    }
    openDecisionSheet(attempt);
  }, [approvalQueue, initialRecordId, openDecisionSheet, selectedDecisionAttempt?.id]);

  function closeDecisionSheet() {
    decisionSheetRef.current?.dismiss();
    setSelectedDecisionAttempt(null);
    setDecisionReason("");
  }

  function revealMemberPhone(memberId: string) {
    setRevealedPhones((current) => {
      const next = new Set(current);
      next.add(memberId);
      void setStoredValue(phoneRevealStorageKey("reception", activeOrgId), JSON.stringify(Array.from(next)));
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
    void getStoredValue(phoneRevealStorageKey("reception", activeOrgId)).then((stored) => {
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

  const presentVerificationResult = useCallback((result: VerificationResultState) => {
    setVerificationResult(result);
    void Haptics.notificationAsync(
      result.tone === "success"
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
  }, []);

  const dismissVerificationResult = useCallback(() => {
    setVerificationResult(null);
  }, []);

  function handleVerifyCodeChange(value: string) {
    const normalized = value.toUpperCase();
    setVerifyCode(normalized);
    setVerificationResult(null);
    const compact = normalized.trim();
    const isCompletePickupCode = /^[A-Z]{2}-PICK-\d{3}$/.test(compact);
    if (isCompletePickupCode && compact !== lastAutoSubmittedCodeRef.current) {
      lastAutoSubmittedCodeRef.current = compact;
      setTimeout(() => {
        void verifyEntryCode(compact);
      }, 0);
    }
  }

  async function approveAttendance(attemptId: string, approvalReason: string) {
    try {
      await approveAttendanceMutation.mutateAsync({
        recordId: attemptId,
        reason: approvalReason || t("reception.workspace.approvedScanReason"),
      });
      const message = t("reception.workspace.checkInApproved");
      setAttendanceStatus(message);
      showToast({ tone: "success", haptic: "success", message });
      closeDecisionSheet();
    } catch (error) {
      const message = getApiErrorMessage(error) || t("reception.workspace.approveFailed");
      setAttendanceStatus(message);
      showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
    }
  }

  async function rejectAttendance(attemptId: string, rejectionReason: string) {
    try {
      await rejectAttendanceMutation.mutateAsync({
        recordId: attemptId,
        reason: rejectionReason || t("reception.workspace.rejectedScanReason"),
      });
      const message = t("reception.workspace.checkInRejected");
      setAttendanceStatus(message);
      showToast({ tone: "success", haptic: "success", message });
      closeDecisionSheet();
    } catch (error) {
      const message = getApiErrorMessage(error) || t("reception.workspace.rejectFailed");
      setAttendanceStatus(message);
      showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
    }
  }

  async function verifyEntryCode(codeOverride?: string) {
    if (verifyingCode) return;
    const normalized = (codeOverride ?? verifyCode).trim().toUpperCase();
    if (!normalized) {
      const message = t("reception.workspace.enterCodeFirst");
      presentVerificationResult({ tone: "danger", message });
      return;
    }
    if (!token || !activeOrgId) {
      const message = t("reception.workspace.signInSelectGymVerify");
      presentVerificationResult({ tone: "danger", message });
      return;
    }
    setVerifyCode(normalized);
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
        const message = getApiErrorMessage(error) || t("reception.workspace.verifyCodeFailed");
        presentVerificationResult({ tone: "danger", message });
        showToast({
          tone: "danger",
          haptic: "error",
          title: t("reception.workspace.verifyFailedTitle"),
          message,
        });
        return;
      }
      if (!result.match) {
        const message = t("reception.workspace.noActiveCode");
        presentVerificationResult({ tone: "danger", message });
        showToast({ tone: "amber", haptic: "warning", message });
        return;
      }
      const presentation = buildVerificationPresentation(result.match, {
        attendanceStatusLabel: (status) => attendanceStatusLabel(status, t),
        memberFallback: t("reception.workspace.memberFallback"),
        pickupStatusLabel: (status) => pickupStatusLabel(status, t),
        t,
      });
      presentVerificationResult(presentation.result);
      showToast(presentation.toast);
    } finally {
      setVerifyingCode(false);
    }
  }

  async function recordPayment() {
    if (!member?.id || !membership?.id) return;
    Keyboard.dismiss();
    setPaymentStatus("");
    if (!(await requirePrivilegedAuth(t("reception.workspace.recordManualPaymentAuth")))) {
      showAuthenticationRequired();
      return;
    }
    try {
      if (amountPaise === null || amountPaise <= 0) {
        setPaymentStatus(t("reception.workspace.invalidAmount"));
        return;
      }
      const payment = await recordPaymentMutation.mutateAsync({
        memberUserId: member.id,
        subscriptionId: membership.id,
        amountPaise,
        mode: paymentMode,
        ...(referenceId ? { receiptNumber: referenceId } : {}),
        notes: [paymentReason, paymentNote].filter(Boolean).join(" · "),
      });
      const message = recordedPaymentMessage(payment.payment, {
        modeLabel: (mode) => deskPaymentModeLabel(mode, t),
        t,
      });
      setPaymentStatus(message);
      showToast({ tone: "success", haptic: "success", message });
    } catch (error) {
      const message = getApiErrorMessage(error);
      const statusMessage = paymentFailureMessage(
        message,
        t("reception.workspace.membershipAlreadyActive"),
      );
      setPaymentStatus(statusMessage);
      showToast({ title: t("common.actionFailed"), message: statusMessage, tone: "danger", haptic: "error" });
    }
  }

  async function fulfillOrder(orderId: string) {
    Keyboard.dismiss();
    if (!(await requirePrivilegedAuth(t("reception.workspace.fulfillPickupAuth")))) {
      showAuthenticationRequired();
      return;
    }
    try {
      await fulfillOrderMutation.mutateAsync({
        orderId,
        skipCode: true,
        skipReason: t("reception.workspace.fulfillPickupReason"),
      });
      const message = t("reception.workspace.pickupFulfilled");
      setPaymentStatus(message);
      showToast({ tone: "success", haptic: "success", message });
    } catch (error) {
      const message = getApiErrorMessage(error) || t("reception.workspace.fulfillFailed");
      setPaymentStatus(message);
      showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
    }
  }

  async function recordManualAttendance() {
    if (!member?.id) {
      return;
    }
    setAttendanceStatus("");
    if (attendanceReason.length < 2) {
      setAttendanceStatus(t("reception.workspace.addAttendanceNote"));
      return;
    }
    if (!(await requirePrivilegedAuth(t("reception.workspace.recordManualAttendanceAuth")))) {
      showAuthenticationRequired();
      return;
    }
    try {
      await manualAttendanceMutation.mutateAsync({ memberUserId: member.id, reason: attendanceReason });
      const message = t("reception.workspace.manualAttendanceRecorded");
      setAttendanceStatus(message);
      showToast({ tone: "success", haptic: "success", message });
    } catch (error) {
      const message = getApiErrorMessage(error);
      const statusMessage = manualAttendanceFailureMessage(
        message,
        t("reception.workspace.alreadyCheckedInToday"),
      );
      setAttendanceStatus(statusMessage);
      showToast({ title: t("common.actionFailed"), message: statusMessage, tone: "danger", haptic: "error" });
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
    handleVerifyCodeChange,
    hiddenMemberCount,
    isDemo,
    member,
    memberRecord,
    memberSearch,
    membersQuery,
    membership,
    multiSelectMode,
    onRefresh,
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
    refreshing,
    rejectAttendance,
    selectedBranchName: selectedBranch?.name ?? null,
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
    verificationResult,
    verifyingCode,
    verifyEntryCode,
    visibleMembers,
    manualAttendanceMutation,
    renderDecisionBackdrop,
    receptionMemberItems,
    amount,
    amountInvalid,
    referenceId,
    paymentModes,
    dismissVerificationResult,
  };
}

export function ReceptionWorkspace({
  children,
  initialMemberId = null,
  initialRecordId = null,
  noScroll = false,
  showMemberContext = false,
  subtitle,
  title,
  testID = "reception-home-screen",
  isDetailView = false,
}: {
  children: ReactNode;
  initialMemberId?: string | null;
  initialRecordId?: string | null;
  noScroll?: boolean;
  showMemberContext?: boolean;
  subtitle?: string;
  title: string;
  testID?: string;
  /** Pushed detail screens (member/[id], verification) show a back button. */
  isDetailView?: boolean;
}) {
  const state = useReceptionWorkspaceState({ initialMemberId, initialRecordId });
  const { mode, palette } = useTheme();
  const t = useT();
  const scrollY = useSharedValue(0);
  const isDark = mode === "dark";
  const isHomeScreen =
    testID === "reception-home-screen" &&
    !isDetailView &&
    !showMemberContext &&
    !initialMemberId &&
    !initialRecordId;
  const headerControlStyle = {
    borderColor: palette.border.default,
    backgroundColor: isDark ? palette.surface.default : palette.surface.raised,
  };
  return (
    <ReceptionWorkspaceContext.Provider value={state}>
      <ZookScreen testID={testID}>
        <KeyboardAwareScreen
          noScroll={noScroll}
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
            onScroll: (event) => {
              scrollY.value = event.nativeEvent.contentOffset.y;
            },
            scrollEventThrottle: 16,
            refreshControl: (
              <RefreshControl
                refreshing={state.refreshing}
                onRefresh={state.onRefresh}
                tintColor={palette.accent.base}
                colors={[palette.accent.base]}
              />
            ),
          }}
        >
          <View style={noScroll ? styles.contentNoScroll : undefined}>
            <ScreenHeader
              title={isHomeScreen ? t("reception.desk.today") : title}
              subtitle={isHomeScreen ? undefined : subtitle}
              contextSlot={
                <View style={styles.headerContextCluster}>
                  <RoleSwitcherContextPill />
                  <BranchSelectorChip style={styles.headerBranchSelector} />
                </View>
              }
              scrollY={scrollY}
              trailing={
                isDetailView ? (
                  <Pressable
                    testID="reception-back"
                    onPress={() => (state.router.canGoBack() ? state.router.back() : state.router.replace("/reception"))}
                    accessibilityRole="button"
                    accessibilityLabel={t("reception.workspace.goBack")}
                    hitSlop={12}
                    style={[styles.backButton, headerControlStyle]}
                  >
                    <Ionicons name="chevron-back" size={22} color={palette.text.primary} />
                  </Pressable>
                ) : state.activeRole === "OWNER" || state.activeRole === "ADMIN" ? (
                  <Pressable
                    testID="reception-back"
                    onPress={() => state.router.replace("/owner")}
                    accessibilityRole="button"
                    accessibilityLabel={t("reception.workspace.backToOwnerTools")}
                    hitSlop={12}
                    style={[styles.backButton, headerControlStyle]}
                  >
                    <Ionicons name="chevron-back" size={22} color={palette.text.primary} />
                  </Pressable>
                ) : (
                  <HeaderActions />
                )
              }
            />

            {showMemberContext ? (
              <Card variant="compact" padding={12} contentStyle={styles.memberContext}>
                <IconBubble
                  icon={state.member ? "person-outline" : "person-add-outline"}
                  tone={state.member ? "lime" : "amber"}
                  size={34}
                />
                <View style={styles.memberContextCopy}>
                  <Text style={[styles.memberContextTitle, { color: palette.text.primary }]}>
                    {state.member?.name ?? t("reception.payments.selectMemberFirst")}
                  </Text>
                  <Text style={[styles.memberContextBody, { color: palette.text.secondary }]}>
                    {state.member?.email ?? t("reception.members.searchOrSelect")}
                    {state.membership?.status ? ` · ${membershipStatusLabel(state.membership.status, t)}` : ""}
                  </Text>
                </View>
                {state.member ? (
                  <Pressable
                    onPress={() => state.setSelectedMemberId(null)}
                    accessibilityRole="button"
                    accessibilityLabel={t("reception.members.clearSelectedMember")}
                    style={[styles.clearMemberButton, { borderColor: palette.border.default }]}
                  >
                    <Text style={[styles.clearMemberText, { color: palette.text.tertiary }]}>
                      {t("reception.members.clear")}
                    </Text>
                  </Pressable>
                ) : null}
              </Card>
            ) : null}
            <AnimatedAppear delay={0} style={noScroll ? styles.animatedContentNoScroll : undefined}>
              {children}
            </AnimatedAppear>
          </View>
        </KeyboardAwareScreen>
        <VerificationResultModal />
        <ApprovalDecisionSheet />
      </ZookScreen>
    </ReceptionWorkspaceContext.Provider>
  );
}

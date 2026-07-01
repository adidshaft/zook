import { useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
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
  AccessibilityInfo,
  InteractionManager,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Reanimated, { useSharedValue } from "@/lib/reanimated-lite";
import { membershipStatusLabel } from "@/components/membership/helpers";
import { type ApprovalItem } from "@/components/domain/approval-queue";
import { MemberList } from "@/components/domain/member-list";
import {
  BranchSelectorChip,
  FormField,
  Card,
  AnimatedAppear,
  HeaderActions,
  IconBubble,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import {
  formatAgeLabel,
  formatInr,
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
import { useShake } from "@/lib/motion";
import { requirePrivilegedAuth } from "@/lib/privileged-action";
import { useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { getStoredValue, phoneRevealStorageKey, setStoredValue } from "@/lib/storage";
import { paymentModes, reasonSuggestions, type DeskPaymentMode } from "./constants";
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

const ATTENDANCE_FLAG_PRIORITY: Record<string, number> = {
  EXPIRED_MEMBERSHIP: 0,
  OUT_OF_BRANCH: 1,
  STALE_TOKEN: 2,
  RAPID_REPEAT: 3,
  EARLY_CHECKIN: 4,
};

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

function attendanceReviewPriority(attempt: ReceptionQueueRecord) {
  if (attempt.status === "FLAGGED") {
    const flags = Array.isArray(attempt.suspiciousFlags) ? attempt.suspiciousFlags : [];
    if (!flags.length) return 2;
    return Math.min(...flags.map((flag) => ATTENDANCE_FLAG_PRIORITY[flag] ?? 2));
  }
  if (attempt.status === "PENDING_APPROVAL") return 5;
  return 9;
}

function attendanceReviewTimestamp(attempt: ReceptionQueueRecord) {
  const timestamp = new Date(attempt.checkedInAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
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
    () =>
      [...(queueQuery.data?.records ?? [])].sort((left, right) => {
        const priority = attendanceReviewPriority(left) - attendanceReviewPriority(right);
        return priority || attendanceReviewTimestamp(left) - attendanceReviewTimestamp(right);
      }),
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
  const amountPaise = Math.round(Number(amount || "0") * 100);
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
    const query = debouncedMemberSearch.toLowerCase();
    return (membersQuery.data?.members ?? []).filter((member) => {
      const name = member.user?.name.toLowerCase() ?? "";
      const email = member.user?.email.toLowerCase() ?? "";
      const phone = member.user?.phone?.toLowerCase() ?? "";
      return !query || name.includes(query) || email.includes(query) || phone.includes(query);
    });
  }, [debouncedMemberSearch, membersQuery.data?.members]);
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
  const selectedMemberRecord =
    (membersQuery.data?.members ?? []).find(
      (record) =>
        record.profile.userId === selectedMemberId || record.user?.id === selectedMemberId,
    ) ?? null;
  useEffect(() => {
    if (!initialMemberId || selectedMemberRecord || !(membersQuery.data?.members.length)) {
      return;
    }
    const fallbackMemberId = membersQuery.data.members[0]?.profile.userId ?? null;
    if (fallbackMemberId) {
      setSelectedMemberId(fallbackMemberId);
    }
  }, [initialMemberId, membersQuery.data?.members, selectedMemberRecord]);
  const memberRecord =
    selectedMemberRecord ??
    (initialMemberId ? (membersQuery.data?.members ?? [])[0] ?? null : null);
  const member = memberRecord?.user ?? null;
  const membership = memberRecord?.activeSubscription ?? null;
  const profile = memberRecord?.profile ?? null;
  const activeRole = roleContext?.role;
  const isDemo = Boolean(roleContext?.isDemo);

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
    const summary = failures.length
      ? t("reception.workspace.bulkRecordedPartial", {
          successes,
          total: ids.length,
          failures: failures.length,
        })
      : t(successes === 1 ? "reception.workspace.bulkRecordedOne" : "reception.workspace.bulkRecordedMany", {
          count: successes,
        });
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
      const name =
        result.match.user?.name ?? result.match.user?.email ?? t("reception.workspace.memberFallback");
      if (result.match.type === "attendance") {
        if (result.match.valid) {
          const status = attendanceStatusLabel(result.match.record?.status ?? "APPROVED", t);
          presentVerificationResult({
            tone: "success",
            type: "attendance",
            name,
            photoUrl: result.match.user?.profilePhotoUrl,
            message: t("reception.workspace.checkInVerified"),
            detail: t("reception.workspace.statusDetail", { status }),
          });
          showToast({
            tone: "success",
            haptic: "success",
            message: t("reception.workspace.verifiedName", { name }),
          });
        } else {
          const message = t("reception.workspace.entryCodeInvalidMessage", { name });
          presentVerificationResult({
            tone: "danger",
            type: "attendance",
            name,
            photoUrl: result.match.user?.profilePhotoUrl,
            message: t("reception.workspace.checkInNotValid"),
            detail: message,
          });
          showToast({
            tone: "amber",
            haptic: "warning",
            title: t("reception.workspace.notValidForEntry"),
            message: name,
          });
        }
        return;
      }
      if (result.match.valid) {
        presentVerificationResult({
          tone: "success",
          type: "pickup",
          name,
          photoUrl: result.match.user?.profilePhotoUrl,
          message: t("reception.workspace.pickupVerified"),
          detail: t("reception.workspace.orderTotalDetail", {
            amount: formatInr(result.match.order?.totalPaise ?? 0),
          }),
        });
        showToast({
          tone: "success",
          haptic: "success",
          message: t("reception.workspace.pickupVerifiedFor", { name }),
        });
      } else {
        const status = pickupStatusLabel(
          result.match.pickupCode?.status ?? result.match.order?.status ?? "READY_FOR_PICKUP",
          t,
        );
        const message = t("reception.workspace.pickupStatusTitle", { status });
        presentVerificationResult({
          tone: "danger",
          type: "pickup",
          name,
          photoUrl: result.match.user?.profilePhotoUrl,
          message: t("reception.workspace.pickupNotReady"),
          detail: message,
        });
        showToast({
          tone: "amber",
          haptic: "warning",
          title: t("reception.workspace.pickupStatusTitle", { status }),
          message: name,
        });
      }
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
      const payment = await recordPaymentMutation.mutateAsync({
        memberUserId: member.id,
        subscriptionId: membership.id,
        amountPaise,
        mode: paymentMode,
        ...(referenceId ? { receiptNumber: referenceId } : {}),
        notes: [paymentReason, paymentNote].filter(Boolean).join(" · "),
      });
      const message = t("reception.workspace.paymentRecorded", {
        amount: formatInr(payment.payment.amountPaise),
        mode: deskPaymentModeLabel(payment.payment.mode, t),
      });
      setPaymentStatus(message);
      showToast({ tone: "success", haptic: "success", message });
    } catch (error) {
      const message = getApiErrorMessage(error);
      const statusMessage =
        /already active/i.test(message)
          ? t("reception.workspace.membershipAlreadyActive")
          : message;
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
      const statusMessage =
        /already has an attendance record/i.test(message)
          ? t("reception.workspace.alreadyCheckedInToday")
          : message;
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

function ApprovalDecisionSheet() {
  const { mode, palette } = useTheme();
  const t = useT();
  const isDark = mode === "dark";
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
  useEffect(() => {
    if (!selectedDecisionAttempt) {
      return;
    }
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        if (!cancelled) {
          decisionSheetRef.current?.present();
        }
      });
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [decisionSheetRef, selectedDecisionAttempt]);
  const sheetBackground = StyleSheet.flatten([
    styles.sheetBackground,
    {
      borderColor: palette.border.default,
      backgroundColor: isDark ? palette.bg.elevated : palette.surface.raised,
    },
  ]);
  const sheetHandle = StyleSheet.flatten([
    styles.sheetHandle,
    { backgroundColor: palette.border.strong },
  ]);

  return (
      <BottomSheetModal
        ref={decisionSheetRef}
        snapPoints={["48%"]}
        enablePanDownToClose
        backdropComponent={renderDecisionBackdrop}
        backgroundStyle={sheetBackground}
        handleIndicatorStyle={sheetHandle}
        onDismiss={() => {
          setSelectedDecisionAttempt(null);
          setDecisionReason("");
        }}
      >
        <BottomSheetView style={styles.decisionSheetContent}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleCopy}>
              <Text style={[styles.sheetEyebrow, { color: palette.accent.base }]}>
                {t("reception.decision.reason")}
              </Text>
              <Text style={[styles.sheetTitle, { color: palette.text.primary }]}>
                {selectedDecisionAttempt?.user?.name ??
                  selectedDecisionAttempt?.user?.email ??
                  t("reception.decision.memberCheckIn")}
              </Text>
              <Text style={[styles.cardBody, { color: palette.text.secondary }]}>
                {t("reception.decision.addDeskNote")}
              </Text>
            </View>
            <Pressable
              onPress={closeDecisionSheet}
              accessibilityRole="button"
              accessibilityLabel={t("reception.decision.closeSheet")}
              style={({ pressed }) => [
                styles.sheetCloseButton,
                { borderColor: palette.border.default, backgroundColor: palette.surface.raised },
                pressed ? styles.sheetCloseButtonPressed : null,
              ]}
            >
              <Ionicons name="close-outline" size={16} color={palette.text.secondary} />
              <Text style={[styles.sheetCloseText, { color: palette.text.secondary }]}>
                {t("reception.decision.close")}
              </Text>
            </Pressable>
          </View>
          <FormField
            label={t("reception.decision.reason")}
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
                style={({ pressed }) => [
                  styles.suggestionChip,
                  {
                    borderColor:
                      decisionReason === suggestion ? palette.border.focus : palette.border.default,
                    backgroundColor:
                      decisionReason === suggestion
                        ? palette.surface.accentSoft
                        : palette.surface.raised,
                  },
                  pressed ? styles.suggestionChipPressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.suggestionText,
                    {
                      color:
                        decisionReason === suggestion
                          ? palette.accent.base
                          : palette.text.secondary,
                    },
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
              {approveAttendanceMutation.isPending
                ? t("reception.decision.approving")
                : t("reception.decision.approve")}
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
              {rejectAttendanceMutation.isPending
                ? t("reception.decision.rejecting")
                : t("reception.decision.reject")}
            </SecondaryButton>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
  );
}

function VerificationResultModal() {
  const { palette } = useTheme();
  const t = useT();
  const { dismissVerificationResult, verificationResult } = useReceptionWorkspace();
  const success = verificationResult?.tone === "success";
  const { animatedStyle: shakeStyle, shake } = useShake();
  useEffect(() => {
    if (!verificationResult) return;
    if (!success) shake();
    AccessibilityInfo.announceForAccessibility(
      [
        success
          ? t("reception.workspace.verificationSuccessful")
          : t("reception.workspace.verificationFailed"),
        verificationResult.message,
        verificationResult.name,
        verificationResult.detail,
      ]
        .filter(Boolean)
        .join(" "),
    );
    const timer = setTimeout(dismissVerificationResult, success ? 1400 : 4000);
    return () => clearTimeout(timer);
  }, [dismissVerificationResult, shake, success, t, verificationResult]);
  const photo = verificationResult?.photoUrl;
  const backdropColor = success ? "rgba(17,21,15,0.94)" : `${palette.feedback.danger}E6`;
  return (
    <Modal
      animationType="fade"
      transparent
      visible={Boolean(verificationResult)}
      onRequestClose={dismissVerificationResult}
    >
      <View
        style={[
          styles.verificationModalBackdrop,
          { backgroundColor: backdropColor },
        ]}
      >
        <Reanimated.View style={[styles.verificationModalContent, success ? null : shakeStyle]}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              contentFit="cover"
              style={[
                styles.verificationModalPhoto,
                { backgroundColor: palette.surface.raised },
              ]}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View
              style={styles.verificationModalPhotoFallback}
            >
              <Ionicons
                name={success ? "checkmark-circle-outline" : "alert-circle-outline"}
                size={92}
                color={palette.text.inverse}
              />
            </View>
          )}
          <Text style={[styles.verificationModalEyebrow, { color: palette.text.inverse }]}>
            {verificationResult?.type === "pickup"
              ? t("reception.orders.pickupCode")
              : t("reception.workspace.entryCode")}
          </Text>
          <Text style={[styles.verificationModalTitle, { color: palette.text.inverse }]}>
            {verificationResult?.message}
          </Text>
          {verificationResult?.name ? (
            <Text style={[styles.verificationModalName, { color: palette.text.inverse }]}>
              {verificationResult.name}
            </Text>
          ) : null}
          {verificationResult?.detail ? (
            <Text style={[styles.verificationModalDetail, { color: palette.text.inverse }]}>
              {verificationResult.detail}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={dismissVerificationResult}
            style={({ pressed }) => [
              styles.verificationModalDismiss,
              pressed ? styles.verificationModalDismissPressed : null,
            ]}
          >
            <Text style={[styles.verificationModalDismissText, { color: palette.text.inverse }]}>
              Dismiss
            </Text>
          </Pressable>
        </Reanimated.View>
      </View>
    </Modal>
  );
}

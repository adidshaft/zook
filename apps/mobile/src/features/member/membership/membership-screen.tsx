import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  type AppStateStatus,
  ActivityIndicator,
  Linking,
  LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Card,
  BranchSelectorChip,
  AppHeader,
  DatePickerField,
  QueryErrorState,
  SectionHeader,
  SegmentedControl,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import {
  ActiveMembershipCard,
  AutopayCard,
  MembershipHistorySection,
  PaymentsSection,
} from "@/components/membership";
import { isAutopayEnabled, planTypeLabel } from "@/components/membership/helpers";
import { MembershipSkeleton, PlansSkeleton } from "@/components/skeletons";
import { toWebUrl } from "@/lib/api";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { useAppFocusInvalidation } from "@/lib/app-focus";
import { useBranchSelection } from "@/lib/branch-selection";
import { memberApi, paymentsApi } from "@/lib/domain-api";
import { formatInr, formatLongDate } from "@/lib/formatting";
import { useI18n, useT, type TranslationKey } from "@/lib/i18n";
import {
  useGeneratePaymentDocument,
  useGymProfile,
  useMyInvoices,
  useMyMemberships,
  type InvoiceRecord,
  type PublicPlanSummary,
} from "@/lib/domains";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type MembershipRecord = {
  id: string;
  status?: string | null;
  endsAt?: string | null;
  remainingVisits?: number | null;
  createdAt?: string | null;
  planId?: string | null;
  plan?:
    | (PublicPlanSummary & {
        id?: string | null;
        name?: string | null;
        type?: string | null;
      })
    | null;
  organization?: {
    id?: string | null;
    name?: string | null;
    username?: string | null;
  } | null;
  autopay?: AutopayRecord | null;
};

type RenewalResult = {
  checkoutUrl?: string | null;
  subscription?: unknown;
  session?: {
    id: string;
    status: string;
    provider?: string | null;
  } | null;
};

type AutopayRecord = {
  id: string;
  status?: string | null;
  checkoutUrl?: string | null;
  provider?: string | null;
  nextChargeAt?: string | null;
  currentEndAt?: string | null;
};

type AutopayResult = {
  checkoutUrl?: string | null;
  mandate?: AutopayRecord | null;
  session?: {
    id: string;
    status: string;
    provider?: string | null;
  } | null;
};

type PaymentRecord = {
  id: string;
  orgId?: string | null;
  purpose?: string | null;
  amountPaise?: number | null;
  status?: string | null;
  mode?: string | null;
  receiptNumber?: string | null;
  recordedAt?: string | null;
  createdAt?: string | null;
};

type PaymentDocumentKind = "receipt" | "invoice";
type MembershipTab = "current" | "history" | "payments";

function daysUntil(dateStr?: string | null) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function pauseMinimumDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(12, 0, 0, 0);
  return date;
}

function pauseDefaultDate() {
  const date = pauseMinimumDate();
  date.setDate(date.getDate() + 6);
  return date;
}

const pauseReasonOptions = ["Medical", "Travel", "Injury", "Other"];

function pauseReasonLabelKey(reason: string): TranslationKey {
  switch (reason) {
    case "Medical":
      return "member.membership.pauseReasonMedical";
    case "Travel":
      return "member.membership.pauseReasonTravel";
    case "Injury":
      return "member.membership.pauseReasonInjury";
    default:
      return "member.membership.pauseReasonOther";
  }
}

function planIdFor(subscription?: MembershipRecord | null) {
  return subscription?.plan?.id ?? subscription?.planId ?? undefined;
}

function shouldShowJoinDifferentGym(subscription?: MembershipRecord | null) {
  const status = String(subscription?.status ?? "").toUpperCase();
  return (
    !subscription ||
    status.includes("CANCEL") ||
    status.includes("EXPIRED") ||
    status.includes("INACTIVE")
  );
}

function checkoutUrl(url?: string | null) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : toWebUrl(url);
}

function checkoutUrlWithReturnUrl(url?: string | null, sessionId?: string | null) {
  const resolvedUrl = checkoutUrl(url);
  if (!resolvedUrl || !sessionId) return resolvedUrl;
  const returnUrl = `zook://payments/return?target=membership&session=${encodeURIComponent(sessionId)}`;
  try {
    const parsed = new URL(resolvedUrl);
    parsed.searchParams.set("return_url", returnUrl);
    return parsed.toString();
  } catch {
    const separator = resolvedUrl.includes("?") ? "&" : "?";
    return `${resolvedUrl}${separator}return_url=${encodeURIComponent(returnUrl)}`;
  }
}

function subscriptionStatusRank(status?: string | null) {
  if (status === "ACTIVE") return 0;
  if (status === "PENDING_PAYMENT" || status === "PENDING") return 1;
  if (status === "PAUSED" || status === "PAST_DUE") return 2;
  return 3;
}

function subscriptionTimestamp(subscription: MembershipRecord) {
  return new Date(
    subscription.endsAt ?? subscription.createdAt ?? "1970-01-01T00:00:00.000Z",
  ).getTime();
}

export default function MembershipScreen() {
  const router = useRouter();
  const { mode, palette } = useTheme();
  const { locale, t } = useI18n();
  const routeParams = useLocalSearchParams<{
    focus?: string;
    notificationId?: string;
    subscriptionId?: string;
  }>();
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const membershipsQuery = useMyMemberships();
  const invoicesQuery = useMyInvoices();
  const paymentDocument = useGeneratePaymentDocument();
  const activeOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization ??
    null;
  const memberships = (membershipsQuery.data?.subscriptions ?? []) as MembershipRecord[];
  const payments = ((membershipsQuery.data?.payments ?? []) as PaymentRecord[]).slice(0, 5);
  const invoices = ((invoicesQuery.data?.invoices ?? []) as InvoiceRecord[]).slice(0, 5);
  const sortedSubscriptions = [...memberships].sort((left, right) => {
    if (left.id === routeParams.subscriptionId) return -1;
    if (right.id === routeParams.subscriptionId) return 1;
    const statusDelta = subscriptionStatusRank(left.status) - subscriptionStatusRank(right.status);
    if (statusDelta !== 0) return statusDelta;
    return subscriptionTimestamp(right) - subscriptionTimestamp(left);
  });
  const latestSubscription = sortedSubscriptions[0];
  const gymUsername =
    latestSubscription?.organization?.username ?? activeOrganization?.username ?? undefined;
  const gymQuery = useGymProfile(gymUsername ?? "");
  const availablePlans = useMemo(() => gymQuery.data?.plans ?? [], [gymQuery.data?.plans]);
  const expiringSoonCount = memberships.filter((s) => {
    if (s.status !== "ACTIVE" || !s.endsAt) return false;
    const days = daysUntil(s.endsAt);
    return days !== null && days <= 30;
  }).length;
  const latestDaysLeft = latestSubscription ? daysUntil(latestSubscription.endsAt) : null;
  const membershipStatItems =
    expiringSoonCount > 0
      ? [{ label: t("member.membership.expiringSoon"), value: expiringSoonCount }]
      : [];
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [renewalTarget, setRenewalTarget] = useState<MembershipRecord | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();
  const [renewalStatus, setRenewalStatus] = useState("");
  const [renewing, setRenewing] = useState(false);
  const [autopayStatus, setAutopayStatus] = useState("");
  const [autopayBusy, setAutopayBusy] = useState(false);
  const [membershipActionStatus, setMembershipActionStatus] = useState("");
  const [membershipActionBusy, setMembershipActionBusy] = useState(false);
  const [terminateStatus, setTerminateStatus] = useState("");
  const [terminateBusy, setTerminateBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [waitingCheckoutSessionId, setWaitingCheckoutSessionId] = useState<string | null>(null);
  const [checkingCheckoutStatus, setCheckingCheckoutStatus] = useState(false);
  const [documentBusyKey, setDocumentBusyKey] = useState<string | null>(null);
  const [pauseResumesAt, setPauseResumesAt] = useState(() => pauseDefaultDate());
  const [pauseReason, setPauseReason] = useState(pauseReasonOptions[0]!);
  const [visibleTab, setVisibleTab] = useState<MembershipTab>("current");
  const refreshAfterCheckoutRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const scrollViewRef = useRef<ScrollView>(null);
  const handledFocusRef = useRef<string | null>(null);
  const sectionOffsetsRef = useRef<Record<string, number>>({});
  useAppFocusInvalidation([["me", "home"]]);
  const selectedPlan = useMemo(
    () => availablePlans.find((plan) => plan.id === selectedPlanId) ?? renewalTarget?.plan ?? null,
    [availablePlans, renewalTarget?.plan, selectedPlanId],
  );
  const tabOptions = useMemo(
    () => [
      { label: t("member.membership.tabCurrent"), value: "current" as const },
      { label: t("member.membership.tabHistory"), value: "history" as const },
      { label: t("member.membership.tabPayments"), value: "payments" as const },
    ],
    [t],
  );

  useEffect(() => {
    if (!renewalTarget) return;
    setSelectedPlanId(planIdFor(renewalTarget) ?? availablePlans[0]?.id);
  }, [availablePlans, renewalTarget]);

  const focusTarget = useMemo(() => {
    switch (routeParams.focus) {
      case "buy":
      case "checkout":
      case "history":
      case "payments":
      case "membership":
        return routeParams.focus;
      default:
        return null;
    }
  }, [routeParams.focus]);

  function registerSectionOffset(
    section: "active" | "history" | "payments",
    event: LayoutChangeEvent,
  ) {
    sectionOffsetsRef.current[section] = event.nativeEvent.layout.y;
  }

  function scrollToSection(section: "active" | "history" | "payments") {
    const y = sectionOffsetsRef.current[section];
    if (typeof y !== "number") {
      return false;
    }
    scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
    return true;
  }

  const refreshMembershipAfterCheckout = useCallback(async () => {
    setCheckingCheckoutStatus(true);
    setRenewalStatus(t("member.membership.checkingPaymentStatus"));
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "membership"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
      setWaitingCheckoutSessionId(null);
      setRenewalOpen(false);
      setRenewalStatus("");
    } finally {
      setCheckingCheckoutStatus(false);
    }
  }, [queryClient, t]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasAway = appStateRef.current === "inactive" || appStateRef.current === "background";
      appStateRef.current = nextState;
      if (nextState !== "active" || !wasAway || !refreshAfterCheckoutRef.current) {
        return;
      }
      refreshAfterCheckoutRef.current = false;
      void refreshMembershipAfterCheckout();
    });
    return () => subscription.remove();
  }, [refreshMembershipAfterCheckout]);

  function openRenewal(subscription: MembershipRecord) {
    setRenewalTarget(subscription);
    setRenewalStatus("");
    setRenewalOpen(true);
  }

  function closeRenewal() {
    setRenewalOpen(false);
    setSelectedPlanId(undefined);
    setRenewalTarget(null);
    setRenewalStatus("");
  }

  function closeManageSheet() {
    setManageOpen(false);
  }

  useEffect(() => {
    if (!focusTarget) {
      handledFocusRef.current = null;
      return;
    }
    if (handledFocusRef.current === focusTarget) {
      return;
    }
    if (focusTarget === "buy" || focusTarget === "checkout") {
      if (!latestSubscription) {
        if (membershipsQuery.isLoading) {
          return;
        }
        handledFocusRef.current = focusTarget;
        return;
      }
      handledFocusRef.current = focusTarget;
      openRenewal(latestSubscription);
      scrollToSection("active");
      return;
    }
    if (membershipsQuery.isLoading) {
      return;
    }
    if (focusTarget === "history") {
      setVisibleTab("history");
      if (!scrollToSection(sortedSubscriptions.length > 1 ? "history" : "payments")) {
        return;
      }
      handledFocusRef.current = focusTarget;
      return;
    }
    if (focusTarget === "payments") {
      setVisibleTab("payments");
      if (!scrollToSection("payments")) {
        return;
      }
      handledFocusRef.current = focusTarget;
      return;
    }
    if (focusTarget === "membership") {
      setVisibleTab("current");
      if (!scrollToSection("active")) {
        return;
      }
      handledFocusRef.current = focusTarget;
    }
  }, [focusTarget, latestSubscription, membershipsQuery.isLoading, sortedSubscriptions.length]);

  async function renewMembership() {
    if (!token || !renewalTarget) return;
    setRenewing(true);
    setRenewalStatus("");
    try {
      const result = await memberApi.renewMembership<RenewalResult>({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        subscriptionId: renewalTarget.id,
        ...(selectedPlanId ? { planId: selectedPlanId } : {}),
      });
      if (result.session?.provider === "mock") {
        await paymentsApi.completeMockPayment({
          token,
          sessionId: result.session.id,
          ...(activeOrgId ? { orgId: activeOrgId } : {}),
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        });
        setRenewalStatus(t("member.membership.renewalConfirmed"));
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
          queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
        ]);
        setRenewalOpen(false);
        return;
      }
      const url = checkoutUrlWithReturnUrl(result.checkoutUrl, result.session?.id ?? token);
      setRenewalStatus(
        url ? t("member.membership.continuingBrowser") : t("member.membership.renewalRequestSent"),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
      if (url) {
        setWaitingCheckoutSessionId(result.session?.id ?? token);
        refreshAfterCheckoutRef.current = true;
        await Linking.openURL(url);
      }
    } catch (error) {
      setRenewalStatus(getApiErrorMessage(error));
    } finally {
      setRenewing(false);
    }
  }

  async function enableAutopay(subscription: MembershipRecord) {
    if (!token) return;
    setAutopayBusy(true);
    setAutopayStatus("");
    try {
      const result = await memberApi.enableAutopay<AutopayResult>({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        subscriptionId: subscription.id,
        ...(planIdFor(subscription) ? { planId: planIdFor(subscription) } : {}),
      });
      const url = checkoutUrlWithReturnUrl(
        result.checkoutUrl ?? result.mandate?.checkoutUrl,
        result.session?.id ?? token,
      );
      if (!url) {
        setAutopayStatus(t("member.membership.autopayActive"));
        await queryClient.invalidateQueries({ queryKey: ["me", "memberships"] });
        return;
      }
      setAutopayStatus(t("member.membership.continuingBrowser"));
      await queryClient.invalidateQueries({ queryKey: ["me", "memberships"] });
      setWaitingCheckoutSessionId(result.session?.id ?? token);
      refreshAfterCheckoutRef.current = true;
      await Linking.openURL(url);
    } catch (error) {
      setAutopayStatus(getApiErrorMessage(error));
    } finally {
      setAutopayBusy(false);
    }
  }

  async function cancelAutopay(subscription: MembershipRecord) {
    if (!token) return;
    setAutopayBusy(true);
    setAutopayStatus("");
    try {
      await memberApi.cancelAutopay({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        subscriptionId: subscription.id,
      });
      setAutopayStatus(t("member.membership.autopayCancelled"));
      await queryClient.invalidateQueries({ queryKey: ["me", "memberships"] });
    } catch (error) {
      setAutopayStatus(getApiErrorMessage(error));
    } finally {
      setAutopayBusy(false);
    }
  }

  async function switchMembershipNow() {
    if (!token || !renewalTarget || !selectedPlanId) return;
    setMembershipActionBusy(true);
    setRenewalStatus("");
    try {
      await memberApi.switchMembership({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        subscriptionId: renewalTarget.id,
        planId: selectedPlanId,
      });
      setRenewalStatus(t("member.membership.planSwitched"));
      showToast({
        tone: "success",
        haptic: "success",
        message: t("member.membership.planSwitched"),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
      setRenewalOpen(false);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setRenewalStatus(message);
      showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
    } finally {
      setMembershipActionBusy(false);
    }
  }

  function pauseOrResumeMembership(subscription: MembershipRecord) {
    // Resuming is safe/positive — do it immediately. Pausing freezes gym
    // access until the resume date, so confirm first to avoid a misfire that
    // leaves the member unable to check in.
    if (subscription.status === "PAUSED") {
      void performPauseOrResume(subscription);
      return;
    }
    Alert.alert(
      t("member.membership.pauseConfirmTitle"),
      t("member.membership.pauseConfirmBody", {
        date: formatLongDate(pauseResumesAt.toISOString(), undefined, locale),
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("member.membership.pause"),
          style: "destructive",
          onPress: () => void performPauseOrResume(subscription),
        },
      ],
    );
  }

  async function performPauseOrResume(subscription: MembershipRecord) {
    if (!token) return;
    setMembershipActionBusy(true);
    setMembershipActionStatus("");
    try {
      if (subscription.status === "PAUSED") {
        await memberApi.resumeMembership({
          token,
          ...(activeOrgId ? { orgId: activeOrgId } : {}),
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
          subscriptionId: subscription.id,
        });
        setMembershipActionStatus(t("member.membership.resumed"));
        showToast({ tone: "success", haptic: "success", message: t("member.membership.resumed") });
      } else {
        await memberApi.pauseMembership({
          token,
          ...(activeOrgId ? { orgId: activeOrgId } : {}),
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
          subscriptionId: subscription.id,
          resumesAt: pauseResumesAt.toISOString(),
          reason: pauseReason,
        });
        setMembershipActionStatus(
          t("member.membership.pausedUntil", {
            date: formatLongDate(pauseResumesAt.toISOString(), undefined, locale),
          }),
        );
        showToast({
          tone: "success",
          haptic: "success",
          message: t("member.membership.pausedToast", {
            date: formatLongDate(pauseResumesAt.toISOString(), undefined, locale),
          }),
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setMembershipActionStatus(message);
      showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
    } finally {
      setMembershipActionBusy(false);
    }
  }

  function cancelMembership(subscription: MembershipRecord) {
    // Terminating ends the membership outright (no resume path), so always
    // confirm first to avoid a misfire that revokes access early.
    Alert.alert(
      t("member.membership.cancelConfirmTitle"),
      t("member.membership.cancelConfirmBody"),
      [
        { text: t("member.membership.keepMembership"), style: "cancel" },
        {
          text: t("member.membership.cancelMembership"),
          style: "destructive",
          onPress: () => void performCancelMembership(subscription),
        },
      ],
    );
  }

  async function performCancelMembership(subscription: MembershipRecord) {
    if (!token) return;
    setTerminateBusy(true);
    setTerminateStatus("");
    try {
      await memberApi.cancelMembership({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        subscriptionId: subscription.id,
      });
      setTerminateStatus(t("member.membership.cancelled"));
      showToast({ tone: "success", haptic: "success", message: t("member.membership.cancelled") });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setTerminateStatus(message);
      showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
    } finally {
      setTerminateBusy(false);
    }
  }

  async function createPaymentDocument(payment: PaymentRecord, kind: PaymentDocumentKind) {
    if (!payment.id) return;
    const busyKey = `${kind}:${payment.id}`;
    setDocumentBusyKey(busyKey);
    try {
      const payload = await paymentDocument.mutateAsync({ paymentId: payment.id, kind });
      await Promise.all([membershipsQuery.refetch(), invoicesQuery.refetch()]);
      if (kind === "invoice" && payload.invoiceUrl) {
        await Linking.openURL(toWebUrl(payload.invoiceUrl));
      }
      showToast({
        tone: "success",
        haptic: "success",
        message:
          kind === "receipt"
            ? t("member.membership.receiptGenerated")
            : t("member.membership.invoiceGenerated"),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      showToast({
        title:
          kind === "receipt"
            ? t("member.membership.receiptUnavailable")
            : t("member.membership.invoiceUnavailable"),
        message: getApiErrorMessage(error),
        tone: "danger",
        haptic: "error",
      });
    } finally {
      setDocumentBusyKey(null);
    }
  }

  async function downloadInvoice(invoice: InvoiceRecord) {
    if (!invoice.invoiceUrl) return;
    await Linking.openURL(toWebUrl(invoice.invoiceUrl));
  }

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
        gymUsername
          ? queryClient.invalidateQueries({ queryKey: ["gym", gymUsername] })
          : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <ZookScreen testID="membership-screen">
        <ScrollView
          ref={scrollViewRef}
          accessibilityElementsHidden={renewalOpen}
          contentInsetAdjustmentBehavior="never"
          importantForAccessibility={renewalOpen ? "no-hide-descendants" : "auto"}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
        >
          <AppHeader
            eyebrow={t("member.membership.eyebrow")}
            title={t("member.membership.title")}
            contextSlot={
              <View style={styles.headerContext}>
                <BranchSelectorChip variant="header" style={styles.headerBranchSelector} />
              </View>
            }
            subtitle={
              memberships.length
                ? undefined
                : t("member.membership.noActivePlans")
            }
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                accessibilityRole="button"
                accessibilityLabel={t("common.back")}
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: mode === "dark" ? palette.surface.raised : palette.bg.elevated,
                    borderColor: palette.border.default,
                  },
                ]}
              >
                <Ionicons name="chevron-back" size={21} color={palette.text.primary} />
              </Pressable>
            }
            showProfileShortcut={false}
          />

          {focusTarget ? (
            <Card variant="selected" contentStyle={styles.calloutContent}>
              <Ionicons
                name={
                  focusTarget === "history" || focusTarget === "payments"
                    ? "receipt-outline"
                    : focusTarget === "buy" || focusTarget === "checkout"
                      ? "card-outline"
                      : "notifications-outline"
                }
                size={16}
                color={palette.accent.base}
              />
              <View style={styles.calloutCopy}>
                <Text
                  numberOfLines={1}
                  style={[styles.calloutTitle, { color: palette.text.primary }]}
                >
                  {focusTarget === "buy"
                    ? t("member.membership.choosePlan")
                    : focusTarget === "checkout"
                      ? t("member.membership.continueCheckout")
                      : focusTarget === "history"
                        ? t("member.membership.history")
                        : focusTarget === "payments"
                          ? t("member.membership.paymentDocuments")
                          : t("member.membership.update")}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.calloutBody, { color: palette.text.secondary }]}
                >
                  {focusTarget === "buy" || focusTarget === "checkout"
                    ? latestSubscription
                      ? t("member.membership.renewalFlowOpened")
                      : t("member.membership.browseGymsBody")
                    : focusTarget === "history"
                      ? t("member.membership.historyJumpBody")
                      : focusTarget === "payments"
                        ? t("member.membership.paymentDocumentsBody")
                        : routeParams.subscriptionId
                          ? t("member.membership.subscriptionUpdated")
                          : t("member.membership.statusBelow")}
                </Text>
              </View>
            </Card>
          ) : null}

          {waitingCheckoutSessionId ? (
            <Card variant="compact" contentStyle={styles.browserReturnContent}>
              <View style={styles.browserReturnCopy}>
                <Text style={[styles.browserReturnTitle, { color: palette.text.primary }]}>
                  {t("member.membership.continuingBrowserTitle")}
                </Text>
                <Text style={[styles.browserReturnBody, { color: palette.text.secondary }]}>
                  {t("member.membership.browserReturnBody")}
                </Text>
                <Text style={[styles.browserReturnHint, { color: palette.text.tertiary }]}>
                  {t("member.membership.browserReturnHint")}
                </Text>
              </View>
              <ZookButton
                variant="secondary"
                disabled={checkingCheckoutStatus}
                onPress={() => void refreshMembershipAfterCheckout()}
                icon="refresh-outline"
              >
                {checkingCheckoutStatus ? t("shop.checking") : t("shop.checkStatus")}
              </ZookButton>
            </Card>
          ) : null}

          {membershipsQuery.isLoading ? <MembershipSkeleton /> : null}

          {!membershipsQuery.isLoading && memberships.length ? (
            <View style={styles.membershipStatsRow}>
              {membershipStatItems.map((item) => (
                <View
                  key={item.label}
                  style={[
                    styles.membershipStatChip,
                    {
                      backgroundColor: palette.bg.sunken,
                      borderColor: palette.border.subtle,
                    },
                  ]}
                >
                  <Text style={[styles.membershipStatValue, { color: palette.text.primary }]}>
                    {item.value}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.membershipStatLabel, { color: palette.text.secondary }]}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {membershipsQuery.isError ? (
            <QueryErrorState error={membershipsQuery.error} onRetry={() => void onRefresh()} />
          ) : null}

          {invoicesQuery.isError ? (
            <QueryErrorState error={invoicesQuery.error} onRetry={() => void onRefresh()} />
          ) : null}

          {!membershipsQuery.isLoading && !memberships.length ? (
            <Card variant="compact" contentStyle={styles.emptyContent}>
              <View style={styles.emptyCopy}>
                <Text style={[styles.emptyTitle, { color: palette.text.primary }]}>
                  {t("member.membership.noMemberships")}
                </Text>
                <Text style={[styles.emptyBody, { color: palette.text.secondary }]}>
                  {t("member.membership.browseGymsBody")}
                </Text>
              </View>
              <ZookButton testID="membership-find-gyms" href="/gyms" icon="search-outline">
                {t("member.membership.findGyms")}
              </ZookButton>
            </Card>
          ) : null}

          {!membershipsQuery.isLoading && memberships.length ? (
            <View style={styles.tabbedContent}>
              <SegmentedControl<MembershipTab>
                options={tabOptions}
                value={visibleTab}
                onChange={(nextTab) => {
                  setVisibleTab(nextTab);
                  requestAnimationFrame(() => {
                    scrollToSection(
                      nextTab === "current"
                        ? "active"
                        : nextTab === "history"
                          ? "history"
                          : "payments",
                    );
                  });
                }}
              />

              {visibleTab === "current" && latestSubscription ? (
                <View
                  style={styles.tabPanel}
                  onLayout={(event) => registerSectionOffset("active", event)}
                >
                  <SectionHeader title={t("member.membership.activePlan")} />
                  <ActiveMembershipCard
                    actionBusy={membershipActionBusy}
                    actionStatus={membershipActionStatus}
                    daysLeft={latestDaysLeft}
                    onOpenRenewal={openRenewal}
                    onOpenManage={() => setManageOpen(true)}
                    onPauseDateChange={setPauseResumesAt}
                    onPauseReasonChange={setPauseReason}
                    onPauseOrResume={(subscription) => void pauseOrResumeMembership(subscription)}
                    onTerminate={(subscription) => cancelMembership(subscription)}
                    pauseMinimumDate={pauseMinimumDate}
                    pauseReason={pauseReason}
                    pauseReasonOptions={pauseReasonOptions}
                    pauseResumesAt={pauseResumesAt}
                    subscription={latestSubscription}
                    terminateBusy={terminateBusy}
                    terminateStatus={terminateStatus}
                  />
                </View>
              ) : null}

              {visibleTab === "history" ? (
                <View
                  style={styles.tabPanel}
                  onLayout={(event) => registerSectionOffset("history", event)}
                >
                  <MembershipHistorySection subscriptions={sortedSubscriptions} />
                </View>
              ) : null}

              {visibleTab === "payments" ? (
                <View
                  style={styles.tabPanel}
                  onLayout={(event) => registerSectionOffset("payments", event)}
                >
                  <PaymentsSection
                    documentBusyKey={documentBusyKey}
                    invoices={invoices}
                    onCreateDocument={(payment, kind) => void createPaymentDocument(payment, kind)}
                    onDownloadInvoice={(invoice) => void downloadInvoice(invoice)}
                    payments={payments}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
        <RenewalSheet
          availablePlans={availablePlans}
          currentPlan={renewalTarget?.plan ?? null}
          currentSubscription={renewalTarget}
          gymName={
            renewalTarget?.organization?.name ??
            activeOrganization?.name ??
            t("member.membership.yourGym")
          }
          showJoinDifferentGym={shouldShowJoinDifferentGym(renewalTarget)}
          loadingPlans={gymQuery.isLoading}
          onClose={closeRenewal}
          onEnableAutopay={(subscription) => void enableAutopay(subscription)}
          onRenew={() => void renewMembership()}
          onSwitch={() => void switchMembershipNow()}
          open={renewalOpen}
          autopayBusy={autopayBusy}
          autopayStatus={autopayStatus}
          renewing={renewing || membershipActionBusy}
          selectedPlan={selectedPlan}
          selectedPlanId={selectedPlanId}
          setSelectedPlanId={setSelectedPlanId}
          status={renewalStatus}
        />
        {latestSubscription ? (
          <MembershipManageSheet
            actionBusy={membershipActionBusy}
            actionStatus={membershipActionStatus}
            autopayBusy={autopayBusy}
            autopayStatus={autopayStatus}
            onClose={closeManageSheet}
            onCancelAutopay={() => void cancelAutopay(latestSubscription)}
            onEnableAutopay={() => void enableAutopay(latestSubscription)}
            onPauseDateChange={setPauseResumesAt}
            onPauseOrResume={() => void pauseOrResumeMembership(latestSubscription)}
            onPauseReasonChange={setPauseReason}
            onTerminate={() => cancelMembership(latestSubscription)}
            open={manageOpen}
            pauseMinimumDate={pauseMinimumDate}
            pauseReason={pauseReason}
            pauseReasonOptions={pauseReasonOptions}
            pauseResumesAt={pauseResumesAt}
            subscription={latestSubscription}
            terminateBusy={terminateBusy}
            terminateStatus={terminateStatus}
          />
        ) : null}
      </ZookScreen>
    </>
  );
}

function MembershipManageSheet({
  actionBusy,
  actionStatus,
  autopayBusy,
  autopayStatus,
  onCancelAutopay,
  onClose,
  onEnableAutopay,
  onPauseDateChange,
  onPauseOrResume,
  onPauseReasonChange,
  onTerminate,
  open,
  pauseMinimumDate,
  pauseReason,
  pauseReasonOptions,
  pauseResumesAt,
  subscription,
  terminateBusy,
  terminateStatus,
}: {
  actionBusy: boolean;
  actionStatus: string;
  autopayBusy: boolean;
  autopayStatus: string;
  onCancelAutopay: () => void;
  onClose: () => void;
  onEnableAutopay: () => void;
  onPauseDateChange: (date: Date) => void;
  onPauseOrResume: () => void;
  onPauseReasonChange: (reason: string) => void;
  onTerminate: () => void;
  open: boolean;
  pauseMinimumDate: () => Date;
  pauseReason: string;
  pauseReasonOptions: string[];
  pauseResumesAt: Date;
  subscription: MembershipRecord;
  terminateBusy?: boolean;
  terminateStatus?: string;
}) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { locale, t } = useI18n();
  const { height: screenHeight } = useWindowDimensions();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["CONTENT_HEIGHT"], []);
  const canPause = subscription.status === "ACTIVE";
  const autopayEnabled = isAutopayEnabled(subscription.autopay);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const renderBackdrop = useCallback(
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

  useEffect(() => {
    if (open) {
      sheetRef.current?.present();
      return;
    }
    sheetRef.current?.dismiss();
  }, [open]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        ...styles.sheetBackground,
        backgroundColor: palette.bg.elevated,
        borderColor: palette.border.default,
      }}
      handleIndicatorStyle={{ ...styles.sheetHandle, backgroundColor: palette.border.strong }}
      maxDynamicContentSize={screenHeight * 0.76}
      bottomInset={insets.bottom + 12}
      onDismiss={onClose}
    >
      <BottomSheetView style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleCopy}>
            <Text style={[styles.sheetEyebrow, { color: palette.accent.base }]}>
              {t("member.membership.manageMembership")}
            </Text>
            <Text style={[styles.sheetTitle, { color: palette.text.primary }]}>
              {subscription.plan?.name ?? t("member.membership.activePlan")}
            </Text>
            <Text style={[styles.sheetBody, { color: palette.text.secondary }]}>
              {t("member.membership.manageMembershipBody")}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("common.dismiss")}
            style={({ pressed }) => [
              styles.closeButton,
              { borderColor: palette.border.default, backgroundColor: palette.surface.raised },
              pressed ? styles.closeButtonPressed : null,
            ]}
          >
            <Ionicons name="close" size={18} color={palette.text.primary} />
          </Pressable>
        </View>

        <View
          style={[
            styles.manageSummaryRow,
            { backgroundColor: palette.bg.sunken, borderColor: palette.border.subtle },
          ]}
        >
          <Ionicons
            name={autopayEnabled ? "repeat-outline" : "card-outline"}
            size={18}
            color={autopayEnabled ? palette.accent.base : palette.text.secondary}
          />
          <View style={styles.manageSummaryCopy}>
            <Text style={[styles.manageSummaryTitle, { color: palette.text.primary }]}>
              {autopayEnabled
                ? t("member.membership.autopayEnabledTitle")
                : t("member.membership.manualRenewalTitle")}
            </Text>
            <Text numberOfLines={2} style={[styles.manageSummaryBody, { color: palette.text.secondary }]}>
              {autopayEnabled
                ? subscription.autopay?.nextChargeAt
                  ? t("member.membership.nextRenewalDate", {
                      date: formatLongDate(subscription.autopay.nextChargeAt, undefined, locale),
                    })
                  : t("member.membership.recurringRenewalEnabled")
                : t("member.membership.manualRenewalBody")}
            </Text>
          </View>
        </View>

        <View style={styles.manageQuickActions}>
          {autopayEnabled ? (
            <ZookButton
              testID="membership-cancel-autopay-button"
              variant="secondary"
              disabled={autopayBusy}
              onPress={onCancelAutopay}
              icon="close-circle-outline"
              style={styles.manageQuickAction}
            >
              {t("member.membership.cancelAutopay")}
            </ZookButton>
          ) : subscription.status === "ACTIVE" ? (
            <ZookButton
              testID="membership-enable-autopay-button"
              disabled={autopayBusy}
              busy={autopayBusy}
              busyLabel={t("member.membership.starting")}
              onPress={onEnableAutopay}
              icon="flash-outline"
              style={styles.manageQuickAction}
            >
              {t("member.membership.autopaySetupAction")}
            </ZookButton>
          ) : null}
        </View>
        {autopayStatus ? (
          <Text style={[styles.statusMessage, { color: palette.feedback.info }]}>
            {autopayStatus}
          </Text>
        ) : null}

        {canPause ? (
          <View style={[styles.manageDisclosure, { borderColor: palette.border.subtle }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("member.membership.pauseMembership")}
              accessibilityState={{ expanded: pauseOpen }}
              onPress={() => setPauseOpen((current) => !current)}
              style={({ pressed }) => [
                styles.manageDisclosureHeader,
                pressed ? styles.manageDisclosurePressed : null,
              ]}
            >
              <View style={styles.manageDisclosureCopy}>
                <Text style={[styles.manageDisclosureTitle, { color: palette.text.primary }]}>
                  {t("member.membership.pauseMembership")}
                </Text>
                <Text numberOfLines={2} style={[styles.manageDisclosureBody, { color: palette.text.secondary }]}>
                  {t("member.membership.pauseDisclosureBody")}
                </Text>
              </View>
              <Ionicons
                name={pauseOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={palette.text.secondary}
              />
            </Pressable>
            {pauseOpen ? (
              <View style={styles.manageSheetGroup}>
                <DatePickerField
                  accessibilityLabel={t("member.membership.pauseEndDateAccessibility")}
                  label={t("member.membership.pauseUntil")}
                  value={pauseResumesAt}
                  minimumDate={pauseMinimumDate()}
                  onChange={onPauseDateChange}
                />
                <Text style={[styles.manageSheetHelp, { color: palette.text.secondary }]}>
                  {t("member.membership.pauseHelp")}
                </Text>
                <View style={styles.manageReasonRow}>
                  {pauseReasonOptions.map((reason) => {
                    const selected = reason === pauseReason;
                    return (
                      <Pressable
                        key={reason}
                        accessibilityRole="button"
                        onPress={() => onPauseReasonChange(reason)}
                        style={({ pressed }) => [
                          styles.manageReasonChip,
                          {
                            backgroundColor: selected ? palette.surface.accentSoft : palette.bg.sunken,
                            borderColor: selected ? palette.border.focus : palette.border.subtle,
                          },
                          pressed ? styles.manageReasonChipPressed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.manageReasonText,
                            { color: selected ? palette.accent.base : palette.text.secondary },
                          ]}
                        >
                          {t(pauseReasonLabelKey(reason))}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <ZookButton
                  testID="membership-pause-resume-button"
                  variant="secondary"
                  disabled={actionBusy}
                  onPress={onPauseOrResume}
                  icon="pause-circle-outline"
                >
                  {t("member.membership.pauseMembership")}
                </ZookButton>
              </View>
            ) : null}
          </View>
        ) : subscription.status === "PAUSED" ? (
          <ZookButton
            testID="membership-pause-resume-button"
            variant="secondary"
            disabled={actionBusy}
            onPress={onPauseOrResume}
            icon="play-circle-outline"
          >
            {t("member.membership.resumeMembership")}
          </ZookButton>
        ) : null}

        {actionStatus ? (
          <Text style={[styles.statusMessage, { color: palette.accent.base }]}>{actionStatus}</Text>
        ) : null}
        {subscription.status !== "CANCELLED" ? (
          <View style={[styles.manageDisclosure, { borderColor: palette.border.subtle }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("member.membership.endMembershipOptions")}
              accessibilityState={{ expanded: endOpen }}
              onPress={() => setEndOpen((current) => !current)}
              style={({ pressed }) => [
                styles.manageDisclosureHeader,
                pressed ? styles.manageDisclosurePressed : null,
              ]}
            >
              <View style={styles.manageDisclosureCopy}>
                <Text style={[styles.manageDisclosureTitle, { color: palette.text.primary }]}>
                  {t("member.membership.endMembershipOptions")}
                </Text>
                <Text numberOfLines={2} style={[styles.manageDisclosureBody, { color: palette.text.secondary }]}>
                  {t("member.membership.endMembershipBody")}
                </Text>
              </View>
              <Ionicons
                name={endOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={palette.text.secondary}
              />
            </Pressable>
            {endOpen ? (
              <View style={styles.manageSheetGroup}>
                <ZookButton
                  testID="membership-cancel-button"
                  variant="destructive"
                  disabled={Boolean(terminateBusy)}
                  onPress={onTerminate}
                  icon="close-circle-outline"
                >
                  {t("member.membership.cancelMembership")}
                </ZookButton>
              </View>
            ) : null}
          </View>
        ) : null}
        {terminateStatus ? (
          <Text style={[styles.statusMessage, { color: palette.feedback.danger }]}>
            {terminateStatus}
          </Text>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

function RenewalSheet({
  autopayBusy,
  autopayStatus,
  availablePlans,
  currentPlan,
  currentSubscription,
  gymName,
  showJoinDifferentGym,
  loadingPlans,
  onClose,
  onEnableAutopay,
  onRenew,
  onSwitch,
  open,
  renewing,
  selectedPlan,
  selectedPlanId,
  setSelectedPlanId,
  status,
}: {
  autopayBusy: boolean;
  autopayStatus: string;
  availablePlans: PublicPlanSummary[];
  currentPlan: MembershipRecord["plan"];
  currentSubscription: MembershipRecord | null;
  gymName: string;
  showJoinDifferentGym: boolean;
  loadingPlans: boolean;
  onClose: () => void;
  onEnableAutopay: (subscription: MembershipRecord) => void;
  onRenew: () => void;
  onSwitch: () => void;
  open: boolean;
  renewing: boolean;
  selectedPlan: PublicPlanSummary | MembershipRecord["plan"] | null;
  selectedPlanId?: string;
  setSelectedPlanId: (planId: string) => void;
  status: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, palette } = useTheme();
  const t = useT();
  const { height: screenHeight } = useWindowDimensions();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["CONTENT_HEIGHT"], []);
  const maxPlanListHeight = Math.min(420, Math.max(240, screenHeight * 0.36));
  const plans = availablePlans.length
    ? availablePlans
    : currentPlan?.id
      ? [currentPlan as PublicPlanSummary]
      : [];
  const selectedAmount =
    selectedPlan && "pricePaise" in selectedPlan ? formatInr(selectedPlan.pricePaise) : null;
  const showAutopayPrompt =
    Boolean(currentSubscription) &&
    currentSubscription?.status === "ACTIVE" &&
    !isAutopayEnabled(currentSubscription.autopay);
  const [autopayChoiceOpen, setAutopayChoiceOpen] = useState(false);
  const renderBackdrop = useCallback(
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

  useEffect(() => {
    if (open) {
      sheetRef.current?.present();
      return;
    }
    sheetRef.current?.dismiss();
  }, [open]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        ...styles.sheetBackground,
        backgroundColor: palette.bg.elevated,
        borderColor: palette.border.default,
      }}
      handleIndicatorStyle={{ ...styles.sheetHandle, backgroundColor: palette.border.strong }}
      maxDynamicContentSize={screenHeight * 0.82}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      bottomInset={insets.bottom + 12}
      onDismiss={onClose}
    >
      <BottomSheetView style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleCopy}>
            <Text style={[styles.sheetEyebrow, { color: palette.accent.base }]}>
              {t("member.membership.renewMembership")}
            </Text>
            <Text style={[styles.sheetTitle, { color: palette.text.primary }]}>
              {t("member.membership.choosePlan")}
            </Text>
            <Text style={[styles.sheetBody, { color: palette.text.secondary }]}>
              {t("member.membership.renewalSheetBody", { gym: gymName })}
            </Text>
          </View>
          <Pressable
            testID="membership-renewal-close"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("common.dismiss")}
            style={({ pressed }) => [
              styles.closeButton,
              { borderColor: palette.border.default, backgroundColor: palette.surface.raised },
              pressed ? styles.closeButtonPressed : null,
            ]}
          >
            <Ionicons name="close" size={18} color={palette.text.primary} />
          </Pressable>
        </View>

        <View style={[styles.planSelectorFrame, { maxHeight: maxPlanListHeight }]}>
          <BottomSheetScrollView
            style={styles.planSelectorScroll}
            contentContainerStyle={styles.planSelector}
            showsVerticalScrollIndicator
          >
            {loadingPlans ? <PlansSkeleton /> : null}
            {!loadingPlans && !plans.length ? (
              <Text style={[styles.emptyBody, { color: palette.text.secondary }]}>
                {t("member.membership.noAlternatePlans")}
              </Text>
            ) : null}
            {plans.map((plan) => {
              const selected = selectedPlanId === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => {
                    if (!renewing) setSelectedPlanId(plan.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t("member.membership.selectPlanAccessibility", {
                    plan: plan.name,
                  })}
                  accessibilityState={{ selected, disabled: renewing, busy: selected && renewing }}
                  disabled={renewing}
                  style={({ pressed }) => [
                    styles.planOption,
                    {
                      backgroundColor: selected
                        ? palette.surface.accentSoft
                        : mode === "dark"
                          ? palette.surface.raised
                          : palette.bg.elevated,
                      borderColor: selected ? palette.border.focus : palette.border.default,
                    },
                    pressed && !renewing ? styles.planOptionPressed : null,
                  ]}
                >
                  <View style={styles.planOptionCopy}>
                    <Text style={[styles.planOptionTitle, { color: palette.text.primary }]}>
                      {plan.name}
                    </Text>
                    <Text style={[styles.planOptionMeta, { color: palette.text.secondary }]}>
                      {planTypeLabel(plan.type, t)} · {formatInr(plan.pricePaise)}
                    </Text>
                  </View>
                  {selected && renewing ? (
                    <ActivityIndicator size="small" color={palette.accent.base} />
                  ) : selected ? (
                    <Ionicons name="checkmark-circle" size={20} color={palette.accent.base} />
                  ) : null}
                </Pressable>
              );
            })}
          </BottomSheetScrollView>
          {plans.length > 3 ? (
            <View
              pointerEvents="none"
              style={[
                styles.planScrollHintBottom,
                { backgroundColor: mode === "dark" ? palette.bg.overlay : palette.bg.elevated },
              ]}
            />
          ) : null}
        </View>

        {status ? (
          <Text style={[styles.statusMessage, { color: palette.accent.base }]}>{status}</Text>
        ) : null}
        <View style={styles.sheetActions}>
          <ZookButton
            testID="membership-pay-securely"
            onPress={onRenew}
            disabled={renewing}
            busy={renewing}
            busyLabel={t("member.membership.starting")}
            icon="card-outline"
            style={styles.actionFull}
          >
            {renewing
              ? t("member.membership.starting")
              : selectedAmount
                ? t("member.membership.payAmountNow", { amount: selectedAmount })
                : t("member.membership.payNow")}
          </ZookButton>
        </View>
        {showAutopayPrompt && currentSubscription ? (
          <View style={[styles.autopayDisclosure, { borderColor: palette.border.subtle }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("member.membership.autopayRenewalChoiceTitle")}
              accessibilityState={{ expanded: autopayChoiceOpen }}
              onPress={() => setAutopayChoiceOpen((current) => !current)}
              style={({ pressed }) => [
                styles.autopayDisclosureHeader,
                {
                  backgroundColor: palette.bg.sunken,
                },
                pressed ? styles.autopayDisclosurePressed : null,
              ]}
            >
              <Ionicons name="repeat-outline" size={16} color={palette.text.secondary} />
              <View style={styles.autopayDisclosureCopy}>
                <Text
                  numberOfLines={1}
                  style={[styles.autopayDisclosureTitle, { color: palette.text.primary }]}
                >
                  {t("member.membership.autopayRenewalChoiceTitle")}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.autopayDisclosureBody, { color: palette.text.secondary }]}
                >
                  {t("member.membership.autopayRenewalChoiceBody")}
                </Text>
              </View>
              <Ionicons
                name={autopayChoiceOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={palette.text.secondary}
              />
            </Pressable>
            {autopayChoiceOpen ? (
              <AutopayCard
                autopayBusy={autopayBusy}
                autopayStatus={autopayStatus}
                onEnable={onEnableAutopay}
                subscription={currentSubscription}
                variant="inline"
              />
            ) : null}
          </View>
        ) : null}
        {selectedPlanId && selectedPlanId !== currentPlan?.id ? (
          <Pressable
            testID="membership-switch-now"
            accessibilityRole="button"
            accessibilityLabel={t("member.membership.switchWithoutCheckoutTitle")}
            accessibilityState={{ disabled: renewing, busy: renewing }}
            disabled={renewing}
            onPress={onSwitch}
            style={({ pressed }) => [
              styles.secondarySheetLink,
              { backgroundColor: palette.bg.sunken, borderColor: palette.border.subtle },
              pressed && !renewing ? styles.secondarySheetLinkPressed : null,
            ]}
          >
            {renewing ? <ActivityIndicator size="small" color={palette.text.secondary} /> : null}
            <Ionicons name="swap-horizontal-outline" size={16} color={palette.text.secondary} />
            <View style={styles.secondarySheetLinkCopy}>
              <Text style={[styles.secondarySheetLinkText, { color: palette.text.primary }]}>
                {renewing
                  ? t("member.membership.updating")
                  : t("member.membership.switchWithoutCheckoutTitle")}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.secondarySheetLinkBody, { color: palette.text.secondary }]}
              >
                {t("member.membership.switchWithoutCheckoutBody")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={palette.text.tertiary} />
          </Pressable>
        ) : null}
        {showJoinDifferentGym ? (
          <Pressable
            onPress={() => {
              onClose();
              router.push("/gyms" as never);
            }}
            accessibilityRole="link"
            accessibilityLabel={t("member.membership.joinDifferentGym")}
            style={styles.joinDifferentGymLink}
          >
            <Ionicons name="search-outline" size={14} color={palette.text.secondary} />
            <Text style={[styles.joinDifferentGymText, { color: palette.text.secondary }]}>
              {t("member.membership.joinDifferentGym")}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={palette.text.secondary} />
          </Pressable>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: layout.screenContentTopPadding,
    gap: spacing.lg,
    paddingBottom: layout.bottomNavContentPadding,
  },
  tabbedContent: {
    gap: spacing.md,
  },
  tabPanel: {
    gap: spacing.md,
  },
  membershipStatsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  membershipStatChip: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 2,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  membershipStatValue: {
    ...typography.bodyStrong,
    lineHeight: 19,
  },
  membershipStatLabel: {
    ...typography.caption,
    maxWidth: "100%",
    textAlign: "center",
  },
  headerContext: {
    width: "100%",
  },
  headerBranchSelector: {
    flex: 1,
    minWidth: 190,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calloutContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  calloutCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  calloutTitle: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  calloutBody: {
    ...typography.small,
  },
  browserReturnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  browserReturnCopy: {
    flex: 1,
    minWidth: 190,
    gap: 4,
  },
  browserReturnTitle: {
    ...typography.cardTitle,
  },
  browserReturnBody: {
    ...typography.body,
  },
  browserReturnHint: {
    ...typography.caption,
    lineHeight: 18,
  },
  emptyContent: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyCopy: {
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    ...typography.cardTitle,
  },
  emptyBody: {
    ...typography.body,
    textAlign: "center",
  },
  sheetBackground: {
    borderWidth: 1,
  },
  sheetHandle: {},
  sheet: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    padding: spacing.lg,
    gap: spacing.md,
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
    ...typography.eyebrow,
  },
  sheetTitle: {
    ...typography.headerTitle,
  },
  sheetBody: {
    ...typography.body,
  },
  manageSheetGroup: {
    gap: spacing.sm,
  },
  manageSummaryRow: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  manageSummaryCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  manageSummaryTitle: {
    ...typography.bodyStrong,
  },
  manageSummaryBody: {
    ...typography.small,
  },
  manageQuickActions: {
    flexDirection: "row",
  },
  manageQuickAction: {
    flex: 1,
  },
  manageDisclosure: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  manageDisclosureHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  manageDisclosurePressed: {
    opacity: 0.82,
  },
  manageDisclosureCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  manageDisclosureTitle: {
    ...typography.bodyStrong,
  },
  manageDisclosureBody: {
    ...typography.small,
  },
  manageSheetHelp: {
    ...typography.small,
  },
  manageReasonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  manageReasonChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  manageReasonChipPressed: {
    opacity: 0.82,
  },
  manageReasonText: {
    ...typography.caption,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  planSelector: {
    gap: spacing.sm,
  },
  planSelectorFrame: {
    position: "relative",
  },
  planSelectorScroll: {
    flexGrow: 0,
  },
  planScrollHintBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 20,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  planOption: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
  },
  planOptionPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  planOptionCopy: {
    flex: 1,
    gap: 4,
  },
  planOptionTitle: {
    ...typography.bodyStrong,
  },
  planOptionMeta: {
    ...typography.small,
  },
  statusMessage: {
    ...typography.small,
  },
  joinDifferentGymLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "center",
    paddingVertical: spacing.xs,
  },
  joinDifferentGymText: {
    ...typography.small,
  },
  secondarySheetLink: {
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondarySheetLinkPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },
  secondarySheetLinkCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  secondarySheetLinkText: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  secondarySheetLinkBody: {
    ...typography.small,
  },
  sheetActions: {
    gap: spacing.sm,
  },
  autopayDisclosure: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  autopayDisclosureHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  autopayDisclosurePressed: {
    opacity: 0.82,
  },
  autopayDisclosureCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  autopayDisclosureTitle: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  autopayDisclosureBody: {
    ...typography.caption,
    lineHeight: 14,
  },
  actionFull: {
    width: "100%",
  },
});

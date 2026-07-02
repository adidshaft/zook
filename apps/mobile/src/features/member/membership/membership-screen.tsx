import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  Linking,
  LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Card,
  BranchSelectorChip,
  ScreenHeader,
  QueryErrorState,
  SectionHeader,
  SegmentedControl,
  ZookButton,
  ZookScreen,
  useConfirmSheet,
} from "@/components/primitives";
import {
  ActiveMembershipCard,
  MembershipHistorySection,
  PaymentsSection,
} from "@/components/membership";
import { MembershipSkeleton } from "@/components/skeletons";
import { toWebUrl } from "@/lib/api";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { useAppFocusInvalidation } from "@/lib/app-focus";
import { useBranchSelection } from "@/lib/branch-selection";
import { memberApi, paymentsApi } from "@/lib/domain-api";
import { formatLongDate } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
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
import { maybeRequestReview } from "@/lib/review-prompt";
import { trackEvent } from "@/lib/analytics";
import {
  checkoutUrlWithReturnUrl,
  daysUntil,
  expiringSoonCount,
  pauseDefaultDate,
  pauseMinimumDate,
  pauseReasonOptions,
  planIdFor,
  shouldShowJoinDifferentGym,
  sortMemberships,
} from "./membership-logic";
import { EmptyMembershipCard, MembershipStatsRow } from "./membership-summary-sections";
import { PauseResumeSheet } from "./pause-resume-sheet";
import { RenewalSheet } from "./renewal-sheet";

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

export default function MembershipScreen() {
  const router = useRouter();
  const { mode, palette } = useTheme();
  const { locale, t } = useI18n();
  const { confirm, sheet } = useConfirmSheet();
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
  const sortedSubscriptions = sortMemberships(memberships, routeParams.subscriptionId);
  const latestSubscription = sortedSubscriptions[0];
  const gymUsername =
    latestSubscription?.organization?.username ?? activeOrganization?.username ?? undefined;
  const gymQuery = useGymProfile(gymUsername ?? "");
  const availablePlans = useMemo(() => gymQuery.data?.plans ?? [], [gymQuery.data?.plans]);
  const renewalExpiringSoonCount = expiringSoonCount(memberships);
  const latestDaysLeft = latestSubscription ? daysUntil(latestSubscription.endsAt) : null;
  const membershipStatItems =
    renewalExpiringSoonCount > 0
      ? [{ label: t("member.membership.expiringSoon"), value: renewalExpiringSoonCount }]
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
        void maybeRequestReview("membership");
        void trackEvent("membership_purchase_succeeded");
        return;
      }
      const url = checkoutUrlWithReturnUrl(result.checkoutUrl, result.session?.id ?? token, toWebUrl);
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
        void trackEvent("membership_purchase_started");
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
        toWebUrl,
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
    confirm({
      title: t("member.membership.pauseConfirmTitle"),
      body: t("member.membership.pauseConfirmBody", {
        date: formatLongDate(pauseResumesAt.toISOString(), undefined, locale),
      }),
      destructiveLabel: t("member.membership.pause"),
      cancelLabel: t("common.cancel"),
      onConfirm: () => void performPauseOrResume(subscription),
    });
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
    confirm({
      title: t("member.membership.cancelConfirmTitle"),
      body: t("member.membership.cancelConfirmBody"),
      destructiveLabel: t("member.membership.cancelMembership"),
      cancelLabel: t("member.membership.keepMembership"),
      onConfirm: () => void performCancelMembership(subscription),
    });
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
          <ScreenHeader
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
            <MembershipStatsRow items={membershipStatItems} />
          ) : null}

          {membershipsQuery.isError ? (
            <QueryErrorState error={membershipsQuery.error} onRetry={() => void onRefresh()} />
          ) : null}

          {invoicesQuery.isError ? (
            <QueryErrorState error={invoicesQuery.error} onRetry={() => void onRefresh()} />
          ) : null}

          {!membershipsQuery.isLoading && !memberships.length ? (
            <EmptyMembershipCard
              title={t("member.membership.noMemberships")}
              body={t("member.membership.browseGymsBody")}
              cta={t("member.membership.findGyms")}
            />
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
          <PauseResumeSheet
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
      {sheet}
    </>
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
});

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
  IconBubble,
  AppHeader,
  MoneySummaryCard,
  SectionHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherChip } from "@/components/role-switcher";
import {
  ActiveMembershipCard,
  AutopayCard,
  MembershipHistorySection,
  PaymentsSection,
} from "@/components/membership";
import { MembershipSkeleton, PlansSkeleton } from "@/components/skeletons";
import { toWebUrl } from "@/lib/api";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { useAppFocusInvalidation } from "@/lib/app-focus";
import { useBranchSelection } from "@/lib/branch-selection";
import { memberApi, paymentsApi } from "@/lib/domain-api";
import { formatInr, formatLongDate, formatVisitLimit, titleCaseFromCode } from "@/lib/formatting";
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

function planIdFor(subscription?: MembershipRecord | null) {
  return subscription?.plan?.id ?? subscription?.planId ?? undefined;
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
  const activeCount = memberships.filter((s) => s.status === "ACTIVE").length;
  const expiringSoonCount = memberships.filter((s) => {
    if (s.status !== "ACTIVE" || !s.endsAt) return false;
    const days = daysUntil(s.endsAt);
    return days !== null && days <= 30;
  }).length;
  const latestDaysLeft = latestSubscription ? daysUntil(latestSubscription.endsAt) : null;
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [renewalTarget, setRenewalTarget] = useState<MembershipRecord | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();
  const [renewalStatus, setRenewalStatus] = useState("");
  const [renewing, setRenewing] = useState(false);
  const [autopayStatus, setAutopayStatus] = useState("");
  const [autopayBusy, setAutopayBusy] = useState(false);
  const [membershipActionStatus, setMembershipActionStatus] = useState("");
  const [membershipActionBusy, setMembershipActionBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [waitingCheckoutSessionId, setWaitingCheckoutSessionId] = useState<string | null>(null);
  const [checkingCheckoutStatus, setCheckingCheckoutStatus] = useState(false);
  const [documentBusyKey, setDocumentBusyKey] = useState<string | null>(null);
  const [pauseResumesAt, setPauseResumesAt] = useState(() => pauseDefaultDate());
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

  function registerSectionOffset(section: "active" | "history" | "payments", event: LayoutChangeEvent) {
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
    setRenewalStatus("Checking payment status...");
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
  }, [queryClient]);

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
      if (!scrollToSection(sortedSubscriptions.length > 1 ? "history" : "payments")) {
        return;
      }
      handledFocusRef.current = focusTarget;
      return;
    }
    if (focusTarget === "payments") {
      if (!scrollToSection("payments")) {
        return;
      }
      handledFocusRef.current = focusTarget;
      return;
    }
    if (focusTarget === "membership") {
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
        setRenewalStatus("Renewal confirmed.");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
          queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
        ]);
        setRenewalOpen(false);
        return;
      }
      const url = checkoutUrlWithReturnUrl(result.checkoutUrl, result.session?.id ?? token);
      setRenewalStatus(url ? "Continuing in your browser." : "Renewal request sent.");
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
        setAutopayStatus("Autopay is active.");
        await queryClient.invalidateQueries({ queryKey: ["me", "memberships"] });
        return;
      }
      setAutopayStatus("Continuing in your browser.");
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
      setAutopayStatus("Autopay cancelled.");
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
      setRenewalStatus("Plan switched.");
      showToast({ tone: "success", haptic: "success", message: "Plan switched." });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
      setRenewalOpen(false);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setRenewalStatus(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
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
      "Pause membership?",
      `Your access stays frozen until ${formatLongDate(pauseResumesAt.toISOString())}. You can resume anytime before then.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Pause", style: "destructive", onPress: () => void performPauseOrResume(subscription) },
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
        setMembershipActionStatus("Membership resumed.");
        showToast({ tone: "success", haptic: "success", message: "Membership resumed." });
      } else {
        await memberApi.pauseMembership({
          token,
          ...(activeOrgId ? { orgId: activeOrgId } : {}),
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
          subscriptionId: subscription.id,
          resumesAt: pauseResumesAt.toISOString(),
          reason: "Member selected a membership pause date from mobile.",
        });
        setMembershipActionStatus(`Membership paused until ${formatLongDate(pauseResumesAt.toISOString())}.`);
        showToast({
          tone: "success",
          haptic: "success",
          message: `Paused until ${formatLongDate(pauseResumesAt.toISOString())}.`,
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
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
    } finally {
      setMembershipActionBusy(false);
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
        message: kind === "receipt" ? "Receipt generated." : "Invoice generated.",
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      showToast({
        title: kind === "receipt" ? "Receipt unavailable" : "Invoice unavailable",
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
          contentInsetAdjustmentBehavior="never"
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
            eyebrow="Membership"
            title="Your plans"
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherChip />
                <BranchSelectorChip />
              </View>
            }
            subtitle={
              memberships.length
                ? `${activeCount} active · ${expiringSoonCount} expiring soon · ${memberships.length} total`
                : "No active plans"
            }
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                accessibilityRole="button"
                accessibilityLabel="Back"
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
              <IconBubble
                icon={
                  focusTarget === "history" || focusTarget === "payments"
                    ? "receipt-outline"
                    : focusTarget === "buy" || focusTarget === "checkout"
                      ? "card-outline"
                      : "notifications"
                }
                tone={focusTarget === "buy" || focusTarget === "checkout" ? "blue" : "neutral"}
                size={36}
              />
              <View style={styles.calloutCopy}>
                <Text style={[styles.calloutTitle, { color: palette.text.primary }]}>
                  {focusTarget === "buy"
                    ? "Choose a plan"
                    : focusTarget === "checkout"
                      ? "Continue checkout"
                      : focusTarget === "history"
                        ? "Membership history"
                        : focusTarget === "payments"
                          ? "Payment documents"
                          : "Membership update"}
                </Text>
                <Text style={[styles.calloutBody, { color: palette.text.secondary }]}>
                  {focusTarget === "buy" || focusTarget === "checkout"
                    ? latestSubscription
                      ? "We opened the renewal flow for this membership."
                      : "Browse gyms and purchase a membership to get started."
                    : focusTarget === "history"
                      ? "Jumped to your previous memberships and payment trail."
                      : focusTarget === "payments"
                        ? "Receipts and invoices are below."
                        : routeParams.subscriptionId
                          ? "Your subscription has been updated."
                          : "Membership status is below."}
                </Text>
              </View>
            </Card>
          ) : null}

          {waitingCheckoutSessionId ? (
            <Card variant="compact" contentStyle={styles.browserReturnContent}>
              <IconBubble icon="open-outline" tone="neutral" size={36} />
              <View style={styles.browserReturnCopy}>
                <Text style={[styles.browserReturnTitle, { color: palette.text.primary }]}>Continuing in your browser</Text>
                <Text style={[styles.browserReturnBody, { color: palette.text.secondary }]}>
                  Return after checkout. Zook refreshes your membership when you come back.
                </Text>
              </View>
              <ZookButton
                variant="secondary"
                disabled={checkingCheckoutStatus}
                onPress={() => void refreshMembershipAfterCheckout()}
                icon="refresh-outline"
              >
                {checkingCheckoutStatus ? "Checking..." : "Check status"}
              </ZookButton>
            </Card>
          ) : null}

          {membershipsQuery.isLoading ? <MembershipSkeleton /> : null}

          {!membershipsQuery.isLoading && !memberships.length ? (
            <Card variant="compact" contentStyle={styles.emptyContent}>
              <IconBubble icon="card-outline" tone="neutral" size={42} />
              <View style={styles.emptyCopy}>
                <Text style={[styles.emptyTitle, { color: palette.text.primary }]}>No memberships</Text>
                <Text style={[styles.emptyBody, { color: palette.text.secondary }]}>
                  Browse gyms and purchase a membership to get started.
                </Text>
              </View>
              <ZookButton testID="membership-find-gyms" href="/gyms" icon="search-outline">
                Find gyms
              </ZookButton>
            </Card>
          ) : null}

          {latestSubscription ? (
            <View onLayout={(event) => registerSectionOffset("active", event)}>
              <SectionHeader title="Active plan" />
              <ActiveMembershipCard
                activeOrganizationName={activeOrganization?.name}
                actionBusy={membershipActionBusy}
                actionStatus={membershipActionStatus}
                daysLeft={latestDaysLeft}
                onOpenRenewal={openRenewal}
                onPauseDateChange={setPauseResumesAt}
                onPauseOrResume={(subscription) => void pauseOrResumeMembership(subscription)}
                pauseMinimumDate={pauseMinimumDate}
                pauseResumesAt={pauseResumesAt}
                subscription={latestSubscription}
              />

              <AutopayCard
                autopayBusy={autopayBusy}
                autopayStatus={autopayStatus}
                onCancel={(subscription) => void cancelAutopay(subscription)}
                onEnable={(subscription) => void enableAutopay(subscription)}
                subscription={latestSubscription}
              />
            </View>
          ) : null}

          <View onLayout={(event) => registerSectionOffset("history", event)}>
            <MembershipHistorySection subscriptions={sortedSubscriptions} />
          </View>

          <View onLayout={(event) => registerSectionOffset("payments", event)}>
            <PaymentsSection
              documentBusyKey={documentBusyKey}
              invoices={invoices}
              onCreateDocument={(payment, kind) => void createPaymentDocument(payment, kind)}
              onDownloadInvoice={(invoice) => void downloadInvoice(invoice)}
              payments={payments}
            />
          </View>
        </ScrollView>
        <RenewalSheet
          availablePlans={availablePlans}
          currentPlan={renewalTarget?.plan ?? null}
          gymName={renewalTarget?.organization?.name ?? activeOrganization?.name ?? "your gym"}
          loadingPlans={gymQuery.isLoading}
          onClose={closeRenewal}
          onRenew={() => void renewMembership()}
          onSwitch={() => void switchMembershipNow()}
          open={renewalOpen}
          renewing={renewing || membershipActionBusy}
          selectedPlan={selectedPlan}
          selectedPlanId={selectedPlanId}
          setSelectedPlanId={setSelectedPlanId}
          status={renewalStatus}
        />
      </ZookScreen>
    </>
  );
}

function RenewalSheet({
  availablePlans,
  currentPlan,
  gymName,
  loadingPlans,
  onClose,
  onRenew,
  onSwitch,
  open,
  renewing,
  selectedPlan,
  selectedPlanId,
  setSelectedPlanId,
  status,
}: {
  availablePlans: PublicPlanSummary[];
  currentPlan: MembershipRecord["plan"];
  gymName: string;
  loadingPlans: boolean;
  onClose: () => void;
  onRenew: () => void;
  onSwitch: () => void;
  open: boolean;
  renewing: boolean;
  selectedPlan: PublicPlanSummary | MembershipRecord["plan"] | null;
  selectedPlanId?: string;
  setSelectedPlanId: (planId: string) => void;
  status: string;
}) {
  const insets = useSafeAreaInsets();
  const { mode, palette } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["CONTENT_HEIGHT"], []);
  const maxPlanListHeight = Math.min(420, Math.max(240, screenHeight * 0.36));
  const plans = availablePlans.length
    ? availablePlans
    : currentPlan?.id
      ? [currentPlan as PublicPlanSummary]
      : [];
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
            <Text style={[styles.sheetEyebrow, { color: palette.accent.base }]}>Renew membership</Text>
            <Text style={[styles.sheetTitle, { color: palette.text.primary }]}>
              {selectedPlan?.name ?? currentPlan?.name ?? "Current plan"}
            </Text>
            <Text style={[styles.sheetBody, { color: palette.text.secondary }]}>
              Continue at {gymName} with the same plan or choose another available option.
            </Text>
          </View>
          <Pressable
            testID="membership-renewal-close"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
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
                No alternate plans are published. Same-plan renewal is requested.
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
                  accessibilityLabel={`Select ${plan.name}`}
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
                    <Text style={[styles.planOptionTitle, { color: palette.text.primary }]}>{plan.name}</Text>
                    <Text style={[styles.planOptionMeta, { color: palette.text.secondary }]}>
                      {titleCaseFromCode(plan.type ?? "MEMBERSHIP")} · {formatInr(plan.pricePaise)}
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

        {selectedPlan ? (
          <MoneySummaryCard
            title="Renewal summary"
            amount={formatInr("pricePaise" in selectedPlan ? selectedPlan.pricePaise : 0)}
            rows={[
              { label: "Plan", value: selectedPlan.name ?? currentPlan?.name ?? "Selected plan" },
              {
                label: "Validity",
                value: selectedPlan.durationDays
                  ? `${selectedPlan.durationDays} days`
                  : "Gym-defined validity",
              },
              {
                label: "Visits",
                value: formatVisitLimit(selectedPlan.visitLimit),
              },
            ]}
            consequence="The renewed membership activates after payment confirmation from the payment service or gym desk."
          />
        ) : null}

        {status ? <Text style={[styles.statusMessage, { color: palette.accent.base }]}>{status}</Text> : null}
        <View style={styles.sheetActions}>
          <ZookButton
            testID="membership-renewal-cancel"
            variant="secondary"
            onPress={onClose}
            style={styles.actionHalf}
          >
            Cancel
          </ZookButton>
          {selectedPlanId && selectedPlanId !== currentPlan?.id ? (
            <ZookButton
              testID="membership-switch-now"
              variant="secondary"
              onPress={onSwitch}
              disabled={renewing}
              busy={renewing}
              busyLabel="Updating"
              icon="swap-horizontal-outline"
              style={styles.actionHalf}
            >
              {renewing ? "Updating..." : "Switch now"}
            </ZookButton>
          ) : null}
          <ZookButton
            testID="membership-pay-securely"
            onPress={onRenew}
            disabled={renewing}
            busy={renewing}
            busyLabel="Starting"
            icon="refresh-outline"
            style={styles.actionHalf}
          >
            {renewing ? "Starting..." : "Pay securely"}
          </ZookButton>
        </View>
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
  headerContext: {
    alignItems: "flex-start",
    gap: spacing.xs,
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
    gap: spacing.md,
  },
  calloutCopy: {
    flex: 1,
    gap: 4,
  },
  calloutTitle: {
    ...typography.cardTitle,
  },
  calloutBody: {
    ...typography.body,
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
  sheetHandle: {
  },
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
  sheetActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionHalf: {
    flex: 1,
    minWidth: 130,
  },
});

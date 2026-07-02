import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
} from "react-native";
import {
  EmptyState,
  Card,
  ScreenHeader,
  PrimaryButton,
  QueryErrorState,
  useRequestPermissionWithRationale,
  ZookScreen,
} from "@/components/primitives";
import { GymDetailSkeleton } from "@/components/skeletons";
import { GymBranchSelector } from "@/features/member/gym/gym-branch-selector";
import { GymHeroCard } from "@/features/member/gym/gym-hero-card";
import { GymJoinDisclosure } from "@/features/member/gym/gym-join-disclosure";
import { GymNextActionCard } from "@/features/member/gym/gym-next-action-card";
import { GymOverviewSection } from "@/features/member/gym/gym-overview-section";
import {
  GymProfileTabs,
  type GymProfileTab,
} from "@/features/member/gym/gym-profile-tabs";
import {
  effectivePlanPrice,
  GymPlansSection,
} from "@/features/member/gym/gym-plans-section";
import {
  gymImageSource,
  seededGymImageSource,
  seededGymMedia,
} from "@/features/member/gym/gym-profile-media";
import { GymReviews } from "@/features/member/gym/gym-reviews";
import { GymTrainerSheetContent } from "@/features/member/gym/gym-trainer-sheet-content";
import { GalleryViewer } from "@/features/member/gym/gallery-viewer";
import { useGymDistanceKm } from "@/lib/use-gym-distance";
import { normalizeWebUrl, toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { gymApi } from "@/lib/domain-api";
import { gymBrandColor, seededGymLogoDataUri } from "@/lib/gym-brand";
import {
  formatBranchName,
  formatGymHeaderIdentity,
  formatInr,
  formatLongDate,
  joinModeLabel,
  joinModeTone,
} from "@/lib/formatting";
import { useGymProfile, type GymProfileData } from "@/lib/domains";
import { useI18n } from "@/lib/i18n";
import { usePushNotifications } from "@/lib/push-notifications";
import { layout, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type PublicTrainer = NonNullable<GymProfileData["trainers"]>[number];
type Translate = ReturnType<typeof useI18n>["t"];

export default function GymProfileScreen() {
  const router = useRouter();
  const notificationPermission = useRequestPermissionWithRationale("notifications");
  const { permissionState, requestEnablePush } = usePushNotifications();
  const params = useLocalSearchParams<{ username: string; ref?: string; intent?: string }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const referralCode = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const intent = Array.isArray(params.intent) ? params.intent[0] : params.intent;
  const { token } = useAuth();
  const { locale, t } = useI18n();
  const { palette } = useTheme();
  const { selectedBranchId } = useBranchSelection();
  const queryClient = useQueryClient();
  const gymQuery = useGymProfile(username ?? "");
  const statusMessageKey = useMemo(() => ["gym", username, "status-message"], [username]);
  const statusMessageQuery = useQuery({
    queryKey: statusMessageKey,
    queryFn: async () => null as string | null,
    initialData: null as string | null,
    enabled: false,
    staleTime: Infinity,
  });
  const statusMessage = statusMessageQuery.data ?? null;
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<PublicTrainer | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [inviteCode, setInviteCode] = useState(referralCode ?? "");
  const [profileTab, setProfileTab] = useState<GymProfileTab>("plans");
  const [selectedProfileBranchId, setSelectedProfileBranchId] = useState<string | null>(null);
  const [selectedCheckoutPlanId, setSelectedCheckoutPlanId] = useState<string | null>(null);
  const [joinStepsExpanded, setJoinStepsExpanded] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const refreshAfterCheckoutRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const usernameRef = useRef(username);
  const defaultedProfileTabForGymRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const trainerSheetRef = useRef<BottomSheetModal>(null);
  const trainerSnapPoints = useMemo(() => ["44%"], []);

  const gym = gymQuery.data?.org ?? null;
  const gymBrand = gymBrandColor(gym?.name);
  const plans = useMemo(() => gymQuery.data?.plans ?? [], [gymQuery.data?.plans]);
  const trainers = useMemo(() => gymQuery.data?.trainers ?? [], [gymQuery.data?.trainers]);
  const demoMedia = seededGymMedia(gym?.username);
  const demoCoverImageUrl = demoMedia.coverImageUrl;
  const demoLogoUrl = demoMedia.logoUrl;
  const demoGallery = demoMedia.gallery;
  const rawCoverImageUrl = gym?.coverImageUrl ?? demoCoverImageUrl;
  const gallery = gym?.gallery?.length
    ? gym.gallery
    : demoGallery.length
      ? demoGallery
      : rawCoverImageUrl
        ? [rawCoverImageUrl]
        : [];
  const coverImageUrl = normalizeWebUrl(rawCoverImageUrl);
  const logoUrl = normalizeWebUrl(gym?.logoUrl ?? demoLogoUrl);
  const coverImageSource = seededGymImageSource(rawCoverImageUrl) ?? (coverImageUrl ? { uri: coverImageUrl } : null);
  const logoImageUrl = seededGymLogoDataUri(gym?.logoUrl ?? demoLogoUrl) ?? logoUrl;
  const showLogoImage = Boolean(logoImageUrl && !logoLoadFailed);
  const shareGym = useCallback(async () => {
    if (!gym?.username) return;
    const url = toWebUrl(`/g/${gym.username}`);
    await Share.share({
      message: `Check out ${gym.name} on Zook - ${url}`,
      url,
    });
  }, [gym?.name, gym?.username]);
  const viewerState = gymQuery.data?.viewerState;
  const profileBranches = useMemo(() => gymQuery.data?.branches ?? [], [gymQuery.data?.branches]);
  const defaultGymBranchId =
    profileBranches.find((branch) => branch.id === selectedBranchId)?.id ??
    profileBranches.find((branch) => branch.isDefault)?.id ??
    profileBranches[0]?.id;
  const selectedGymBranchId =
    profileBranches.find((branch) => branch.id === selectedProfileBranchId)?.id ??
    defaultGymBranchId;
  const selectedGymBranch =
    profileBranches.find((branch) => branch.id === selectedGymBranchId) ?? null;
  const selectedBranchLatitude = selectedGymBranch?.latitude ?? gym?.latitude ?? null;
  const selectedBranchLongitude = selectedGymBranch?.longitude ?? gym?.longitude ?? null;
  const distanceKm = useGymDistanceKm(selectedBranchLatitude, selectedBranchLongitude);
  const distanceLabel = formatGymDistance(distanceKm, t);
  const effectiveReferral = referralCode ?? gymQuery.data?.referral?.code ?? undefined;
  const leadPlan = plans[0] ?? null;
  const selectedCheckoutPlan =
    plans.find((plan) => plan.id === selectedCheckoutPlanId) ?? leadPlan;
  const selectedCheckoutPlanPrice = effectivePlanPrice(selectedCheckoutPlan);
  const joinIntentActive = intent === "join" && Boolean(gym) && !viewerState?.activeMembership;
  const joinSteps = gym ? buildJoinSteps(gym.joinMode, t, effectiveReferral) : [];

  function openDirections() {
    if (!gym) return;
    const providedMapsUrl = normalizeWebUrl(selectedGymBranch?.googleMapsUrl);
    if (providedMapsUrl) {
      void Linking.openURL(providedMapsUrl);
      return;
    }
    const fallbackAddress = compactAddressParts(
      selectedGymBranch?.address ?? gym.address,
      selectedGymBranch?.city ?? gym.city,
      selectedGymBranch?.state ?? gym.state,
      gym.name,
    );
    const query =
      selectedBranchLatitude != null && selectedBranchLongitude != null
        ? `${selectedBranchLatitude},${selectedBranchLongitude}`
        : fallbackAddress;
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
  }
  const gymIdentity = formatGymHeaderIdentity({
    address: selectedGymBranch?.address ?? gym?.address,
    branchName: selectedGymBranch?.name,
    city: selectedGymBranch?.city ?? gym?.city,
    orgCity: gym?.city,
    orgName: gym?.name,
  });
  const gymLocalityLabel =
    gymIdentity.subtitle ?? (gym ? [gym.city, gym.state].filter(Boolean).join(", ") : undefined);
  const selectedBranchDisplayName =
    formatBranchName(gym?.name, selectedGymBranch?.name, {
      collapseOrgMatch: true,
      fallback: selectedGymBranch?.city ?? t("branch.current"),
    }) ?? selectedGymBranch?.name;
  const selectedBranchCompactName = compactBranchName(gym?.name, selectedBranchDisplayName);
  const branchSelectorVisible = profileBranches.length > 1;
  const alternateProfileBranches = profileBranches.filter((branch) => branch.id !== selectedGymBranchId);
  const selectedLocationTitle = branchSelectorVisible
    ? selectedBranchCompactName || selectedBranchDisplayName || gymIdentity.title
    : t("gymProfile.gettingThere");
  const selectedLocationAddress = compactAddressPartsExcluding(
    [selectedLocationTitle, selectedBranchDisplayName, selectedBranchCompactName],
    selectedGymBranch?.address ?? gym?.address,
    selectedGymBranch?.city ?? gym?.city,
    selectedGymBranch?.state ?? gym?.state,
  );
  const selectedLocationMeta = [selectedLocationAddress || gymLocalityLabel, distanceLabel]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    if (!defaultGymBranchId) {
      setSelectedProfileBranchId(null);
      return;
    }
    setSelectedProfileBranchId((current) =>
      profileBranches.some((branch) => branch.id === current) ? current : defaultGymBranchId,
    );
  }, [defaultGymBranchId, profileBranches]);

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [logoUrl]);

  useEffect(() => {
    if (!plans.length) {
      setSelectedCheckoutPlanId(null);
      return;
    }
    setSelectedCheckoutPlanId((current) =>
      plans.some((plan) => plan.id === current) ? current : plans[0]?.id ?? null,
    );
  }, [plans]);

  useEffect(() => {
    const gymKey = gym?.username ?? username ?? null;
    const defaultProfileTab = viewerState?.activeMembership ? "overview" : "plans";
    const defaultProfileTabKey = gymKey ? `${gymKey}:${defaultProfileTab}` : null;
    if (!gymKey || defaultedProfileTabForGymRef.current === defaultProfileTabKey) {
      return;
    }
    setProfileTab(defaultProfileTab);
    defaultedProfileTabForGymRef.current = defaultProfileTabKey;
  }, [gym?.username, username, viewerState?.activeMembership]);

  const setStatusMessage = useCallback(
    (message: string | null) => {
      queryClient.setQueryData(statusMessageKey, message);
    },
    [queryClient, statusMessageKey],
  );

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const renderTrainerBackdrop = useCallback(
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

  function openTrainerSheet(trainer: PublicTrainer) {
    setSelectedTrainer(trainer);
    trainerSheetRef.current?.present();
  }

  function applyInviteCode() {
    const normalized = inviteCode.trim().toUpperCase();
    if (!username || !normalized) {
      return;
    }
    router.replace({ pathname: "/gyms/[username]", params: { username, ref: normalized } });
  }

  function selectCheckoutPlan(planId: string, options?: { revealCheckout?: boolean }) {
    setSelectedCheckoutPlanId(planId);
    if (options?.revealCheckout) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasAway = appStateRef.current === "inactive" || appStateRef.current === "background";
      appStateRef.current = nextState;
      if (nextState !== "active" || !wasAway || !refreshAfterCheckoutRef.current) {
        return;
      }
      refreshAfterCheckoutRef.current = false;
      setStatusMessage(t("gymProfile.updatingMembershipStatus"));
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
        queryClient.invalidateQueries({ queryKey: ["gym", usernameRef.current] }),
      ]).finally(() => {
        if (mountedRef.current) {
          setStatusMessage(null);
        }
      });
    });
    return () => subscription.remove();
  }, [queryClient, setStatusMessage, t]);

  async function requestMembership() {
    if (!gym) {
      return;
    }
    if (!token) {
      const redirectPath = `/gyms/${username}${effectiveReferral ? `?ref=${effectiveReferral}` : ""}`;
      const redirect = encodeURIComponent(redirectPath);
      router.push(`/login?redirect=${redirect}` as never);
      return;
    }
    setBusyAction("join-request");
    setStatusMessage(null);
    try {
      await gymApi.requestMembership({
        orgId: gym.id,
        token,
        ...(selectedGymBranchId ? { branchId: selectedGymBranchId } : {}),
        ...(selectedCheckoutPlan?.id ? { planId: selectedCheckoutPlan.id } : {}),
        ...(effectiveReferral ? { referralCode: effectiveReferral } : {}),
      });
      setStatusMessage(t("gymProfile.membershipRequestSubmittedBody"));
      showToast({
        tone: "success",
        haptic: "success",
        message: t("gymProfile.membershipRequestSubmitted"),
      });
      if (permissionState !== "granted") {
        const granted = await notificationPermission.requestPermission();
        if (granted) {
          await requestEnablePush();
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["gym", username] });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("gymProfile.unableSubmitMembershipRequest");
      setStatusMessage(message);
      showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  async function startCheckout(planId: string) {
    if (!gym) {
      return;
    }
    if (!token) {
      const redirectPath = `/gyms/${username}${effectiveReferral ? `?ref=${effectiveReferral}` : ""}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}` as never);
      return;
    }
    setBusyAction(planId);
    setStatusMessage(null);
    try {
      const payload = await gymApi.createSubscriptionCheckout({
        orgId: gym.id,
        token,
        planId,
        ...(selectedGymBranchId ? { branchId: selectedGymBranchId } : {}),
        ...(effectiveReferral ? { referralCode: effectiveReferral } : {}),
      });
      setStatusMessage(t("gymProfile.paymentStarted"));
      refreshAfterCheckoutRef.current = true;
      await Linking.openURL(checkoutUrlWithReturnUrl(payload.checkoutUrl, payload.session?.id));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["gym", username] }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("gymProfile.unableStartPayment");
      setStatusMessage(message);
      showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  const needsApproval = gym?.joinMode === "APPROVAL_REQUIRED";
  const inviteOnlyLocked = gym?.joinMode === "INVITE_ONLY" && !effectiveReferral;
  const canCheckout = (planId: string) =>
    !viewerState?.activeMembership &&
    !inviteOnlyLocked &&
    (!needsApproval || Boolean(viewerState?.approvedJoinRequest)) &&
    Boolean(planId);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["gym", username] }),
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const nextActionCard = viewerState?.activeMembership ? null : (
    <GymNextActionCard
      approvedJoinRequest={Boolean(viewerState?.approvedJoinRequest)}
      busyAction={busyAction}
      canCheckoutSelectedPlan={
        selectedCheckoutPlan ? canCheckout(selectedCheckoutPlan.id) : false
      }
      inviteCode={inviteCode}
      inviteOnlyLocked={inviteOnlyLocked}
      needsApproval={needsApproval}
      onApplyInviteCode={applyInviteCode}
      onInviteCodeChange={setInviteCode}
      onRequestMembership={() => void requestMembership()}
      onStartCheckout={(planId) => void startCheckout(planId)}
      pendingJoinRequest={Boolean(viewerState?.pendingJoinRequest)}
      selectedCheckoutPlan={selectedCheckoutPlan}
      selectedCheckoutPlanPrice={selectedCheckoutPlanPrice}
    />
  );

  return (
    <ZookScreen testID="gym-profile-screen">
      <ScrollView
        ref={scrollRef}
        style={styles.scroller}
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
        {!gym ? (
          <ScreenHeader
            eyebrow={t("gymProfile.eyebrow")}
            title={t("gymProfile.membershipProfile")}
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                accessibilityRole="button"
                accessibilityLabel={t("shop.back")}
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: palette.surface.raised, borderColor: palette.border.default },
                  pressed ? styles.iconButtonPressed : null,
                ]}
              >
                <Ionicons name="chevron-back" size={21} color={palette.text.primary} />
              </Pressable>
            }
            showProfileShortcut={false}
          />
        ) : null}

        {gymQuery.isLoading ? <GymDetailSkeleton /> : null}

        {gymQuery.isError ? (
          <Card variant="compact">
            <QueryErrorState
              error={gymQuery.error}
              onRetry={() => void gymQuery.refetch()}
              title={t("gymProfile.couldNotLoad")}
            />
          </Card>
        ) : null}

        {!gymQuery.isLoading && !gymQuery.isError && !gym ? (
          <EmptyState
            title={t("gymProfile.notFound")}
            body={t("gymProfile.notFoundBody")}
            action={<PrimaryButton href="/gyms">{t("findGyms.title")}</PrimaryButton>}
          />
        ) : null}

        {gym ? (
          <>
            <GymHeroCard
              activeMembershipLabel={
                viewerState?.activeMembership
                  ? viewerState.activeMembership.endsAt
                    ? t("gymProfile.activeUntil", {
                        date: formatLongDate(viewerState.activeMembership.endsAt),
                      })
                    : t("gymProfile.alreadyActive")
                  : null
              }
              approvedJoinRequestLabel={
                viewerState?.approvedJoinRequest
                  ? viewerState.approvedJoinRequest.reviewedAt
                    ? t("gymProfile.approvedDate", {
                        date: formatLongDate(viewerState.approvedJoinRequest.reviewedAt),
                      })
                    : t("gymProfile.approvedForPayment")
                  : null
              }
              backLabel={t("common.back")}
              coverImageSource={coverImageSource}
              effectiveReferral={effectiveReferral}
              gymBrand={gymBrand}
              gymName={gym.name}
              identityTitle={gymIdentity.title}
              joinModePill={localizedJoinModeLabel(gym.joinMode, t)}
              joinModeTone={joinModeTone(gym.joinMode)}
              leadPlanPriceLabel={leadPlan ? formatInr(effectivePlanPrice(leadPlan)) : null}
              localityLabel={gymLocalityLabel}
              logoImageUrl={logoImageUrl}
              openingHoursSummary={gym.openingHoursSummary}
              pendingJoinRequestLabel={
                viewerState?.pendingJoinRequest
                  ? t("gymProfile.pendingSince", {
                      date: formatLongDate(viewerState.pendingJoinRequest.createdAt),
                    })
                  : null
              }
              referralAppliedLabel={t("gymProfile.referralApplied")}
              shareLabel={t("gymProfile.shareProfile")}
              showLogoImage={showLogoImage}
              tagline={localizedGymTagline(
                gym.tagline,
                gym.gymType,
                gym.city,
                gym.state,
                locale,
                t,
              )}
              viewerHasActiveMembership={Boolean(viewerState?.activeMembership)}
              onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              onLogoError={() => setLogoLoadFailed(true)}
              onShare={() => void shareGym()}
            />

            <GymBranchSelector
              alternateBranches={alternateProfileBranches}
              branchSelectorVisible={branchSelectorVisible}
              gymName={gym.name}
              onOpenDirections={openDirections}
              onSelectBranch={setSelectedProfileBranchId}
              selectedLocationMeta={selectedLocationMeta}
              selectedLocationTitle={selectedLocationTitle}
            />

            {joinIntentActive ? nextActionCard : null}

            {joinIntentActive ? null : nextActionCard}

            <GymProfileTabs
              activeTab={profileTab}
              items={[
                { key: "plans", label: t("nav.plans") },
                { key: "overview", label: t("gymProfile.overview") },
                { key: "reviews", label: t("gymReviews.reviews") },
              ]}
              onSelectTab={setProfileTab}
            />

            {profileTab === "plans" ? (
              <GymPlansSection
                activeMembership={Boolean(viewerState?.activeMembership)}
                effectiveReferral={effectiveReferral}
                inviteOnlyLocked={inviteOnlyLocked}
                locale={locale}
                needsApproval={needsApproval}
                plans={plans}
                selectedCheckoutPlanId={selectedCheckoutPlan?.id ?? null}
                onSelectPlan={(planId) => selectCheckoutPlan(planId, { revealCheckout: true })}
              />
            ) : null}

            {profileTab === "overview" ? (
              <GymOverviewSection
                gallery={gallery}
                gym={gym}
                imageSource={gymImageSource}
                trainers={trainers}
                onOpenGallery={setGalleryIndex}
                onOpenTrainer={openTrainerSheet}
              />
            ) : null}

            {profileTab === "reviews" ? (
              <GymReviews orgId={gym.id} />
            ) : null}

            {profileTab === "plans" ? (
              <GymJoinDisclosure
                expanded={joinStepsExpanded}
                onToggle={() => setJoinStepsExpanded((current) => !current)}
                steps={joinSteps}
                eyebrow={t("gymProfile.joinPath")}
                title={t("gymProfile.howToJoin")}
              />
            ) : null}

            {statusMessage ? (
              <Card testID="gym-status-message" variant="compact">
                <Text style={[styles.statusMessage, { color: palette.text.primary }]}>
                  {statusMessage}
                </Text>
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <BottomSheetModal
        ref={trainerSheetRef}
        snapPoints={trainerSnapPoints}
        enablePanDownToClose
        backdropComponent={renderTrainerBackdrop}
        backgroundStyle={{
          ...styles.sheetBackground,
          backgroundColor: palette.bg.elevated,
          borderColor: palette.border.default,
        }}
        handleIndicatorStyle={{ ...styles.sheetHandle, backgroundColor: palette.border.strong }}
        onDismiss={() => setSelectedTrainer(null)}
      >
        <BottomSheetView>
          <GymTrainerSheetContent trainer={selectedTrainer} />
        </BottomSheetView>
      </BottomSheetModal>
      <GalleryViewer
        images={gallery}
        sourceForImage={gymImageSource}
        initialIndex={galleryIndex}
        onClose={() => setGalleryIndex(null)}
      />
      {notificationPermission.permissionSheet}
    </ZookScreen>
  );
}

function buildJoinSteps(joinMode: string, t: Translate, referralCode?: string) {
  if (joinMode === "APPROVAL_REQUIRED") {
    return [
      {
        title: t("gymProfile.stepSendRequest"),
        body: t("gymProfile.stepSendRequestBody"),
      },
      {
        title: t("gymProfile.stepStaffReview"),
        body: t("gymProfile.stepStaffReviewBody"),
      },
      {
        title: t("gymProfile.stepActivatePlan"),
        body: t("gymProfile.stepActivatePlanBody"),
      },
    ];
  }

  if (joinMode === "INVITE_ONLY") {
    return [
      {
        title: t("gymProfile.stepSecureReferral"),
        body: referralCode
          ? t("gymProfile.stepReferralAttached", { code: referralCode })
          : t("gymProfile.stepReferralRequired"),
      },
      {
        title: t("gymProfile.stepReviewPlans"),
        body: t("gymProfile.stepReviewPlansBody"),
      },
      {
        title: t("gymProfile.stepPaySecurely"),
        body: t("gymProfile.stepPaySecurelyBody"),
      },
    ];
  }

  if (joinMode !== "OPEN_JOIN") {
    console.warn("Unknown join mode; defaulting to OPEN_JOIN flow", joinMode);
  }

  return [
    {
      title: t("gymProfile.stepBrowsePublicPlans"),
      body: t("gymProfile.stepBrowsePublicPlansBody"),
    },
    {
      title: t("gymProfile.stepPayInstantly"),
      body: t("gymProfile.stepPayInstantlyBody"),
    },
    {
      title: t("gymProfile.stepStartTraining"),
      body: t("gymProfile.stepStartTrainingBody"),
    },
  ];
}

function localizedJoinModeLabel(mode: string | null | undefined, t: Translate) {
  if (mode === "OPEN_JOIN") return t("gymProfile.joinModeOpen");
  if (mode === "APPROVAL_REQUIRED") return t("gymProfile.joinModeApproval");
  if (mode === "INVITE_ONLY") return t("gymProfile.joinModeInvite");
  return joinModeLabel(mode);
}

function formatGymDistance(km: number | null, t: Translate) {
  if (km == null) return null;
  if (km < 1) {
    return t("gymProfile.distanceMeters", { distance: String(Math.round(km * 1000)) });
  }
  const distance = km < 10 ? km.toFixed(1) : String(Math.round(km));
  return t("gymProfile.distanceKm", { distance });
}

function localizedGymTagline(
  tagline: string | null | undefined,
  gymType: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined,
  locale: string,
  t: Translate,
) {
  if (locale === "hi" && tagline?.toLowerCase().includes("strength, pt, and recovery operations")) {
    return t("gymProfile.demoTagline");
  }
  return tagline ?? gymType ?? [city, state].filter(Boolean).join(", ");
}

function compactBranchName(orgName: string | null | undefined, branchName?: string | null) {
  const cleanedBranch = branchName?.trim();
  if (!cleanedBranch) return "";
  const orgFirstWord = orgName?.trim().split(/\s+/)[0];
  if (!orgFirstWord || orgFirstWord.length < 4) return cleanedBranch;
  const escapedOrg = orgFirstWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedOrg}\\s+`, "i");
  return cleanedBranch.replace(pattern, "").trim() || cleanedBranch;
}

function compactAddressParts(...parts: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return parts
    .flatMap((part) => part?.split(",") ?? [])
    .map((part) => part.trim())
    .filter((part) => {
      const key = part.toLowerCase();
      if (!part || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
}

function compactAddressPartsExcluding(
  excludedParts: Array<string | null | undefined>,
  ...parts: Array<string | null | undefined>
) {
  const excluded = new Set(
    excludedParts
      .flatMap((part) => part?.split(",") ?? [])
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
  return compactAddressParts(
    ...parts.map((part) => {
      if (!part) return part;
      return part
        .split(",")
        .map((segment) => segment.trim())
        .filter((segment) => !excluded.has(segment.toLowerCase()))
        .join(", ");
    }),
  );
}

function checkoutUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : toWebUrl(value);
}

function checkoutUrlWithReturnUrl(value: string, sessionId?: string | null) {
  const resolvedUrl = checkoutUrl(value);
  const returnUrl = `zook://payments/return?target=membership${sessionId ? `&session=${encodeURIComponent(sessionId)}` : ""}`;
  try {
    const parsed = new URL(resolvedUrl);
    parsed.searchParams.set("return_url", returnUrl);
    return parsed.toString();
  } catch {
    const separator = resolvedUrl.includes("?") ? "&" : "?";
    return `${resolvedUrl}${separator}return_url=${encodeURIComponent(returnUrl)}`;
  }
}

const styles = StyleSheet.create({
  scroller: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: layout.contentWidth + layout.screenPadding * 2,
    alignSelf: "center",
    paddingHorizontal: layout.screenPadding,
    paddingTop: 20,
    gap: 16,
    paddingBottom: layout.bottomNavContentPadding,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  sheetBackground: {
    borderWidth: 1,
  },
  sheetHandle: {},
  statusMessage: {
    ...typography.body,
  },
});

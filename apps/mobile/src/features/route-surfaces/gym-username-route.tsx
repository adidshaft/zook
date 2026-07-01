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
  type ImageSourcePropType,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  EmptyState,
  Card,
  AppHeader,
  Pill,
  PrimaryButton,
  QueryErrorState,
  SectionHeader,
  useRequestPermissionWithRationale,
  ZookScreen,
} from "@/components/primitives";
import { GymDetailSkeleton } from "@/components/skeletons";
import { AmenityGrid } from "@/components/domain/amenity-grid";
import { GymReviews } from "@/features/member/gym/gym-reviews";
import { GalleryViewer } from "@/features/member/gym/gallery-viewer";
import aarogyaCoverSource from "../../../../web/public/seed/gyms/aarogya-strength/cover.png";
import aarogyaGallery01Source from "../../../../web/public/seed/gyms/aarogya-strength/gallery-01.png";
import aarogyaGallery02Source from "../../../../web/public/seed/gyms/aarogya-strength/gallery-02.png";
import aarogyaGallery03Source from "../../../../web/public/seed/gyms/aarogya-strength/gallery-03.png";
import aarogyaGallery04Source from "../../../../web/public/seed/gyms/aarogya-strength/gallery-04.png";
import aarogyaGallery05Source from "../../../../web/public/seed/gyms/aarogya-strength/gallery-05.png";
import yourFitnessCoverSource from "../../../../web/public/seed/gyms/your-fitness/cover.png";
import yourFitnessGallery01Source from "../../../../web/public/seed/gyms/your-fitness/gallery-01.png";
import yourFitnessGallery02Source from "../../../../web/public/seed/gyms/your-fitness/gallery-02.png";
import yourFitnessGallery03Source from "../../../../web/public/seed/gyms/your-fitness/gallery-03.png";
import yourFitnessGallery04Source from "../../../../web/public/seed/gyms/your-fitness/gallery-04.png";
import yourFitnessGallery05Source from "../../../../web/public/seed/gyms/your-fitness/gallery-05.png";
import { planTypeLabel } from "@/components/membership/helpers";
import { useGymDistanceKm } from "@/lib/use-gym-distance";
import { normalizeWebUrl, toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { gymApi } from "@/lib/domain-api";
import { gymBrandColor, seededGymLogoDataUri } from "@/lib/gym-brand";
import {
  formatBranchName,
  formatGymHeaderIdentity,
  formatInitials,
  formatInr,
  formatLongDate,
  joinModeLabel,
  joinModeTone,
} from "@/lib/formatting";
import { useGymProfile, type GymProfileData } from "@/lib/domains";
import { useI18n } from "@/lib/i18n";
import { usePushNotifications } from "@/lib/push-notifications";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type PublicTrainer = NonNullable<GymProfileData["trainers"]>[number];
type Translate = ReturnType<typeof useI18n>["t"];
type GymProfileTab = "plans" | "overview" | "reviews";

const SEEDED_GYM_IMAGE_SOURCES: Record<string, ImageSourcePropType> = {
  "/seed/gyms/aarogya-strength/cover.png": aarogyaCoverSource as ImageSourcePropType,
  "/seed/gyms/aarogya-strength/gallery-01.png": aarogyaGallery01Source as ImageSourcePropType,
  "/seed/gyms/aarogya-strength/gallery-02.png": aarogyaGallery02Source as ImageSourcePropType,
  "/seed/gyms/aarogya-strength/gallery-03.png": aarogyaGallery03Source as ImageSourcePropType,
  "/seed/gyms/aarogya-strength/gallery-04.png": aarogyaGallery04Source as ImageSourcePropType,
  "/seed/gyms/aarogya-strength/gallery-05.png": aarogyaGallery05Source as ImageSourcePropType,
  "/seed/gyms/your-fitness/cover.png": yourFitnessCoverSource as ImageSourcePropType,
  "/seed/gyms/your-fitness/gallery-01.png": yourFitnessGallery01Source as ImageSourcePropType,
  "/seed/gyms/your-fitness/gallery-02.png": yourFitnessGallery02Source as ImageSourcePropType,
  "/seed/gyms/your-fitness/gallery-03.png": yourFitnessGallery03Source as ImageSourcePropType,
  "/seed/gyms/your-fitness/gallery-04.png": yourFitnessGallery04Source as ImageSourcePropType,
  "/seed/gyms/your-fitness/gallery-05.png": yourFitnessGallery05Source as ImageSourcePropType,
};

function seededGymMedia(username?: string | null) {
  if (username === "aarogya-strength" || username === "your-fitness") {
    const base = `/seed/gyms/${username}`;
    return {
      coverImageUrl: `${base}/cover.png`,
      logoUrl: `${base}/logo.svg`,
      gallery: [
        `${base}/gallery-01.png`,
        `${base}/gallery-02.png`,
        `${base}/gallery-03.png`,
        `${base}/gallery-04.png`,
        `${base}/gallery-05.png`,
      ],
    };
  }
  return { coverImageUrl: null, logoUrl: null, gallery: [] };
}

function seededGymImageSource(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const matchedPath = Object.keys(SEEDED_GYM_IMAGE_SOURCES).find((path) => trimmed.endsWith(path));
  return matchedPath ? SEEDED_GYM_IMAGE_SOURCES[matchedPath] : null;
}

function gymImageSource(value?: string | null) {
  const webUrl = normalizeWebUrl(value);
  return seededGymImageSource(value) ?? (webUrl ? { uri: webUrl } : null);
}

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
  const { mode, palette } = useTheme();
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
    <Card
      variant={needsApproval || inviteOnlyLocked ? "warning" : "default"}
      contentStyle={styles.nextActionCard}
    >
      <View style={styles.nextActionCopy}>
        <Text style={[styles.nextActionEyebrow, { color: palette.text.secondary }]}>
          {needsApproval
            ? t("gymProfile.reviewed")
            : inviteOnlyLocked
              ? t("gymProfile.inviteOnly")
              : t("gymProfile.readyToJoin")}
        </Text>
        <Text numberOfLines={2} style={[styles.nextActionTitle, { color: palette.text.primary }]}>
          {selectedCheckoutPlan
            ? planNameForLocale(selectedCheckoutPlan, locale, t)
            : t("gymProfile.choosePlanToContinue")}
        </Text>
        {selectedCheckoutPlan && !needsApproval && !inviteOnlyLocked ? (
          <Text
            numberOfLines={1}
            style={[styles.nextActionBody, { color: palette.text.secondary }]}
          >
            {t("gymProfile.tapPlanToChange")}
          </Text>
        ) : null}
      </View>
      {needsApproval && !viewerState?.pendingJoinRequest && !viewerState?.approvedJoinRequest ? (
        <PrimaryButton testID="gym-top-request-membership" onPress={() => void requestMembership()}>
          {busyAction === "join-request"
            ? t("gymProfile.submitting")
            : t("gymProfile.sendMembershipRequest")}
        </PrimaryButton>
      ) : inviteOnlyLocked ? (
        <View style={styles.inviteCodeRow}>
          <TextInput
            testID="gym-top-invite-code"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            placeholder={t("gymProfile.inviteCode")}
            placeholderTextColor={palette.text.tertiary}
            style={[
              styles.inviteCodeInput,
              {
                backgroundColor: mode === "dark" ? palette.bg.sunken : palette.surface.raised,
                borderColor: palette.border.default,
                color: palette.text.primary,
              },
            ]}
          />
          <PrimaryButton testID="gym-top-apply-invite-code" onPress={applyInviteCode}>
            {t("gymProfile.apply")}
          </PrimaryButton>
        </View>
      ) : selectedCheckoutPlan ? (
        <PrimaryButton
          testID="gym-top-choose-plan"
          onPress={() => void startCheckout(selectedCheckoutPlan.id)}
          disabled={!canCheckout(selectedCheckoutPlan.id)}
        >
          {busyAction === selectedCheckoutPlan.id
            ? t("gymProfile.openingPayment")
            : canCheckout(selectedCheckoutPlan.id)
              ? t("gymProfile.payAmountNow", { amount: formatInr(selectedCheckoutPlanPrice) })
              : t("gymProfile.completeEarlierStep")}
        </PrimaryButton>
      ) : null}
    </Card>
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
          <AppHeader
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
            <Card contentStyle={styles.heroCard}>
              <View style={styles.coverShell}>
                <View
                  style={[
                    styles.coverPlaceholder,
                    !coverImageSource ? styles.coverPlaceholderFallback : null,
                    {
                      backgroundColor: coverImageSource ? palette.surface.raised : gymBrand.soft,
                      borderColor: palette.border.default,
                    },
                  ]}
                >
                  {coverImageSource ? (
                    <Image
                      source={coverImageSource}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={[styles.coverFallbackInitial, { color: gymBrand.solid }]}>
                      {formatInitials(gym.name, gymBrand.initial)}
                    </Text>
                  )}
                  <View style={styles.coverTint} />
                  <View style={styles.coverActionRow}>
                    <Pressable
                      onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                      accessibilityRole="button"
                      accessibilityLabel={t("common.back")}
                      style={({ pressed }) => [
                        styles.coverIconButton,
                        pressed ? styles.iconButtonPressed : null,
                      ]}
                    >
                      <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
                    </Pressable>
                    <Pressable
                      onPress={() => void shareGym()}
                      accessibilityRole="button"
                      accessibilityLabel={t("gymProfile.shareProfile")}
                      style={({ pressed }) => [
                        styles.coverIconButton,
                        pressed ? styles.iconButtonPressed : null,
                      ]}
                    >
                      <Ionicons name="share-outline" size={21} color="#FFFFFF" />
                    </Pressable>
                  </View>
                  <View style={styles.coverTextStack}>
                    <View style={styles.coverIdentityRow}>
                      <View
                        style={[
                          styles.gymLogoOverlay,
                          { backgroundColor: palette.accent.base, borderColor: "rgba(255,255,255,0.72)" },
                        ]}
                      >
                        {showLogoImage ? (
                          <Image
                            source={{ uri: logoImageUrl }}
                            style={styles.gymLogoImage}
                            contentFit="cover"
                            onError={() => setLogoLoadFailed(true)}
                          />
                        ) : (
                          <Text style={[styles.gymLogoFallbackText, { color: palette.text.onAccent }]}>
                            {formatInitials(gym.name, gymBrand.initial)}
                          </Text>
                        )}
                      </View>
                      <View style={styles.coverIdentityCopy}>
                        <Text
                          numberOfLines={3}
                          style={[styles.coverTitle, styles.coverTextOnImage]}
                        >
                          {gymIdentity.title}
                        </Text>
                        {gymLocalityLabel ? (
                          <Text
                            numberOfLines={1}
                            style={[styles.coverSubtitle, styles.coverTextOnImage]}
                          >
                            {gymLocalityLabel}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <Text
                      numberOfLines={2}
                      style={[styles.coverEyebrow, styles.coverTextOnImage]}
                    >
                      {localizedGymTagline(
                        gym.tagline,
                        gym.gymType,
                        gym.city,
                        gym.state,
                        locale,
                        t,
                      )}
                    </Text>
                    <View style={styles.coverMetaRow}>
                      {!viewerState?.activeMembership ? (
                        <Pill tone={joinModeTone(gym.joinMode)}>
                          {localizedJoinModeLabel(gym.joinMode, t)}
                        </Pill>
                      ) : null}
                      {leadPlan && !viewerState?.activeMembership ? (
                        <Pill>{formatInr(effectivePlanPrice(leadPlan))}</Pill>
                      ) : null}
                    </View>
                  </View>
                  {gym.openingHoursSummary ? (
                    <Text style={[styles.coverBody, styles.coverTextOnImage]} numberOfLines={1}>
                      {gym.openingHoursSummary}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.viewerStateStack}>
                {effectiveReferral && !viewerState?.activeMembership ? (
                  <Pill tone="blue">{`${t("gymProfile.referralApplied")}: ${effectiveReferral}`}</Pill>
                ) : null}
                {viewerState?.activeMembership ? (
                  <Pill tone="blue">
                    {viewerState.activeMembership.endsAt
                      ? t("gymProfile.activeUntil", {
                          date: formatLongDate(viewerState.activeMembership.endsAt),
                        })
                      : t("gymProfile.alreadyActive")}
                  </Pill>
                ) : null}
                {viewerState?.pendingJoinRequest ? (
                  <Pill tone="amber">
                    {t("gymProfile.pendingSince", {
                      date: formatLongDate(viewerState.pendingJoinRequest.createdAt),
                    })}
                  </Pill>
                ) : null}
                {viewerState?.approvedJoinRequest ? (
                  <Pill tone="lime">
                    {viewerState.approvedJoinRequest.reviewedAt
                      ? t("gymProfile.approvedDate", {
                          date: formatLongDate(viewerState.approvedJoinRequest.reviewedAt),
                        })
                      : t("gymProfile.approvedForPayment")}
                  </Pill>
                ) : null}
              </View>
            </Card>

            <Card variant="compact" contentStyle={styles.branchSelectorCard}>
              <View style={styles.branchSelectorTopRow}>
                <View style={styles.branchSelectorCopy}>
                  <Text style={[styles.branchSelectorEyebrow, { color: palette.text.secondary }]}>
                    {t("gymProfile.location")}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[styles.branchSelectorTitle, { color: palette.text.primary }]}
                  >
                    {selectedLocationTitle}
                  </Text>
                  {selectedLocationMeta ? (
                    <Text
                      numberOfLines={1}
                      style={[styles.branchSelectorAddress, { color: palette.text.secondary }]}
                    >
                      {selectedLocationMeta}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("gymProfile.getDirections")}
                  onPress={openDirections}
                  style={({ pressed }) => [
                    styles.branchDirectionsButton,
                    {
                      backgroundColor: palette.surface.accentSoft,
                      borderColor: palette.border.focus,
                    },
                    pressed ? styles.branchChoiceChipPressed : null,
                  ]}
                >
                  <Ionicons name="navigate-outline" size={18} color={palette.accent.base} />
                </Pressable>
              </View>
              {branchSelectorVisible && alternateProfileBranches.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.branchSelectorRail}
                >
                  {alternateProfileBranches.map((branch) => {
                    const hasMapLocation = Boolean(
                      normalizeWebUrl(branch.googleMapsUrl) ||
                        (branch.latitude != null && branch.longitude != null),
                    );
                    const branchName =
                      formatBranchName(gym.name, branch.name, {
                        collapseOrgMatch: true,
                        fallback: branch.city ?? t("branch.current"),
                      }) ?? branch.name;
                    const branchChipName = compactBranchName(gym.name, branchName);
                    return (
                      <Pressable
                        key={branch.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${branchChipName}, ${t("branch.useBranch")}`}
                        onPress={() => setSelectedProfileBranchId(branch.id)}
                        style={({ pressed }) => [
                          styles.branchSelectorChip,
                          {
                            backgroundColor: palette.bg.sunken,
                            borderColor: palette.border.subtle,
                          },
                          pressed ? styles.branchChoiceChipPressed : null,
                        ]}
                      >
                        <Ionicons
                          name={hasMapLocation ? "navigate-outline" : "alert-circle-outline"}
                          size={13}
                          color={
                            hasMapLocation ? palette.text.secondary : palette.feedback.warning
                          }
                        />
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.branchSelectorChipText,
                            { color: palette.text.secondary },
                          ]}
                        >
                          {branchChipName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
            </Card>

            {joinIntentActive ? nextActionCard : null}

            {joinIntentActive ? null : nextActionCard}

            <View style={[styles.sectionTabs, { backgroundColor: palette.surface.default }]}>
              {[
                { key: "plans" as const, label: t("nav.plans") },
                { key: "overview" as const, label: t("gymProfile.overview") },
                { key: "reviews" as const, label: t("gymReviews.reviews") },
              ].map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setProfileTab(item.key)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: profileTab === item.key }}
                  style={({ pressed }) => [
                    styles.sectionTab,
                    {
                      backgroundColor:
                        profileTab === item.key ? palette.surface.accentSoft : "transparent",
                      borderColor:
                        profileTab === item.key ? palette.border.focus : palette.border.subtle,
                    },
                    pressed ? styles.sectionTabPressed : null,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.sectionTabText,
                      {
                        color:
                          profileTab === item.key ? palette.accent.base : palette.text.secondary,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {profileTab === "plans" ? (
              <View>
                <SectionHeader eyebrow={t("nav.plans")} title={t("gymProfile.membershipOptions")} />

                {!plans.length ? <EmptyState title={t("gymProfile.noPublicPlans")} /> : null}

                <View style={styles.planStack}>
                  {plans.map((plan) => {
                    const pricedPlan = plan as typeof plan & {
                      effectivePricePaise?: number | null;
                      badges?: string[] | null;
                    };
                    const effectivePricePaise = pricedPlan.effectivePricePaise ?? plan.pricePaise;
                    const hasReferralPrice =
                      effectiveReferral &&
                      effectivePricePaise !== null &&
                      effectivePricePaise !== undefined &&
                      plan.pricePaise !== null &&
                      plan.pricePaise !== undefined &&
                      effectivePricePaise < plan.pricePaise;
                    const badges = [
                      ...(pricedPlan.badges ?? []),
                      hasReferralPrice ? t("gymProfile.referralPrice") : null,
                    ].filter((item): item is string => Boolean(item));
                    const planName = planNameForLocale(plan, locale, t);
                    const planDescription = planDescriptionForLocale(plan, locale, t);

                    const selectedForCheckout = selectedCheckoutPlan?.id === plan.id;
                    const canSelectPlan =
                      !viewerState?.activeMembership && !needsApproval && !inviteOnlyLocked;

                    return (
                      <Pressable
                        key={plan.id}
                        testID={`gym-plan-row-${plan.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={`${t("gymProfile.choosePlan")}: ${planName}`}
                        accessibilityState={{ selected: selectedForCheckout }}
                        onPress={() =>
                          canSelectPlan
                            ? selectCheckoutPlan(plan.id, { revealCheckout: true })
                            : undefined
                        }
                        disabled={!canSelectPlan}
                        style={({ pressed }) => (pressed && canSelectPlan ? styles.cardPressed : null)}
                      >
                        <Card
                          contentStyle={styles.planCard}
                          style={[
                            styles.planCardShell,
                            {
                              borderColor: selectedForCheckout
                                ? palette.border.focus
                                : palette.border.subtle,
                              backgroundColor: selectedForCheckout
                                ? palette.surface.accentSoft
                                : palette.surface.default,
                            },
                          ]}
                        >
                          <View style={styles.planHeader}>
                            <View style={styles.planCopy}>
                              <Text
                                style={[styles.planName, { color: palette.text.primary }]}
                                numberOfLines={1}
                              >
                                {planName}
                              </Text>
                              <Text
                                style={[styles.planType, { color: palette.text.secondary }]}
                                numberOfLines={1}
                              >
                                {planTypeLabel(plan.type, t)}
                              </Text>
                            </View>
                            <View style={styles.planPriceBlock}>
                              {selectedForCheckout && !viewerState?.activeMembership ? (
                                <View
                                  style={[
                                    styles.planSelectedMark,
                                    { backgroundColor: palette.accent.base },
                                  ]}
                                >
                                  <Ionicons
                                    name="checkmark"
                                    size={13}
                                    color={palette.text.onAccent}
                                  />
                                </View>
                              ) : null}
                              <Text
                                style={[styles.planPrice, { color: palette.accent.base }]}
                                numberOfLines={1}
                              >
                                {formatInr(effectivePricePaise)}
                              </Text>
                              {hasReferralPrice ? (
                                <Text
                                  style={[styles.planOriginalPrice, { color: palette.text.tertiary }]}
                                  numberOfLines={1}
                                >
                                  {formatInr(plan.pricePaise)}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                          {badges.length ? (
                            <View style={styles.planBadgeRow}>
                              {badges.slice(0, 3).map((badge) => (
                                <Text
                                  key={`${plan.id}-${badge}`}
                                  style={[
                                    styles.planBadge,
                                    {
                                      backgroundColor: palette.surface.accentSoft,
                                      borderColor: palette.border.focus,
                                      color: palette.accent.base,
                                    },
                                  ]}
                                >
                                  {badge}
                                </Text>
                              ))}
                            </View>
                          ) : null}
                          {planDescription ? (
                            <Text
                              style={[styles.planDescription, { color: palette.text.secondary }]}
                              numberOfLines={2}
                            >
                              {planDescription}
                            </Text>
                          ) : null}
                          <View style={styles.planBenefits}>
                            {buildPlanHighlights(plan, t).map((item) => (
                              <View key={`${plan.id}-${item}`} style={styles.planBenefitRow}>
                                <Ionicons
                                  name="checkmark-circle-outline"
                                  size={15}
                                  color={palette.accent.base}
                                />
                                <Text
                                  style={[styles.planBenefitText, { color: palette.text.secondary }]}
                                >
                                  {item}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {profileTab === "overview" ? (
              <>
                <SectionHeader
                  eyebrow={t("gymProfile.atAGlance")}
                  title={t("gymProfile.whatsInside")}
                />
                <Card contentStyle={styles.amenityCard}>
                  <AmenityGrid
                    sources={[...(gym.amenities ?? []), ...(gym.equipment ?? []), gym.gymType]}
                  />
                </Card>

                {gallery.length ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.galleryRow}
                  >
                    {gallery.map((imageUrl, index) => (
                      <Pressable
                        key={`${imageUrl}-${index}`}
                        accessibilityRole="imagebutton"
                        accessibilityLabel={t("gymProfile.photoOf", {
                          index: index + 1,
                          count: gallery.length,
                        })}
                        onPress={() => setGalleryIndex(index)}
                        style={({ pressed }) => (pressed ? { opacity: 0.88 } : null)}
                      >
                        <Image
                          source={gymImageSource(imageUrl)}
                          style={styles.galleryImage}
                          contentFit="cover"
                        />
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}

                <SectionHeader
                  eyebrow={t("gymProfile.coaches")}
                  title={t("gymProfile.trainerTeam")}
                />

                <View style={styles.trainerStack}>
                  {trainers.length ? (
                    trainers
                      .filter((trainer) => trainer.visibleToMembers !== false)
                      .map((trainer) => (
                        <Pressable
                          key={trainer.userId}
                          onPress={() => openTrainerSheet(trainer)}
                          accessibilityRole="button"
                          accessibilityLabel={t("gymProfile.openTrainerProfile", {
                            name: trainer.name,
                          })}
                          style={({ pressed }) => (pressed ? styles.cardPressed : null)}
                        >
                          <Card contentStyle={styles.trainerCard}>
                            {trainer.profilePhotoUrl ? (
                              <Image
                                source={{ uri: normalizeWebUrl(trainer.profilePhotoUrl) }}
                                style={styles.trainerImage}
                                contentFit="cover"
                              />
                            ) : (
                              <View
                                style={[
                                  styles.trainerImageFallback,
                                  {
                                    backgroundColor: palette.surface.accentSoft,
                                    borderColor: palette.border.focus,
                                  },
                                ]}
                              >
                                <Text
                                  style={[styles.trainerImageText, { color: palette.accent.base }]}
                                >
                                  {formatInitials(trainer.name, "T")}
                                </Text>
                              </View>
                            )}
                            <View style={styles.trainerCopy}>
                              <Text style={[styles.trainerName, { color: palette.text.primary }]}>
                                {trainer.name}
                              </Text>
                              <Text
                                style={[styles.sectionBody, { color: palette.text.secondary }]}
                                numberOfLines={2}
                              >
                                {trainer.bio ?? t("gymProfile.noBioAdded")}
                              </Text>
                              <View style={styles.trainerSpecialties}>
                                {normalizeSpecialties(trainer.specialties)
                                  .slice(0, 3)
                                  .map((specialty) => (
                                    <Text
                                      key={`${trainer.userId}-${specialty}`}
                                      style={[
                                        styles.trainerSpecialty,
                                        { color: palette.feedback.info },
                                      ]}
                                    >
                                      {specialty}
                                    </Text>
                                  ))}
                              </View>
                            </View>
                          </Card>
                        </Pressable>
                      ))
                  ) : (
                    <EmptyState title={t("gymProfile.noPublicTrainerProfiles")} />
                  )}
                </View>
              </>
            ) : null}

            {profileTab === "reviews" ? (
              <View>
                <GymReviews orgId={gym.id} />
              </View>
            ) : null}

            {profileTab === "plans" ? (
              <>
                <Card variant="compact" contentStyle={styles.joinDisclosureCard}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("gymProfile.howToJoin")}
                    accessibilityState={{ expanded: joinStepsExpanded }}
                    onPress={() => setJoinStepsExpanded((current) => !current)}
                    style={({ pressed }) => [
                      styles.joinDisclosureHeader,
                      pressed ? styles.branchChoiceChipPressed : null,
                    ]}
                  >
                    <View style={styles.joinDisclosureCopy}>
                      <Text
                        style={[styles.joinDisclosureEyebrow, { color: palette.text.secondary }]}
                      >
                        {t("gymProfile.joinPath")}
                      </Text>
                      <Text style={[styles.joinDisclosureTitle, { color: palette.text.primary }]}>
                        {t("gymProfile.howToJoin")}
                      </Text>
                    </View>
                    <Ionicons
                      name={joinStepsExpanded ? "chevron-up" : "chevron-down"}
                      size={19}
                      color={palette.text.secondary}
                    />
                  </Pressable>
                  {joinStepsExpanded ? (
                    <View style={styles.timelineCard}>
                      {joinSteps.map((step, index) => (
                        <View key={step.title} style={styles.timelineRow}>
                          <View
                            style={[
                              styles.timelineMarker,
                              {
                                backgroundColor: palette.surface.accentSoft,
                                borderColor: palette.border.focus,
                              },
                            ]}
                          >
                            <Text style={[styles.timelineMarkerText, { color: palette.accent.base }]}>
                              {index + 1}
                            </Text>
                          </View>
                          <View style={styles.timelineCopy}>
                            <Text style={[styles.timelineTitle, { color: palette.text.primary }]}>
                              {step.title}
                            </Text>
                            <Text style={[styles.timelineBody, { color: palette.text.secondary }]}>
                              {step.body}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Card>
              </>
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
        <BottomSheetView style={styles.trainerSheetContent}>
          {selectedTrainer ? (
            <>
              <View style={styles.trainerSheetHeader}>
                {selectedTrainer.profilePhotoUrl ? (
                  <Image
                    source={{ uri: normalizeWebUrl(selectedTrainer.profilePhotoUrl) }}
                    style={styles.trainerSheetImage}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.trainerSheetImageFallback,
                      {
                        backgroundColor: palette.surface.accentSoft,
                        borderColor: palette.border.focus,
                      },
                    ]}
                  >
                    <Text style={[styles.trainerImageText, { color: palette.accent.base }]}>
                      {formatInitials(selectedTrainer.name, "T")}
                    </Text>
                  </View>
                )}
                <View style={styles.trainerCopy}>
                  <Text style={[styles.trainerName, { color: palette.text.primary }]}>
                    {selectedTrainer.name}
                  </Text>
                  <Text style={[styles.sectionBody, { color: palette.text.secondary }]}>
                    {selectedTrainer.bio ?? t("gymProfile.noTrainerBioPublished")}
                  </Text>
                </View>
              </View>
              <View style={styles.trainerSpecialties}>
                {normalizeSpecialties(selectedTrainer.specialties).map((specialty) => (
                  <Text
                    key={`${selectedTrainer.userId}-sheet-${specialty}`}
                    style={[styles.trainerSpecialty, { color: palette.feedback.info }]}
                  >
                    {specialty}
                  </Text>
                ))}
              </View>
            </>
          ) : null}
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

function normalizeSpecialties(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (value && typeof value === "object") {
    return Object.values(value).filter((item): item is string => typeof item === "string");
  }
  return [];
}

function planNameForLocale(
  plan: { id?: string | null; name?: string | null; type?: string | null },
  locale: string,
  t: Translate,
) {
  const fallback = plan.name ?? t("gymProfile.choosePlan");
  if (locale !== "hi") {
    return fallback;
  }
  const normalizedId = (plan.id ?? "").toLowerCase();
  const normalizedName = (plan.name ?? "").toLowerCase();
  const normalizedType = (plan.type ?? "").toUpperCase();
  if (
    normalizedType === "TRIAL" ||
    normalizedId.includes("trial") ||
    normalizedName.includes("trial")
  ) {
    return t("gymProfile.planNameTrial");
  }
  if (
    normalizedType === "HYBRID" ||
    normalizedId.includes("hybrid") ||
    normalizedName.includes("hybrid")
  ) {
    return t("gymProfile.planNameHybrid");
  }
  if (
    normalizedType === "DURATION" ||
    normalizedId.includes("monthly") ||
    normalizedName.includes("monthly")
  ) {
    return t("gymProfile.planNameMonthly");
  }
  return fallback;
}

function planDescriptionForLocale(
  plan: { description?: string | null; id?: string | null; type?: string | null },
  locale: string,
  t: Translate,
) {
  if (locale !== "hi") {
    return plan.description ?? null;
  }
  const normalizedId = (plan.id ?? "").toLowerCase();
  const normalizedType = (plan.type ?? "").toUpperCase();
  if (normalizedType === "TRIAL" || normalizedId.includes("trial")) {
    return t("gymProfile.planDescriptionTrial");
  }
  if (normalizedType === "HYBRID" || normalizedId.includes("hybrid")) {
    return t("gymProfile.planDescriptionHybrid");
  }
  if (normalizedType === "DURATION" || normalizedId.includes("monthly")) {
    return t("gymProfile.planDescriptionMonthly");
  }
  return plan.description ?? null;
}

function effectivePlanPrice(plan?: { pricePaise?: number | null; effectivePricePaise?: number | null } | null) {
  return typeof plan?.effectivePricePaise === "number" ? plan.effectivePricePaise : plan?.pricePaise;
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

function buildPlanHighlights(
  plan: {
    durationDays?: number | null;
    visitLimit?: number | null;
    validityDays?: number | null;
    startDate?: string | null;
    endDate?: string | null;
  },
  t: Translate,
) {
  const highlights = [
    plan.durationDays ? t("gymProfile.daysCount", { count: plan.durationDays }) : null,
    plan.visitLimit
      ? t(plan.visitLimit === 1 ? "gymProfile.visitCountOne" : "gymProfile.visitCountMany", {
          count: plan.visitLimit,
        })
      : null,
    plan.validityDays ? t("gymProfile.validityDays", { count: plan.validityDays }) : null,
    plan.startDate && plan.endDate
      ? t("gymProfile.dateRange", {
          start: formatLongDate(plan.startDate),
          end: formatLongDate(plan.endDate),
        })
      : null,
  ].filter(Boolean) as string[];

  return highlights.length
    ? highlights
    : [t("gymProfile.flexibleMembership"), t("gymProfile.securePayment")];
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
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
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
  heroCard: {
    gap: 10,
  },
  coverShell: {
    position: "relative",
  },
  coverPlaceholder: {
    minHeight: 220,
    borderRadius: 22,
    padding: 16,
    paddingTop: 62,
    borderWidth: 1,
    overflow: "hidden",
    gap: 10,
    justifyContent: "flex-end",
  },
  coverPlaceholderFallback: {
    minHeight: 156,
  },
  coverFallbackInitial: {
    position: "absolute",
    right: 20,
    top: 18,
    fontSize: 54,
    fontWeight: "900",
    letterSpacing: 0,
    opacity: 0.56,
  },
  coverTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  coverActionRow: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 14,
    zIndex: 2,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coverIconButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.34)",
  },
  gymLogoOverlay: {
    width: 54,
    height: 54,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gymLogoImage: {
    width: "100%",
    height: "100%",
  },
  gymLogoFallbackText: {
    ...typography.headerTitle,
  },
  coverIdentityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    maxWidth: "100%",
  },
  coverIdentityCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  coverTitle: {
    ...typography.screenTitle,
    letterSpacing: 0,
  },
  coverSubtitle: {
    ...typography.body,
  },
  coverEyebrow: {
    ...typography.eyebrow,
  },
  coverTextStack: {
    alignSelf: "stretch",
    backgroundColor: "transparent",
    borderRadius: 0,
    gap: 8,
    maxWidth: "100%",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  coverMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  coverBody: {
    ...typography.body,
  },
  coverTextOnImage: {
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  viewerStateStack: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  branchSelectorCard: {
    gap: spacing.sm,
  },
  branchSelectorTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  branchSelectorCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  branchSelectorEyebrow: {
    ...typography.eyebrow,
  },
  branchSelectorTitle: {
    ...typography.cardTitle,
  },
  branchSelectorAddress: {
    ...typography.small,
  },
  branchDirectionsButton: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  branchSelectorRail: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  branchSelectorChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    maxWidth: 168,
    minHeight: 34,
    paddingHorizontal: spacing.md,
  },
  branchSelectorChipText: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  branchChoiceChipPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  amenityCard: {
    gap: 10,
  },
  galleryRow: {
    gap: spacing.md,
    paddingRight: spacing.xl,
  },
  galleryImage: {
    width: 210,
    height: 126,
    borderRadius: 20,
  },
  trainerStack: {
    gap: spacing.md,
  },
  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.992 }],
  },
  trainerCard: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  trainerImage: {
    width: 64,
    height: 64,
    borderRadius: 22,
  },
  trainerImageFallback: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  trainerImageText: {
    ...typography.headerTitle,
  },
  trainerCopy: {
    flex: 1,
    gap: 6,
  },
  trainerName: {
    ...typography.headerTitle,
  },
  trainerSpecialties: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  trainerSpecialty: {
    ...typography.small,
  },
  sheetBackground: {
    borderWidth: 1,
  },
  sheetHandle: {},
  trainerSheetContent: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  trainerSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  trainerSheetImage: {
    width: 72,
    height: 72,
    borderRadius: 24,
  },
  trainerSheetImageFallback: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    gap: 8,
  },
  metricLabel: {
    ...typography.eyebrow,
  },
  metricValue: {
    ...typography.metric,
  },
  metricBody: {
    ...typography.body,
  },
  joinDisclosureCard: {
    gap: 12,
  },
  joinDisclosureHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: 42,
  },
  joinDisclosureCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  joinDisclosureEyebrow: {
    ...typography.eyebrow,
  },
  joinDisclosureTitle: {
    ...typography.bodyStrong,
  },
  timelineCard: {
    gap: 16,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  timelineMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  timelineMarkerText: {
    ...typography.bodyStrong,
  },
  timelineCopy: {
    flex: 1,
    gap: 6,
  },
  timelineTitle: {
    ...typography.sectionTitle,
  },
  timelineBody: {
    ...typography.body,
  },
  nextActionCard: {
    gap: spacing.md,
  },
  nextActionCopy: {
    gap: 4,
  },
  nextActionEyebrow: {
    ...typography.eyebrow,
  },
  nextActionTitle: {
    ...typography.cardTitle,
  },
  nextActionBody: {
    ...typography.small,
  },
  sectionTabs: {
    flexDirection: "row",
    gap: spacing.xs,
    borderRadius: 18,
    padding: 4,
  },
  sectionTab: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xs,
  },
  sectionTabPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  sectionTabText: {
    ...typography.small,
    fontFamily: "Inter_700Bold",
  },
  inviteCodeRow: {
    gap: spacing.sm,
  },
  inviteCodeInput: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  sectionTitle: {
    ...typography.screenTitle,
  },
  sectionBody: {
    ...typography.body,
  },
  planStack: {
    gap: 12,
  },
  planCard: {
    gap: 12,
  },
  planCardShell: {
    borderWidth: 1,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  planCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  planName: {
    ...typography.headerTitle,
  },
  planType: {
    ...typography.small,
  },
  planPrice: {
    ...typography.cardTitle,
  },
  planPriceBlock: {
    alignItems: "flex-end",
    flexShrink: 0,
    gap: 2,
    maxWidth: 112,
  },
  planSelectedMark: {
    alignItems: "center",
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    marginBottom: 2,
    width: 24,
  },
  planOriginalPrice: {
    textDecorationLine: "line-through",
    ...typography.small,
  },
  planDescription: {
    ...typography.small,
  },
  planBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  planBadge: {
    minHeight: 26,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: 5,
    ...typography.caption,
  },
  planBenefits: {
    gap: 6,
  },
  planBenefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  planBenefitText: {
    ...typography.small,
    flex: 1,
    minWidth: 0,
  },
  statusMessage: {
    ...typography.body,
  },
});

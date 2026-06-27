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
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  EmptyState,
  Card,
  IconBubble,
  InfoRow,
  AppHeader,
  Pill,
  PrimaryButton,
  QueryErrorState,
  SectionHeader,
  useRequestPermissionWithRationale,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { GymDetailSkeleton } from "@/components/skeletons";
import { AmenityGrid } from "@/components/domain/amenity-grid";
import { GymReviews } from "@/features/member/gym/gym-reviews";
import { GalleryViewer } from "@/features/member/gym/gallery-viewer";
import { formatDistanceKm, useGymDistanceKm } from "@/lib/use-gym-distance";
import { normalizeWebUrl, toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { gymApi } from "@/lib/domain-api";
import {
  formatInitials,
  formatInr,
  formatLongDate,
  formatVisitLimit,
  joinModeLabel,
  joinModeTone,
  titleCaseFromCode,
} from "@/lib/formatting";
import { useGymProfile, type GymProfileData } from "@/lib/domains";
import { useI18n } from "@/lib/i18n";
import { usePushNotifications } from "@/lib/push-notifications";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type PublicTrainer = NonNullable<GymProfileData["trainers"]>[number];
type Translate = ReturnType<typeof useI18n>["t"];

export default function GymProfileScreen() {
  const router = useRouter();
  const notificationPermission = useRequestPermissionWithRationale("notifications");
  const { permissionState, requestEnablePush } = usePushNotifications();
  const params = useLocalSearchParams<{ username: string; ref?: string }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const referralCode = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const { token } = useAuth();
  const { t } = useI18n();
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
  const refreshAfterCheckoutRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const usernameRef = useRef(username);
  const mountedRef = useRef(true);
  const trainerSheetRef = useRef<BottomSheetModal>(null);
  const trainerSnapPoints = useMemo(() => ["44%"], []);

  const gym = gymQuery.data?.org ?? null;
  const plans = gymQuery.data?.plans ?? [];
  const trainers = gymQuery.data?.trainers ?? [];
  const gallery = gym?.gallery?.length
    ? gym.gallery
    : gym?.coverImageUrl
      ? [gym.coverImageUrl]
      : [];
  const coverImageUrl = normalizeWebUrl(gym?.coverImageUrl);
  const logoUrl = normalizeWebUrl(gym?.logoUrl);
  const shareGym = useCallback(async () => {
    if (!gym?.username) return;
    const url = toWebUrl(`/g/${gym.username}`);
    await Share.share({
      message: `Check out ${gym.name} on Zook - ${url}`,
      url,
    });
  }, [gym?.name, gym?.username]);
  const viewerState = gymQuery.data?.viewerState;
  const distanceKm = useGymDistanceKm(gym?.latitude, gym?.longitude);
  const distanceLabel = formatDistanceKm(distanceKm);
  const effectiveReferral = referralCode ?? gymQuery.data?.referral?.code ?? undefined;

  function openDirections() {
    if (!gym) return;
    const query =
      gym.latitude != null && gym.longitude != null
        ? `${gym.latitude},${gym.longitude}`
        : encodeURIComponent(gym.address ?? `${gym.name}, ${gym.city}, ${gym.state}`);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  }
  const profileBranches = gymQuery.data?.branches ?? [];
  const selectedGymBranchId =
    profileBranches.find((branch) => branch.id === selectedBranchId)?.id ??
    profileBranches.find((branch) => branch.isDefault)?.id ??
    profileBranches[0]?.id;

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
        ...(plans[0]?.id ? { planId: plans[0].id } : {}),
        ...(effectiveReferral ? { referralCode: effectiveReferral } : {}),
      });
      setStatusMessage(
        t("gymProfile.membershipRequestSubmittedBody"),
      );
      showToast({ tone: "success", haptic: "success", message: t("gymProfile.membershipRequestSubmitted") });
      if (permissionState !== "granted") {
        const granted = await notificationPermission.requestPermission();
        if (granted) {
          await requestEnablePush();
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["gym", username] });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("gymProfile.unableSubmitMembershipRequest");
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

  return (
    <ZookScreen testID="gym-profile-screen">
      <ScrollView
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
        {gym ? (
          <AppHeader
            eyebrow={t("gymProfile.eyebrow")}
            title={gym.name}
            subtitle={`${gym.city}, ${gym.state}`}
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
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
            trailing={
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => void shareGym()}
                  accessibilityRole="button"
                  accessibilityLabel="Share gym profile"
                  style={({ pressed }) => [
                    styles.iconButton,
                    { backgroundColor: palette.surface.raised, borderColor: palette.border.default },
                    pressed ? styles.iconButtonPressed : null,
                  ]}
                >
                  <Ionicons name="share-outline" size={20} color={palette.text.primary} />
                </Pressable>
                <Pill tone={joinModeTone(gym.joinMode)}>{joinModeLabel(gym.joinMode)}</Pill>
              </View>
            }
          />
        ) : (
          <AppHeader
            eyebrow={t("gymProfile.eyebrow")}
            title={t("gymProfile.membershipProfile")}
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
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
        )}

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
                <View style={[styles.coverPlaceholder, { backgroundColor: palette.surface.raised, borderColor: palette.border.default }]}>
                  {gym.coverImageUrl ? (
                    <Image
                      source={{ uri: coverImageUrl }}
                      style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
                      contentFit="cover"
                    />
                  ) : null}
                  <Text style={[styles.coverEyebrow, { color: palette.accent.base }]}>{gym.tagline ?? gym.name}</Text>
                  <Text style={[styles.coverTitle, { color: palette.text.primary }]}>{t(plans.length === 1 ? "gymProfile.planAvailableOne" : "gymProfile.planAvailableMany", { count: plans.length })}</Text>
                  <Text style={[styles.coverBody, { color: palette.text.secondary }]}>{gym.address ?? `${gym.city}, ${gym.state}`}</Text>
                  {gym.openingHoursSummary ? (
                    <Text style={[styles.coverBody, { color: palette.text.secondary }]}>{gym.openingHoursSummary}</Text>
                  ) : null}
                </View>
                <View style={[styles.gymLogoOverlay, { backgroundColor: palette.accent.base, borderColor: palette.bg.elevated }]}>
                  {logoUrl ? (
                    <Image
                      source={{ uri: logoUrl }}
                      style={styles.gymLogoImage}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={[styles.gymLogoFallbackText, { color: palette.text.onAccent }]}>{formatInitials(gym.name, "T")}</Text>
                  )}
                </View>
              </View>

              {gym.gymType || (gym.amenities ?? []).length ? (
                <View style={styles.tagMetaBlock}>
                  {gym.gymType ? <Text style={[styles.tagMeta, { color: palette.text.secondary }]}>{gym.gymType}</Text> : null}
                  {(gym.amenities ?? []).slice(0, 6).map((amenity) => (
                    <Text key={amenity} style={[styles.tagMeta, { color: palette.text.secondary }]}>
                      {amenity}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.viewerStateStack}>
                {effectiveReferral ? (
                  <InfoRow label={t("gymProfile.referralApplied")} value={effectiveReferral} tone="blue" />
                ) : null}
                {viewerState?.activeMembership ? (
                  <InfoRow
                    label={t("gymProfile.currentMembership")}
                    value={
                      viewerState.activeMembership.endsAt
                        ? t("gymProfile.activeUntil", { date: formatLongDate(viewerState.activeMembership.endsAt) })
                        : t("gymProfile.alreadyActive")
                    }
                    tone="blue"
                  />
                ) : null}
                {viewerState?.pendingJoinRequest ? (
                  <InfoRow
                    label={t("gymProfile.joinRequest")}
                    value={t("gymProfile.pendingSince", { date: formatLongDate(viewerState.pendingJoinRequest.createdAt) })}
                    tone="amber"
                  />
                ) : null}
                {viewerState?.approvedJoinRequest ? (
                  <InfoRow
                    label={t("gymProfile.joinRequest")}
                    value={
                      viewerState.approvedJoinRequest.reviewedAt
                        ? t("gymProfile.approvedDate", { date: formatLongDate(viewerState.approvedJoinRequest.reviewedAt) })
                        : t("gymProfile.approvedForPayment")
                    }
                    tone="lime"
                  />
                ) : null}
              </View>
            </Card>

            <SectionHeader eyebrow={t("gymProfile.inside")} title={t("gymProfile.eyebrow")} />

            <Card style={styles.firstFoldEndCard} contentStyle={styles.profileDetailsCard}>
              <InfoRow
                label={t("gymProfile.address")}
                value={gym.address ?? `${gym.city}, ${gym.state}`}
                tone="neutral"
              />
              {gym.equipment?.length ? (
                <View style={styles.inlineChipBlock}>
                  <Text style={[styles.inlineChipTitle, { color: palette.text.primary }]}>{t("gymProfile.equipment")}</Text>
                  <View style={styles.tagMetaBlock}>
                    {gym.equipment.slice(0, 12).map((equipment) => (
                      <Text key={equipment} style={[styles.tagMeta, { color: palette.text.secondary }]}>
                        {equipment}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : null}
            </Card>

            <SectionHeader eyebrow={t("gymProfile.gettingThere")} title={t("gymProfile.location")} />
            <Card contentStyle={styles.locationCard}>
              <View style={styles.locationRow}>
                <IconBubble icon="location-outline" tone="lime" size={42} />
                <View style={styles.locationCopy}>
                  <Text style={[styles.locationAddress, { color: palette.text.primary }]}>
                    {gym.address ?? `${gym.city}, ${gym.state}`}
                  </Text>
                  <Text style={[styles.locationCity, { color: palette.text.secondary }]}>
                    {distanceLabel ?? `${gym.city}, ${gym.state}`}
                  </Text>
                </View>
                {distanceLabel ? <Pill tone="lime">{distanceLabel}</Pill> : null}
              </View>
              <ZookButton variant="secondary" icon="navigate-outline" onPress={openDirections}>
                {t("gymProfile.getDirections")}
              </ZookButton>
            </Card>

            <SectionHeader eyebrow={t("gymProfile.atAGlance")} title={t("gymProfile.whatsInside")} />
            <Card contentStyle={styles.amenityCard}>
              <AmenityGrid sources={[...(gym.amenities ?? []), ...(gym.equipment ?? []), gym.gymType]} />
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
                    accessibilityLabel={t("gymProfile.photoOf", { index: index + 1, count: gallery.length })}
                    onPress={() => setGalleryIndex(index)}
                    style={({ pressed }) => (pressed ? { opacity: 0.88 } : null)}
                  >
                    <Image
                      source={{ uri: normalizeWebUrl(imageUrl) }}
                      style={styles.galleryImage}
                      contentFit="cover"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <SectionHeader eyebrow={t("gymProfile.coaches")} title={t("gymProfile.trainerTeam")} />

            <View style={styles.trainerStack}>
              {trainers.length ? (
                trainers
                  .filter((trainer) => trainer.visibleToMembers !== false)
                  .map((trainer) => (
                    <Pressable
                      key={trainer.userId}
                      onPress={() => openTrainerSheet(trainer)}
                      accessibilityRole="button"
                      accessibilityLabel={t("gymProfile.openTrainerProfile", { name: trainer.name })}
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
                          <View style={[styles.trainerImageFallback, { backgroundColor: palette.surface.accentSoft, borderColor: palette.border.focus }]}>
                            <Text style={[styles.trainerImageText, { color: palette.accent.base }]}>
                              {formatInitials(trainer.name, "T")}
                            </Text>
                          </View>
                        )}
                        <View style={styles.trainerCopy}>
                          <Text style={[styles.trainerName, { color: palette.text.primary }]}>{trainer.name}</Text>
                          <Text style={[styles.sectionBody, { color: palette.text.secondary }]} numberOfLines={2}>
                            {trainer.bio ?? t("gymProfile.noBioAdded")}
                          </Text>
                          <View style={styles.trainerSpecialties}>
                            {normalizeSpecialties(trainer.specialties)
                              .slice(0, 3)
                              .map((specialty) => (
                                <Text
                                  key={`${trainer.userId}-${specialty}`}
                                  style={[styles.trainerSpecialty, { color: palette.feedback.info }]}
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

            <View style={styles.metricRow}>
              <Card style={{ flex: 1 }} contentStyle={styles.metricCard}>
                <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>{t("gymProfile.joinFlow")}</Text>
                <Text style={[styles.metricValue, { color: palette.text.primary }]}>
                  {needsApproval ? t("gymProfile.reviewed") : inviteOnlyLocked ? t("gymProfile.inviteOnly") : t("gymProfile.instant")}
                </Text>
                <Text style={[styles.metricBody, { color: palette.text.secondary }]}>
                  {needsApproval
                    ? t("gymProfile.staffApprovalBeforePayment")
                    : inviteOnlyLocked
                      ? t("gymProfile.referralInviteRequired")
                      : t("gymProfile.moveStraightToPayment")}
                </Text>
              </Card>
              <Card style={{ flex: 1 }} contentStyle={styles.metricCard}>
                <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>{t("gymProfile.membershipState")}</Text>
                <Text style={[styles.metricValue, { color: palette.text.primary }]}>
                  {viewerState?.activeMembership
                    ? t("member.home.active")
                    : viewerState?.pendingJoinRequest
                      ? t("member.coaching.pending")
                      : t("trainer.pt.new")}
                </Text>
                <Text style={[styles.metricBody, { color: palette.text.secondary }]}>
                  {viewerState?.activeMembership?.remainingVisits !== null &&
                  viewerState?.activeMembership?.remainingVisits !== undefined
                    ? t("gymProfile.visitsRemaining", { count: viewerState.activeMembership.remainingVisits })
                    : t("gymProfile.choosePlanToContinue")}
                </Text>
              </Card>
            </View>

            <GymReviews orgId={gym.id} />

            <SectionHeader eyebrow={t("gymProfile.joinPath")} title={t("gymProfile.howToJoin")} />

            <Card contentStyle={styles.timelineCard}>
              {buildJoinSteps(gym.joinMode, t, effectiveReferral).map((step, index) => (
                <View key={step.title} style={styles.timelineRow}>
                  <View style={[styles.timelineMarker, { backgroundColor: palette.surface.accentSoft, borderColor: palette.border.focus }]}>
                    <Text style={[styles.timelineMarkerText, { color: palette.accent.base }]}>{index + 1}</Text>
                  </View>
                  <View style={styles.timelineCopy}>
                    <Text style={[styles.timelineTitle, { color: palette.text.primary }]}>{step.title}</Text>
                    <Text style={[styles.timelineBody, { color: palette.text.secondary }]}>{step.body}</Text>
                  </View>
                </View>
              ))}
            </Card>

            {needsApproval &&
            !viewerState?.pendingJoinRequest &&
            !viewerState?.approvedJoinRequest ? (
              <Card variant="warning" contentStyle={styles.ctaCard}>
                <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>{t("gymProfile.requestMembershipFirst")}</Text>
                <Text style={[styles.sectionBody, { color: palette.text.secondary }]}>
                  {t("gymProfile.requestMembershipFirstBody")}
                </Text>
                <PrimaryButton
                  testID="gym-request-membership"
                  onPress={() => void requestMembership()}
                >
                  {busyAction === "join-request" ? t("gymProfile.submitting") : t("gymProfile.sendMembershipRequest")}
                </PrimaryButton>
              </Card>
            ) : null}

            {inviteOnlyLocked ? (
              <Card variant="warning" contentStyle={styles.ctaCard}>
                <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>{t("gymProfile.inviteReferralRequired")}</Text>
                <Text style={[styles.sectionBody, { color: palette.text.secondary }]}>
                  {t("gymProfile.inviteReferralRequiredBody")}
                </Text>
                <View style={styles.inviteCodeRow}>
                  <TextInput
                    testID="gym-invite-code"
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
                  <PrimaryButton testID="gym-apply-invite-code" onPress={applyInviteCode}>{t("gymProfile.apply")}</PrimaryButton>
                </View>
              </Card>
            ) : null}

            <SectionHeader eyebrow={t("nav.plans")} title={t("gymProfile.membershipOptions")} />

            {!plans.length ? (
              <EmptyState title={t("gymProfile.noPublicPlans")} />
            ) : null}

            <View style={styles.planStack}>
              {plans.map((plan, index) => {
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
                  plan.visitLimit ? formatVisitLimit(plan.visitLimit) : null,
                ].filter((item): item is string => Boolean(item));

                return (
                <Card
                  key={plan.id}
                  testID={`gym-plan-row-${plan.id}`}
                  contentStyle={styles.planCard}
                >
                  <View style={styles.planHeader}>
                    <View style={styles.planCopy}>
                      <Text style={[styles.planName, { color: palette.text.primary }]}>{plan.name}</Text>
                      <Text style={[styles.planType, { color: palette.text.secondary }]}>
                        {titleCaseFromCode(plan.type ?? "MEMBERSHIP")}
                      </Text>
                      <Text style={[styles.planPrice, { color: palette.accent.base }]}>{formatInr(effectivePricePaise)}</Text>
                      {hasReferralPrice ? (
                        <Text style={[styles.planOriginalPrice, { color: palette.text.tertiary }]}>{formatInr(plan.pricePaise)}</Text>
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
                  <Text style={[styles.sectionBody, { color: palette.text.secondary }]}>
                    {plan.description ?? t("gymProfile.standardMembershipPlan")}
                  </Text>
                  <View style={styles.planBenefits}>
                    {buildPlanHighlights(plan, t).map((item) => (
                      <View key={`${plan.id}-${item}`} style={styles.planBenefitRow}>
                        <Text style={[styles.planBenefitText, { color: palette.text.secondary }]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                  <PrimaryButton
                    testID={index === 0 ? "gym-choose-plan-first" : `gym-choose-plan-${plan.id}`}
                    onPress={() => void startCheckout(plan.id)}
                    disabled={!canCheckout(plan.id)}
                  >
                    {busyAction === plan.id
                      ? t("gymProfile.openingPayment")
                      : canCheckout(plan.id)
                        ? t("gymProfile.choosePlan")
                        : t("gymProfile.completeEarlierStep")}
                  </PrimaryButton>
                </Card>
                );
              })}
            </View>

            {statusMessage ? (
              <Card testID="gym-status-message" variant="compact">
                <Text style={[styles.statusMessage, { color: palette.text.primary }]}>{statusMessage}</Text>
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
                  <View style={[styles.trainerSheetImageFallback, { backgroundColor: palette.surface.accentSoft, borderColor: palette.border.focus }]}>
                    <Text style={[styles.trainerImageText, { color: palette.accent.base }]}>
                      {formatInitials(selectedTrainer.name, "T")}
                    </Text>
                  </View>
                )}
                <View style={styles.trainerCopy}>
                  <Text style={[styles.trainerName, { color: palette.text.primary }]}>{selectedTrainer.name}</Text>
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
      <GalleryViewer images={gallery} initialIndex={galleryIndex} onClose={() => setGalleryIndex(null)} />
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

function normalizeSpecialties(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (value && typeof value === "object") {
    return Object.values(value).filter((item): item is string => typeof item === "string");
  }
  return [];
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

function buildPlanHighlights(plan: {
  durationDays?: number | null;
  visitLimit?: number | null;
  validityDays?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}, t: Translate) {
  const highlights = [
    plan.durationDays ? t("gymProfile.daysCount", { count: plan.durationDays }) : null,
    plan.visitLimit ? formatVisitLimit(plan.visitLimit) : null,
    plan.validityDays ? t("gymProfile.validityDays", { count: plan.validityDays }) : null,
    plan.startDate && plan.endDate
      ? t("gymProfile.dateRange", { start: formatLongDate(plan.startDate), end: formatLongDate(plan.endDate) })
      : null,
  ].filter(Boolean) as string[];

  return highlights.length ? highlights : [t("gymProfile.flexibleMembership"), t("gymProfile.securePayment")];
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
    gap: 16,
  },
  coverShell: {
    position: "relative",
    marginBottom: 24,
  },
  coverPlaceholder: {
    minHeight: 196,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    overflow: "hidden",
    gap: 10,
  },
  gymLogoOverlay: {
    position: "absolute",
    bottom: -24,
    left: 16,
    width: 58,
    height: 58,
    borderRadius: 20,
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
  coverEyebrow: {
    ...typography.eyebrow,
  },
  coverTitle: {
    ...typography.heroTitle,
  },
  coverBody: {
    ...typography.body,
  },
  tagMetaBlock: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tagMeta: {
    ...typography.small,
  },
  viewerStateStack: {
    gap: 10,
  },
  profileDetailsCard: {
    gap: 10,
  },
  amenityCard: {
    gap: 10,
  },
  locationCard: {
    gap: spacing.md,
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  locationCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  locationAddress: {
    ...typography.cardTitle,
  },
  locationCity: {
    ...typography.small,
  },
  inlineChipBlock: {
    gap: 8,
  },
  inlineChipTitle: {
    ...typography.caption,
  },
  firstFoldEndCard: {
    marginBottom: spacing.xxxl,
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
  sheetHandle: {
  },
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
  ctaCard: {
    gap: 12,
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
    gap: 14,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  planCopy: {
    flex: 1,
    gap: 6,
  },
  planName: {
    ...typography.headerTitle,
  },
  planType: {
    ...typography.small,
  },
  planPrice: {
    ...typography.metric,
  },
  planOriginalPrice: {
    textDecorationLine: "line-through",
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
    gap: 8,
  },
  planBenefitRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  planBenefitText: {
    ...typography.body,
  },
  statusMessage: {
    ...typography.body,
  },
});

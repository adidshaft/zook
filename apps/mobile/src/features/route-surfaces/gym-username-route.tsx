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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  EmptyState,
  Card,
  InfoRow,
  AppHeader,
  Pill,
  PrimaryButton,
  QueryErrorState,
  SectionHeader,
  useRequestPermissionWithRationale,
  ZookScreen,
} from "@/components/primitives";
import { GymDetailSkeleton } from "@/components/skeletons";
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
import { usePushNotifications } from "@/lib/push-notifications";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type PublicTrainer = NonNullable<GymProfileData["trainers"]>[number];

export default function GymProfileScreen() {
  const router = useRouter();
  const notificationPermission = useRequestPermissionWithRationale("notifications");
  const { permissionState, requestEnablePush } = usePushNotifications();
  const params = useLocalSearchParams<{ username: string; ref?: string }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const referralCode = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const { token } = useAuth();
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
  const viewerState = gymQuery.data?.viewerState;
  const effectiveReferral = referralCode ?? gymQuery.data?.referral?.code ?? undefined;
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
      setStatusMessage("Refreshing membership status...");
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
  }, [queryClient, setStatusMessage]);

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
        "Membership request submitted. The gym team can now review it from their dashboard.",
      );
      showToast({ tone: "success", haptic: "success", message: "Membership request submitted." });
      if (permissionState !== "granted") {
        const granted = await notificationPermission.requestPermission();
        if (granted) {
          await requestEnablePush();
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["gym", username] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit membership request.";
      setStatusMessage(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
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
      setStatusMessage("Payment started. Complete it to activate your membership.");
      refreshAfterCheckoutRef.current = true;
      await Linking.openURL(checkoutUrlWithReturnUrl(payload.checkoutUrl, payload.session?.id));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["gym", username] }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start payment.";
      setStatusMessage(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
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
            eyebrow="Gym profile"
            title={gym.name}
            subtitle={`${gym.city}, ${gym.state}`}
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
                accessibilityRole="button"
                accessibilityLabel="Back"
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
              <Pill tone={joinModeTone(gym.joinMode)}>{joinModeLabel(gym.joinMode)}</Pill>
            }
          />
        ) : (
          <AppHeader
            eyebrow="Gym profile"
            title="Membership profile"
            subtitle="We’ll load plan details, join rules, and referral support for this gym."
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
                accessibilityRole="button"
                accessibilityLabel="Back"
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
              title="Could not load this gym"
            />
          </Card>
        ) : null}

        {!gymQuery.isLoading && !gymQuery.isError && !gym ? (
          <EmptyState
            title="Gym not found"
            body="This link may be expired or the gym may have moved."
            action={<PrimaryButton href="/gyms">Find gyms</PrimaryButton>}
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
                  <Text style={[styles.coverTitle, { color: palette.text.primary }]}>{plans.length} plans available</Text>
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
                  <InfoRow label="Referral applied" value={effectiveReferral} tone="blue" />
                ) : null}
                {viewerState?.activeMembership ? (
                  <InfoRow
                    label="Current membership"
                    value={
                      viewerState.activeMembership.endsAt
                        ? `Active until ${formatLongDate(viewerState.activeMembership.endsAt)}`
                        : "Already active"
                    }
                    tone="blue"
                  />
                ) : null}
                {viewerState?.pendingJoinRequest ? (
                  <InfoRow
                    label="Join request"
                    value={`Pending since ${formatLongDate(viewerState.pendingJoinRequest.createdAt)}`}
                    tone="amber"
                  />
                ) : null}
                {viewerState?.approvedJoinRequest ? (
                  <InfoRow
                    label="Join request"
                    value={
                      viewerState.approvedJoinRequest.reviewedAt
                        ? `Approved ${formatLongDate(viewerState.approvedJoinRequest.reviewedAt)}`
                        : "Approved and ready for payment"
                    }
                    tone="lime"
                  />
                ) : null}
              </View>
            </Card>

            <SectionHeader
              eyebrow="Inside"
              title="Gym profile"
              subtitle="Facility, trainers, access, and location details."
            />

            <Card style={styles.firstFoldEndCard} contentStyle={styles.profileDetailsCard}>
              <InfoRow
                label="Address"
                value={gym.address ?? `${gym.city}, ${gym.state}`}
                tone="neutral"
              />
              {gym.equipment?.length ? (
                <View style={styles.inlineChipBlock}>
                  <Text style={[styles.inlineChipTitle, { color: palette.text.primary }]}>Equipment</Text>
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

            {gallery.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryRow}
              >
                {gallery.map((imageUrl, index) => (
                  <Image
                    key={`${imageUrl}-${index}`}
                    source={{ uri: normalizeWebUrl(imageUrl) }}
                    style={styles.galleryImage}
                    contentFit="cover"
                  />
                ))}
              </ScrollView>
            ) : null}

            <SectionHeader
              eyebrow="Coaches"
              title="Trainer team"
              subtitle="Visible trainer profiles for this gym."
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
                      accessibilityLabel={`Open ${trainer.name} profile`}
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
                            {trainer.bio ?? "No bio added yet."}
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
                <EmptyState
                  title="No public trainer profiles"
                  body="This gym has not published trainer profiles yet."
                />
              )}
            </View>

            <View style={styles.metricRow}>
              <Card style={{ flex: 1 }} contentStyle={styles.metricCard}>
                <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>Join flow</Text>
                <Text style={[styles.metricValue, { color: palette.text.primary }]}>
                  {needsApproval ? "Reviewed" : inviteOnlyLocked ? "Invite only" : "Instant"}
                </Text>
                <Text style={[styles.metricBody, { color: palette.text.secondary }]}>
                  {needsApproval
                    ? "Staff approval happens before payment."
                    : inviteOnlyLocked
                      ? "Referral or invite is required."
                      : "You can move straight to payment."}
                </Text>
              </Card>
              <Card style={{ flex: 1 }} contentStyle={styles.metricCard}>
                <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>Membership state</Text>
                <Text style={[styles.metricValue, { color: palette.text.primary }]}>
                  {viewerState?.activeMembership
                    ? "Active"
                    : viewerState?.pendingJoinRequest
                      ? "Pending"
                      : "New"}
                </Text>
                <Text style={[styles.metricBody, { color: palette.text.secondary }]}>
                  {viewerState?.activeMembership?.remainingVisits !== null &&
                  viewerState?.activeMembership?.remainingVisits !== undefined
                    ? `${viewerState.activeMembership.remainingVisits} visits remaining`
                    : "Choose a plan to continue."}
                </Text>
              </Card>
            </View>

            <SectionHeader
              eyebrow="Join path"
              title="How to join"
              subtitle="Follow these steps to start your membership."
            />

            <Card contentStyle={styles.timelineCard}>
              {buildJoinSteps(gym.joinMode, effectiveReferral).map((step, index) => (
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
                <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Request membership first</Text>
                <Text style={[styles.sectionBody, { color: palette.text.secondary }]}>
                  This gym reviews new members before payment. Submit your request and the owner can
                  approve it from the web dashboard.
                </Text>
                <PrimaryButton
                  testID="gym-request-membership"
                  onPress={() => void requestMembership()}
                >
                  {busyAction === "join-request" ? "Submitting..." : "Send membership request"}
                </PrimaryButton>
              </Card>
            ) : null}

            {inviteOnlyLocked ? (
              <Card variant="warning" contentStyle={styles.ctaCard}>
                <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Invite or referral required</Text>
                <Text style={[styles.sectionBody, { color: palette.text.secondary }]}>
                  Open this gym from a referral link or ask the gym team for a code to continue.
                </Text>
                <View style={styles.inviteCodeRow}>
                  <TextInput
                    testID="gym-invite-code"
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    autoCapitalize="characters"
                    placeholder="Invite code"
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
                  <PrimaryButton testID="gym-apply-invite-code" onPress={applyInviteCode}>Apply</PrimaryButton>
                </View>
              </Card>
            ) : null}

            <SectionHeader eyebrow="Plans" title="Membership options" />

            {!plans.length ? (
              <EmptyState
                title="No public plans yet"
                body="This gym is public, but it has not published any plans for mobile sign-up yet."
              />
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
                  hasReferralPrice ? "Referral price" : null,
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
                    {plan.description ?? "Standard membership plan."}
                  </Text>
                  <View style={styles.planBenefits}>
                    {buildPlanHighlights(plan).map((item) => (
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
                      ? "Opening payment..."
                      : canCheckout(plan.id)
                        ? "Choose plan"
                        : "Complete earlier step first"}
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
                    {selectedTrainer.bio ?? "Bio will appear once this trainer publishes it."}
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
      {notificationPermission.permissionSheet}
    </ZookScreen>
  );
}

function buildJoinSteps(joinMode: string, referralCode?: string) {
  if (joinMode === "APPROVAL_REQUIRED") {
    return [
      {
        title: "Send request",
        body: "Send your request before payment if this gym reviews new members.",
      },
      {
        title: "Staff review",
        body: "The gym team reviews your request.",
      },
      {
        title: "Activate plan",
        body: "Return here and complete payment once you are approved.",
      },
    ];
  }

  if (joinMode === "INVITE_ONLY") {
    return [
      {
        title: "Secure a referral",
        body: referralCode
          ? `Referral ${referralCode} is already attached.`
          : "A referral or invite is required before you can continue.",
      },
      {
        title: "Review plans",
        body: "Once the code is accepted, plans are available to join.",
      },
      {
        title: "Pay securely",
        body: "Payment activates the membership once the invite rules are met.",
      },
    ];
  }

  if (joinMode !== "OPEN_JOIN") {
    console.warn("Unknown join mode; defaulting to OPEN_JOIN flow", joinMode);
  }

  return [
    {
      title: "Browse public plans",
      body: "Compare price, access, trainer support, and plan format without waiting for staff.",
    },
    {
      title: "Pay instantly",
      body: "Pay securely from mobile.",
    },
    {
      title: "Start training",
      body: "Scan the gym QR, get a unique entry code, and show it at the floor or desk.",
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
}) {
  const highlights = [
    plan.durationDays ? `${plan.durationDays} days` : null,
    plan.visitLimit ? formatVisitLimit(plan.visitLimit) : null,
    plan.validityDays ? `${plan.validityDays} validity days` : null,
    plan.startDate && plan.endDate
      ? `${formatLongDate(plan.startDate)} to ${formatLongDate(plan.endDate)}`
      : null,
  ].filter(Boolean) as string[];

  return highlights.length ? highlights : ["Flexible membership", "Secure payment"];
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

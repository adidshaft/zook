import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  BottomNav,
  EmptyState,
  GlassCard,
  InfoRow,
  LoadingState,
  MobileHeader,
  Pill,
  PrimaryButton,
  SectionHeader,
  ZookScreen,
} from "@/components/primitives";
import { toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { gymApi } from "@/lib/domain-api";
import { formatInr, formatLongDate, joinModeLabel, titleCaseFromCode } from "@/lib/formatting";
import { useGymProfile } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

export default function GymProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ username: string; ref?: string }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const referralCode = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const { token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const queryClient = useQueryClient();
  const gymQuery = useGymProfile(username ?? "");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshAfterCheckoutRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const gym = gymQuery.data?.org ?? null;
  const plans = gymQuery.data?.plans ?? [];
  const trainers = gymQuery.data?.trainers ?? [];
  const gallery = gym?.gallery?.length
    ? gym.gallery
    : gym?.coverImageUrl
      ? [gym.coverImageUrl]
      : [];
  const coverImageUrl = normalizeMediaUrl(gym?.coverImageUrl);
  const logoUrl = normalizeMediaUrl(gym?.logoUrl);
  const viewerState = gymQuery.data?.viewerState;
  const effectiveReferral = referralCode ?? gymQuery.data?.referral?.code ?? undefined;
  const profileBranches = gymQuery.data?.branches ?? [];
  const selectedGymBranchId =
    profileBranches.find((branch) => branch.id === selectedBranchId)?.id ??
    profileBranches.find((branch) => branch.isDefault)?.id ??
    profileBranches[0]?.id;

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
        queryClient.invalidateQueries({ queryKey: ["gym", username] }),
      ]).finally(() => {
        setStatusMessage(null);
      });
    });
    return () => subscription.remove();
  }, [queryClient, username]);

  async function requestMembership() {
    if (!gym || !token) {
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
      await queryClient.invalidateQueries({ queryKey: ["gym", username] });
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to submit membership request.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function startCheckout(planId: string) {
    if (!gym || !token) {
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
      await Linking.openURL(checkoutUrl(payload.checkoutUrl));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["gym", username] }),
      ]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to start payment.");
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
    <ZookScreen>
      <ScrollView
        style={styles.scroller}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.lime}
            colors={[colors.lime]}
          />
        }
      >
        {gym ? (
          <MobileHeader
            eyebrow="Gym profile"
            title={gym.name}
            subtitle={`${gym.city}, ${gym.state}`}
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={21} color={colors.text} />
              </Pressable>
            }
            trailing={
              <Pill tone={toneForJoinMode(gym.joinMode)}>{joinModeLabel(gym.joinMode)}</Pill>
            }
          />
        ) : (
          <MobileHeader
            eyebrow="Gym profile"
            title="Membership profile"
            subtitle="We’ll load plan details, join rules, and referral support for this gym."
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={21} color={colors.text} />
              </Pressable>
            }
            showProfileShortcut={false}
          />
        )}

        {gymQuery.isLoading ? (
          <LoadingState
            title="Loading gym details"
            body="Loading gym details, plans, and your membership status."
          />
        ) : null}

        {!gymQuery.isLoading && !gym ? (
          <EmptyState
            title="Gym not found"
            body="This link may be expired or the gym may have moved."
            action={<PrimaryButton href="/find-gyms">Find gyms</PrimaryButton>}
          />
        ) : null}

        {gym ? (
          <>
            <GlassCard contentStyle={styles.heroCard}>
              <View style={styles.coverShell}>
                <View style={styles.coverPlaceholder}>
                  {gym.coverImageUrl ? (
                    <Image
                      source={{ uri: coverImageUrl }}
                      style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
                      contentFit="cover"
                    />
                  ) : null}
                  <View style={styles.coverGlow} />
                  <Text style={styles.coverEyebrow}>{gym.tagline ?? gym.name}</Text>
                  <Text style={styles.coverTitle}>{plans.length} plans available</Text>
                  <Text style={styles.coverBody}>{gym.address ?? `${gym.city}, ${gym.state}`}</Text>
                  {gym.openingHoursSummary ? (
                    <Text style={styles.coverBody}>{gym.openingHoursSummary}</Text>
                  ) : null}
                </View>
                <View style={styles.gymLogoOverlay}>
                  {logoUrl ? (
                    <Image
                      source={{ uri: logoUrl }}
                      style={styles.gymLogoImage}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={styles.gymLogoFallbackText}>{initialsForName(gym.name)}</Text>
                  )}
                </View>
              </View>

              {gym.gymType || (gym.amenities ?? []).length ? (
                <View style={styles.tagMetaBlock}>
                  {gym.gymType ? <Text style={styles.tagMeta}>{gym.gymType}</Text> : null}
                  {(gym.amenities ?? []).slice(0, 6).map((amenity) => (
                    <Text key={amenity} style={styles.tagMeta}>
                      {amenity}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.viewerStateStack}>
                {effectiveReferral ? (
                  <InfoRow label="Referral applied" value={effectiveReferral} tone="lime" />
                ) : null}
                {viewerState?.activeMembership ? (
                  <InfoRow
                    label="Current membership"
                    value={
                      viewerState.activeMembership.endsAt
                        ? `Active until ${formatLongDate(viewerState.activeMembership.endsAt)}`
                        : "Already active"
                    }
                    tone="lime"
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
            </GlassCard>

            <SectionHeader
              eyebrow="Inside"
              title="Gym profile"
              subtitle="Facility, trainers, access, and location details."
            />

            <GlassCard style={styles.firstFoldEndCard} contentStyle={styles.profileDetailsCard}>
              <InfoRow
                label="Address"
                value={gym.address ?? `${gym.city}, ${gym.state}`}
                tone="blue"
              />
            </GlassCard>

            {gallery.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryRow}
              >
                {gallery.map((imageUrl, index) => (
                  <Image
                    key={`${imageUrl}-${index}`}
                    source={{ uri: normalizeMediaUrl(imageUrl) }}
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
                    <GlassCard key={trainer.userId} contentStyle={styles.trainerCard}>
                      {trainer.profilePhotoUrl ? (
                        <Image
                          source={{ uri: normalizeMediaUrl(trainer.profilePhotoUrl) }}
                          style={styles.trainerImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={styles.trainerImageFallback}>
                          <Text style={styles.trainerImageText}>
                            {initialsForName(trainer.name)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.trainerCopy}>
                        <Text style={styles.trainerName}>{trainer.name}</Text>
                        <Text style={styles.sectionBody} numberOfLines={2}>
                          {trainer.bio ?? "Bio coming soon."}
                        </Text>
                        <View style={styles.trainerSpecialties}>
                          {normalizeSpecialties(trainer.specialties)
                            .slice(0, 3)
                            .map((specialty) => (
                              <Text
                                key={`${trainer.userId}-${specialty}`}
                                style={styles.trainerSpecialty}
                              >
                                {specialty}
                              </Text>
                            ))}
                        </View>
                      </View>
                    </GlassCard>
                  ))
              ) : (
                <EmptyState
                  title="No public trainer profiles"
                  body="This gym has not published trainer profiles yet."
                />
              )}
            </View>

            <View style={styles.metricRow}>
              <GlassCard contentStyle={styles.metricCard}>
                <Text style={styles.metricLabel}>Join flow</Text>
                <Text style={styles.metricValue}>
                  {needsApproval ? "Reviewed" : inviteOnlyLocked ? "Invite only" : "Instant"}
                </Text>
                <Text style={styles.metricBody}>
                  {needsApproval
                    ? "Staff approval happens before payment."
                    : inviteOnlyLocked
                      ? "Referral or invite is required."
                      : "You can move straight to payment."}
                </Text>
              </GlassCard>
              <GlassCard contentStyle={styles.metricCard}>
                <Text style={styles.metricLabel}>Membership state</Text>
                <Text style={styles.metricValue}>
                  {viewerState?.activeMembership
                    ? "Active"
                    : viewerState?.pendingJoinRequest
                      ? "Pending"
                      : "New"}
                </Text>
                <Text style={styles.metricBody}>
                  {viewerState?.activeMembership?.remainingVisits !== null &&
                  viewerState?.activeMembership?.remainingVisits !== undefined
                    ? `${viewerState.activeMembership.remainingVisits} visits remaining`
                    : "Choose a plan when you’re ready."}
                </Text>
              </GlassCard>
            </View>

            <SectionHeader
              eyebrow="Join path"
              title="How to join"
              subtitle="Follow these steps to start your membership."
            />

            <GlassCard contentStyle={styles.timelineCard}>
              {buildJoinSteps(gym.joinMode, effectiveReferral).map((step, index) => (
                <View key={step.title} style={styles.timelineRow}>
                  <View style={styles.timelineMarker}>
                    <Text style={styles.timelineMarkerText}>{index + 1}</Text>
                  </View>
                  <View style={styles.timelineCopy}>
                    <Text style={styles.timelineTitle}>{step.title}</Text>
                    <Text style={styles.timelineBody}>{step.body}</Text>
                  </View>
                </View>
              ))}
            </GlassCard>

            {needsApproval &&
            !viewerState?.pendingJoinRequest &&
            !viewerState?.approvedJoinRequest ? (
              <GlassCard variant="warning" contentStyle={styles.ctaCard}>
                <Text style={styles.sectionTitle}>Request membership first</Text>
                <Text style={styles.sectionBody}>
                  This gym reviews new members before payment. Submit your request and the owner can
                  approve it from the web dashboard.
                </Text>
                <PrimaryButton onPress={() => void requestMembership()}>
                  {busyAction === "join-request" ? "Submitting..." : "Send membership request"}
                </PrimaryButton>
              </GlassCard>
            ) : null}

            {inviteOnlyLocked ? (
              <GlassCard variant="warning" contentStyle={styles.ctaCard}>
                <Text style={styles.sectionTitle}>Invite or referral required</Text>
                <Text style={styles.sectionBody}>
                  Open this gym from a referral link or ask the gym team for a code to continue.
                </Text>
              </GlassCard>
            ) : null}

            <SectionHeader eyebrow="Plans" title="Membership options" />

            {!plans.length ? (
              <EmptyState
                title="No public plans yet"
                body="This gym is public, but it has not published any plans for mobile sign-up yet."
              />
            ) : null}

            <View style={styles.planStack}>
              {plans.map((plan) => (
                <GlassCard key={plan.id} contentStyle={styles.planCard}>
                  <View style={styles.planHeader}>
                    <View style={styles.planCopy}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planType}>
                        {titleCaseFromCode(plan.type ?? "MEMBERSHIP")}
                      </Text>
                      <Text style={styles.planPrice}>{formatInr(plan.pricePaise)}</Text>
                    </View>
                  </View>
                  <Text style={styles.sectionBody}>
                    {plan.description ?? "Standard membership plan."}
                  </Text>
                  <View style={styles.planBenefits}>
                    {buildPlanHighlights(plan).map((item) => (
                      <View key={`${plan.id}-${item}`} style={styles.planBenefitRow}>
                        <View style={styles.planBenefitDot} />
                        <Text style={styles.planBenefitText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                  <PrimaryButton
                    onPress={() => void startCheckout(plan.id)}
                    disabled={!canCheckout(plan.id)}
                  >
                    {busyAction === plan.id
                      ? "Opening payment..."
                      : canCheckout(plan.id)
                        ? "Choose plan"
                        : "Complete earlier step first"}
                  </PrimaryButton>
                </GlassCard>
              ))}
            </View>

            {statusMessage ? (
              <GlassCard variant="compact">
                <Text style={styles.statusMessage}>{statusMessage}</Text>
              </GlassCard>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <BottomNav />
    </ZookScreen>
  );
}

function buildJoinSteps(
  joinMode: "OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY",
  referralCode?: string,
) {
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
        body: "Once the code is accepted, plans are ready to join.",
      },
      {
        title: "Pay securely",
        body: "Payment activates the membership once the invite rules are met.",
      },
    ];
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

function normalizeMediaUrl(value?: string | null) {
  if (!value) {
    return undefined;
  }
  return /^https?:\/\//i.test(value) ? value : toWebUrl(value);
}

function checkoutUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : toWebUrl(value);
}

function initialsForName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "T").concat(parts[1]?.[0] ?? "").toUpperCase();
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
    plan.visitLimit ? `${plan.visitLimit} visits` : null,
    plan.validityDays ? `${plan.validityDays} validity days` : null,
    plan.startDate && plan.endDate
      ? `${formatLongDate(plan.startDate)} to ${formatLongDate(plan.endDate)}`
      : null,
  ].filter(Boolean) as string[];

  return highlights.length ? highlights : ["Flexible membership", "Secure payment"];
}

function toneForJoinMode(joinMode?: string) {
  if (joinMode === "OPEN_JOIN") {
    return "lime" as const;
  }
  if (joinMode === "APPROVAL_REQUIRED") {
    return "amber" as const;
  }
  if (joinMode === "INVITE_ONLY") {
    return "violet" as const;
  }
  return "neutral" as const;
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
    paddingTop: 14,
    gap: 16,
    paddingBottom: layout.bottomNavContentPadding,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
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
    borderColor: "rgba(7,9,8,0.92)",
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gymLogoImage: {
    width: "100%",
    height: "100%",
  },
  gymLogoFallbackText: {
    color: colors.bg,
    ...typography.headerTitle,
  },
  coverGlow: {
    position: "absolute",
    top: -44,
    right: -24,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(185,244,85,0.08)",
  },
  coverEyebrow: {
    color: colors.amber,
    ...typography.eyebrow,
  },
  coverTitle: {
    color: colors.text,
    ...typography.display,
  },
  coverBody: {
    color: colors.muted,
    ...typography.body,
  },
  tagMetaBlock: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tagMeta: {
    color: colors.muted,
    ...typography.small,
  },
  viewerStateStack: {
    gap: 10,
  },
  profileDetailsCard: {
    gap: 10,
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
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  trainerStack: {
    gap: spacing.md,
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
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  trainerImageFallback: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "rgba(185,244,85,0.12)",
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  trainerImageText: {
    color: colors.lime,
    ...typography.headerTitle,
  },
  trainerCopy: {
    flex: 1,
    gap: 6,
  },
  trainerName: {
    color: colors.text,
    ...typography.headerTitle,
  },
  trainerSpecialties: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  trainerSpecialty: {
    color: colors.blue,
    ...typography.small,
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
    color: colors.muted,
    ...typography.eyebrow,
  },
  metricValue: {
    color: colors.text,
    ...typography.metric,
  },
  metricBody: {
    color: colors.muted,
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
    backgroundColor: "rgba(185,244,85,0.12)",
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.24)",
  },
  timelineMarkerText: {
    color: colors.lime,
    ...typography.bodyStrong,
  },
  timelineCopy: {
    flex: 1,
    gap: 6,
  },
  timelineTitle: {
    color: colors.text,
    ...typography.sectionTitle,
  },
  timelineBody: {
    color: colors.muted,
    ...typography.body,
  },
  ctaCard: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    ...typography.screenTitle,
  },
  sectionBody: {
    color: colors.muted,
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
    color: colors.text,
    ...typography.headerTitle,
  },
  planType: {
    color: colors.muted,
    ...typography.small,
  },
  planPrice: {
    color: colors.lime,
    ...typography.metric,
  },
  planBenefits: {
    gap: 8,
  },
  planBenefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planBenefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.amber,
  },
  planBenefitText: {
    color: colors.muted,
    ...typography.body,
  },
  statusMessage: {
    color: colors.text,
    ...typography.body,
  },
});

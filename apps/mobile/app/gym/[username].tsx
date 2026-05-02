import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import {
  BottomNav,
  EmptyState,
  GlassCard,
  IconBubble,
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
import { gymApi } from "@/lib/domain-api";
import { formatInr, formatLongDate, titleCaseFromCode } from "@/lib/formatting";
import { useGymProfile } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

export default function GymProfileScreen() {
  const params = useLocalSearchParams<{ username: string; ref?: string }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const referralCode = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const gymQuery = useGymProfile(username ?? "");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const gym = gymQuery.data?.org ?? null;
  const plans = gymQuery.data?.plans ?? [];
  const trainers = gymQuery.data?.trainers ?? [];
  const gallery = gym?.gallery?.length
    ? gym.gallery
    : [
        gym?.coverImageUrl || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=800&h=500&fit=crop",
        "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&h=500&fit=crop",
      ];
  const viewerState = gymQuery.data?.viewerState;
  const effectiveReferral = referralCode ?? gymQuery.data?.referral?.code ?? undefined;

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
        ...(effectiveReferral ? { referralCode: effectiveReferral } : {}),
      });
      setStatusMessage("Checkout created. Complete the hosted flow to activate your membership.");
      await Linking.openURL(toWebUrl(payload.checkoutUrl));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["gym", username] }),
      ]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to start checkout.");
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

  return (
    <ZookScreen>
      <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {gym ? (
          <MobileHeader
            eyebrow="Gym profile"
            title={gym.name}
            subtitle={`${gym.city}, ${gym.state}`}
            trailing={
              <Pill tone={toneForJoinMode(gym.joinMode)}>{titleCaseFromCode(gym.joinMode)}</Pill>
            }
          />
        ) : (
          <MobileHeader
            eyebrow="Gym profile"
            title="Membership profile"
            subtitle="We’ll load plan details, join rules, and referral support for this gym."
          />
        )}

        {gymQuery.isLoading ? (
          <LoadingState
            title="Loading gym details"
            body="Pulling public organization data, plans, and your viewer state."
          />
        ) : null}

        {!gymQuery.isLoading && !gym ? (
          <EmptyState
            title="Gym profile unavailable"
            body="This public gym could not be found or is no longer visible."
          />
        ) : null}

        {gym ? (
          <>
            <GlassCard contentStyle={styles.heroCard}>
              <View style={styles.coverPlaceholder}>
                <Image
                  source={{ uri: gym.coverImageUrl || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&h=400&fit=crop" }}
                  style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
                  contentFit="cover"
                />
                <View style={styles.coverGlow} />
                <Text style={styles.coverEyebrow}>
                  {gym.tagline ?? gym.name}
                </Text>
                <Text style={styles.coverTitle}>
                  {plans.length} plans available
                </Text>
                <Text style={styles.coverBody}>
                  {gym.address ?? `${gym.city}, ${gym.state}`}
                </Text>
              </View>

              <View style={styles.tagRow}>
                {(gym.amenities ?? []).slice(0, 6).map((amenity) => (
                  <Pill key={amenity} tone="blue">
                    {amenity}
                  </Pill>
                ))}
              </View>

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
                        : "Approved and ready for checkout"
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

            <GlassCard contentStyle={styles.profileDetailsCard}>
              <InfoRow label="Address" value={gym.address ?? `${gym.city}, ${gym.state}`} tone="blue" />
              <InfoRow label="Entry" value="Scan QR and show entry code" tone="lime" />
              <InfoRow label="Trial flow" value="Tour + optional body check" tone="amber" />
            </GlassCard>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
              {gallery.map((imageUrl, index) => (
                <Image
                  key={`${imageUrl}-${index}`}
                  source={{ uri: imageUrl }}
                  style={styles.galleryImage}
                  contentFit="cover"
                />
              ))}
            </ScrollView>

            <SectionHeader
              eyebrow="Coaches"
              title="Trainer team"
              subtitle="Visible trainer profiles for this gym."
            />

            <View style={styles.trainerStack}>
              {trainers.length ? (
                trainers.filter((trainer) => trainer.visibleToMembers !== false).map((trainer) => (
                  <GlassCard key={trainer.userId} contentStyle={styles.trainerCard}>
                    <Image
                      source={{ uri: trainer.profilePhotoUrl || "https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=300&h=300&fit=crop" }}
                      style={styles.trainerImage}
                      contentFit="cover"
                    />
                    <View style={styles.trainerCopy}>
                      <Text style={styles.trainerName}>{trainer.name}</Text>
                      <Text style={styles.sectionBody} numberOfLines={2}>
                        {trainer.bio ?? "Strength, conditioning, and member onboarding."}
                      </Text>
                      <View style={styles.planBenefits}>
                        {normalizeSpecialties(trainer.specialties).slice(0, 3).map((specialty) => (
                          <Pill key={`${trainer.userId}-${specialty}`} tone="blue">{specialty}</Pill>
                        ))}
                      </View>
                    </View>
                  </GlassCard>
                ))
              ) : (
                <EmptyState title="Trainer profiles coming soon" body="The gym can publish coach bios, expertise, and photos from the owner dashboard." />
              )}
            </View>

            <View style={styles.metricRow}>
              <GlassCard contentStyle={styles.metricCard}>
                <Text style={styles.metricLabel}>
                  Join flow
                </Text>
                <Text style={styles.metricValue}>
                  {needsApproval ? "Reviewed" : inviteOnlyLocked ? "Invite only" : "Instant"}
                </Text>
                <Text style={styles.metricBody}>
                  {needsApproval
                    ? "Staff approval happens before payment."
                    : inviteOnlyLocked
                      ? "Referral or invite is required."
                  : "You can move straight to hosted checkout."}
                </Text>
              </GlassCard>
              <GlassCard contentStyle={styles.metricCard}>
                <Text style={styles.metricLabel}>
                  Membership state
                </Text>
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
                    <Text style={styles.timelineTitle}>
                      {step.title}
                    </Text>
                    <Text style={styles.timelineBody}>
                      {step.body}
                    </Text>
                  </View>
                </View>
              ))}
            </GlassCard>

            {needsApproval &&
            !viewerState?.pendingJoinRequest &&
            !viewerState?.approvedJoinRequest ? (
              <GlassCard variant="warning" contentStyle={styles.ctaCard}>
                <Text style={styles.sectionTitle}>
                  Request membership first
                </Text>
                <Text style={styles.sectionBody}>
                  This gym reviews new members before payment. Submit your request and the
                  owner can approve it from the web dashboard.
                </Text>
                <PrimaryButton onPress={() => void requestMembership()}>
                  {busyAction === "join-request" ? "Submitting..." : "Send membership request"}
                </PrimaryButton>
              </GlassCard>
            ) : null}

            {inviteOnlyLocked ? (
              <GlassCard variant="warning" contentStyle={styles.ctaCard}>
                <Text style={styles.sectionTitle}>
                  Invite or referral required
                </Text>
                <Text style={styles.sectionBody}>
                  Open this gym from a referral link or ask the gym team for a code to continue.
                </Text>
              </GlassCard>
            ) : null}

            <SectionHeader
              eyebrow="Plans"
              title="Membership options"
            />

            {!plans.length ? (
              <EmptyState
                title="No public plans yet"
                body="This gym is public, but it has not published any plans for mobile checkout yet."
              />
            ) : null}

            <View style={styles.planStack}>
              {plans.map((plan) => (
                <GlassCard key={plan.id} contentStyle={styles.planCard}>
                  <View style={styles.planHeader}>
                    <View style={styles.planCopy}>
                      <Text style={styles.planName}>
                        {plan.name}
                      </Text>
                      <Text style={styles.planPrice}>
                        {formatInr(plan.pricePaise)}
                      </Text>
                    </View>
                    <Pill tone="lime">{titleCaseFromCode(plan.type ?? "MEMBERSHIP")}</Pill>
                  </View>
                  <Text style={styles.sectionBody}>
                    {plan.description ?? "Standard membership plan."}
                  </Text>
                  <View style={styles.planBenefits}>
                    {buildPlanHighlights(plan).map((item) => (
                      <Pill key={`${plan.id}-${item}`} tone="amber">
                        {item}
                      </Pill>
                    ))}
                  </View>
                  <PrimaryButton
                    onPress={() => void startCheckout(plan.id)}
                    disabled={!canCheckout(plan.id)}
                  >
                    {busyAction === plan.id
                      ? "Opening checkout..."
                      : canCheckout(plan.id)
                        ? "Choose plan"
                        : "Complete earlier step first"}
                  </PrimaryButton>
                </GlassCard>
              ))}
            </View>

            {statusMessage ? (
              <GlassCard variant="compact">
                <Text style={styles.statusMessage}>
                  {statusMessage}
                </Text>
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
        title: "Submit request",
        body: "Send your membership intent before payment if the gym keeps approvals on.",
      },
      {
        title: "Staff review",
        body: "Ownership can clear the commercial membership request in the web app.",
      },
      {
        title: "Activate plan",
        body: "Return here and complete hosted checkout once approval lands.",
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
        body: "Once the code is valid, the published plans become checkout-ready.",
      },
      {
        title: "Complete checkout",
        body: "Hosted payment activates the membership once the invite rules are satisfied.",
      },
    ];
  }

  return [
    {
      title: "Browse public plans",
      body: "Compare price, access, trainer support, and plan format without waiting for staff.",
    },
    {
      title: "Checkout instantly",
      body: "Hosted checkout creates the membership flow directly from mobile.",
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
  return ["Strength", "Mobility", "Nutrition"];
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

  return highlights.length ? highlights : ["Flexible membership", "Hosted checkout"];
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
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 16,
    paddingBottom: layout.bottomNavContentPadding,
  },
  heroCard: {
    gap: 16,
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
  tagRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  viewerStateStack: {
    gap: 10,
  },
  profileDetailsCard: {
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
  trainerCopy: {
    flex: 1,
    gap: 6,
  },
  trainerName: {
    color: colors.text,
    ...typography.headerTitle,
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
  planPrice: {
    color: colors.lime,
    ...typography.metric,
  },
  planBenefits: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  statusMessage: {
    color: colors.text,
    ...typography.body,
  },
});

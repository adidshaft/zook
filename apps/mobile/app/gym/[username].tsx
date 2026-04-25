import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  InfoRow,
  LoadingState,
  Pill,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SectionHeader,
} from "@/components/primitives";
import { mobileApiFetch, toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatInr, formatLongDate, titleCaseFromCode } from "@/lib/formatting";
import { useGymProfile } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

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
  const viewerState = gymQuery.data?.viewerState;
  const effectiveReferral = referralCode ?? gymQuery.data?.referral?.code ?? undefined;

  async function requestMembership() {
    if (!gym || !token) {
      return;
    }
    setBusyAction("join-request");
    setStatusMessage(null);
    try {
      await mobileApiFetch(`/orgs/${gym.id}/join-requests`, {
        method: "POST",
        token,
        body: {
          ...(plans[0]?.id ? { planId: plans[0].id } : {}),
          ...(effectiveReferral ? { referralCode: effectiveReferral } : {}),
        },
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
      const payload = await mobileApiFetch<{ checkoutUrl: string }>(
        `/orgs/${gym.id}/subscriptions`,
        {
          method: "POST",
          token,
          body: {
            planId,
            ...(effectiveReferral ? { referralCode: effectiveReferral } : {}),
          },
        },
      );
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
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {gym ? (
          <ScreenHeader
            eyebrow="Gym profile"
            title={gym.name}
            subtitle={`${gym.city}, ${gym.state}`}
            trailing={
              <Pill tone={toneForJoinMode(gym.joinMode)}>{titleCaseFromCode(gym.joinMode)}</Pill>
            }
          />
        ) : (
          <ScreenHeader
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
            <Card style={styles.heroCard}>
              <View style={styles.coverPlaceholder}>
                <View style={styles.coverGlow} />
                <Text style={styles.coverEyebrow}>
                  {gym.name}
                </Text>
                <Text style={styles.coverTitle}>
                  {plans.length} plans available
                </Text>
                <Text style={styles.coverBody}>
                  Review membership options and join directly from your phone.
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
            </Card>

            <View style={styles.metricRow}>
              <Card style={styles.metricCard}>
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
              </Card>
              <Card style={styles.metricCard}>
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
              </Card>
            </View>

            <SectionHeader
              eyebrow="Join path"
              title="How to join"
              subtitle="Follow these steps to start your membership."
            />

            <Card style={styles.timelineCard}>
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
            </Card>

            {needsApproval &&
            !viewerState?.pendingJoinRequest &&
            !viewerState?.approvedJoinRequest ? (
              <Card style={styles.ctaCard}>
                <Text style={styles.sectionTitle}>
                  Request membership first
                </Text>
                <Text style={styles.sectionBody}>
                  This gym reviews new members before payment. Submit your request and the
                  receptionist or owner can approve it.
                </Text>
                <PrimaryButton onPress={() => void requestMembership()}>
                  {busyAction === "join-request" ? "Submitting..." : "Send membership request"}
                </PrimaryButton>
              </Card>
            ) : null}

            {inviteOnlyLocked ? (
              <Card style={styles.ctaCard}>
                <Text style={styles.sectionTitle}>
                  Invite or referral required
                </Text>
                <Text style={styles.sectionBody}>
                  Open this gym from a referral link or ask the gym team for a code to continue.
                </Text>
              </Card>
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
                <Card key={plan.id} style={styles.planCard}>
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
                </Card>
              ))}
            </View>

            {statusMessage ? (
              <Card>
                <Text style={styles.statusMessage}>
                  {statusMessage}
                </Text>
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
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
        body: "Send your membership intent so staff can review the fit before payment.",
      },
      {
        title: "Staff review",
        body: "Reception or ownership approves the request in the live dashboard.",
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
      body: "Compare price, structure, and plan format without waiting for staff.",
    },
    {
      title: "Checkout instantly",
      body: "Hosted checkout creates the membership flow directly from mobile.",
    },
    {
      title: "Start training",
      body: "Membership, attendance, plans, and notifications flow back into your member home.",
    },
  ];
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
    padding: 20,
    gap: 16,
    paddingBottom: 120,
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
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  coverTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
  },
  coverBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  tagRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  viewerStateStack: {
    gap: 10,
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    gap: 8,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  metricBody: {
    color: colors.muted,
    lineHeight: 20,
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
    fontWeight: "900",
  },
  timelineCopy: {
    flex: 1,
    gap: 6,
  },
  timelineTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  timelineBody: {
    color: colors.muted,
    lineHeight: 20,
  },
  ctaCard: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  sectionBody: {
    color: colors.muted,
    lineHeight: 21,
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
    fontSize: 22,
    fontWeight: "900",
  },
  planPrice: {
    color: colors.lime,
    fontSize: 26,
    fontWeight: "900",
  },
  planBenefits: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  statusMessage: {
    color: colors.text,
    lineHeight: 20,
  },
});

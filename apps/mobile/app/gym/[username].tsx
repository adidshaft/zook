import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Pill, PrimaryButton, Screen } from "@/components/primitives";
import { toWebUrl, mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useGymProfile } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

type GymProfile = {
  id: string;
  name: string;
  city: string;
  state: string;
  joinMode: "OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY";
  visibility: string;
  amenities?: string[] | null;
};

type PublicPlan = {
  id: string;
  name: string;
  description?: string | null;
  pricePaise?: number | null;
};

function formatInr(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format((value ?? 0) / 100);
}

export default function GymProfileScreen() {
  const params = useLocalSearchParams<{ username: string; ref?: string }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const referralCode = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const gymQuery = useGymProfile(username ?? "");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const gym = (gymQuery.data?.org ?? null) as GymProfile | null;
  const plans = (gymQuery.data?.plans ?? []) as PublicPlan[];
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
          ...(effectiveReferral ? { referralCode: effectiveReferral } : {})
        }
      });
      setStatusMessage("Membership request submitted. Staff can now review it from the dashboard.");
      await queryClient.invalidateQueries({ queryKey: ["gym", username] });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to submit membership request.");
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
      const payload = await mobileApiFetch<{ checkoutUrl: string }>(`/orgs/${gym.id}/subscriptions`, {
        method: "POST",
        token,
        body: {
          planId,
          ...(effectiveReferral ? { referralCode: effectiveReferral } : {})
        }
      });
      setStatusMessage("Checkout created. Complete the hosted mock payment to activate the membership.");
      await Linking.openURL(toWebUrl(payload.checkoutUrl));
      await queryClient.invalidateQueries({ queryKey: ["me", "memberships"] });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to start checkout.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <Screen title="Gym Profile">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {gymQuery.isLoading ? (
          <Card>
            <Text style={styles.body}>Loading gym details...</Text>
          </Card>
        ) : null}

        {!gymQuery.isLoading && !gym ? (
          <Card>
            <Text style={styles.body}>Gym profile not available.</Text>
          </Card>
        ) : null}

        {gym ? (
          <>
            <Card>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{gym.name}</Text>
                  <Text style={styles.body}>
                    {gym.city}, {gym.state}
                  </Text>
                </View>
                <Pill tone="lime">{gym.joinMode.replaceAll("_", " ")}</Pill>
              </View>
              <View style={styles.tags}>
                {(gym.amenities ?? []).slice(0, 4).map((amenity) => (
                  <Pill key={amenity}>{amenity}</Pill>
                ))}
              </View>
              {effectiveReferral ? (
                <Text style={[styles.body, styles.notice]}>Referral applied: {effectiveReferral}</Text>
              ) : null}
              {viewerState?.activeMembership ? (
                <Text style={[styles.body, styles.notice]}>You already have an active membership with this gym.</Text>
              ) : null}
              {viewerState?.pendingJoinRequest ? (
                <Text style={[styles.body, styles.notice]}>Your join request is pending staff review.</Text>
              ) : null}
              {viewerState?.approvedJoinRequest ? (
                <Text style={[styles.body, styles.notice]}>Your join request is approved. You can continue to checkout.</Text>
              ) : null}
            </Card>

            {gym.joinMode === "APPROVAL_REQUIRED" && !viewerState?.pendingJoinRequest && !viewerState?.approvedJoinRequest ? (
              <Card>
                <Text style={styles.cardTitle}>Request membership</Text>
                <Text style={styles.body}>
                  This gym reviews new members before payment. Submit a request and the receptionist or owner can approve it.
                </Text>
                <PrimaryButton onPress={() => void requestMembership()}>
                  {busyAction === "join-request" ? "Submitting..." : "Request Membership"}
                </PrimaryButton>
              </Card>
            ) : null}

            {gym.joinMode === "INVITE_ONLY" && !effectiveReferral ? (
              <Card>
                <Text style={styles.cardTitle}>Invite required</Text>
                <Text style={styles.body}>
                  This gym only allows join through invite or referral links. Open the gym from a referral to continue.
                </Text>
              </Card>
            ) : null}

            {plans.map((plan) => (
              <Card key={plan.id}>
                <Text style={styles.cardTitle}>{plan.name}</Text>
                <Text style={styles.price}>{formatInr(plan.pricePaise)}</Text>
                <Text style={styles.body}>{plan.description ?? "Membership plan"}</Text>
                {viewerState?.activeMembership ? null : gym.joinMode === "APPROVAL_REQUIRED" && !viewerState?.approvedJoinRequest ? null : gym.joinMode === "INVITE_ONLY" && !effectiveReferral ? null : (
                  <PrimaryButton onPress={() => void startCheckout(plan.id)}>
                    {busyAction === plan.id ? "Opening checkout..." : "Choose Plan"}
                  </PrimaryButton>
                )}
              </Card>
            ))}

            {statusMessage ? (
              <Card>
                <Text style={styles.body}>{statusMessage}</Text>
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 120 },
  header: { flexDirection: "row", gap: 12, alignItems: "center" },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  cardTitle: { color: colors.text, fontSize: 20, fontWeight: "900" },
  price: { color: colors.lime, fontSize: 22, fontWeight: "900", marginTop: 10 },
  body: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  tags: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" },
  notice: { color: colors.text },
});

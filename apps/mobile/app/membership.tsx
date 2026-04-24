import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  LoadingState,
  MetricTile,
  Pill,
  PrimaryLink,
  Screen,
  ScreenHeader,
  SectionHeader,
} from "@/components/primitives";
import { formatLongDate, titleCaseFromCode } from "@/lib/formatting";
import { useMyMemberships } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

type MembershipRecord = {
  id: string;
  status?: string | null;
  endsAt?: string | null;
  remainingVisits?: number | null;
  createdAt?: string | null;
  plan?: {
    name?: string | null;
    type?: string | null;
  } | null;
  organization?: {
    name?: string | null;
  } | null;
};

function toneForStatus(status?: string | null) {
  if (status === "ACTIVE") {
    return "lime" as const;
  }
  if (status === "PENDING" || status === "PAST_DUE") {
    return "amber" as const;
  }
  if (status === "EXPIRED" || status === "CANCELLED") {
    return "neutral" as const;
  }
  return "blue" as const;
}

export default function MembershipScreen() {
  const routeParams = useLocalSearchParams<{
    focus?: string;
    notificationId?: string;
    subscriptionId?: string;
  }>();
  const membershipsQuery = useMyMemberships();
  const subscriptions = (membershipsQuery.data?.subscriptions ?? []) as MembershipRecord[];
  const sortedSubscriptions = [...subscriptions].sort((left, right) => {
    if (left.id === routeParams.subscriptionId) {
      return -1;
    }
    if (right.id === routeParams.subscriptionId) {
      return 1;
    }
    return 0;
  });
  const activeCount = subscriptions.filter(
    (subscription) => subscription.status === "ACTIVE",
  ).length;
  const expiringSoonCount = subscriptions.filter((subscription) => {
    if (subscription.status !== "ACTIVE" || !subscription.endsAt) {
      return false;
    }
    const timeUntilExpiry = new Date(subscription.endsAt).getTime() - Date.now();
    return timeUntilExpiry >= 0 && timeUntilExpiry <= 1000 * 60 * 60 * 24 * 30;
  }).length;
  const latestSubscription = sortedSubscriptions[0];

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Membership"
          title="Keep plan access, renewal timing, and visit balances visible."
          subtitle="This is the mobile handoff target for expiring membership alerts and checkout follow-up."
        />

        {routeParams.focus === "membership" ? (
          <Card style={styles.calloutCard}>
            <Pill tone="blue">Opened from push</Pill>
            <Text style={styles.calloutTitle} selectable>
              Membership notification context is active.
            </Text>
            <Text style={styles.body} selectable>
              {routeParams.subscriptionId
                ? `Subscription ${routeParams.subscriptionId} was passed through the notification payload.`
                : "This screen is showing the current membership stack without a specific subscription ID."}
            </Text>
          </Card>
        ) : null}

        <View style={styles.metricGrid}>
          <MetricTile
            label="Active"
            value={String(activeCount)}
            detail={
              activeCount ? "Current paid or approved memberships." : "No active membership yet."
            }
            tone={activeCount ? "lime" : "neutral"}
          />
          <MetricTile
            label="Expiring in 30 days"
            value={String(expiringSoonCount)}
            detail="Use this to verify membership expiry reminders and renewal follow-up."
            tone={expiringSoonCount ? "amber" : "blue"}
          />
        </View>

        {membershipsQuery.isLoading ? (
          <LoadingState
            title="Loading memberships"
            body="Pulling subscription records, plan metadata, and current gym context."
          />
        ) : null}

        {!membershipsQuery.isLoading && !subscriptions.length ? (
          <EmptyState
            title="No memberships yet"
            body="Choose a public gym and start a membership to see renewal, visits, and active-plan state here."
            action={<PrimaryLink href="/find-gyms">Browse gyms</PrimaryLink>}
          />
        ) : null}

        {latestSubscription ? (
          <>
            <SectionHeader
              eyebrow="Current focus"
              title="Latest membership"
              subtitle="The most relevant subscription is surfaced first for pilot QA and push follow-up."
            />
            <Card style={styles.featuredCard}>
              <View style={styles.featuredHeader}>
                <View style={styles.featuredCopy}>
                  <Text style={styles.featuredTitle} selectable>
                    {latestSubscription.plan?.name ?? "Membership"}
                  </Text>
                  <Text style={styles.body} selectable>
                    {latestSubscription.organization?.name ?? "Gym organization"}
                  </Text>
                </View>
                <Pill tone={toneForStatus(latestSubscription.status)}>
                  {titleCaseFromCode(latestSubscription.status ?? "ACTIVE")}
                </Pill>
              </View>
              <Text style={styles.body} selectable>
                {latestSubscription.endsAt
                  ? `Ends on ${formatLongDate(latestSubscription.endsAt)}`
                  : "No end date available for this membership."}
              </Text>
              {latestSubscription.remainingVisits !== null &&
              latestSubscription.remainingVisits !== undefined ? (
                <Text style={styles.detail} selectable>
                  {latestSubscription.remainingVisits} visits remaining
                </Text>
              ) : null}
            </Card>
          </>
        ) : null}

        {sortedSubscriptions.length > 1 ? (
          <>
            <SectionHeader
              eyebrow="History"
              title="Other memberships"
              subtitle="Past and secondary subscriptions stay visible for renewal support and operator troubleshooting."
            />
            <View style={styles.stack}>
              {sortedSubscriptions.slice(1).map((subscription) => (
                <Card key={subscription.id}>
                  <View style={styles.listHeader}>
                    <View style={styles.listCopy}>
                      <Text style={styles.listTitle} selectable>
                        {subscription.plan?.name ?? "Membership"}
                      </Text>
                      <Text style={styles.body} selectable>
                        {subscription.organization?.name ?? "Gym organization"}
                      </Text>
                    </View>
                    <Pill tone={toneForStatus(subscription.status)}>
                      {titleCaseFromCode(subscription.status ?? "ACTIVE")}
                    </Pill>
                  </View>
                  <Text style={styles.body} selectable>
                    {subscription.endsAt
                      ? `Ends on ${formatLongDate(subscription.endsAt)}`
                      : "No expiry date available."}
                  </Text>
                </Card>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  calloutCard: {
    gap: 10,
  },
  calloutTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  metricGrid: {
    gap: 12,
  },
  featuredCard: {
    gap: 12,
  },
  featuredHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  featuredCopy: {
    flex: 1,
    gap: 4,
  },
  featuredTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  body: {
    color: colors.muted,
    lineHeight: 21,
  },
  detail: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  stack: {
    gap: 12,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  listCopy: {
    flex: 1,
    gap: 4,
  },
  listTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
});

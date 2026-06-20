import { Stack } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Card,
  EmptyState,
  FormField,
  IconBubble,
  Pill,
  QueryErrorState,
  SectionHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import {
  useCreatePtPlan,
  useTrainerPtPlans,
  useTrainerPtSubscriptions,
} from "@/lib/domains/trainer/queries";
import type { PtSubscriptionRecord } from "@/lib/domains/shared/types";
import { formatInr, titleCaseFromCode } from "@/lib/formatting";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

function subscriptionTone(status: string) {
  const normalized = status.toUpperCase();
  if (normalized.includes("ACTIVE")) return "lime" as const;
  if (normalized.includes("PENDING")) return "amber" as const;
  if (normalized.includes("EXPIRED") || normalized.includes("CANCEL")) return "red" as const;
  return "neutral" as const;
}

function ClientRow({ sub }: { sub: PtSubscriptionRecord }) {
  const { palette } = useTheme();
  return (
    <View style={styles.clientRow}>
      <IconBubble icon="person-outline" tone="blue" size={40} />
      <View style={styles.clientCopy}>
        <Text style={[styles.clientName, { color: palette.text.primary }]} numberOfLines={1}>
          {sub.memberName ?? "Client"}
        </Text>
        <Text style={[styles.clientMeta, { color: palette.text.secondary }]} numberOfLines={1}>
          {sub.planName ?? "PT package"}
          {sub.totalSessions
            ? ` · ${sub.remainingSessions ?? 0}/${sub.totalSessions} sessions left`
            : ""}
        </Text>
      </View>
      <Pill tone={subscriptionTone(sub.status)}>{titleCaseFromCode(sub.status)}</Pill>
    </View>
  );
}

export default function TrainerPersonalTraining() {
  const { palette } = useTheme();
  const plansQuery = useTrainerPtPlans();
  const subscriptionsQuery = useTrainerPtSubscriptions();
  const createPlan = useCreatePtPlan();
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [sessions, setSessions] = useState("");
  const [days, setDays] = useState("");
  const [price, setPrice] = useState("");

  const plans = plansQuery.data?.plans ?? [];
  const subscriptions = subscriptionsQuery.data?.subscriptions ?? [];
  const activeClients = subscriptions.filter((sub) =>
    sub.status.toUpperCase().includes("ACTIVE"),
  ).length;
  const priceValid = (Number.parseInt(price, 10) || 0) > 0;
  const canSubmit = name.trim().length >= 2 && priceValid && !createPlan.isPending;

  async function refresh() {
    setRefreshing(true);
    await Promise.all([plansQuery.refetch(), subscriptionsQuery.refetch()]);
    setRefreshing(false);
  }

  function submit() {
    if (!canSubmit) return;
    createPlan.mutate(
      {
        name: name.trim(),
        pricePaise: (Number.parseInt(price, 10) || 0) * 100,
        ...(Number.parseInt(sessions, 10) ? { sessionCount: Number.parseInt(sessions, 10) } : {}),
        ...(Number.parseInt(days, 10) ? { durationDays: Number.parseInt(days, 10) } : {}),
      },
      {
        onSuccess: () => {
          setName("");
          setSessions("");
          setDays("");
          setPrice("");
          setShowForm(false);
        },
      },
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="trainer-pt-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
        >
          <AppHeader
            title="Personal Training"
            subtitle="Your own coaching packages and clients."
            showProfileShortcut={false}
            showBack
          />

          <View style={styles.statRow}>
            <Card variant="compact" contentStyle={styles.statCard}>
              <Text style={[styles.statValue, { color: palette.text.primary }]}>
                {activeClients}
              </Text>
              <Text style={[styles.statLabel, { color: palette.text.secondary }]}>PT clients</Text>
            </Card>
            <Card variant="compact" contentStyle={styles.statCard}>
              <Text style={[styles.statValue, { color: palette.text.primary }]}>{plans.length}</Text>
              <Text style={[styles.statLabel, { color: palette.text.secondary }]}>Packages</Text>
            </Card>
          </View>

          <SectionHeader
            title="Your packages"
            action={
              <ZookButton
                size="sm"
                variant={showForm ? "secondary" : "primary"}
                icon={showForm ? "close" : "add"}
                onPress={() => setShowForm((current) => !current)}
              >
                {showForm ? "Cancel" : "New"}
              </ZookButton>
            }
          />

          {showForm ? (
            <Card contentStyle={styles.formCard}>
              <FormField label="Package name" value={name} onChangeText={setName} placeholder="1-on-1 Strength · 12 sessions" />
              <View style={styles.formRow}>
                <FormField label="Sessions" value={sessions} onChangeText={setSessions} keyboardType="number-pad" placeholder="12" style={styles.formField} />
                <FormField label="Valid days" value={days} onChangeText={setDays} keyboardType="number-pad" placeholder="45" style={styles.formField} />
              </View>
              <FormField label="Price (₹)" value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="12000" />
              <ZookButton onPress={submit} disabled={!canSubmit} busy={createPlan.isPending} busyLabel="Creating..." icon="pricetag-outline">
                Create package
              </ZookButton>
            </Card>
          ) : null}

          {plansQuery.isError ? (
            <QueryErrorState error={plansQuery.error} onRetry={() => void plansQuery.refetch()} />
          ) : null}

          {!plansQuery.isLoading && plans.length === 0 && !showForm ? (
            <Card variant="compact">
              <EmptyState
                icon="pricetag-outline"
                title="No packages yet"
                body="Create a PT package and members can train with you one-on-one."
              />
            </Card>
          ) : null}

          <View style={styles.stack}>
            {plans.map((plan) => (
              <Card key={plan.id} variant="compact" contentStyle={styles.planCard}>
                <View style={styles.planHeader}>
                  <IconBubble icon="barbell-outline" tone="lime" size={42} />
                  <View style={styles.planCopy}>
                    <Text style={[styles.planName, { color: palette.text.primary }]}>{plan.name}</Text>
                    <Text style={[styles.planMeta, { color: palette.text.secondary }]}>
                      {[
                        plan.sessionCount ? `${plan.sessionCount} sessions` : null,
                        plan.durationDays ? `${plan.durationDays} days` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <Text style={[styles.planPrice, { color: palette.text.primary }]}>
                    {formatInr(plan.pricePaise)}
                  </Text>
                </View>
                {plan.description ? (
                  <Text style={[styles.planDesc, { color: palette.text.secondary }]} numberOfLines={2}>
                    {plan.description}
                  </Text>
                ) : null}
              </Card>
            ))}
          </View>

          <SectionHeader title="Your PT clients" />
          {subscriptionsQuery.isError ? (
            <QueryErrorState
              error={subscriptionsQuery.error}
              onRetry={() => void subscriptionsQuery.refetch()}
            />
          ) : null}
          <Card variant="compact" contentStyle={styles.clientsCard}>
            {subscriptions.length === 0 && !subscriptionsQuery.isLoading ? (
              <EmptyState
                icon="people-outline"
                title="No PT clients yet"
                body="When a member buys one of your packages they'll appear here."
              />
            ) : (
              subscriptions.map((sub, index) => (
                <View key={sub.id}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: palette.border.subtle }]} />
                  ) : null}
                  <ClientRow sub={sub} />
                </View>
              ))
            )}
          </Card>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  statRow: { flexDirection: "row", gap: spacing.sm },
  statCard: { alignItems: "flex-start", flex: 1, gap: 2 },
  statValue: { ...typography.metric },
  statLabel: { ...typography.small },
  formCard: { gap: spacing.md },
  formRow: { flexDirection: "row", gap: spacing.sm },
  formField: { flex: 1 },
  stack: { gap: spacing.sm },
  planCard: { gap: spacing.sm },
  planHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  planCopy: { flex: 1, gap: 2, minWidth: 0 },
  planName: { ...typography.cardTitle },
  planMeta: { ...typography.small },
  planPrice: { ...typography.cardTitle },
  planDesc: { ...typography.body },
  clientsCard: { gap: 0, paddingVertical: 2 },
  clientRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, paddingVertical: 10 },
  clientCopy: { flex: 1, gap: 2, minWidth: 0 },
  clientName: { ...typography.cardTitle },
  clientMeta: { ...typography.small },
  divider: { height: StyleSheet.hairlineWidth },
});

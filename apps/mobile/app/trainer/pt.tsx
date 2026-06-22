import { Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

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
  useLogPtSession,
  useRecordPtSubscription,
  useTrainerClients,
  useTrainerPtPlans,
  useTrainerPtSubscriptions,
} from "@/lib/domains/trainer/queries";
import type { PtPlanRecord, PtSubscriptionRecord } from "@/lib/domains/shared/types";
import { formatInr, titleCaseFromCode } from "@/lib/formatting";
import { radii, spacing, typography, layout, useTheme } from "@/lib/theme";

type PaymentMode = "CASH" | "DIRECT_UPI" | "OTHER";
const PAYMENT_MODES: Array<{ value: PaymentMode; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "DIRECT_UPI", label: "UPI" },
  { value: "OTHER", label: "Other" },
];

function subscriptionTone(status: string) {
  const normalized = status.toUpperCase();
  if (normalized.includes("ACTIVE")) return "lime" as const;
  if (normalized.includes("PENDING")) return "amber" as const;
  if (normalized.includes("EXPIRED") || normalized.includes("CANCEL")) return "red" as const;
  return "neutral" as const;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? palette.accent.base : palette.border.default,
          backgroundColor: selected ? palette.surface.accentSoft : palette.surface.default,
        },
      ]}
    >
      <Text
        style={[styles.chipText, { color: selected ? palette.accent.base : palette.text.secondary }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ClientRow({
  sub,
  logging,
  onLogSession,
}: {
  sub: PtSubscriptionRecord;
  logging: boolean;
  onLogSession: () => void;
}) {
  const { palette } = useTheme();
  const active = sub.status.toUpperCase().includes("ACTIVE");
  const remaining = sub.remainingSessions ?? 0;
  const canLog = active && remaining > 0;
  return (
    <View style={styles.clientRow}>
      <View style={styles.clientTop}>
        <IconBubble icon="person-outline" tone="blue" size={40} />
        <View style={styles.clientCopy}>
          <Text style={[styles.clientName, { color: palette.text.primary }]} numberOfLines={1}>
            {sub.memberName ?? "Client"}
          </Text>
          <Text style={[styles.clientMeta, { color: palette.text.secondary }]} numberOfLines={1}>
            {sub.planName ?? "PT package"}
            {sub.totalSessions ? ` · ${remaining}/${sub.totalSessions} left` : ""}
          </Text>
        </View>
        <Pill tone={subscriptionTone(sub.status)}>{titleCaseFromCode(sub.status)}</Pill>
      </View>
      {canLog ? (
        <ZookButton size="sm" variant="secondary" icon="checkmark-done-outline" busy={logging} busyLabel="Logging..." onPress={onLogSession}>
          Log session
        </ZookButton>
      ) : remaining <= 0 && sub.totalSessions ? (
        <Text style={[styles.clientMeta, { color: palette.text.tertiary }]}>All sessions completed</Text>
      ) : null}
    </View>
  );
}

export default function TrainerPersonalTraining() {
  const { palette } = useTheme();
  const plansQuery = useTrainerPtPlans();
  const subscriptionsQuery = useTrainerPtSubscriptions();
  const clientsQuery = useTrainerClients();
  const createPlan = useCreatePtPlan();
  const recordClient = useRecordPtSubscription();
  const logSession = useLogPtSession();
  const [refreshing, setRefreshing] = useState(false);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  // package form
  const [name, setName] = useState("");
  const [sessions, setSessions] = useState("");
  const [days, setDays] = useState("");
  const [price, setPrice] = useState("");
  // client form
  const [memberId, setMemberId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");

  const plans = plansQuery.data?.plans ?? [];
  const subscriptions = subscriptionsQuery.data?.subscriptions ?? [];
  const members = useMemo(
    () =>
      (clientsQuery.data?.clients ?? []).map((client) => ({
        id: client.memberUserId as string,
        name: (client.user?.name as string) ?? "Member",
      })),
    [clientsQuery.data],
  );
  const activeClients = subscriptions.filter((sub) => sub.status.toUpperCase().includes("ACTIVE")).length;
  const selectedPlan: PtPlanRecord | undefined = plans.find((plan) => plan.id === planId);
  const priceValid = (Number.parseInt(price, 10) || 0) > 0;
  const canSubmitPackage = name.trim().length >= 2 && priceValid && !createPlan.isPending;
  const canSubmitClient = Boolean(memberId) && Boolean(planId) && !recordClient.isPending;

  async function refresh() {
    setRefreshing(true);
    await Promise.all([plansQuery.refetch(), subscriptionsQuery.refetch(), clientsQuery.refetch()]);
    setRefreshing(false);
  }

  function submitPackage() {
    if (!canSubmitPackage) return;
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
          setShowPackageForm(false);
        },
      },
    );
  }

  function submitClient() {
    if (!canSubmitClient || !memberId || !selectedPlan) return;
    recordClient.mutate(
      {
        memberUserId: memberId,
        ptPlanId: selectedPlan.id,
        amountPaise: selectedPlan.pricePaise,
        paymentMode,
        ...(selectedPlan.sessionCount ? { totalSessions: selectedPlan.sessionCount } : {}),
      },
      {
        onSuccess: () => {
          setMemberId(null);
          setPlanId(null);
          setPaymentMode("CASH");
          setShowClientForm(false);
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
            <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.accent.base} colors={[palette.accent.base]} />
          }
        >
          <AppHeader title="Personal Training" subtitle="Your own coaching packages and clients." showProfileShortcut={false} showBack />

          <View style={styles.statRow}>
            <Card variant="compact" contentStyle={styles.statCard}>
              <Text style={[styles.statValue, { color: palette.text.primary }]}>{activeClients}</Text>
              <Text style={[styles.statLabel, { color: palette.text.secondary }]}>PT clients</Text>
            </Card>
            <Card variant="compact" contentStyle={styles.statCard}>
              <Text style={[styles.statValue, { color: palette.text.primary }]}>{plans.length}</Text>
              <Text style={[styles.statLabel, { color: palette.text.secondary }]}>Packages</Text>
            </Card>
          </View>

          <SectionHeader
            title="Your PT clients"
            action={
              <ZookButton
                size="sm"
                variant={showClientForm ? "secondary" : "primary"}
                icon={showClientForm ? "close" : "person-add"}
                disabled={plans.length === 0}
                onPress={() => setShowClientForm((current) => !current)}
              >
                {showClientForm ? "Cancel" : "Add"}
              </ZookButton>
            }
          />

          {showClientForm ? (
            <Card contentStyle={styles.formCard}>
              <Text style={[styles.formLabel, { color: palette.text.secondary }]}>Member</Text>
              <View style={styles.chipWrap}>
                {members.length ? (
                  members.map((member) => (
                    <Chip key={member.id} label={member.name} selected={memberId === member.id} onPress={() => setMemberId(member.id)} />
                  ))
                ) : (
                  <Text style={[styles.clientMeta, { color: palette.text.tertiary }]}>No members available.</Text>
                )}
              </View>
              <Text style={[styles.formLabel, { color: palette.text.secondary }]}>Package</Text>
              <View style={styles.chipWrap}>
                {plans.map((plan) => (
                  <Chip key={plan.id} label={`${plan.name} · ${formatInr(plan.pricePaise)}`} selected={planId === plan.id} onPress={() => setPlanId(plan.id)} />
                ))}
              </View>
              <Text style={[styles.formLabel, { color: palette.text.secondary }]}>Payment</Text>
              <View style={styles.chipWrap}>
                {PAYMENT_MODES.map((mode) => (
                  <Chip key={mode.value} label={mode.label} selected={paymentMode === mode.value} onPress={() => setPaymentMode(mode.value)} />
                ))}
              </View>
              <ZookButton onPress={submitClient} disabled={!canSubmitClient} busy={recordClient.isPending} busyLabel="Adding..." icon="person-add-outline">
                {selectedPlan ? `Record client · ${formatInr(selectedPlan.pricePaise)}` : "Record client"}
              </ZookButton>
            </Card>
          ) : null}

          {subscriptionsQuery.isError ? (
            <QueryErrorState error={subscriptionsQuery.error} onRetry={() => void subscriptionsQuery.refetch()} />
          ) : null}

          <Card variant="compact" contentStyle={styles.clientsCard}>
            {subscriptions.length === 0 && !subscriptionsQuery.isLoading ? (
              <EmptyState icon="people-outline" title="No PT clients yet" body="Add a client to start coaching them one-on-one." />
            ) : (
              subscriptions.map((sub, index) => (
                <View key={sub.id}>
                  {index > 0 ? <View style={[styles.divider, { backgroundColor: palette.border.subtle }]} /> : null}
                  <ClientRow sub={sub} logging={logSession.isPending && logSession.variables?.subscriptionId === sub.id} onLogSession={() => logSession.mutate({ subscriptionId: sub.id })} />
                </View>
              ))
            )}
          </Card>

          <SectionHeader
            title="Your packages"
            action={
              <ZookButton size="sm" variant={showPackageForm ? "secondary" : "primary"} icon={showPackageForm ? "close" : "add"} onPress={() => setShowPackageForm((current) => !current)}>
                {showPackageForm ? "Cancel" : "New"}
              </ZookButton>
            }
          />

          {showPackageForm ? (
            <Card contentStyle={styles.formCard}>
              <FormField label="Package name" value={name} onChangeText={setName} placeholder="1-on-1 Strength · 12 sessions" />
              <View style={styles.formRow}>
                <FormField label="Sessions" value={sessions} onChangeText={setSessions} keyboardType="number-pad" placeholder="12" style={styles.formField} />
                <FormField label="Valid days" value={days} onChangeText={setDays} keyboardType="number-pad" placeholder="45" style={styles.formField} />
              </View>
              <FormField label="Price (₹)" value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="12000" />
              <ZookButton onPress={submitPackage} disabled={!canSubmitPackage} busy={createPlan.isPending} busyLabel="Creating..." icon="pricetag-outline">
                Create package
              </ZookButton>
            </Card>
          ) : null}

          {plansQuery.isError ? (
            <QueryErrorState error={plansQuery.error} onRetry={() => void plansQuery.refetch()} />
          ) : null}

          {!plansQuery.isLoading && plans.length === 0 && !showPackageForm ? (
            <Card variant="compact">
              <EmptyState icon="pricetag-outline" title="No packages yet" body="Create a PT package, then add clients to it." />
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
                      {[plan.sessionCount ? `${plan.sessionCount} sessions` : null, plan.durationDays ? `${plan.durationDays} days` : null].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  <Text style={[styles.planPrice, { color: palette.text.primary }]}>{formatInr(plan.pricePaise)}</Text>
                </View>
                {plan.description ? (
                  <Text style={[styles.planDesc, { color: palette.text.secondary }]} numberOfLines={2}>{plan.description}</Text>
                ) : null}
              </Card>
            ))}
          </View>
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
  formLabel: { ...typography.caption },
  formRow: { flexDirection: "row", gap: spacing.sm },
  formField: { flex: 1 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: -spacing.xs },
  chip: { borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9, maxWidth: "100%" },
  chipText: { ...typography.caption },
  stack: { gap: spacing.sm },
  planCard: { gap: spacing.sm },
  planHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  planCopy: { flex: 1, gap: 2, minWidth: 0 },
  planName: { ...typography.cardTitle },
  planMeta: { ...typography.small },
  planPrice: { ...typography.cardTitle },
  planDesc: { ...typography.body },
  clientsCard: { gap: spacing.sm, paddingVertical: spacing.sm },
  clientRow: { gap: spacing.sm },
  clientTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  clientCopy: { flex: 1, gap: 2, minWidth: 0 },
  clientName: { ...typography.cardTitle },
  clientMeta: { ...typography.small },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
});

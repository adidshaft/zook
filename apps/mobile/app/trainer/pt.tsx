import { Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

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
  useApprovePtSubscription,
  useCreatePtPlan,
  useDeletePtPlan,
  useLogPtSession,
  useRecordPtSubscription,
  useTrainerClients,
  useTrainerPtPlans,
  useTrainerPtSubscriptions,
  useUpdatePtPlan,
} from "@/lib/domains/trainer/queries";
import type { PtPlanRecord, PtSubscriptionRecord } from "@/lib/domains/shared/types";
import { formatInr, titleCaseFromCode } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { radii, spacing, typography, layout, useTheme } from "@/lib/theme";

type PaymentMode = "CASH" | "DIRECT_UPI" | "OTHER";
const PAYMENT_MODES: PaymentMode[] = ["CASH", "DIRECT_UPI", "OTHER"];

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
  const t = useT();
  const active = sub.status.toUpperCase().includes("ACTIVE");
  const remaining = sub.remainingSessions ?? 0;
  const canLog = active && remaining > 0;
  return (
    <View style={styles.clientRow}>
      <View style={styles.clientTop}>
        <IconBubble icon="person-outline" tone="blue" size={40} />
        <View style={styles.clientCopy}>
          <Text style={[styles.clientName, { color: palette.text.primary }]} numberOfLines={1}>
            {sub.memberName ?? t("trainer.pt.clientFallback")}
          </Text>
          <Text style={[styles.clientMeta, { color: palette.text.secondary }]} numberOfLines={1}>
            {sub.planName ?? t("trainer.pt.ptPackage")}
            {sub.totalSessions ? ` · ${t("trainer.pt.sessionsLeftShort", { remaining, total: sub.totalSessions })}` : ""}
          </Text>
        </View>
        <Pill tone={subscriptionTone(sub.status)}>{titleCaseFromCode(sub.status)}</Pill>
      </View>
      {canLog ? (
        <ZookButton size="sm" variant="secondary" icon="checkmark-done-outline" busy={logging} busyLabel={t("trainer.pt.logging")} onPress={onLogSession}>
          {t("trainer.pt.logSession")}
        </ZookButton>
      ) : remaining <= 0 && sub.totalSessions ? (
        <Text style={[styles.clientMeta, { color: palette.text.tertiary }]}>{t("trainer.pt.allSessionsCompleted")}</Text>
      ) : null}
    </View>
  );
}

function PendingRequestRow({
  sub,
  approving,
  onApprove,
}: {
  sub: PtSubscriptionRecord;
  approving: boolean;
  onApprove: () => void;
}) {
  const { palette } = useTheme();
  const t = useT();
  return (
    <View style={styles.clientRow}>
      <View style={styles.clientTop}>
        <IconBubble icon="person-outline" tone="amber" size={40} />
        <View style={styles.clientCopy}>
          <Text style={[styles.clientName, { color: palette.text.primary }]} numberOfLines={1}>
            {sub.memberName ?? t("more.fallbackName")}
          </Text>
          <Text style={[styles.clientMeta, { color: palette.text.secondary }]} numberOfLines={1}>
            {sub.planName ?? t("trainer.pt.ptPackage")}
            {sub.amountPaise ? ` · ${formatInr(sub.amountPaise)}` : ""}
          </Text>
        </View>
        <Pill tone="amber">{t("trainer.pt.pending")}</Pill>
      </View>
      <ZookButton size="sm" variant="primary" icon="checkmark-outline" busy={approving} busyLabel={t("trainer.pt.approving")} onPress={onApprove}>
        {t("trainer.pt.approve")}
      </ZookButton>
    </View>
  );
}

export default function TrainerPersonalTraining() {
  const { palette } = useTheme();
  const t = useT();
  const plansQuery = useTrainerPtPlans();
  const subscriptionsQuery = useTrainerPtSubscriptions();
  const clientsQuery = useTrainerClients();
  const createPlan = useCreatePtPlan();
  const updatePlan = useUpdatePtPlan();
  const deletePlan = useDeletePtPlan();
  const recordClient = useRecordPtSubscription();
  const logSession = useLogPtSession();
  const approveSubscription = useApprovePtSubscription();
  const [refreshing, setRefreshing] = useState(false);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
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
        name: (client.user?.name as string) ?? t("more.fallbackName"),
      })),
    [clientsQuery.data],
  );
  const activeClients = subscriptions.filter((sub) => sub.status.toUpperCase().includes("ACTIVE")).length;
  const pendingRequests = subscriptions.filter((sub) => sub.status === "PENDING_APPROVAL");
  const confirmedSubscriptions = subscriptions.filter((sub) => sub.status !== "PENDING_APPROVAL");
  const selectedPlan: PtPlanRecord | undefined = plans.find((plan) => plan.id === planId);
  const priceValid = (Number.parseInt(price, 10) || 0) > 0;
  const canSubmitPackage = name.trim().length >= 2 && priceValid && !createPlan.isPending && !updatePlan.isPending;
  const canSubmitClient = Boolean(memberId) && Boolean(planId) && !recordClient.isPending;

  async function refresh() {
    setRefreshing(true);
    await Promise.all([plansQuery.refetch(), subscriptionsQuery.refetch(), clientsQuery.refetch()]);
    setRefreshing(false);
  }

  function submitPackage() {
    if (!canSubmitPackage) return;
    const input = {
      name: name.trim(),
      pricePaise: (Number.parseInt(price, 10) || 0) * 100,
      ...(Number.parseInt(sessions, 10) ? { sessionCount: Number.parseInt(sessions, 10) } : {}),
      ...(Number.parseInt(days, 10) ? { durationDays: Number.parseInt(days, 10) } : {}),
    };
    if (editingPlanId) {
      updatePlan.mutate(
        { planId: editingPlanId, ...input },
        {
          onSuccess: () => resetPackageForm(),
        },
      );
      return;
    }
    createPlan.mutate(
      input,
      {
        onSuccess: () => resetPackageForm(),
      },
    );
  }

  function resetPackageForm() {
    setName("");
    setSessions("");
    setDays("");
    setPrice("");
    setEditingPlanId(null);
    setShowPackageForm(false);
  }

  function openEditPlan(plan: PtPlanRecord) {
    setEditingPlanId(plan.id);
    setName(plan.name);
    setSessions(plan.sessionCount ? String(plan.sessionCount) : "");
    setDays(plan.durationDays ? String(plan.durationDays) : "");
    setPrice(String(Math.round(plan.pricePaise / 100)));
    setShowPackageForm(true);
  }

  function confirmDeletePlan(plan: PtPlanRecord) {
    Alert.alert(t("trainer.pt.removePackageTitle"), t("trainer.pt.removePackageBody", { name: plan.name }), [
      { text: t("trainer.pt.keep"), style: "cancel" },
      {
        text: t("trainer.pt.remove"),
        style: "destructive",
        onPress: () => deletePlan.mutate(plan.id),
      },
    ]);
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
          <AppHeader title={t("trainer.pt.title")} subtitle={t("trainer.pt.subtitle")} showBack />

          <View style={styles.statRow}>
            <Card variant="compact" contentStyle={styles.statCard}>
              <Text style={[styles.statValue, { color: palette.text.primary }]}>{activeClients}</Text>
              <Text style={[styles.statLabel, { color: palette.text.secondary }]}>{t("trainer.pt.ptClients")}</Text>
            </Card>
            <Card variant="compact" contentStyle={styles.statCard}>
              <Text style={[styles.statValue, { color: palette.text.primary }]}>{plans.length}</Text>
              <Text style={[styles.statLabel, { color: palette.text.secondary }]}>{t("trainer.pt.packages")}</Text>
            </Card>
          </View>

          {pendingRequests.length > 0 ? (
            <>
              <SectionHeader title={t("trainer.pt.pendingRequests")} />
              <Card variant="compact" contentStyle={styles.clientsCard}>
                {pendingRequests.map((sub, index) => (
                  <View key={sub.id}>
                    {index > 0 ? <View style={[styles.divider, { backgroundColor: palette.border.subtle }]} /> : null}
                    <PendingRequestRow
                      sub={sub}
                      approving={approveSubscription.isPending && approveSubscription.variables?.subscriptionId === sub.id}
                      onApprove={() => approveSubscription.mutate({ subscriptionId: sub.id })}
                    />
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          <SectionHeader
            title={t("trainer.pt.yourPtClients")}
            action={
              <ZookButton
                size="sm"
                variant={showClientForm ? "secondary" : "primary"}
                icon={showClientForm ? "close" : "person-add"}
                disabled={plans.length === 0}
                onPress={() => setShowClientForm((current) => !current)}
              >
                {showClientForm ? t("common.cancel") : t("trainer.pt.add")}
              </ZookButton>
            }
          />

          {showClientForm ? (
            <Card contentStyle={styles.formCard}>
              <Text style={[styles.formLabel, { color: palette.text.secondary }]}>{t("trainer.pt.member")}</Text>
              <View style={styles.chipWrap}>
                {clientsQuery.isError ? (
                  <QueryErrorState
                    error={clientsQuery.error}
                    onRetry={() => void clientsQuery.refetch()}
                    title={t("trainer.pt.couldNotLoadMembers")}
                  />
                ) : members.length ? (
                  members.map((member) => (
                    <Chip key={member.id} label={member.name} selected={memberId === member.id} onPress={() => setMemberId(member.id)} />
                  ))
                ) : (
                  <Text style={[styles.clientMeta, { color: palette.text.tertiary }]}>{t("trainer.pt.noMembersAvailable")}</Text>
                )}
              </View>
              <Text style={[styles.formLabel, { color: palette.text.secondary }]}>{t("trainer.pt.package")}</Text>
              <View style={styles.chipWrap}>
                {plans.map((plan) => (
                  <Chip key={plan.id} label={`${plan.name} · ${formatInr(plan.pricePaise)}`} selected={planId === plan.id} onPress={() => setPlanId(plan.id)} />
                ))}
              </View>
              <Text style={[styles.formLabel, { color: palette.text.secondary }]}>{t("trainer.pt.payment")}</Text>
              <View style={styles.chipWrap}>
                {PAYMENT_MODES.map((mode) => (
                  <Chip
                    key={mode}
                    label={t(`trainer.pt.paymentMode.${mode}`)}
                    selected={paymentMode === mode}
                    onPress={() => setPaymentMode(mode)}
                  />
                ))}
              </View>
              <ZookButton onPress={submitClient} disabled={!canSubmitClient} busy={recordClient.isPending} busyLabel={t("trainer.pt.adding")} icon="person-add-outline">
                {selectedPlan ? t("trainer.pt.recordClientWithPrice", { price: formatInr(selectedPlan.pricePaise) }) : t("trainer.pt.recordClient")}
              </ZookButton>
            </Card>
          ) : null}

          {subscriptionsQuery.isError ? (
            <QueryErrorState error={subscriptionsQuery.error} onRetry={() => void subscriptionsQuery.refetch()} />
          ) : null}

          <Card variant="compact" contentStyle={styles.clientsCard}>
            {confirmedSubscriptions.length === 0 && !subscriptionsQuery.isLoading ? (
              <EmptyState icon="people-outline" title={t("trainer.pt.noPtClientsYet")} body={t("trainer.pt.noPtClientsYetBody")} />
            ) : (
              confirmedSubscriptions.map((sub, index) => (
                <View key={sub.id}>
                  {index > 0 ? <View style={[styles.divider, { backgroundColor: palette.border.subtle }]} /> : null}
                  <ClientRow sub={sub} logging={logSession.isPending && logSession.variables?.subscriptionId === sub.id} onLogSession={() => logSession.mutate({ subscriptionId: sub.id })} />
                </View>
              ))
            )}
          </Card>

          <SectionHeader
            title={t("trainer.pt.yourPackages")}
            action={
              <ZookButton size="sm" variant={showPackageForm ? "secondary" : "primary"} icon={showPackageForm ? "close" : "add"} onPress={() => showPackageForm ? resetPackageForm() : setShowPackageForm(true)}>
                {showPackageForm ? t("common.cancel") : t("trainer.pt.new")}
              </ZookButton>
            }
          />

          {showPackageForm ? (
            <Card contentStyle={styles.formCard}>
              <FormField label={t("trainer.pt.packageName")} value={name} onChangeText={setName} placeholder={t("trainer.pt.packageNamePlaceholder")} />
              <View style={styles.formRow}>
                <FormField label={t("trainer.pt.sessions")} value={sessions} onChangeText={setSessions} keyboardType="number-pad" placeholder="12" style={styles.formField} />
                <FormField label={t("trainer.pt.validDays")} value={days} onChangeText={setDays} keyboardType="number-pad" placeholder="45" style={styles.formField} />
              </View>
              <FormField label={t("trainer.pt.priceInr")} value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="12000" />
              <ZookButton
                onPress={submitPackage}
                disabled={!canSubmitPackage}
                busy={createPlan.isPending || updatePlan.isPending}
                busyLabel={editingPlanId ? t("settings.saving") : t("trainer.pt.creating")}
                icon="pricetag-outline"
              >
                {editingPlanId ? t("trainer.pt.savePackage") : t("trainer.pt.createPackage")}
              </ZookButton>
            </Card>
          ) : null}

          {plansQuery.isError ? (
            <QueryErrorState error={plansQuery.error} onRetry={() => void plansQuery.refetch()} />
          ) : null}

          {!plansQuery.isLoading && plans.length === 0 && !showPackageForm ? (
            <Card variant="compact">
              <EmptyState icon="pricetag-outline" title={t("trainer.pt.noPackagesYet")} body={t("trainer.pt.noPackagesYetBody")} />
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
                        plan.sessionCount ? t("trainer.pt.sessionsCount", { count: plan.sessionCount }) : null,
                        plan.durationDays ? t("trainer.pt.daysCount", { count: plan.durationDays }) : null,
                      ].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  <Text style={[styles.planPrice, { color: palette.text.primary }]}>{formatInr(plan.pricePaise)}</Text>
                </View>
                {plan.description ? (
                  <Text style={[styles.planDesc, { color: palette.text.secondary }]} numberOfLines={2}>{plan.description}</Text>
                ) : null}
                <View style={styles.planActions}>
                  <ZookButton size="sm" variant="secondary" icon="pencil-outline" onPress={() => openEditPlan(plan)}>
                    {t("trainer.pt.edit")}
                  </ZookButton>
                  <ZookButton
                    size="sm"
                    variant="secondary"
                    icon="trash-outline"
                    busy={deletePlan.isPending && deletePlan.variables === plan.id}
                    busyLabel={t("trainer.pt.removing")}
                    onPress={() => confirmDeletePlan(plan)}
                  >
                    {t("trainer.pt.remove")}
                  </ZookButton>
                </View>
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
  planActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  clientsCard: { gap: spacing.sm, paddingVertical: spacing.sm },
  clientRow: { gap: spacing.sm },
  clientTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  clientCopy: { flex: 1, gap: 2, minWidth: 0 },
  clientName: { ...typography.cardTitle },
  clientMeta: { ...typography.small },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
});

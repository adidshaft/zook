import { Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
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
  Skeleton,
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
import { type TranslationKey, useT } from "@/lib/i18n";
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

const subscriptionStatusLabelKeys: Record<string, TranslationKey> = {
  ACTIVE: "memberList.status.active",
  EXPIRED: "memberList.status.expired",
  PAST_DUE: "memberList.status.expired",
  PENDING: "memberList.status.pending",
  PENDING_PAYMENT: "memberList.status.pending",
};

function subscriptionStatusLabel(status: string, t: ReturnType<typeof useT>) {
  const normalized = status.toUpperCase();
  const exactLabel = subscriptionStatusLabelKeys[normalized];
  if (exactLabel) return t(exactLabel);
  if (normalized.includes("ACTIVE")) return t("memberList.status.active");
  if (normalized.includes("PENDING")) return t("memberList.status.pending");
  if (normalized.includes("EXPIRED") || normalized.includes("CANCEL")) return t("memberList.status.expired");
  return titleCaseFromCode(status);
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
    <View style={[styles.clientRow, canLog ? styles.clientRowWithAction : null]}>
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
        <Pill tone={subscriptionTone(sub.status)}>{subscriptionStatusLabel(sub.status, t)}</Pill>
      </View>
      {canLog ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("trainer.pt.logSession")}
          disabled={logging}
          hitSlop={8}
          onPress={onLogSession}
          style={({ pressed }) => [
            styles.compactAction,
            { backgroundColor: palette.surface.default, borderColor: palette.border.default },
            pressed ? styles.pressedAction : null,
            logging ? styles.disabledAction : null,
          ]}
        >
          <Ionicons name={logging ? "hourglass-outline" : "checkmark-done-outline"} size={19} color={palette.text.secondary} />
        </Pressable>
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
    <View style={[styles.clientRow, styles.clientRowWithAction]}>
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("trainer.pt.approve")}
        disabled={approving}
        hitSlop={8}
        onPress={onApprove}
        style={({ pressed }) => [
          styles.compactAction,
          { backgroundColor: palette.accent.base, borderColor: palette.accent.strong },
          pressed ? styles.pressedAction : null,
          approving ? styles.disabledAction : null,
        ]}
      >
        <Ionicons name={approving ? "hourglass-outline" : "checkmark-outline"} size={19} color={palette.text.onAccent} />
      </Pressable>
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
    [clientsQuery.data, t],
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
          <AppHeader title={t("trainer.pt.title")} showBack />

          {plansQuery.isLoading || subscriptionsQuery.isLoading ? (
            <Card variant="compact" contentStyle={styles.loadingCard}>
              <Skeleton width="55%" height={18} borderRadius={9} />
              <Skeleton width="40%" height={14} borderRadius={7} />
            </Card>
          ) : null}

          <View style={[styles.workSummary, { backgroundColor: palette.surface.default, borderColor: palette.border.subtle }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: pendingRequests.length ? palette.accent.base : palette.text.primary }]}>
                {pendingRequests.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: palette.text.secondary }]} numberOfLines={1}>
                {t("trainer.pt.pendingRequests")}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: palette.border.subtle }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: palette.text.primary }]}>{activeClients}</Text>
              <Text style={[styles.summaryLabel, { color: palette.text.secondary }]} numberOfLines={1}>
                {t("trainer.pt.ptClients")}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: palette.border.subtle }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: palette.text.primary }]}>{plans.length}</Text>
              <Text style={[styles.summaryLabel, { color: palette.text.secondary }]} numberOfLines={1}>
                {t("trainer.pt.packages")}
              </Text>
            </View>
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showClientForm ? t("common.cancel") : t("trainer.pt.add")}
                disabled={plans.length === 0}
                hitSlop={8}
                onPress={() => setShowClientForm((current) => !current)}
                style={({ pressed }) => [
                  styles.headerIconAction,
                  {
                    backgroundColor: showClientForm ? palette.surface.default : palette.accent.base,
                    borderColor: showClientForm ? palette.border.default : palette.accent.strong,
                  },
                  pressed ? styles.pressedAction : null,
                  plans.length === 0 ? styles.disabledAction : null,
                ]}
              >
                <Ionicons
                  name={showClientForm ? "close" : "person-add"}
                  size={20}
                  color={showClientForm ? palette.text.secondary : palette.text.onAccent}
                />
              </Pressable>
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPackageForm ? t("common.cancel") : t("trainer.pt.new")}
                hitSlop={8}
                onPress={() => showPackageForm ? resetPackageForm() : setShowPackageForm(true)}
                style={({ pressed }) => [
                  styles.headerIconAction,
                  {
                    backgroundColor: showPackageForm ? palette.surface.default : palette.accent.base,
                    borderColor: showPackageForm ? palette.border.default : palette.accent.strong,
                  },
                  pressed ? styles.pressedAction : null,
                ]}
              >
                <Ionicons
                  name={showPackageForm ? "close" : "add"}
                  size={20}
                  color={showPackageForm ? palette.text.secondary : palette.text.onAccent}
                />
              </Pressable>
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
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("trainer.pt.edit")}
                    hitSlop={8}
                    onPress={() => openEditPlan(plan)}
                    style={({ pressed }) => [
                      styles.compactAction,
                      { backgroundColor: palette.surface.default, borderColor: palette.border.default },
                      pressed ? styles.pressedAction : null,
                    ]}
                  >
                    <Ionicons name="pencil-outline" size={18} color={palette.text.secondary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("trainer.pt.remove")}
                    disabled={deletePlan.isPending && deletePlan.variables === plan.id}
                    hitSlop={8}
                    onPress={() => confirmDeletePlan(plan)}
                    style={({ pressed }) => [
                      styles.compactAction,
                      { backgroundColor: palette.surface.default, borderColor: palette.border.default },
                      pressed ? styles.pressedAction : null,
                      deletePlan.isPending && deletePlan.variables === plan.id ? styles.disabledAction : null,
                    ]}
                  >
                    <Ionicons
                      name={deletePlan.isPending && deletePlan.variables === plan.id ? "hourglass-outline" : "trash-outline"}
                      size={18}
                      color={palette.text.secondary}
                    />
                  </Pressable>
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
  workSummary: {
    alignItems: "center",
    borderRadius: radii.large,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  summaryItem: { alignItems: "center", flex: 1, gap: 2, minWidth: 0 },
  summaryValue: { fontFamily: "Inter_700Bold", fontSize: 20, lineHeight: 24 },
  summaryLabel: { ...typography.small },
  summaryDivider: { height: 28, width: StyleSheet.hairlineWidth },
  formCard: { gap: spacing.md },
  loadingCard: { gap: spacing.md },
  formLabel: { ...typography.caption },
  formRow: { gap: spacing.sm },
  formField: { flex: 1 },
  headerIconAction: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  compactAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  pressedAction: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  disabledAction: { opacity: 0.45 },
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
  planActions: { alignSelf: "flex-end", flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs },
  clientsCard: { gap: spacing.sm, paddingVertical: spacing.sm },
  clientRow: { gap: spacing.sm },
  clientRowWithAction: { alignItems: "center", flexDirection: "row" },
  clientTop: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.md, minWidth: 0 },
  clientCopy: { flex: 1, gap: 2, minWidth: 0 },
  clientName: { ...typography.cardTitle },
  clientMeta: { ...typography.small },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
});

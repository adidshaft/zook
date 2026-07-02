import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  BranchSelectorChip,
  Card,
  EmptyState,
  FormField,
  HeaderActions,
  IconBubble,
  Pill,
  QueryErrorState,
  ScreenHeader,
  ThemedSwitch,
  ZookButton,
  ZookScreen,
  useConfirmSheet,
} from "@/components/primitives";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { useOrgMembershipPlans, type MembershipPlanRecord } from "@/lib/domains/owner/queries";
import { useDeleteMembershipPlan, useSaveMembershipPlan, type MembershipPlanInput } from "@/lib/domains/owner/mutations";
import { formatInr } from "@/lib/formatting";
import { useT, type TranslationKey } from "@/lib/i18n";
import { layout, radii, spacing, typography, useTheme } from "@/lib/theme";

type PlanType = MembershipPlanInput["type"];
const PLAN_TYPES: Array<{ value: PlanType; labelKey: TranslationKey }> = [
  { value: "DURATION", labelKey: "owner.plans.duration" },
  { value: "VISIT_PACK", labelKey: "owner.plans.visitPack" },
  { value: "HYBRID", labelKey: "owner.plans.hybrid" },
  { value: "TRIAL", labelKey: "owner.plans.trial" },
  { value: "DATE_RANGE", labelKey: "owner.plans.dateRange" },
];

function planSummary(plan: MembershipPlanRecord, t: (key: TranslationKey, values?: Record<string, string | number>) => string) {
  return [
    plan.durationDays ? t("owner.plans.daysCount", { count: plan.durationDays }) : null,
    plan.visitLimit ? t("owner.plans.visitsCount", { count: plan.visitLimit }) : null,
  ]
    .filter(Boolean)
    .join(" · ") || plan.type;
}

export default function OwnerPlans() {
  const { palette } = useTheme();
  const t = useT();
  const plansQuery = useOrgMembershipPlans();
  const savePlan = useSaveMembershipPlan();
  const deletePlan = useDeleteMembershipPlan();
  const { confirm, sheet } = useConfirmSheet();
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<PlanType>("DURATION");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [visitLimit, setVisitLimit] = useState("");
  const [publicVisible, setPublicVisible] = useState(true);
  const [showPlanLimits, setShowPlanLimits] = useState(false);

  const plans = plansQuery.data?.plans ?? [];
  const showDuration = type === "DURATION" || type === "HYBRID" || type === "TRIAL" || type === "DATE_RANGE";
  const showVisits = type === "VISIT_PACK" || type === "HYBRID" || type === "TRIAL";
  const canSubmit = name.trim().length >= 2 && (Number.parseInt(price, 10) || 0) >= 0 && !savePlan.isPending;
  const planLimitSummary = [
    showDuration
      ? durationDays.trim()
        ? t("owner.plans.daysCount", { count: durationDays.trim() })
        : t("owner.plans.durationDays")
      : null,
    showVisits
      ? visitLimit.trim()
        ? t("owner.plans.visitsCount", { count: visitLimit.trim() })
        : t("owner.plans.visits")
      : null,
  ].filter(Boolean).join(" · ");

  function resetForm() {
    setEditingId(null);
    setName("");
    setType("DURATION");
    setPrice("");
    setDurationDays("");
    setVisitLimit("");
    setPublicVisible(true);
    setShowPlanLimits(false);
    setShowForm(false);
  }

  function startEdit(plan: MembershipPlanRecord) {
    setEditingId(plan.id);
    setName(plan.name);
    setType(plan.type as PlanType);
    setPrice(String(Math.round(plan.pricePaise / 100)));
    setDurationDays(plan.durationDays ? String(plan.durationDays) : "");
    setVisitLimit(plan.visitLimit ? String(plan.visitLimit) : "");
    setPublicVisible(plan.publicVisible);
    setShowPlanLimits(Boolean(plan.durationDays || plan.visitLimit));
    setShowForm(true);
  }

  async function refresh() {
    setRefreshing(true);
    await plansQuery.refetch();
    setRefreshing(false);
  }

  function submit() {
    if (!canSubmit) return;
    const body: MembershipPlanInput = {
      name: name.trim(),
      type,
      pricePaise: (Number.parseInt(price, 10) || 0) * 100,
      publicVisible,
      ...(showDuration && Number.parseInt(durationDays, 10) ? { durationDays: Number.parseInt(durationDays, 10) } : {}),
      ...(showVisits && Number.parseInt(visitLimit, 10) ? { visitLimit: Number.parseInt(visitLimit, 10) } : {}),
    };
    savePlan.mutate(
      { ...(editingId ? { planId: editingId } : {}), body },
      { onSuccess: () => resetForm() },
    );
  }

  function confirmDelete(plan: MembershipPlanRecord) {
    confirm({
      title: t("owner.plans.removePlanTitle"),
      body: t("owner.plans.removePlanBody", { name: plan.name }),
      destructiveLabel: t("owner.plans.remove"),
      cancelLabel: t("common.cancel"),
      onConfirm: () => deletePlan.mutate(plan.id),
    });
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-plans-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.accent.base} colors={[palette.accent.base]} />}
        >
          <ScreenHeader
            title={t("owner.plans.title")}
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip style={styles.headerBranchSelector} />
              </View>
            }
            trailing={<HeaderActions showBell />}
          />

          <View style={styles.listToolbar}>
            <Pill tone={plans.length ? "blue" : "neutral"}>
              {t("owner.plans.totalPlans", { count: plans.length })}
            </Pill>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showForm && !editingId ? t("common.cancel") : t("owner.plans.newPlan")}
              hitSlop={8}
              onPress={() => (showForm && !editingId ? resetForm() : (resetForm(), setShowForm(true)))}
              style={({ pressed }) => [
                styles.toolbarAction,
                {
                  backgroundColor:
                    showForm && !editingId ? palette.surface.default : palette.accent.base,
                  borderColor:
                    showForm && !editingId ? palette.border.default : palette.accent.strong,
                },
                pressed ? styles.pressedAction : null,
              ]}
            >
              <Ionicons
                name={showForm && !editingId ? "close" : "add"}
                size={20}
                color={showForm && !editingId ? palette.text.secondary : palette.text.onAccent}
              />
            </Pressable>
          </View>

          {showForm ? (
            <Card contentStyle={styles.formCard}>
              <Text style={[styles.formTitle, { color: palette.text.primary }]}>{editingId ? t("owner.plans.editPlan") : t("owner.plans.newPlan")}</Text>
              <FormField label={t("owner.plans.planName")} value={name} onChangeText={setName} placeholder={t("owner.plans.planNamePlaceholder")} />
              <Text style={[styles.label, { color: palette.text.secondary }]}>{t("owner.plans.type")}</Text>
              <View style={styles.chipWrap}>
                {PLAN_TYPES.map((option) => {
                  const selected = type === option.value;
                  return (
                    <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setType(option.value)} style={[styles.chip, { borderColor: selected ? palette.accent.base : palette.border.default, backgroundColor: selected ? palette.surface.accentSoft : palette.surface.default }]}>
                      <Text style={[styles.chipText, { color: selected ? palette.accent.base : palette.text.secondary }]}>{t(option.labelKey)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <FormField label={t("owner.plans.priceInr")} value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="1499" />
              {showDuration || showVisits ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showPlanLimits }}
                  onPress={() => setShowPlanLimits((value) => !value)}
                  style={({ pressed }) => [
                    styles.disclosureRow,
                    { borderColor: palette.border.default, backgroundColor: palette.surface.default },
                    pressed ? styles.pressedAction : null,
                  ]}
                >
                  <View style={styles.disclosureCopy}>
                    <Text style={[styles.disclosureTitle, { color: palette.text.primary }]}>{t("owner.plans.planLimits")}</Text>
                    <Text style={[styles.disclosureMeta, { color: palette.text.secondary }]} numberOfLines={1}>
                      {planLimitSummary}
                    </Text>
                  </View>
                  <Ionicons
                    name={showPlanLimits ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={palette.text.secondary}
                  />
                </Pressable>
              ) : null}
              {showPlanLimits ? (
                <View style={styles.limitsStack}>
                  {showDuration ? (
                    <FormField label={t("owner.plans.durationDays")} value={durationDays} onChangeText={setDurationDays} keyboardType="number-pad" placeholder="30" />
                  ) : null}
                  {showVisits ? (
                    <FormField label={t("owner.plans.visits")} value={visitLimit} onChangeText={setVisitLimit} keyboardType="number-pad" placeholder="12" />
                  ) : null}
                </View>
              ) : null}
              <View style={styles.switchRow}>
                <Text style={[styles.switchTitle, { color: palette.text.primary }]}>{t("owner.plans.showPublicly")}</Text>
                <ThemedSwitch value={publicVisible} onValueChange={setPublicVisible} />
              </View>
              <ZookButton onPress={submit} disabled={!canSubmit} busy={savePlan.isPending} busyLabel={t("common.saving")} icon="save-outline">
                {editingId ? t("owner.plans.saveChanges") : t("owner.plans.createPlan")}
              </ZookButton>
            </Card>
          ) : null}

          {plansQuery.isError ? (
            <QueryErrorState error={plansQuery.error} onRetry={() => void plansQuery.refetch()} />
          ) : null}
          {!plansQuery.isLoading && plans.length === 0 ? (
            <Card variant="compact">
              <EmptyState
                icon="pricetag-outline"
                title={t("owner.plans.noPlansYet")}
                body={t("owner.plans.noPlansYetBody")}
                cta={{
                  label: t("owner.plans.createPlan"),
                  onPress: () => setShowForm(true),
                }}
              />
            </Card>
          ) : null}

          <View style={styles.stack}>
            {plans.map((plan) => (
              <Card key={plan.id} variant="compact" contentStyle={styles.planCard}>
                <Pressable accessibilityRole="button" accessibilityLabel={t("owner.plans.editAccessibility", { name: plan.name })} onPress={() => startEdit(plan)} style={styles.planMain}>
                  <IconBubble icon="card-outline" tone="lime" size={42} />
                  <View style={styles.planCopy}>
                    <Text style={[styles.planName, { color: palette.text.primary }]} numberOfLines={1}>{plan.name}</Text>
                    <Text style={[styles.planMeta, { color: palette.text.secondary }]} numberOfLines={1}>{planSummary(plan, t)}</Text>
                    {!plan.publicVisible ? (
                      <View style={styles.planStatusRow}>
                        <Pill tone="neutral">{t("owner.plans.hidden")}</Pill>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.planRight}>
                    <Text style={[styles.planPrice, { color: palette.text.primary }]}>{formatInr(plan.pricePaise)}</Text>
                  </View>
                </Pressable>
                <View style={styles.planActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("owner.plans.remove")}
                    hitSlop={10}
                    onPress={() => confirmDelete(plan)}
                    style={({ pressed }) => [styles.planRemoveAction, pressed ? styles.pressedAction : null]}
                  >
                    <Ionicons name="trash-outline" size={18} color={palette.feedback.danger} />
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        </ScrollView>
      </ZookScreen>
      {sheet}
    </>
  );
}

const styles = StyleSheet.create({
  headerContext: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 0,
    width: "100%",
  },
  headerBranchSelector: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  formCard: { gap: spacing.md },
  formTitle: { ...typography.cardTitle },
  label: { ...typography.caption },
  listToolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  toolbarAction: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  disclosureRow: {
    alignItems: "center",
    borderRadius: radii.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  disclosureCopy: { flex: 1, gap: 2, minWidth: 0 },
  disclosureTitle: { ...typography.bodyStrong },
  disclosureMeta: { ...typography.small },
  limitsStack: { gap: spacing.sm },
  switchRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  switchTitle: { ...typography.cardTitle },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: -spacing.xs },
  chip: { borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { ...typography.caption },
  stack: { gap: spacing.sm },
  planCard: { gap: spacing.sm },
  planMain: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  planCopy: { flex: 1, gap: 2, minWidth: 0 },
  planName: { ...typography.cardTitle },
  planMeta: { ...typography.small },
  planStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingTop: 2,
  },
  planRight: { alignItems: "flex-end", gap: 4, maxWidth: 108 },
  planPrice: { ...typography.cardTitle },
  planActions: { alignItems: "flex-end" },
  planRemoveAction: {
    alignItems: "center",
    borderColor: "rgba(255, 98, 74, 0.42)",
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: "center",
    width: 42,
  },
  pressedAction: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});

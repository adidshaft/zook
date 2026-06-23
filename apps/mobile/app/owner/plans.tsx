import { Stack } from "expo-router";
import { useState } from "react";
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
  ThemedSwitch,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useOrgMembershipPlans, type MembershipPlanRecord } from "@/lib/domains/owner/queries";
import { useDeleteMembershipPlan, useSaveMembershipPlan, type MembershipPlanInput } from "@/lib/domains/owner/mutations";
import { formatInr } from "@/lib/formatting";
import { layout, radii, spacing, typography, useTheme } from "@/lib/theme";

type PlanType = MembershipPlanInput["type"];
const PLAN_TYPES: Array<{ value: PlanType; label: string }> = [
  { value: "DURATION", label: "Duration" },
  { value: "VISIT_PACK", label: "Visit pack" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "TRIAL", label: "Trial" },
  { value: "DATE_RANGE", label: "Date range" },
];

function planSummary(plan: MembershipPlanRecord) {
  return [
    plan.durationDays ? `${plan.durationDays} days` : null,
    plan.visitLimit ? `${plan.visitLimit} visits` : null,
  ]
    .filter(Boolean)
    .join(" · ") || plan.type;
}

export default function OwnerPlans() {
  const { palette } = useTheme();
  const plansQuery = useOrgMembershipPlans();
  const savePlan = useSaveMembershipPlan();
  const deletePlan = useDeleteMembershipPlan();
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<PlanType>("DURATION");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [visitLimit, setVisitLimit] = useState("");
  const [publicVisible, setPublicVisible] = useState(true);

  const plans = plansQuery.data?.plans ?? [];
  const showDuration = type === "DURATION" || type === "HYBRID" || type === "TRIAL" || type === "DATE_RANGE";
  const showVisits = type === "VISIT_PACK" || type === "HYBRID" || type === "TRIAL";
  const canSubmit = name.trim().length >= 2 && (Number.parseInt(price, 10) || 0) >= 0 && !savePlan.isPending;

  function resetForm() {
    setEditingId(null);
    setName("");
    setType("DURATION");
    setPrice("");
    setDurationDays("");
    setVisitLimit("");
    setPublicVisible(true);
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
    Alert.alert("Remove plan?", `Members won't be able to buy "${plan.name}" anymore.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deletePlan.mutate(plan.id) },
    ]);
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
          <AppHeader title="Membership plans" subtitle="The plans members can buy at your gym." showBack />

          <SectionHeader
            title="Plans"
            action={
              <ZookButton size="sm" variant={showForm && !editingId ? "secondary" : "primary"} icon={showForm && !editingId ? "close" : "add"} onPress={() => (showForm && !editingId ? resetForm() : (resetForm(), setShowForm(true)))}>
                {showForm && !editingId ? "Cancel" : "New plan"}
              </ZookButton>
            }
          />

          {showForm ? (
            <Card contentStyle={styles.formCard}>
              <Text style={[styles.formTitle, { color: palette.text.primary }]}>{editingId ? "Edit plan" : "New plan"}</Text>
              <FormField label="Plan name" value={name} onChangeText={setName} placeholder="Monthly Active" />
              <Text style={[styles.label, { color: palette.text.secondary }]}>Type</Text>
              <View style={styles.chipWrap}>
                {PLAN_TYPES.map((option) => {
                  const selected = type === option.value;
                  return (
                    <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setType(option.value)} style={[styles.chip, { borderColor: selected ? palette.accent.base : palette.border.default, backgroundColor: selected ? palette.surface.accentSoft : palette.surface.default }]}>
                      <Text style={[styles.chipText, { color: selected ? palette.accent.base : palette.text.secondary }]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.formRow}>
                <FormField label="Price (₹)" value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="1499" style={styles.formField} />
                {showDuration ? (
                  <FormField label="Duration (days)" value={durationDays} onChangeText={setDurationDays} keyboardType="number-pad" placeholder="30" style={styles.formField} />
                ) : null}
                {showVisits ? (
                  <FormField label="Visits" value={visitLimit} onChangeText={setVisitLimit} keyboardType="number-pad" placeholder="12" style={styles.formField} />
                ) : null}
              </View>
              <View style={styles.switchRow}>
                <Text style={[styles.switchTitle, { color: palette.text.primary }]}>Show publicly</Text>
                <ThemedSwitch value={publicVisible} onValueChange={setPublicVisible} />
              </View>
              <ZookButton onPress={submit} disabled={!canSubmit} busy={savePlan.isPending} busyLabel="Saving..." icon="save-outline">
                {editingId ? "Save changes" : "Create plan"}
              </ZookButton>
            </Card>
          ) : null}

          {plansQuery.isError ? (
            <QueryErrorState error={plansQuery.error} onRetry={() => void plansQuery.refetch()} />
          ) : null}
          {!plansQuery.isLoading && plans.length === 0 ? (
            <Card variant="compact">
              <EmptyState icon="pricetag-outline" title="No plans yet" body="Create your first membership plan." />
            </Card>
          ) : null}

          <View style={styles.stack}>
            {plans.map((plan) => (
              <Card key={plan.id} variant="compact" contentStyle={styles.planCard}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${plan.name}`} onPress={() => startEdit(plan)} style={styles.planMain}>
                  <IconBubble icon="card-outline" tone="lime" size={42} />
                  <View style={styles.planCopy}>
                    <Text style={[styles.planName, { color: palette.text.primary }]} numberOfLines={1}>{plan.name}</Text>
                    <Text style={[styles.planMeta, { color: palette.text.secondary }]} numberOfLines={1}>{planSummary(plan)}</Text>
                  </View>
                  <View style={styles.planRight}>
                    <Text style={[styles.planPrice, { color: palette.text.primary }]}>{formatInr(plan.pricePaise)}</Text>
                    {!plan.publicVisible ? <Pill tone="neutral">Hidden</Pill> : null}
                  </View>
                </Pressable>
                <View style={styles.planActions}>
                  <ZookButton size="sm" variant="secondary" icon="create-outline" onPress={() => startEdit(plan)} style={styles.planAction}>
                    Edit
                  </ZookButton>
                  <ZookButton size="sm" variant="destructive" icon="trash-outline" onPress={() => confirmDelete(plan)} style={styles.planAction}>
                    Remove
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
  formCard: { gap: spacing.md },
  formTitle: { ...typography.cardTitle },
  label: { ...typography.caption },
  formRow: { flexDirection: "row", gap: spacing.sm },
  formField: { flex: 1 },
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
  planRight: { alignItems: "flex-end", gap: 4 },
  planPrice: { ...typography.cardTitle },
  planActions: { flexDirection: "row", gap: spacing.sm },
  planAction: { flex: 1 },
});

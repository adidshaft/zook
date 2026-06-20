import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Card,
  FormField,
  QueryErrorState,
  SectionHeader,
  ThemedSwitch,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useOrgReferralPolicy, type ReferralPolicy } from "@/lib/domains/owner/queries";
import { useUpdateReferralPolicy } from "@/lib/domains/owner/mutations";
import { layout, radii, spacing, typography, useTheme } from "@/lib/theme";

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.chipWrap}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.chip, { borderColor: selected ? palette.accent.base : palette.border.default, backgroundColor: selected ? palette.surface.accentSoft : palette.surface.default }]}
          >
            <Text style={[styles.chipText, { color: selected ? palette.accent.base : palette.text.secondary }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const REWARD_TYPES = [
  { value: "DAYS", label: "Free days" },
  { value: "VISITS", label: "Visits" },
  { value: "NONE", label: "None" },
] as const;
const DISCOUNT_TYPES = [
  { value: "PERCENTAGE", label: "Percent" },
  { value: "FIXED", label: "Flat ₹" },
  { value: "NONE", label: "None" },
] as const;

export default function OwnerReferralSettings() {
  const { palette } = useTheme();
  const policyQuery = useOrgReferralPolicy();
  const updatePolicy = useUpdateReferralPolicy();
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<ReferralPolicy | null>(null);

  useEffect(() => {
    if (policyQuery.data?.policy && !form) setForm(policyQuery.data.policy);
  }, [policyQuery.data, form]);

  function patch(next: Partial<ReferralPolicy>) {
    setForm((current) => (current ? { ...current, ...next } : current));
  }
  function num(value: string) {
    return Number.parseInt(value, 10) || 0;
  }

  async function refresh() {
    setRefreshing(true);
    const result = await policyQuery.refetch();
    if (result.data?.policy) setForm(result.data.policy);
    setRefreshing(false);
  }

  function save() {
    if (!form) return;
    updatePolicy.mutate({
      enabled: form.enabled,
      referrerRewardType: form.referrerRewardType,
      referrerRewardValue: form.referrerRewardValue,
      referredDiscountType: form.referredDiscountType,
      referredDiscountValue: form.referredDiscountValue,
      maxReferralsPerMonth: form.maxReferralsPerMonth,
      referralCodeExpiryDays: form.referralCodeExpiryDays,
      trainerReferralEnabled: form.trainerReferralEnabled,
      trainerRewardType: form.trainerRewardType,
      trainerRewardValue: form.trainerRewardValue,
      memberGymReferralRewardPaise: form.memberGymReferralRewardPaise,
    });
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-referrals-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.accent.base} colors={[palette.accent.base]} />}
        >
          <AppHeader title="Referral program" subtitle="Set how much everyone earns for referrals." showProfileShortcut={false} showBack />

          {policyQuery.isError ? (
            <QueryErrorState error={policyQuery.error} onRetry={() => void policyQuery.refetch()} />
          ) : null}

          {form ? (
            <>
              <Card variant="compact" contentStyle={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={[styles.switchTitle, { color: palette.text.primary }]}>Referrals enabled</Text>
                  <Text style={[styles.switchSub, { color: palette.text.secondary }]}>Turn the whole referral program on or off.</Text>
                </View>
                <ThemedSwitch value={form.enabled} onValueChange={(v) => patch({ enabled: v })} />
              </Card>

              <SectionHeader title="Member refers a member" />
              <Card contentStyle={styles.formCard}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>Referrer earns</Text>
                <ChipRow options={REWARD_TYPES} value={form.referrerRewardType} onChange={(v) => patch({ referrerRewardType: v })} />
                {form.referrerRewardType !== "NONE" ? (
                  <FormField label={form.referrerRewardType === "DAYS" ? "Free days" : "Visits"} value={String(form.referrerRewardValue)} onChangeText={(t) => patch({ referrerRewardValue: num(t) })} keyboardType="number-pad" />
                ) : null}
                <Text style={[styles.label, { color: palette.text.secondary }]}>New member gets</Text>
                <ChipRow options={DISCOUNT_TYPES} value={form.referredDiscountType} onChange={(v) => patch({ referredDiscountType: v })} />
                {form.referredDiscountType !== "NONE" ? (
                  <FormField
                    label={form.referredDiscountType === "PERCENTAGE" ? "Discount %" : "Discount ₹"}
                    value={String(form.referredDiscountType === "PERCENTAGE" ? Math.round(form.referredDiscountValue / 100) : Math.round(form.referredDiscountValue / 100))}
                    onChangeText={(t) => patch({ referredDiscountValue: num(t) * 100 })}
                    keyboardType="number-pad"
                  />
                ) : null}
              </Card>

              <SectionHeader title="Trainer refers a member" />
              <Card contentStyle={styles.formCard}>
                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={[styles.switchTitle, { color: palette.text.primary }]}>Allow trainer referrals</Text>
                  </View>
                  <ThemedSwitch value={form.trainerReferralEnabled} onValueChange={(v) => patch({ trainerReferralEnabled: v })} />
                </View>
                {form.trainerReferralEnabled ? (
                  <>
                    <Text style={[styles.label, { color: palette.text.secondary }]}>Trainer earns</Text>
                    <ChipRow options={REWARD_TYPES} value={form.trainerRewardType} onChange={(v) => patch({ trainerRewardType: v })} />
                    {form.trainerRewardType !== "NONE" ? (
                      <FormField label={form.trainerRewardType === "DAYS" ? "Free days" : "Visits"} value={String(form.trainerRewardValue)} onChangeText={(t) => patch({ trainerRewardValue: num(t) })} keyboardType="number-pad" />
                    ) : null}
                  </>
                ) : null}
              </Card>

              <SectionHeader title="Member refers a new gym" />
              <Card contentStyle={styles.formCard}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>
                  Account credit a member earns when a gym they refer signs up.
                </Text>
                <FormField label="Credit (₹)" value={String(Math.round(form.memberGymReferralRewardPaise / 100))} onChangeText={(t) => patch({ memberGymReferralRewardPaise: num(t) * 100 })} keyboardType="number-pad" />
              </Card>

              <SectionHeader title="Limits" />
              <Card contentStyle={styles.formRow}>
                <FormField label="Max / member / month" value={String(form.maxReferralsPerMonth)} onChangeText={(t) => patch({ maxReferralsPerMonth: Math.max(1, num(t)) })} keyboardType="number-pad" style={styles.formField} />
                <FormField label="Code expiry (days)" value={String(form.referralCodeExpiryDays)} onChangeText={(t) => patch({ referralCodeExpiryDays: num(t) })} keyboardType="number-pad" style={styles.formField} />
              </Card>

              <ZookButton onPress={save} busy={updatePolicy.isPending} busyLabel="Saving..." icon="save-outline" size="lg">
                Save referral settings
              </ZookButton>
            </>
          ) : null}
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
  switchRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  switchCopy: { flex: 1, gap: 2, minWidth: 0 },
  switchTitle: { ...typography.cardTitle },
  switchSub: { ...typography.small },
  formCard: { gap: spacing.md },
  formRow: { flexDirection: "row", gap: spacing.sm },
  formField: { flex: 1 },
  label: { ...typography.caption },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: -spacing.xs },
  chip: { borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { ...typography.caption },
});

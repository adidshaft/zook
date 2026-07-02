import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  BranchSelectorChip,
  Card,
  FormField,
  HeaderActions,
  QueryErrorState,
  SectionHeader,
  ScreenHeader,
  Skeleton,
  ThemedSwitch,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { useOrgReferralPolicy, type ReferralPolicy } from "@/lib/domains/owner/queries";
import { useUpdateReferralPolicy } from "@/lib/domains/owner/mutations";
import { useT, type TranslationKey } from "@/lib/i18n";
import { layout, radii, spacing, typography, useTheme } from "@/lib/theme";

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: T; labelKey: TranslationKey }>;
  value: T;
  onChange: (value: T) => void;
}) {
  const { palette } = useTheme();
  const t = useT();
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
            <Text style={[styles.chipText, { color: selected ? palette.accent.base : palette.text.secondary }]}>{t(option.labelKey)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const REWARD_TYPES = [
  { value: "DAYS", labelKey: "owner.referrals.freeDays" },
  { value: "VISITS", labelKey: "owner.referrals.visits" },
  { value: "NONE", labelKey: "owner.referrals.none" },
] as const;
const DISCOUNT_TYPES = [
  { value: "PERCENTAGE", labelKey: "owner.referrals.percent" },
  { value: "FIXED", labelKey: "owner.referrals.flatInr" },
  { value: "NONE", labelKey: "owner.referrals.none" },
] as const;

export default function OwnerReferralSettings() {
  const { palette } = useTheme();
  const t = useT();
  const policyQuery = useOrgReferralPolicy();
  const updatePolicy = useUpdateReferralPolicy();
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<ReferralPolicy | null>(null);
  const [showMoreRules, setShowMoreRules] = useState(false);

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
          <ScreenHeader
            title={t("owner.referrals.title")}
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip style={styles.headerBranchSelector} />
              </View>
            }
            trailing={<HeaderActions showBell />}
          />

          {policyQuery.isError ? (
            <QueryErrorState error={policyQuery.error} onRetry={() => void policyQuery.refetch()} />
          ) : null}

          {policyQuery.isLoading && !form ? (
            <Card variant="compact" contentStyle={styles.loadingCard}>
              <Skeleton width="65%" height={18} borderRadius={9} />
              <Skeleton width="45%" height={14} borderRadius={7} />
              <Skeleton width="80%" height={14} borderRadius={7} />
            </Card>
          ) : null}

          {form ? (
            <>
              <Card variant="compact" contentStyle={styles.policyBar}>
                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={[styles.switchTitle, { color: palette.text.primary }]}>{t("owner.referrals.enabled")}</Text>
                    <Text numberOfLines={1} style={[styles.switchSub, { color: palette.text.secondary }]}>
                      {t("owner.referrals.enabledBody")}
                    </Text>
                  </View>
                  <ThemedSwitch value={form.enabled} onValueChange={(v) => patch({ enabled: v })} />
                </View>
                <ZookButton onPress={save} busy={updatePolicy.isPending} busyLabel={t("common.saving")} icon="save-outline" size="sm">
                  {t("owner.referrals.saveSettings")}
                </ZookButton>
              </Card>

              <SectionHeader title={t("owner.referrals.memberRefersMember")} />
              <Card contentStyle={styles.formCard}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>{t("owner.referrals.referrerEarns")}</Text>
                <ChipRow options={REWARD_TYPES} value={form.referrerRewardType} onChange={(v) => patch({ referrerRewardType: v })} />
                {form.referrerRewardType !== "NONE" ? (
                  <FormField label={form.referrerRewardType === "DAYS" ? t("owner.referrals.freeDays") : t("owner.referrals.visits")} value={String(form.referrerRewardValue)} onChangeText={(text) => patch({ referrerRewardValue: num(text) })} keyboardType="number-pad" />
                ) : null}
                <Text style={[styles.label, { color: palette.text.secondary }]}>{t("owner.referrals.newMemberGets")}</Text>
                <ChipRow options={DISCOUNT_TYPES} value={form.referredDiscountType} onChange={(v) => patch({ referredDiscountType: v })} />
                {form.referredDiscountType !== "NONE" ? (
                  <FormField
                    label={form.referredDiscountType === "PERCENTAGE" ? t("owner.referrals.discountPercent") : t("owner.referrals.discountInr")}
                    value={String(form.referredDiscountType === "PERCENTAGE" ? Math.round(form.referredDiscountValue / 100) : Math.round(form.referredDiscountValue / 100))}
                    onChangeText={(text) => patch({ referredDiscountValue: num(text) * 100 })}
                    keyboardType="number-pad"
                  />
                ) : null}
              </Card>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showMoreRules }}
                onPress={() => setShowMoreRules((value) => !value)}
                style={({ pressed }) => [
                  styles.disclosureRow,
                  { borderColor: palette.border.default, backgroundColor: palette.surface.default },
                  pressed ? styles.pressedAction : null,
                ]}
              >
                <View style={styles.switchCopy}>
                  <Text style={[styles.switchTitle, { color: palette.text.primary }]}>
                    {t("owner.referrals.moreRules")}
                  </Text>
                  <Text numberOfLines={1} style={[styles.switchSub, { color: palette.text.secondary }]}>
                    {t("owner.referrals.moreRulesBody")}
                  </Text>
                </View>
                <Ionicons
                  name={showMoreRules ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={palette.text.secondary}
                />
              </Pressable>

              {showMoreRules ? (
                <>
                  <SectionHeader title={t("owner.referrals.trainerRefersMember")} />
                  <Card contentStyle={styles.formCard}>
                    <View style={styles.switchRow}>
                      <View style={styles.switchCopy}>
                        <Text style={[styles.switchTitle, { color: palette.text.primary }]}>{t("owner.referrals.allowTrainerReferrals")}</Text>
                      </View>
                      <ThemedSwitch value={form.trainerReferralEnabled} onValueChange={(v) => patch({ trainerReferralEnabled: v })} />
                    </View>
                    {form.trainerReferralEnabled ? (
                      <>
                        <Text style={[styles.label, { color: palette.text.secondary }]}>{t("owner.referrals.trainerEarns")}</Text>
                        <ChipRow options={REWARD_TYPES} value={form.trainerRewardType} onChange={(v) => patch({ trainerRewardType: v })} />
                        {form.trainerRewardType !== "NONE" ? (
                          <FormField label={form.trainerRewardType === "DAYS" ? t("owner.referrals.freeDays") : t("owner.referrals.visits")} value={String(form.trainerRewardValue)} onChangeText={(text) => patch({ trainerRewardValue: num(text) })} keyboardType="number-pad" />
                        ) : null}
                      </>
                    ) : null}
                  </Card>

                  <SectionHeader title={t("owner.referrals.memberRefersNewGym")} />
                  <Card contentStyle={styles.formCard}>
                    <Text style={[styles.label, { color: palette.text.secondary }]}>
                      {t("owner.referrals.memberGymCreditBody")}
                    </Text>
                    <FormField label={t("owner.referrals.creditInr")} value={String(Math.round(form.memberGymReferralRewardPaise / 100))} onChangeText={(text) => patch({ memberGymReferralRewardPaise: num(text) * 100 })} keyboardType="number-pad" />
                  </Card>

                  <SectionHeader title={t("owner.referrals.limits")} />
                  <Card contentStyle={styles.formRow}>
                    <FormField label={t("owner.referrals.maxPerMemberMonth")} value={String(form.maxReferralsPerMonth)} onChangeText={(text) => patch({ maxReferralsPerMonth: Math.max(1, num(text)) })} keyboardType="number-pad" style={styles.formField} />
                    <FormField label={t("owner.referrals.codeExpiryDays")} value={String(form.referralCodeExpiryDays)} onChangeText={(text) => patch({ referralCodeExpiryDays: num(text) })} keyboardType="number-pad" style={styles.formField} />
                  </Card>
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </ZookScreen>
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
  policyBar: { gap: spacing.sm },
  switchRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  switchCopy: { flex: 1, gap: 2, minWidth: 0 },
  switchTitle: { ...typography.cardTitle },
  switchSub: { ...typography.small },
  formCard: { gap: spacing.md },
  loadingCard: { gap: spacing.md },
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
  formRow: { gap: spacing.sm },
  formField: { flex: 1 },
  label: { ...typography.caption },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: -spacing.xs },
  chip: { borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { ...typography.caption },
  pressedAction: { opacity: 0.78, transform: [{ scale: 0.96 }] },
});

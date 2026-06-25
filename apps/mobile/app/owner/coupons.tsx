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
import { useOrgCoupons, type CouponRecord } from "@/lib/domains/owner/queries";
import { useDeleteCoupon, useSaveCoupon, type CouponInput } from "@/lib/domains/owner/mutations";
import { formatInr } from "@/lib/formatting";
import { useT, type TranslationKey } from "@/lib/i18n";
import { layout, radii, spacing, typography, useTheme } from "@/lib/theme";

type CouponType = CouponInput["type"];
const COUPON_TYPES: Array<{ value: CouponType; labelKey: TranslationKey }> = [
  { value: "PERCENTAGE", labelKey: "owner.coupons.percentOff" },
  { value: "FIXED_AMOUNT", labelKey: "owner.coupons.flatInrOff" },
];

function couponValue(coupon: CouponRecord, t: (key: TranslationKey, values?: Record<string, string | number>) => string) {
  if (coupon.type === "PERCENTAGE") {
    return t("owner.coupons.percentOffValue", { value: Math.round((coupon.valuePercentBps ?? 0) / 100) });
  }
  return t("owner.coupons.amountOffValue", { amount: formatInr(coupon.valuePaise ?? 0) });
}

function couponLimits(coupon: CouponRecord, t: (key: TranslationKey, values?: Record<string, string | number>) => string) {
  const parts: string[] = [];
  if (coupon.maxRedemptions) {
    parts.push(t("owner.coupons.usedWithLimit", { used: coupon.redemptionCount, limit: coupon.maxRedemptions }));
  } else {
    parts.push(t("owner.coupons.usedCount", { count: coupon.redemptionCount }));
  }
  if (coupon.perUserLimit) parts.push(t("owner.coupons.perMemberLimit", { count: coupon.perUserLimit }));
  return parts.join(" · ");
}

export default function OwnerCoupons() {
  const { palette } = useTheme();
  const t = useT();
  const couponsQuery = useOrgCoupons();
  const saveCoupon = useSaveCoupon();
  const deleteCoupon = useDeleteCoupon();
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState<CouponType>("PERCENTAGE");
  const [value, setValue] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [perUserLimit, setPerUserLimit] = useState("");
  const [active, setActive] = useState(true);

  const coupons = couponsQuery.data?.coupons ?? [];
  const numericValue = Number.parseInt(value, 10) || 0;
  const validValue = type === "PERCENTAGE" ? numericValue > 0 && numericValue <= 100 : numericValue > 0;
  const canSubmit = /^[A-Z0-9-]{3,32}$/.test(code.trim().toUpperCase()) && validValue && !saveCoupon.isPending;

  function resetForm() {
    setEditingId(null);
    setCode("");
    setType("PERCENTAGE");
    setValue("");
    setMaxRedemptions("");
    setPerUserLimit("");
    setActive(true);
    setShowForm(false);
  }

  function startEdit(coupon: CouponRecord) {
    setEditingId(coupon.id);
    setCode(coupon.code);
    setType(coupon.type);
    setValue(
      coupon.type === "PERCENTAGE"
        ? String(Math.round((coupon.valuePercentBps ?? 0) / 100))
        : String(Math.round((coupon.valuePaise ?? 0) / 100)),
    );
    setMaxRedemptions(coupon.maxRedemptions ? String(coupon.maxRedemptions) : "");
    setPerUserLimit(coupon.perUserLimit ? String(coupon.perUserLimit) : "");
    setActive(coupon.active);
    setShowForm(true);
  }

  async function refresh() {
    setRefreshing(true);
    await couponsQuery.refetch();
    setRefreshing(false);
  }

  function submit() {
    if (!canSubmit) return;
    const body: CouponInput = {
      code: code.trim().toUpperCase(),
      type,
      active,
      ...(type === "PERCENTAGE" ? { valuePercentBps: numericValue * 100 } : { valuePaise: numericValue * 100 }),
      ...(Number.parseInt(maxRedemptions, 10) ? { maxRedemptions: Number.parseInt(maxRedemptions, 10) } : {}),
      ...(Number.parseInt(perUserLimit, 10) ? { perUserLimit: Number.parseInt(perUserLimit, 10) } : {}),
    };
    saveCoupon.mutate(
      { ...(editingId ? { couponId: editingId } : {}), body },
      { onSuccess: () => resetForm() },
    );
  }

  function confirmDelete(coupon: CouponRecord) {
    Alert.alert(t("owner.coupons.removeCouponTitle"), t("owner.coupons.removeCouponBody", { code: coupon.code }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("owner.coupons.remove"), style: "destructive", onPress: () => deleteCoupon.mutate(coupon.id) },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-coupons-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.accent.base} colors={[palette.accent.base]} />}
        >
          <AppHeader title={t("owner.coupons.title")} subtitle={t("owner.coupons.subtitle")} showBack />

          <SectionHeader
            title={t("owner.coupons.coupons")}
            action={
              <ZookButton size="sm" variant={showForm && !editingId ? "secondary" : "primary"} icon={showForm && !editingId ? "close" : "add"} onPress={() => (showForm && !editingId ? resetForm() : (resetForm(), setShowForm(true)))}>
                {showForm && !editingId ? t("common.cancel") : t("owner.coupons.newCoupon")}
              </ZookButton>
            }
          />

          {showForm ? (
            <Card contentStyle={styles.formCard}>
              <Text style={[styles.formTitle, { color: palette.text.primary }]}>{editingId ? t("owner.coupons.editCoupon") : t("owner.coupons.newCoupon")}</Text>
              <FormField label={t("owner.coupons.code")} value={code} onChangeText={(nextCode) => setCode(nextCode.toUpperCase())} autoCapitalize="characters" placeholder="WELCOME15" />
              <Text style={[styles.label, { color: palette.text.secondary }]}>{t("owner.coupons.discount")}</Text>
              <View style={styles.chipWrap}>
                {COUPON_TYPES.map((option) => {
                  const selected = type === option.value;
                  return (
                    <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setType(option.value)} style={[styles.chip, { borderColor: selected ? palette.accent.base : palette.border.default, backgroundColor: selected ? palette.surface.accentSoft : palette.surface.default }]}>
                      <Text style={[styles.chipText, { color: selected ? palette.accent.base : palette.text.secondary }]}>{t(option.labelKey)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <FormField label={type === "PERCENTAGE" ? t("owner.coupons.percentOffInput") : t("owner.coupons.amountOffInput")} value={value} onChangeText={setValue} keyboardType="number-pad" placeholder={type === "PERCENTAGE" ? "15" : "500"} />
              <View style={styles.formRow}>
                <FormField label={t("owner.coupons.maxRedemptions")} value={maxRedemptions} onChangeText={setMaxRedemptions} keyboardType="number-pad" placeholder={t("owner.coupons.unlimited")} style={styles.formField} />
                <FormField label={t("owner.coupons.perMember")} value={perUserLimit} onChangeText={setPerUserLimit} keyboardType="number-pad" placeholder="1" style={styles.formField} />
              </View>
              <View style={styles.switchRow}>
                <Text style={[styles.switchTitle, { color: palette.text.primary }]}>{t("owner.coupons.active")}</Text>
                <ThemedSwitch value={active} onValueChange={setActive} />
              </View>
              <ZookButton onPress={submit} disabled={!canSubmit} busy={saveCoupon.isPending} busyLabel={t("common.saving")} icon="save-outline">
                {editingId ? t("owner.coupons.saveChanges") : t("owner.coupons.createCoupon")}
              </ZookButton>
            </Card>
          ) : null}

          {couponsQuery.isError ? (
            <QueryErrorState error={couponsQuery.error} onRetry={() => void couponsQuery.refetch()} />
          ) : null}
          {!couponsQuery.isLoading && coupons.length === 0 ? (
            <Card variant="compact">
              <EmptyState icon="pricetag-outline" title={t("owner.coupons.noCouponsYet")} body={t("owner.coupons.noCouponsYetBody")} />
            </Card>
          ) : null}

          <View style={styles.stack}>
            {coupons.map((coupon) => (
              <Card key={coupon.id} variant="compact" contentStyle={styles.couponCard}>
                <Pressable accessibilityRole="button" accessibilityLabel={t("owner.coupons.editAccessibility", { code: coupon.code })} onPress={() => startEdit(coupon)} style={styles.couponMain}>
                  <IconBubble icon="pricetag" tone={coupon.active ? "lime" : "neutral"} size={42} />
                  <View style={styles.couponCopy}>
                    <Text style={[styles.couponCode, { color: palette.text.primary }]} numberOfLines={1}>{coupon.code}</Text>
                    <Text style={[styles.couponMeta, { color: palette.text.secondary }]} numberOfLines={1}>{couponLimits(coupon, t)}</Text>
                  </View>
                  <View style={styles.couponRight}>
                    <Text style={[styles.couponValue, { color: palette.text.primary }]}>{couponValue(coupon, t)}</Text>
                    {!coupon.active ? <Pill tone="neutral">{t("owner.coupons.paused")}</Pill> : null}
                  </View>
                </Pressable>
                <View style={styles.couponActions}>
                  <ZookButton size="sm" variant="secondary" icon="create-outline" onPress={() => startEdit(coupon)} style={styles.couponAction}>
                    {t("owner.coupons.edit")}
                  </ZookButton>
                  <ZookButton size="sm" variant="destructive" icon="trash-outline" onPress={() => confirmDelete(coupon)} style={styles.couponAction}>
                    {t("owner.coupons.remove")}
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
  couponCard: { gap: spacing.sm },
  couponMain: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  couponCopy: { flex: 1, gap: 2, minWidth: 0 },
  couponCode: { ...typography.cardTitle },
  couponMeta: { ...typography.small },
  couponRight: { alignItems: "flex-end", gap: 4 },
  couponValue: { ...typography.cardTitle },
  couponActions: { flexDirection: "row", gap: spacing.sm },
  couponAction: { flex: 1 },
});

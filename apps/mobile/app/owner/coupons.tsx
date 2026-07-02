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
  const { confirm, sheet } = useConfirmSheet();
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState<CouponType>("PERCENTAGE");
  const [value, setValue] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [perUserLimit, setPerUserLimit] = useState("");
  const [active, setActive] = useState(true);
  const [showRedemptionLimits, setShowRedemptionLimits] = useState(false);

  const coupons = couponsQuery.data?.coupons ?? [];
  const activeCoupons = coupons.filter((coupon) => coupon.active);
  const numericValue = Number.parseInt(value, 10) || 0;
  const validValue = type === "PERCENTAGE" ? numericValue > 0 && numericValue <= 100 : numericValue > 0;
  const canSubmit = /^[A-Z0-9-]{3,32}$/.test(code.trim().toUpperCase()) && validValue && !saveCoupon.isPending;
  const redemptionLimitSummary = [
    maxRedemptions.trim()
      ? `${t("owner.coupons.maxRedemptions")}: ${maxRedemptions.trim()}`
      : null,
    perUserLimit.trim()
      ? t("owner.coupons.perMemberLimit", { count: perUserLimit.trim() })
      : null,
  ].filter(Boolean).join(" · ") || t("owner.coupons.unlimited");

  function resetForm() {
    setEditingId(null);
    setCode("");
    setType("PERCENTAGE");
    setValue("");
    setMaxRedemptions("");
    setPerUserLimit("");
    setActive(true);
    setShowRedemptionLimits(false);
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
    setShowRedemptionLimits(Boolean(coupon.maxRedemptions || coupon.perUserLimit));
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
    confirm({
      title: t("owner.coupons.removeCouponTitle"),
      body: t("owner.coupons.removeCouponBody", { code: coupon.code }),
      destructiveLabel: t("owner.coupons.remove"),
      cancelLabel: t("common.cancel"),
      onConfirm: () => deleteCoupon.mutate(coupon.id),
    });
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
          <ScreenHeader
            title={t("owner.coupons.title")}
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip style={styles.headerBranchSelector} />
              </View>
            }
            trailing={<HeaderActions showBell />}
          />

          <View style={styles.listToolbar}>
            <View style={styles.countCluster}>
              <Pill tone={activeCoupons.length ? "lime" : "neutral"}>
                {t("owner.coupons.activeOffers", { count: activeCoupons.length })}
              </Pill>
              {coupons.length !== activeCoupons.length ? (
                <Pill tone="neutral">
                  {t("owner.coupons.pausedOffers", {
                    count: coupons.length - activeCoupons.length,
                  })}
                </Pill>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                showForm && !editingId ? t("common.cancel") : t("owner.coupons.newCoupon")
              }
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
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showRedemptionLimits }}
                onPress={() => setShowRedemptionLimits((value) => !value)}
                style={({ pressed }) => [
                  styles.disclosureRow,
                  { borderColor: palette.border.default, backgroundColor: palette.surface.default },
                  pressed ? styles.pressedAction : null,
                ]}
              >
                <View style={styles.disclosureCopy}>
                  <Text style={[styles.disclosureTitle, { color: palette.text.primary }]}>{t("owner.coupons.redemptionLimits")}</Text>
                  <Text style={[styles.disclosureMeta, { color: palette.text.secondary }]} numberOfLines={1}>
                    {redemptionLimitSummary}
                  </Text>
                </View>
                <Ionicons
                  name={showRedemptionLimits ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={palette.text.secondary}
                />
              </Pressable>
              {showRedemptionLimits ? (
                <View style={styles.limitsStack}>
                  <FormField label={t("owner.coupons.maxRedemptions")} value={maxRedemptions} onChangeText={setMaxRedemptions} keyboardType="number-pad" placeholder={t("owner.coupons.unlimited")} />
                  <FormField label={t("owner.coupons.perMember")} value={perUserLimit} onChangeText={setPerUserLimit} keyboardType="number-pad" placeholder="1" />
                </View>
              ) : null}
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
              <EmptyState
                icon="pricetag-outline"
                title={t("owner.coupons.noCouponsYet")}
                body={t("owner.coupons.noCouponsYetBody")}
                cta={{
                  label: t("owner.coupons.createCoupon"),
                  onPress: () => setShowForm(true),
                }}
              />
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
                    {!coupon.active ? (
                      <View style={styles.couponStatusRow}>
                        <Pill tone="neutral">{t("owner.coupons.paused")}</Pill>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.couponRight}>
                    <Text style={[styles.couponValue, { color: palette.text.primary }]}>{couponValue(coupon, t)}</Text>
                  </View>
                </Pressable>
                <View style={styles.couponActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("owner.coupons.remove")}
                    hitSlop={10}
                    onPress={() => confirmDelete(coupon)}
                    style={({ pressed }) => [styles.couponRemoveAction, pressed ? styles.pressedAction : null]}
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
  countCluster: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    flexWrap: "wrap",
    gap: spacing.xs,
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
  couponCard: { gap: spacing.sm },
  couponMain: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  couponCopy: { flex: 1, gap: 2, minWidth: 0 },
  couponCode: { ...typography.cardTitle },
  couponMeta: { ...typography.small },
  couponStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingTop: 2,
  },
  couponRight: { alignItems: "flex-end", gap: 4, maxWidth: 108 },
  couponValue: { ...typography.cardTitle },
  couponActions: { alignItems: "flex-end" },
  couponRemoveAction: {
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

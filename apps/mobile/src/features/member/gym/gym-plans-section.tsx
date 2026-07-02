import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { planTypeLabel } from "@/components/membership/helpers";
import { Card, EmptyState, SectionHeader } from "@/components/primitives";
import { formatInr, formatLongDate } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";
import type { PublicPlanSummary } from "@/lib/domains/shared/types";

type Translate = ReturnType<typeof useI18n>["t"];
type PricedPlan = PublicPlanSummary & {
  effectivePricePaise?: number | null;
  badges?: string[] | null;
};

export function effectivePlanPrice(
  plan?: { pricePaise?: number | null; effectivePricePaise?: number | null } | null,
) {
  return typeof plan?.effectivePricePaise === "number" ? plan.effectivePricePaise : plan?.pricePaise;
}

export function planNameForLocale(
  plan: { id?: string | null; name?: string | null; type?: string | null },
  locale: string,
  t: Translate,
) {
  const fallback = plan.name ?? t("gymProfile.choosePlan");
  if (locale !== "hi") {
    return fallback;
  }
  const normalizedId = (plan.id ?? "").toLowerCase();
  const normalizedName = (plan.name ?? "").toLowerCase();
  const normalizedType = (plan.type ?? "").toUpperCase();
  if (
    normalizedType === "TRIAL" ||
    normalizedId.includes("trial") ||
    normalizedName.includes("trial")
  ) {
    return t("gymProfile.planNameTrial");
  }
  if (
    normalizedType === "HYBRID" ||
    normalizedId.includes("hybrid") ||
    normalizedName.includes("hybrid")
  ) {
    return t("gymProfile.planNameHybrid");
  }
  if (
    normalizedType === "DURATION" ||
    normalizedId.includes("monthly") ||
    normalizedName.includes("monthly")
  ) {
    return t("gymProfile.planNameMonthly");
  }
  return fallback;
}

function planDescriptionForLocale(
  plan: { description?: string | null; id?: string | null; type?: string | null },
  locale: string,
  t: Translate,
) {
  if (locale !== "hi") {
    return plan.description ?? null;
  }
  const normalizedId = (plan.id ?? "").toLowerCase();
  const normalizedType = (plan.type ?? "").toUpperCase();
  if (normalizedType === "TRIAL" || normalizedId.includes("trial")) {
    return t("gymProfile.planDescriptionTrial");
  }
  if (normalizedType === "HYBRID" || normalizedId.includes("hybrid")) {
    return t("gymProfile.planDescriptionHybrid");
  }
  if (normalizedType === "DURATION" || normalizedId.includes("monthly")) {
    return t("gymProfile.planDescriptionMonthly");
  }
  return plan.description ?? null;
}

function buildPlanHighlights(plan: PublicPlanSummary, t: Translate) {
  const highlights = [
    plan.durationDays ? t("gymProfile.daysCount", { count: plan.durationDays }) : null,
    plan.visitLimit
      ? t(plan.visitLimit === 1 ? "gymProfile.visitCountOne" : "gymProfile.visitCountMany", {
          count: plan.visitLimit,
        })
      : null,
    plan.validityDays ? t("gymProfile.validityDays", { count: plan.validityDays }) : null,
    plan.startDate && plan.endDate
      ? t("gymProfile.dateRange", {
          start: formatLongDate(plan.startDate),
          end: formatLongDate(plan.endDate),
        })
      : null,
  ].filter(Boolean) as string[];

  return highlights.length
    ? highlights
    : [t("gymProfile.flexibleMembership"), t("gymProfile.securePayment")];
}

export function GymPlansSection({
  activeMembership,
  effectiveReferral,
  inviteOnlyLocked,
  locale,
  needsApproval,
  plans,
  selectedCheckoutPlanId,
  onSelectPlan,
}: {
  activeMembership: boolean;
  effectiveReferral?: string | null;
  inviteOnlyLocked: boolean;
  locale: string;
  needsApproval: boolean;
  plans: PublicPlanSummary[];
  selectedCheckoutPlanId?: string | null;
  onSelectPlan: (planId: string) => void;
}) {
  const { palette } = useTheme();
  const { t } = useI18n();

  return (
    <View>
      <SectionHeader eyebrow={t("nav.plans")} title={t("gymProfile.membershipOptions")} />

      {!plans.length ? <EmptyState title={t("gymProfile.noPublicPlans")} /> : null}

      <View style={styles.planStack}>
        {plans.map((plan) => {
          const pricedPlan = plan as PricedPlan;
          const effectivePricePaise = pricedPlan.effectivePricePaise ?? plan.pricePaise;
          const hasReferralPrice =
            effectiveReferral &&
            effectivePricePaise !== null &&
            effectivePricePaise !== undefined &&
            plan.pricePaise !== null &&
            plan.pricePaise !== undefined &&
            effectivePricePaise < plan.pricePaise;
          const badges = [
            ...(pricedPlan.badges ?? []),
            hasReferralPrice ? t("gymProfile.referralPrice") : null,
          ].filter((item): item is string => Boolean(item));
          const planName = planNameForLocale(plan, locale, t);
          const planDescription = planDescriptionForLocale(plan, locale, t);

          const selectedForCheckout = selectedCheckoutPlanId === plan.id;
          const canSelectPlan = !activeMembership && !needsApproval && !inviteOnlyLocked;

          return (
            <Pressable
              key={plan.id}
              testID={`gym-plan-row-${plan.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${t("gymProfile.choosePlan")}: ${planName}`}
              accessibilityState={{ selected: selectedForCheckout }}
              onPress={() => (canSelectPlan ? onSelectPlan(plan.id) : undefined)}
              disabled={!canSelectPlan}
              style={({ pressed }) => (pressed && canSelectPlan ? styles.cardPressed : null)}
            >
              <Card
                contentStyle={styles.planCard}
                style={[
                  styles.planCardShell,
                  {
                    borderColor: selectedForCheckout
                      ? palette.border.focus
                      : palette.border.subtle,
                    backgroundColor: selectedForCheckout
                      ? palette.surface.accentSoft
                      : palette.surface.default,
                  },
                ]}
              >
                <View style={styles.planHeader}>
                  <View style={styles.planCopy}>
                    <Text style={[styles.planName, { color: palette.text.primary }]} numberOfLines={1}>
                      {planName}
                    </Text>
                    <Text style={[styles.planType, { color: palette.text.secondary }]} numberOfLines={1}>
                      {planTypeLabel(plan.type, t)}
                    </Text>
                  </View>
                  <View style={styles.planPriceBlock}>
                    {selectedForCheckout && !activeMembership ? (
                      <View style={[styles.planSelectedMark, { backgroundColor: palette.accent.base }]}>
                        <Ionicons name="checkmark" size={13} color={palette.text.onAccent} />
                      </View>
                    ) : null}
                    <Text style={[styles.planPrice, { color: palette.accent.base }]} numberOfLines={1}>
                      {formatInr(effectivePricePaise)}
                    </Text>
                    {hasReferralPrice ? (
                      <Text
                        style={[styles.planOriginalPrice, { color: palette.text.tertiary }]}
                        numberOfLines={1}
                      >
                        {formatInr(plan.pricePaise)}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {badges.length ? (
                  <View style={styles.planBadgeRow}>
                    {badges.slice(0, 3).map((badge) => (
                      <Text
                        key={`${plan.id}-${badge}`}
                        style={[
                          styles.planBadge,
                          {
                            backgroundColor: palette.surface.accentSoft,
                            borderColor: palette.border.focus,
                            color: palette.accent.base,
                          },
                        ]}
                      >
                        {badge}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {planDescription ? (
                  <Text style={[styles.planDescription, { color: palette.text.secondary }]} numberOfLines={2}>
                    {planDescription}
                  </Text>
                ) : null}
                <View style={styles.planBenefits}>
                  {buildPlanHighlights(plan, t).map((item) => (
                    <View key={`${plan.id}-${item}`} style={styles.planBenefitRow}>
                      <Ionicons name="checkmark-circle-outline" size={15} color={palette.accent.base} />
                      <Text style={[styles.planBenefitText, { color: palette.text.secondary }]}>
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  planStack: {
    gap: spacing.md,
  },
  planCardShell: {
    borderWidth: 1,
  },
  planCard: {
    gap: spacing.md,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  planCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  planName: {
    ...typography.cardTitle,
  },
  planType: {
    ...typography.caption,
  },
  planPriceBlock: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 92,
  },
  planSelectedMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  planPrice: {
    ...typography.sectionTitle,
  },
  planOriginalPrice: {
    ...typography.caption,
    textDecorationLine: "line-through",
  },
  planBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  planBadge: {
    ...typography.caption,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planDescription: {
    ...typography.body,
  },
  planBenefits: {
    gap: 8,
  },
  planBenefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planBenefitText: {
    ...typography.caption,
    flex: 1,
  },
});

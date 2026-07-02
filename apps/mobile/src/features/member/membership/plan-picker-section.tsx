import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheetScrollView } from "@/components/expo-safe-bottom-sheet";
import { PlansSkeleton } from "@/components/skeletons";
import { planTypeLabel } from "@/components/membership/helpers";
import type { MembershipRecord } from "@/components/membership";
import type { PublicPlanSummary } from "@/lib/domains";
import { formatInr } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";

export function PlanPickerSection({
  loadingPlans,
  maxHeight,
  plans,
  renewing,
  selectedPlanId,
  setSelectedPlanId,
}: {
  loadingPlans: boolean;
  maxHeight: number;
  plans: Array<PublicPlanSummary | NonNullable<MembershipRecord["plan"]>>;
  renewing: boolean;
  selectedPlanId?: string;
  setSelectedPlanId: (planId: string) => void;
}) {
  const { mode, palette } = useTheme();
  const t = useT();

  return (
    <View style={[styles.frame, { maxHeight }]}>
      <BottomSheetScrollView
        style={styles.scroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator
      >
        {loadingPlans ? <PlansSkeleton /> : null}
        {!loadingPlans && !plans.length ? (
          <Text style={[styles.emptyBody, { color: palette.text.secondary }]}>
            {t("member.membership.noAlternatePlans")}
          </Text>
        ) : null}
        {plans.map((plan) => {
          const selected = selectedPlanId === plan.id;
          return (
            <Pressable
              key={plan.id}
              onPress={() => {
                if (!renewing) setSelectedPlanId(plan.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={t("member.membership.selectPlanAccessibility", {
                plan: plan.name,
              })}
              accessibilityState={{ selected, disabled: renewing, busy: selected && renewing }}
              disabled={renewing}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: selected
                    ? palette.surface.accentSoft
                    : mode === "dark"
                      ? palette.surface.raised
                      : palette.bg.elevated,
                  borderColor: selected ? palette.border.focus : palette.border.default,
                },
                pressed && !renewing ? styles.optionPressed : null,
              ]}
            >
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, { color: palette.text.primary }]}>
                  {plan.name}
                </Text>
                <Text style={[styles.optionMeta, { color: palette.text.secondary }]}>
                  {planTypeLabel(plan.type, t)} · {formatInr(plan.pricePaise)}
                </Text>
              </View>
              {selected && renewing ? (
                <ActivityIndicator size="small" color={palette.accent.base} />
              ) : selected ? (
                <Ionicons name="checkmark-circle" size={20} color={palette.accent.base} />
              ) : null}
            </Pressable>
          );
        })}
      </BottomSheetScrollView>
      {plans.length > 3 ? (
        <View
          pointerEvents="none"
          style={[
            styles.scrollHintBottom,
            { backgroundColor: mode === "dark" ? palette.bg.overlay : palette.bg.elevated },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyBody: {
    ...typography.small,
    textAlign: "center",
  },
  frame: {
    position: "relative",
  },
  scroll: {
    flexGrow: 0,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  scrollHintBottom: {
    bottom: 0,
    height: 18,
    left: 0,
    opacity: 0.82,
    position: "absolute",
    right: 0,
  },
  option: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 66,
    padding: spacing.md,
  },
  optionPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  optionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  optionTitle: {
    ...typography.cardTitle,
  },
  optionMeta: {
    ...typography.small,
  },
});

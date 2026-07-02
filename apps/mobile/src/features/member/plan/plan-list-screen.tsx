import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  IconBubble,
  ProgressBar,
  QueryErrorState,
  ScreenHeader,
  SectionHeader,
  SegmentedControl,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { PlansSkeleton } from "@/components/skeletons";
import { useMyPlans } from "@/lib/domains";
import { useT } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { planKind, planTitle } from "./plan-summary-helpers";

type PlanFilter = "workout" | "diet";

export function PlanListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mode, palette } = useTheme();
  const t = useT();
  const [filter, setFilter] = useState<PlanFilter>("workout");
  const [refreshing, setRefreshing] = useState(false);
  const plansQuery = useMyPlans();
  const filters = useMemo(
    () => [
      { label: t("member.planDetail.workoutFilter"), value: "workout" as const },
      { label: t("member.planDetail.dietFilter"), value: "diet" as const },
    ],
    [t],
  );
  const plans = plansQuery.data?.plans ?? [];
  const filteredPlans = plans.filter((assignment) => planKind(assignment).includes(filter));
  const selectedAssignment = filteredPlans[0] ?? plans[0] ?? null;
  const coachName = selectedAssignment?.assignedById
    ? t("member.planDetail.assignedByCoach")
    : t("member.planDetail.yourCoach");

  function openAssignment(assignmentId: string) {
    router.push(`/plan/${assignmentId}` as never);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["me", "plans"] });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ZookScreen testID="plans-screen">
      <KeyboardAwareScreen
        scrollViewProps={{
          contentInsetAdjustmentBehavior: "never",
          showsVerticalScrollIndicator: false,
          contentContainerStyle: styles.content,
          stickyHeaderIndices: [0],
          refreshControl: (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          ),
        }}
      >
        <ScreenHeader
          title={t("member.planDetail.yourPlan")}
          showProfileShortcut={false}
          leading={
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/plan"))}
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
              hitSlop={12}
              style={({ pressed }) => [
                styles.headerBackButton,
                {
                  backgroundColor: mode === "dark" ? palette.surface.raised : palette.bg.elevated,
                  borderColor: palette.border.default,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons name="chevron-back" size={21} color={palette.text.primary} />
            </Pressable>
          }
        />

        {selectedAssignment ? (
          <Card variant="selected" contentStyle={styles.activePlanContent}>
            <View style={styles.activePlanTop}>
              <View style={styles.activePlanCopy}>
                <Text style={[styles.eyebrow, { color: palette.text.secondary }]}>
                  {t("member.planDetail.active")}
                </Text>
                <Text style={[styles.activePlanTitle, { color: palette.text.primary }]}>
                  {planTitle(selectedAssignment, t("member.plan.assignedPlan"))}
                </Text>
                <Text style={[styles.activePlanMeta, { color: palette.text.secondary }]}>
                  {coachName} · {planKind(selectedAssignment)}
                </Text>
              </View>
              <View style={styles.activePlanPercent}>
                <Text style={[styles.activePlanPercentValue, { color: palette.accent.base }]}>
                  {selectedAssignment.progress?.completionPct ?? 0}
                </Text>
                <Text style={[styles.activePlanPercentSuffix, { color: palette.text.secondary }]}>
                  %
                </Text>
              </View>
            </View>
            <ProgressBar
              value={(selectedAssignment.progress?.completionPct ?? 0) / 100}
              label={t("member.plan.progress")}
            />
            <View style={styles.activePlanActions}>
              <ZookButton
                testID="plans-start-session"
                onPress={() => openAssignment(selectedAssignment.id)}
                icon="open-outline"
                style={styles.activePlanPrimaryAction}
              >
                {t("member.plan.openTodayPlan")}
              </ZookButton>
              <Pressable
                testID="plans-view-active"
                onPress={() =>
                  setFilter(planKind(selectedAssignment).includes("diet") ? "diet" : "workout")
                }
                accessibilityRole="button"
                accessibilityLabel={t("member.planDetail.seeWeeklyList")}
                style={({ pressed }) => [
                  styles.activePlanSecondaryAction,
                  {
                    backgroundColor: mode === "dark" ? palette.surface.raised : palette.bg.elevated,
                    borderColor: palette.border.default,
                  },
                  pressed ? styles.iconButtonPressed : null,
                ]}
              >
                <Ionicons name="list-outline" size={18} color={palette.text.primary} />
              </Pressable>
            </View>
          </Card>
        ) : null}

        <SegmentedControl options={filters} value={filter} onChange={setFilter} />

        <SectionHeader title={t("member.planDetail.upNextThisWeek")} />
        <View style={styles.libraryGrid}>
          {plansQuery.isLoading ? (
            <View style={styles.fullWidth}>
              <PlansSkeleton />
            </View>
          ) : null}
          {plansQuery.isError ? (
            <View style={styles.fullWidth}>
              <Card variant="compact">
                <QueryErrorState error={plansQuery.error} onRetry={() => void plansQuery.refetch()} />
              </Card>
            </View>
          ) : null}
          {!plansQuery.isLoading && !plansQuery.isError && !filteredPlans.length ? (
            <Card variant="compact" style={styles.emptyPlanCard}>
              <EmptyState
                icon="clipboard-outline"
                title={t("member.plan.noPlanAssigned")}
                body={t("member.planDetail.noPlanAssignedBody")}
              />
            </Card>
          ) : null}
          {filteredPlans.map((assignment, index) => (
            <Pressable
              testID={index === 0 ? "plan-row-first" : `plan-row-${assignment.id}`}
              key={assignment.id}
              onPress={() => openAssignment(assignment.id)}
              accessibilityRole="button"
              style={[
                styles.libraryCard,
                {
                  backgroundColor: mode === "dark" ? palette.surface.raised : palette.bg.elevated,
                  borderColor: palette.border.default,
                },
              ]}
            >
              <IconBubble
                icon={planKind(assignment).includes("diet") ? "nutrition-outline" : "barbell-outline"}
                tone="neutral"
                size={42}
              />
              <Text numberOfLines={2} style={[styles.libraryTitle, { color: palette.text.primary }]}>
                {planTitle(assignment, t("member.plan.assignedPlan"))}
              </Text>
              <Text numberOfLines={1} style={[styles.libraryDetail, { color: palette.text.secondary }]}>
                {t("member.plan.percentComplete", {
                  percent: assignment.progress?.completionPct ?? 0,
                })}
              </Text>
            </Pressable>
          ))}
        </View>
      </KeyboardAwareScreen>
    </ZookScreen>
  );
}

const styles = StyleSheet.create({
  headerBackButton: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: layout.screenContentTopPadding,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  iconButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  activePlanContent: {
    gap: spacing.md,
  },
  activePlanTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  activePlanCopy: {
    flex: 1,
    gap: 4,
  },
  activePlanTitle: {
    ...typography.headerTitle,
  },
  activePlanMeta: {
    ...typography.caption,
  },
  activePlanPercent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 1,
  },
  activePlanPercentValue: {
    ...typography.screenTitle,
    lineHeight: 34,
  },
  activePlanPercentSuffix: {
    ...typography.bodyStrong,
  },
  activePlanActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  activePlanPrimaryAction: {
    flex: 1,
  },
  activePlanSecondaryAction: {
    alignItems: "center",
    borderRadius: 23,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  eyebrow: {
    ...typography.eyebrow,
  },
  libraryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  fullWidth: {
    width: "100%",
  },
  libraryCard: {
    width: "48.5%",
    minHeight: 112,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: spacing.sm,
    justifyContent: "center",
  },
  libraryTitle: {
    ...typography.cardTitle,
    minHeight: 44,
  },
  libraryDetail: {
    ...typography.small,
  },
  emptyPlanCard: {
    width: "100%",
  },
});

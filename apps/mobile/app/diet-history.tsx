import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  ScreenHeader,
  Card,
  EmptyState,
  QueryErrorState,
  Skeleton,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { dietApi } from "@/lib/domain-api";
import type { DietPlanRecord, MealLogRecord } from "@/lib/domains/shared/types";
import { useT } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export default function DietHistoryScreen() {
  const { token, activeOrgId } = useAuth();
  const { palette } = useTheme();
  const t = useT();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const selectedDateKey = dateKey(selectedDate);
  const dietQuery = useQuery({
    queryKey: ["me", "diet", selectedDateKey],
    enabled: Boolean(token),
    queryFn: () =>
      dietApi.getMine<{ plan: DietPlanRecord | null; logs: MealLogRecord[] }>({
        token: token!,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        date: selectedDateKey,
      }),
  });
  const logs = useMemo(() => dietQuery.data?.logs ?? [], [dietQuery.data?.logs]);
  const totals = useMemo(
    () =>
      logs.reduce(
        (acc, log) => ({
          calories: acc.calories + (log.calories ?? 0),
          proteinG: acc.proteinG + (log.proteinG ?? 0),
          carbsG: acc.carbsG + (log.carbsG ?? 0),
          fatsG: acc.fatsG + (log.fatsG ?? 0),
        }),
        { calories: 0, proteinG: 0, carbsG: 0, fatsG: 0 },
      ),
    [logs],
  );

  return (
    <ZookScreen testID="diet-history-screen">
      <ScreenHeader title={t("member.diet.historyTitle")} showBack />
      <Card contentStyle={styles.stack}>
        <View style={styles.dateRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("member.diet.previousDay")}
            onPress={() => setSelectedDate((current) => addDays(current, -1))}
            hitSlop={8}
            style={({ pressed }) => [
              styles.dateAction,
              { backgroundColor: palette.surface.default, borderColor: palette.border.default },
              pressed ? styles.pressed : null,
            ]}
          >
            <Ionicons name="chevron-back-outline" size={20} color={palette.text.secondary} />
          </Pressable>
          <Text style={[styles.dateLabel, { color: palette.text.primary }]}>{selectedDateKey}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("member.diet.nextDay")}
            onPress={() => setSelectedDate((current) => addDays(current, 1))}
            hitSlop={8}
            style={({ pressed }) => [
              styles.dateAction,
              { backgroundColor: palette.surface.default, borderColor: palette.border.default },
              pressed ? styles.pressed : null,
            ]}
          >
            <Ionicons name="chevron-forward-outline" size={20} color={palette.text.secondary} />
          </Pressable>
        </View>
        {dietQuery.isLoading ? (
          <View style={styles.stack}>
            <Skeleton width="60%" height={20} borderRadius={10} />
            <Skeleton width="100%" height={48} borderRadius={18} />
            <Skeleton width="86%" height={48} borderRadius={18} />
          </View>
        ) : null}
        {dietQuery.isError ? (
          <QueryErrorState error={dietQuery.error} onRetry={() => void dietQuery.refetch()} />
        ) : null}
        {!dietQuery.isLoading && !dietQuery.isError ? (
          <>
            <View style={[styles.totalCard, { borderColor: palette.border.subtle }]}>
              <Text style={[styles.totalValue, { color: palette.text.primary }]}>
                {totals.calories} kcal
              </Text>
              <Text style={[styles.totalMeta, { color: palette.text.secondary }]}>
                {totals.proteinG}P / {totals.carbsG}C / {totals.fatsG}F
              </Text>
            </View>
            {logs.length ? (
              logs.map((log) => (
                <View key={log.id} style={[styles.logRow, { borderColor: palette.border.subtle }]}>
                  <Text style={[styles.logTitle, { color: palette.text.primary }]}>{log.mealName}</Text>
                  <Text style={[styles.totalMeta, { color: palette.text.secondary }]}>
                    {log.calories ?? 0} kcal · {log.proteinG ?? 0}P/{log.carbsG ?? 0}C/{log.fatsG ?? 0}F
                  </Text>
                </View>
              ))
            ) : (
              <EmptyState
                icon="restaurant-outline"
                title={t("member.diet.noMealsLogged")}
                body={t("member.diet.noMealsLoggedBody")}
              />
            )}
          </>
        ) : null}
      </Card>
    </ZookScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  dateRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  dateLabel: typography.bodyStrong,
  dateAction: { alignItems: "center", borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, height: 40, justifyContent: "center", width: 40 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.96 }] },
  totalCard: { borderRadius: 20, borderWidth: 1, padding: spacing.md, gap: spacing.xs },
  totalValue: typography.screenTitle,
  totalMeta: typography.caption,
  logRow: { borderRadius: 18, borderWidth: 1, padding: spacing.md, gap: spacing.xs },
  logTitle: typography.bodyStrong,
});

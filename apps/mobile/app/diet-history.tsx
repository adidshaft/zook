import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Card,
  EmptyState,
  QueryErrorState,
  Skeleton,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { dietApi } from "@/lib/domain-api";
import type { DietPlanRecord, MealLogRecord } from "@/lib/domains/shared/types";
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
  const logs = dietQuery.data?.logs ?? [];
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
      <AppHeader title="Diet history" showBack />
      <Card contentStyle={styles.stack}>
        <View style={styles.dateRow}>
          <ZookButton
            size="sm"
            variant="secondary"
            icon="chevron-back-outline"
            onPress={() => setSelectedDate((current) => addDays(current, -1))}
          >
            Previous
          </ZookButton>
          <Text style={[styles.dateLabel, { color: palette.text.primary }]}>{selectedDateKey}</Text>
          <ZookButton
            size="sm"
            variant="secondary"
            icon="chevron-forward-outline"
            onPress={() => setSelectedDate((current) => addDays(current, 1))}
          >
            Next
          </ZookButton>
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
                title="No meals logged"
                body="Meals you log for this day will appear here."
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
  totalCard: { borderRadius: 20, borderWidth: 1, padding: spacing.md, gap: spacing.xs },
  totalValue: typography.screenTitle,
  totalMeta: typography.caption,
  logRow: { borderRadius: 18, borderWidth: 1, padding: spacing.md, gap: spacing.xs },
  logTitle: typography.bodyStrong,
});

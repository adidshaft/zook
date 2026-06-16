import { Stack } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import {
  EmptyState,
  Card,
  ListRow,
  LoadingSkeleton,
  AppHeader,
  QueryErrorState,
  SectionHeader,
  StatusChip,
  ZookScreen,
} from "@/components/primitives";
import { useTrainerPayouts } from "@/lib/domains";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

function rupees(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function TrainerPayoutsScreen() {
  const { palette } = useTheme();
  const payoutsQuery = useTrainerPayouts();
  const isLoading = payoutsQuery.isLoading;
  const payouts = payoutsQuery.data?.payouts ?? [];
  const current = payouts[0] ?? null;
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="trainer-payouts-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={payoutsQuery.isRefetching}
              onRefresh={() => void payoutsQuery.refetch()}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
        >
          <AppHeader title="Payouts" subtitle="Live PT earnings and paid history" chip={<StatusChip status="Trainer" tone="neutral" />} />
          {payoutsQuery.isError ? <QueryErrorState error={payoutsQuery.error} onRetry={() => void payoutsQuery.refetch()} /> : null}
          {isLoading ? (
            <Card variant="compact" contentStyle={styles.loadingCard}>
              <LoadingSkeleton height={16} width="36%" />
              <LoadingSkeleton height={34} width="48%" />
              <LoadingSkeleton height={16} width="58%" />
            </Card>
          ) : null}
          {!isLoading ? (
            <>
              <Card variant="compact" contentStyle={styles.hero}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>This month accrued</Text>
                <Text style={[styles.total, { color: palette.text.primary }]}>{rupees(current?.totalPaise ?? 0)}</Text>
                <Text style={[styles.meta, { color: palette.text.secondary }]}>{current?.status ?? "draft"} · {current?.lines?.length ?? 0} earning lines</Text>
              </Card>
              <SectionHeader title="Breakdown" />
              <Card variant="compact" contentStyle={styles.stack}>
                {current?.lines?.length ? (
                  current.lines.map((line) => (
                    <ListRow key={line.id} title={line.description} subtitle={line.kind} trailing={<Text style={[styles.lineAmount, { color: palette.accent.base }]}>{rupees(line.amountPaise)}</Text>} />
                  ))
                ) : (
                  <EmptyState title="No earnings yet" body="PT commissions and session fees will appear as soon as owner records activity." />
                )}
              </Card>
            </>
          ) : null}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding + 32, paddingTop: 8, width: "100%" },
  hero: { gap: 8 },
  label: { ...typography.caption },
  total: { fontFamily: "Inter_700Bold", fontSize: 34, lineHeight: 40 },
  meta: { ...typography.body },
  loadingCard: { gap: 10 },
  stack: { gap: 10 },
  lineAmount: { ...typography.bodyStrong },
});

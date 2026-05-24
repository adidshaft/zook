import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import {
  EmptyState,
  GlassCard,
  ListRow,
  MobileHeader,
  QueryErrorState,
  SectionHeader,
  StatusChip,
  ZookScreen,
} from "@/components/primitives";
import { useTrainerPayouts } from "@/lib/domains";
import { legacyColors, layout, spacing, typography } from "@/lib/theme";

function rupees(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function TrainerPayoutsScreen() {
  const payoutsQuery = useTrainerPayouts();
  const payouts = payoutsQuery.data?.payouts ?? [];
  const current = payouts[0] ?? null;
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="trainer-payouts-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title="Payouts" subtitle="Live PT earnings and paid history" chip={<StatusChip status="Trainer" tone="neutral" />} />
          {payoutsQuery.isError ? <QueryErrorState error={payoutsQuery.error} onRetry={() => void payoutsQuery.refetch()} /> : null}
          <GlassCard variant="compact" contentStyle={styles.hero}>
            <Text style={styles.label}>This month accrued</Text>
            <Text style={styles.total}>{rupees(current?.totalPaise ?? 0)}</Text>
            <Text style={styles.meta}>{current?.status ?? "draft"} · {current?.lines?.length ?? 0} earning lines</Text>
          </GlassCard>
          <SectionHeader title="Breakdown" />
          <GlassCard variant="compact" contentStyle={styles.stack}>
            {current?.lines?.length ? (
              current.lines.map((line) => (
                <ListRow key={line.id} title={line.description} subtitle={line.kind} trailing={<Text style={styles.lineAmount}>{rupees(line.amountPaise)}</Text>} />
              ))
            ) : (
              <EmptyState title="No earnings yet" body="PT commissions and session fees will appear as soon as owner records activity." />
            )}
          </GlassCard>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding + 32, paddingTop: 8, width: "100%" },
  hero: { gap: 8 },
  label: { color: legacyColors.muted, ...typography.caption },
  total: { color: legacyColors.text, fontFamily: "Inter_700Bold", fontSize: 34, lineHeight: 40 },
  meta: { color: legacyColors.muted, ...typography.body },
  stack: { gap: 10 },
  lineAmount: { color: legacyColors.lime, ...typography.bodyStrong },
});

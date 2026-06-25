import { Stack, useRouter } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import {
  EmptyState,
  Card,
  HeaderActions,
  ListRow,
  Skeleton,
  QueryErrorState,
  ScreenHeader,
  SectionHeader,
  ZookScreen,
} from "@/components/primitives";
import { useTrainerPayouts } from "@/lib/domains";
import { useI18n } from "@/lib/i18n";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

function rupees(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function TrainerPayoutsScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const bottomPadding = useBottomScrollPadding();
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
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={payoutsQuery.isRefetching}
              onRefresh={() => void payoutsQuery.refetch()}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
        >
          <ScreenHeader title={t("trainer.payouts.title")} trailing={<HeaderActions showBell />} />

          <Card variant="compact" contentStyle={styles.stack}>
            <ListRow
              title={t("trainer.payouts.settings")}
              subtitle={t("trainer.payouts.settingsSubtitle")}
              icon="settings-outline"
              tone="violet"
              onPress={() => router.push("/trainer/payout-settings" as never)}
            />
          </Card>

          {payoutsQuery.isError ? <QueryErrorState error={payoutsQuery.error} onRetry={() => void payoutsQuery.refetch()} /> : null}
          {isLoading ? (
            <Card variant="compact" contentStyle={styles.loadingCard}>
              <Skeleton height={16} width="36%" />
              <Skeleton height={34} width="48%" />
              <Skeleton height={16} width="58%" />
            </Card>
          ) : null}
          {!isLoading ? (
            <>
              <Card variant="compact" contentStyle={styles.hero}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>
                  {t("trainer.payouts.thisMonthAccrued")}
                </Text>
                <Text style={[styles.total, { color: palette.text.primary }]}>{rupees(current?.totalPaise ?? 0)}</Text>
                <Text style={[styles.meta, { color: palette.text.secondary }]}>
                  {current?.status ?? t("trainer.payouts.draft")} · {t("trainer.payouts.earningLines", { count: current?.lines?.length ?? 0 })}
                </Text>
              </Card>
              <SectionHeader title={t("trainer.payouts.breakdown")} />
              <Card variant="compact" contentStyle={styles.stack}>
                {current?.lines?.length ? (
                  current.lines.map((line) => (
                    <ListRow key={line.id} title={line.description} subtitle={line.kind} trailing={<Text style={[styles.lineAmount, { color: palette.accent.base }]}>{rupees(line.amountPaise)}</Text>} />
                  ))
                ) : (
                  <EmptyState icon="cash-outline" title={t("trainer.payouts.emptyTitle")} body={t("trainer.payouts.emptyBody")} />
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
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingTop: layout.screenContentTopPadding, width: "100%" },
  hero: { gap: spacing.xs },
  label: { ...typography.caption },
  total: { fontFamily: "Inter_700Bold", fontSize: 34, lineHeight: 40 },
  meta: { ...typography.body },
  loadingCard: { gap: spacing.sm },
  stack: { gap: spacing.sm },
  lineAmount: { ...typography.bodyStrong },
});

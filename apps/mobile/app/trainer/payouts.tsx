import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  EmptyState,
  Card,
  HeaderActions,
  ListRow,
  Pill,
  Skeleton,
  QueryErrorState,
  ScreenHeader,
  SectionHeader,
  ZookScreen,
} from "@/components/primitives";
import { useTrainerPayouts } from "@/lib/domains";
import { titleCaseFromCode } from "@/lib/formatting";
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
          <ScreenHeader
            title={t("trainer.payouts.title")}
            trailing={
              <View style={styles.headerActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("trainer.payouts.settings")}
                  hitSlop={8}
                  onPress={() => router.push("/trainer/payout-settings" as never)}
                  style={({ pressed }) => [
                    styles.iconButton,
                    {
                      backgroundColor: palette.surface.default,
                      borderColor: palette.border.subtle,
                    },
                    pressed ? styles.controlPressed : null,
                  ]}
                >
                  <Ionicons name="settings-outline" size={20} color={palette.text.primary} />
                </Pressable>
                <HeaderActions showBell />
              </View>
            }
          />

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
                <View style={styles.heroTop}>
                  <Text style={[styles.label, { color: palette.text.secondary }]}>
                    {t("trainer.payouts.thisMonthAccrued")}
                  </Text>
                  <Pill tone={current?.status === "PAID" ? "lime" : "amber"}>
                    {titleCaseFromCode(current?.status ?? t("trainer.payouts.draft"))}
                  </Pill>
                </View>
                <Text style={[styles.total, { color: palette.text.primary }]}>{rupees(current?.totalPaise ?? 0)}</Text>
                <Text style={[styles.meta, { color: palette.text.secondary }]}>
                  {t("trainer.payouts.earningLines", { count: current?.lines?.length ?? 0 })}
                </Text>
              </Card>
              {current?.lines?.length ? (
                <>
                  <SectionHeader title={t("trainer.payouts.breakdown")} />
                  <Card variant="compact" contentStyle={styles.stack}>
                    {current.lines.map((line) => (
                      <ListRow key={line.id} title={line.description} subtitle={line.kind} trailing={<Text style={[styles.lineAmount, { color: palette.accent.base }]}>{rupees(line.amountPaise)}</Text>} />
                    ))}
                  </Card>
                </>
              ) : (
                <Card variant="compact">
                  <EmptyState icon="cash-outline" title={t("trainer.payouts.emptyTitle")} body={t("trainer.payouts.emptyBody")} />
                </Card>
              )}
            </>
          ) : null}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingTop: layout.screenContentTopPadding, width: "100%" },
  headerActions: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  iconButton: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  controlPressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  hero: { gap: spacing.xs },
  heroTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  label: { ...typography.caption },
  total: { ...typography.display },
  meta: { ...typography.body },
  loadingCard: { gap: spacing.sm },
  stack: { gap: spacing.sm },
  lineAmount: { ...typography.bodyStrong },
});

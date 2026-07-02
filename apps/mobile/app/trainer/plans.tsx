import { Stack } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  BranchSelectorChip,
  EmptyState,
  HeaderActions,
  Pill,
  QueryErrorState,
  ScreenHeader,
  SectionHeader,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { TrainerClientsSkeleton } from "@/components/skeletons";
import { PlanRow } from "@/features/trainer/components/plan-row";
import { useAuth } from "@/lib/auth";
import { useTrainerClients } from "@/lib/domains";
import { useI18n } from "@/lib/i18n";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";
import { layout, spacing, useTheme } from "@/lib/theme";

export default function TrainerPlansScreen() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useAuth();
  const { t } = useI18n();
  const { palette } = useTheme();
  const bottomPadding = useBottomScrollPadding();
  const [refreshing, setRefreshing] = useState(false);
  const clientsQuery = useTrainerClients();
  const clients = clientsQuery.data?.clients ?? [];
  const needsPlanClients = clients.filter(
    (client) => (client.summary?.activePlans ?? 0) === 0,
  );
  const plannedClients = clients.filter(
    (client) => (client.summary?.activePlans ?? 0) > 0,
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "trainer"] });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="trainer-plans-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
        >
          <ScreenHeader
            title={t("trainer.plans.title")}
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip style={styles.headerBranchSelector} />
              </View>
            }
            trailing={<HeaderActions showBell />}
          />
          <View style={styles.stack}>
            {clientsQuery.isLoading ? (
              <TrainerClientsSkeleton />
            ) : clientsQuery.isError ? (
              <QueryErrorState error={clientsQuery.error} onRetry={() => void clientsQuery.refetch()} />
            ) : needsPlanClients.length || plannedClients.length ? (
              <>
                {needsPlanClients.length ? (
                  <>
                    <SectionHeader
                      title={t("trainer.plans.needsFirstPlan")}
                      action={<Pill tone="amber">{needsPlanClients.length}</Pill>}
                    />
                    {needsPlanClients.map((client) => (
                      <PlanRow
                        key={client.id ?? client.memberUserId}
                        actionLabel={t("trainer.plans.createPlan")}
                        client={client}
                      />
                    ))}
                  </>
                ) : null}
                {plannedClients.length ? (
                  <>
                    <SectionHeader
                      title={t("trainer.plans.reviewActivePlans")}
                      action={<Pill tone="blue">{plannedClients.length}</Pill>}
                    />
                    {plannedClients.map((client) => (
                      <PlanRow key={client.id ?? client.memberUserId} client={client} />
                    ))}
                  </>
                ) : null}
              </>
            ) : (
              <EmptyState icon="clipboard-outline" title={t("trainer.plans.emptyTitle")} body={t("trainer.plans.emptyBody")} />
            )}
          </View>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.sm,
    maxWidth: layout.contentWidth,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  headerContext: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 0,
  },
  headerBranchSelector: {
    flex: 1,
    minWidth: 0,
  },
  stack: { gap: spacing.sm },
});

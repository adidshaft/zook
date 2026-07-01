import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Card,
  ListRow,
  AppHeader,
  SegmentedControl,
  Skeleton,
  StatusChip,
  ZookScreen,
} from "@/components/primitives";
import {
  averageCompletionFor,
  clientDetailTabs,
  clientDetailTabLabelKeys,
  progressTimelineFor,
  selectedTrainerClient,
  trainerClientDetailPath,
  type ClientDetailTab,
} from "@/features/trainer/helpers";
import { useTrainerClients } from "@/lib/domains";
import { useT } from "@/lib/i18n";
import { layout, spacing, useTheme } from "@/lib/theme";

export default function TrainerClientSessionsScreen() {
  const router = useRouter();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const { palette } = useTheme();
  const t = useT();
  const clientsQuery = useTrainerClients();
  const client = selectedTrainerClient(clientsQuery.data?.clients, id);
  const activePlans = client?.summary?.activePlans ?? 0;
  const hasActivePlans = activePlans > 0;
  const averageCompletion = averageCompletionFor(client);
  const adherenceValue = averageCompletion === null ? "--" : `${averageCompletion}%`;
  const progressTimeline = progressTimelineFor(client, {
    logged: t("trainer.clientSessions.logged"),
    planFeedback: t("trainer.clientSessions.planFeedback"),
    planProgress: t("trainer.clientSessions.planProgress"),
    complete: (percent) => t("trainer.clientSessions.completePercent", { percent }),
    durationMinutes: (minutes) => t("trainer.clientSessions.durationMinutes", { minutes }),
  });
  const translatedClientDetailTabs = clientDetailTabs.map((tab) => ({
    ...tab,
    label: t(clientDetailTabLabelKeys[tab.value]),
  }));

  function selectTab(tab: ClientDetailTab) {
    router.replace(trainerClientDetailPath(id, tab) as never);
  }

  return (
    <>
      <ZookScreen testID="trainer-client-sessions-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <AppHeader
            title={t("trainer.clientSessions.title")}
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/trainer/clients" as never))}
                accessibilityRole="button"
                accessibilityLabel={t("trainer.clientSessions.backToClients")}
                style={[styles.iconButton, { backgroundColor: palette.surface.raised, borderColor: palette.border.default }]}
              >
                <Text style={[styles.backIcon, { color: palette.text.primary }]}>‹</Text>
              </Pressable>
            }
          />
          <SegmentedControl options={translatedClientDetailTabs} value="sessions" onChange={selectTab} />
          {clientsQuery.isLoading ? (
            <Card variant="compact" contentStyle={styles.stack}>
              <Skeleton width="42%" height={16} borderRadius={8} />
              <Skeleton width="100%" height={44} borderRadius={18} />
              <Skeleton width="92%" height={44} borderRadius={18} />
              <Skeleton width="84%" height={44} borderRadius={18} />
            </Card>
          ) : null}
          {!clientsQuery.isLoading ? (
            <>
              <Card variant="compact" contentStyle={styles.summaryCard}>
                <View style={styles.summaryLead}>
                  <Text style={[styles.summaryValue, { color: averageCompletion === null ? palette.text.secondary : palette.text.primary }]}>
                    {adherenceValue}
                  </Text>
                  <View style={styles.summaryCopy}>
                    <Text style={[styles.summaryTitle, { color: palette.text.primary }]}>{t("trainer.clientSessions.adherence")}</Text>
                    <Text style={[styles.summaryBody, { color: palette.text.secondary }]} numberOfLines={2}>
                      {averageCompletion === null ? t("trainer.clientSessions.waitingForFeedback") : t("trainer.clientSessions.averageCompletion", { percent: averageCompletion })}
                    </Text>
                  </View>
                </View>
                <View style={[styles.planRail, { backgroundColor: palette.surface.default }]}>
                  <Ionicons name="reader-outline" size={16} color={palette.text.secondary} />
                  <Text style={[styles.planRailText, { color: palette.text.secondary }]} numberOfLines={1}>
                    {t("trainer.clients.activePlanCount", {
                      count: activePlans,
                      label: activePlans === 1 ? t("trainer.home.plan") : t("trainer.home.plans"),
                    })}
                  </Text>
                  <StatusChip
                    status={hasActivePlans ? t("member.home.active") : t("trainer.clientSessions.noPlans")}
                    tone={hasActivePlans ? "blue" : "neutral"}
                  />
                </View>
              </Card>
              <Card variant="compact" contentStyle={styles.stack}>
                {progressTimeline.length ? (
                  progressTimeline.map((entry) => (
                    <ListRow key={entry.id} title={entry.title} subtitle={entry.body || t("trainer.clientSessions.noDetails")} trailing={<StatusChip status={entry.status} tone={entry.tone} />} />
                  ))
                ) : (
                  <ListRow title={t("trainer.clientSessions.planFeedback")} />
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
  content: { alignSelf: "center", gap: spacing.sm, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding + 32, paddingTop: layout.screenContentTopPadding, width: "100%" },
  iconButton: { alignItems: "center", borderRadius: 16, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  backIcon: { fontSize: 26, lineHeight: 28 },
  summaryCard: { gap: spacing.sm },
  summaryLead: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  summaryValue: { fontFamily: "Inter_700Bold", fontSize: 34, lineHeight: 40, minWidth: 76 },
  summaryCopy: { flex: 1, gap: 2, minWidth: 0 },
  summaryTitle: { fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 21 },
  summaryBody: { fontSize: 13, lineHeight: 18 },
  planRail: { alignItems: "center", borderRadius: 16, flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 7 },
  planRailText: { flex: 1, fontSize: 12, lineHeight: 16 },
  stack: { gap: spacing.sm },
});

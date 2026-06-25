import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AuditWarning,
  FormField,
  Card,
  EmptyState,
  ListRow,
  AppHeader,
  QueryErrorState,
  SegmentedControl,
  Skeleton,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import {
  averageCompletionFor,
  clientDetailTabs,
  fitnessGoalFor,
  selectedTrainerClient,
  trainerClientDetailPath,
  type ClientDetailTab,
} from "@/features/trainer/helpers";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { trainerApi } from "@/lib/domain-api";
import { useTrainerClients } from "@/lib/domains";
import { queryKeys } from "@/lib/domains/shared/keys";
import { useClientBodyProgress } from "@/lib/domains/trainer/queries";
import { formatDateTime, formatInitials, formatLongDate } from "@/lib/formatting";
import { type TranslationKey, useI18n } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

const clientDetailTabLabelKeys: Record<ClientDetailTab, TranslationKey> = {
  overview: "trainer.clientDetail.overviewTab",
  plan: "trainer.clientDetail.planTab",
  sessions: "trainer.clientDetail.sessionsTab",
};

export default function TrainerClientOverviewScreen() {
  const router = useRouter();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const clientsQuery = useTrainerClients();
  const client = selectedTrainerClient(clientsQuery.data?.clients, id);
  const clientName = client?.user?.name ?? (clientsQuery.isLoading ? t("trainer.pt.clientFallback") : t("trainer.clients.noMatchingClients"));
  const fitnessGoal = fitnessGoalFor(client);
  const averageCompletion = averageCompletionFor(client);
  const recentWorkouts = client?.summary?.recentWorkouts ?? [];
  const lastWorkoutStartedAt = recentWorkouts[0]?.startedAt;
  const activePlans = client?.summary?.activePlans ?? 0;
  const dietPreference = client?.summary?.dietPreference?.trim();
  const allergies = client?.summary?.allergies?.trim();
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [bodyWeight, setBodyWeight] = useState("");
  const [bodyWaist, setBodyWaist] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const bodyProgressQuery = useClientBodyProgress(client?.memberUserId ?? id);
  const trendEntries = bodyProgressQuery.data?.entries?.slice(0, 5) ?? [];
  const translatedClientDetailTabs = clientDetailTabs.map((tab) => ({
    ...tab,
    label: t(clientDetailTabLabelKeys[tab.value]),
  }));

  useEffect(() => {
    setNoteText(client?.summary?.trainerNote ?? "");
    setNoteSaved(false);
  }, [client?.memberUserId, client?.summary?.trainerNote]);

  async function saveNote() {
    if (!token || !activeOrgId || !client || !client.trainerUserId) return;
    setNoteSaved(false);
    try {
      await trainerApi.updateClientNote({
        token,
        orgId: activeOrgId,
        trainerUserId: client.trainerUserId,
        clientId: client.memberUserId,
        note: noteText,
      });
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "trainer"] });
      setNoteSaved(true);
      showToast({ tone: "success", haptic: "success", message: t("trainer.clientOverview.noteSavedToast") });
    } catch (error) {
      showToast({ title: t("common.actionFailed"), message: getApiErrorMessage(error), tone: "danger", haptic: "error" });
    }
  }

  async function saveBodyProgress() {
    if (!token || !activeOrgId || !client || !client.trainerUserId) return;
    try {
      await trainerApi.recordClientBodyProgress({
        token,
        orgId: activeOrgId,
        trainerUserId: client.trainerUserId,
        clientId: client.memberUserId,
        body: {
          organizationId: activeOrgId,
          measuredAt: new Date().toISOString(),
          weightKg: Number.parseFloat(bodyWeight) || undefined,
          waistCm: Number.parseFloat(bodyWaist) || undefined,
          bodyFatPercent: Number.parseFloat(bodyFat) || undefined,
          visibility: "TRAINER_VISIBLE",
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "trainer"] });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.trainer.clientBodyProgress(activeOrgId, client.trainerUserId, client.memberUserId),
      });
      setBodyWeight("");
      setBodyWaist("");
      setBodyFat("");
      showToast({ tone: "success", haptic: "success", message: t("trainer.clientOverview.bodyProgressRecordedToast") });
    } catch (error) {
      showToast({ title: t("common.actionFailed"), message: getApiErrorMessage(error), tone: "danger", haptic: "error" });
    }
  }

  function selectTab(tab: ClientDetailTab) {
    router.replace(trainerClientDetailPath(id, tab) as never);
  }

  return (
    <>
      <ZookScreen testID="trainer-client-detail-screen">
        <KeyboardAwareScreen scrollViewProps={{ contentInsetAdjustmentBehavior: "never", showsVerticalScrollIndicator: false, contentContainerStyle: styles.content }}>
          <AppHeader
            title={t("trainer.clientSessions.title")}
            subtitle={clientName}
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/trainer/clients" as never))}
                accessibilityRole="button"
                accessibilityLabel={t("trainer.clientSessions.backToClients")}
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: palette.surface.raised, borderColor: palette.border.default },
                  pressed ? styles.controlPressed : null,
                ]}
              >
                <Text style={[styles.backIcon, { color: palette.text.primary }]}>‹</Text>
              </Pressable>
            }
          />
          <SegmentedControl options={translatedClientDetailTabs} value="overview" onChange={selectTab} />

          {clientsQuery.isError ? (
            <Card variant="compact">
              <QueryErrorState error={clientsQuery.error} onRetry={() => void clientsQuery.refetch()} />
            </Card>
          ) : null}

          {!clientsQuery.isLoading && !clientsQuery.isError && !client ? (
            <Card variant="compact" contentStyle={styles.notFoundContent}>
              <Text style={[styles.cardTitle, { color: palette.text.primary }]}>{t("trainer.clients.noMatchingClients")}</Text>
              <ZookButton href="/trainer/clients" variant="secondary" icon="people-outline">{t("trainer.clientSessions.backToClients")}</ZookButton>
            </Card>
          ) : null}

          <Card variant="compact" contentStyle={styles.clientHeroContent}>
            <View style={styles.clientHeroTop}>
              <View style={[styles.clientAvatar, { backgroundColor: palette.surface.accentSoft, borderColor: palette.accent.base }]}>
                <Text style={[styles.clientAvatarText, { color: palette.text.primary }]}>{formatInitials(clientName, "ZK")}</Text>
              </View>
              <View style={styles.clientHeroCopy}>
                <Text numberOfLines={1} style={[styles.clientHeroName, { color: palette.text.primary }]}>{clientName}</Text>
                <View style={styles.clientStatusRow}>
                  <Ionicons name="person-outline" size={21} color={palette.accent.base} />
                  <Text style={[styles.clientStatusText, { color: palette.accent.base }]}>{client?.active ? t("trainer.clientOverview.activeMember") : t("trainer.clientOverview.pausedMember")}</Text>
                </View>
              </View>
            </View>
            <View style={styles.clientHeroMetrics}>
              <View style={styles.clientHeroMetric}>
                <Ionicons name="navigate-circle-outline" size={22} color={palette.accent.base} />
                <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>{t("assistant.contextGoal")}</Text>
                <Text numberOfLines={1} style={[styles.metricValue, { color: palette.text.primary }]}>{fitnessGoal}</Text>
              </View>
              <View style={styles.clientHeroMetric}>
                <Ionicons name="barbell-outline" size={22} color={palette.accent.base} />
                <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>{t("trainer.clientOverview.ptPack")}</Text>
                <Text numberOfLines={1} style={[styles.metricValue, { color: palette.text.primary }]}>{activePlans ? t("trainer.clients.activePlanCount", { count: activePlans, label: activePlans === 1 ? t("trainer.home.plan") : t("trainer.home.plans") }) : t("trainer.clientOverview.createFirstPlan")}</Text>
              </View>
            </View>
            <View style={styles.heroActions}>
              <ZookButton testID="trainer-create-plan-button" href={`/trainer/clients/${id}/plan` as never} icon="reader-outline" disabled={!client} style={styles.heroAction}>
                {t("trainer.clientOverview.workoutPlan")}
              </ZookButton>
              <ZookButton testID="trainer-create-diet-button" href={`/trainer/clients/${id}/diet` as never} variant="secondary" icon="restaurant-outline" disabled={!client} style={styles.heroAction}>
                {t("trainer.clientDiet.title")}
              </ZookButton>
            </View>
          </Card>

          <Card variant="compact" contentStyle={styles.stack}>
            <ListRow title={t("settings.fitnessGoal")} subtitle={fitnessGoal} trailing={<StatusChip status={client?.active ? t("trainer.clientOverview.active") : t("trainer.clientOverview.paused")} />} />
            <ListRow
              title={t("trainer.clientOverview.dietNote")}
              subtitle={dietPreference || t("trainer.clientOverview.notShared")}
              trailing={<StatusChip status={dietPreference ? t("trainer.clientOverview.shared") : t("trainer.clientOverview.missing")} tone="neutral" />}
            />
            <ListRow
              title={t("trainer.clientOverview.allergyNote")}
              subtitle={allergies || t("trainer.clientOverview.noneAdded")}
              trailing={<StatusChip status={allergies ? t("trainer.clientOverview.shared") : t("trainer.clientOverview.notAdded")} tone="neutral" />}
            />
            <ListRow
              title={t("trainer.clientOverview.lastCheckIn")}
              subtitle={formatDateTime(lastWorkoutStartedAt, t("trainer.clientOverview.noWorkoutLogged"), "en-IN")}
              trailing={<StatusChip status={lastWorkoutStartedAt ? t("trainer.clientOverview.tracked") : t("trainer.clientOverview.noLog")} tone="neutral" />}
            />
            <ListRow title={t("trainer.home.recentFeedback")} subtitle={averageCompletion === null ? t("trainer.clients.activePlanCount", { count: activePlans, label: activePlans === 1 ? t("trainer.home.plan") : t("trainer.home.plans") }) : t("trainer.clientOverview.averagePlanCompletion", { percent: averageCompletion })} trailing={<StatusChip status={averageCompletion === null ? t("trainer.clientOverview.needsFeedback") : `${averageCompletion}%`} tone="amber" />} />
          </Card>

          <Card contentStyle={styles.stack}>
            <FormField testID="trainer-note" label={t("trainer.clientOverview.trainerNote")} value={noteText} onChangeText={setNoteText} multiline placeholder={t("trainer.clientOverview.trainerNotePlaceholder")} />
            <ZookButton testID="trainer-save-note-button" onPress={() => void saveNote()} disabled={!client} icon={noteSaved ? "checkmark-outline" : "save-outline"}>{noteSaved ? t("trainer.clientOverview.saved") : t("trainer.clientOverview.saveNote")}</ZookButton>
            <AuditWarning>{t("trainer.clientOverview.noteAudit")}</AuditWarning>
          </Card>

          <Card contentStyle={styles.stack}>
            <FormField testID="trainer-client-body-weight" label={t("trainer.clientOverview.weightKg")} value={bodyWeight} onChangeText={setBodyWeight} keyboardType="decimal-pad" placeholder="72.5" />
            <FormField label={t("trainer.clientOverview.waistCm")} value={bodyWaist} onChangeText={setBodyWaist} keyboardType="decimal-pad" placeholder="82" />
            <FormField label={t("trainer.clientOverview.bodyFatPercent")} value={bodyFat} onChangeText={setBodyFat} keyboardType="decimal-pad" placeholder="18" />
            <ZookButton testID="trainer-client-body-save" onPress={() => void saveBodyProgress()} disabled={!client} icon="analytics-outline">{t("trainer.clientOverview.recordBodyProgress")}</ZookButton>
          </Card>

          <Card variant="compact" contentStyle={styles.stack}>
            <Text style={[styles.cardTitle, { color: palette.text.primary }]}>{t("trainer.clientOverview.bodyProgressTrend")}</Text>
            {bodyProgressQuery.isLoading ? (
              <>
                <Skeleton height={18} width="50%" />
                <Skeleton height={44} />
              </>
            ) : null}
            {bodyProgressQuery.isError ? (
              <QueryErrorState error={bodyProgressQuery.error} onRetry={() => void bodyProgressQuery.refetch()} />
            ) : null}
            {!bodyProgressQuery.isLoading && !bodyProgressQuery.isError ? (
              trendEntries.length ? (
                trendEntries.map((entry, index) => {
                  const next = trendEntries[index + 1];
                  const weight = entry.weightKg != null ? Number(entry.weightKg) : null;
                  const previousWeight = next?.weightKg != null ? Number(next.weightKg) : null;
                  const delta =
                    weight != null && previousWeight != null ? weight - previousWeight : null;
                  return (
                    <View key={entry.id} style={styles.trendRow}>
                      <Text style={[styles.trendDate, { color: palette.text.secondary }]}>
                        {formatLongDate(entry.measuredAt)}
                      </Text>
                      <Text style={[styles.trendWeight, { color: palette.text.primary }]}>
                        {weight != null ? `${weight} kg` : "-"}
                      </Text>
                      <Text
                        style={[
                          styles.trendDelta,
                          {
                            color:
                              delta == null
                                ? palette.text.secondary
                                : delta > 0
                                  ? palette.feedback.danger
                                  : delta < 0
                                    ? palette.feedback.success
                                    : palette.text.secondary,
                          },
                        ]}
                      >
                        {delta == null
                          ? t("trainer.clientOverview.baseline")
                          : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <EmptyState
                  icon="analytics-outline"
                  title={t("trainer.clientOverview.noMeasurements")}
                  body={t("trainer.clientOverview.noMeasurementsBody")}
                />
              )
            ) : null}
          </Card>
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.sm, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding + 32, paddingTop: layout.screenContentTopPadding, width: "100%" },
  iconButton: { alignItems: "center", borderRadius: 16, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  controlPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  backIcon: { fontSize: 26, lineHeight: 28 },
  notFoundContent: { alignItems: "center", gap: spacing.md },
  clientHeroContent: { gap: 18, padding: 20 },
  clientHeroTop: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  clientAvatar: { alignItems: "center", borderRadius: 48, borderWidth: 2, height: 96, justifyContent: "center", width: 96 },
  clientAvatarText: { fontFamily: "Inter_700Bold", fontSize: 30, lineHeight: 36 },
  clientHeroCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  clientHeroName: { fontFamily: "Inter_700Bold", fontSize: 30, lineHeight: 36 },
  clientStatusRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  clientStatusText: { fontFamily: "Inter_600SemiBold", fontSize: 17, lineHeight: 23 },
  clientHeroMetrics: { flexDirection: "row", gap: spacing.lg },
  clientHeroMetric: { flex: 1, gap: 6 },
  heroActions: { flexDirection: "row", gap: 8 },
  heroAction: { flex: 1 },
  metricLabel: { fontSize: 15, lineHeight: 20 },
  metricValue: { fontFamily: "Inter_600SemiBold", fontSize: 18, lineHeight: 24 },
  cardTitle: { ...typography.cardTitle },
  stack: { gap: spacing.sm },
  trendRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  trendDate: { ...typography.caption, flex: 1 },
  trendWeight: { ...typography.bodyStrong, marginHorizontal: spacing.sm },
  trendDelta: { ...typography.caption, minWidth: 72, textAlign: "right" },
});

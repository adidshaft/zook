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
  ScreenHeader,
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

function InlineStateBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  const { palette } = useTheme();
  const label = active ? activeLabel : inactiveLabel;
  return (
    <View
      accessibilityLabel={label}
      style={[
        styles.inlineStateBadge,
        {
          backgroundColor: active ? palette.surface.successSoft : palette.surface.default,
          borderColor: active ? palette.feedback.success : palette.border.default,
        },
      ]}
    >
      <Ionicons
        name={active ? "checkmark" : "remove"}
        size={14}
        color={active ? palette.feedback.success : palette.text.tertiary}
      />
    </View>
  );
}

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
  const fitnessGoal = fitnessGoalFor(client, t("trainer.clients.generalFitness"));
  const averageCompletion = averageCompletionFor(client);
  const recentWorkouts = client?.summary?.recentWorkouts ?? [];
  const lastWorkoutStartedAt = recentWorkouts[0]?.startedAt;
  const activePlans = client?.summary?.activePlans ?? 0;
  const nextStep = activePlans === 0
    ? {
        id: "workoutPlan" as const,
        icon: "reader-outline" as const,
        title: t("trainer.home.createPlanNext"),
        body: t("trainer.home.trainerPlanningQueue"),
        href: `/trainer/clients/${id}/plan` as const,
        cta: t("trainer.clientOverview.workoutPlan"),
      }
    : averageCompletion !== null && averageCompletion < 70
      ? {
          id: "sessions" as const,
          icon: "chatbubble-ellipses-outline" as const,
          title: t("trainer.clientOverview.reviewFeedback"),
          body: t("trainer.clientOverview.reviewFeedbackBody"),
          href: `/trainer/clients/${id}/sessions` as const,
          cta: t("trainer.clientDetail.sessionsTab"),
        }
      : !lastWorkoutStartedAt
        ? {
            id: "sessions" as const,
            icon: "barbell-outline" as const,
            title: t("trainer.clientOverview.reviewSessions"),
            body: t("trainer.clientOverview.reviewSessionsBody"),
            href: `/trainer/clients/${id}/sessions` as const,
            cta: t("trainer.clientDetail.sessionsTab"),
          }
        : {
            id: "sessions" as const,
            icon: "analytics-outline" as const,
            title: t("trainer.clientOverview.recordBodyProgress"),
            body: t("trainer.clientOverview.nextStepBody"),
            href: `/trainer/clients/${id}/sessions` as const,
            cta: t("trainer.clientDetail.sessionsTab"),
          };
  const heroActions = [
    {
      id: "workoutPlan",
      testID: "trainer-create-plan-button",
      href: `/trainer/clients/${id}/plan` as const,
      icon: "reader-outline" as const,
      label: t("trainer.clientOverview.workoutPlan"),
      variant: "primary" as const,
    },
    {
      id: "diet",
      testID: "trainer-create-diet-button",
      href: `/trainer/clients/${id}/diet` as const,
      icon: "restaurant-outline" as const,
      label: t("trainer.clientDiet.title"),
      variant: "secondary" as const,
    },
  ].filter((action) => action.id !== nextStep.id);
  const dietPreference = client?.summary?.dietPreference?.trim();
  const allergies = client?.summary?.allergies?.trim();
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showBodyForm, setShowBodyForm] = useState(false);
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
          <ScreenHeader
            title={t("trainer.clientSessions.title")}
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

          <Card variant="compact" contentStyle={styles.nextStepCard}>
            <View style={styles.nextStepHeader}>
              <View style={[styles.nextStepIcon, { backgroundColor: palette.surface.accentSoft }]}>
                <Ionicons name={nextStep.icon} size={20} color={palette.accent.base} />
              </View>
              <View style={styles.nextStepCopy}>
                <Text style={[styles.nextStepEyebrow, { color: palette.text.tertiary }]}>
                  {t("trainer.clientOverview.nextStep")}
                </Text>
                <Text style={[styles.nextStepTitle, { color: palette.text.primary }]}>
                  {nextStep.title}
                </Text>
                <Text style={[styles.nextStepBody, { color: palette.text.secondary }]}>
                  {nextStep.body}
                </Text>
              </View>
            </View>
            <ZookButton
              testID={`trainer-next-step-${nextStep.id}`}
              onPress={() => router.push(nextStep.href as never)}
              icon={nextStep.icon}
              disabled={!client}
            >
              {nextStep.cta}
            </ZookButton>
          </Card>

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
            {heroActions.length ? (
              <View style={styles.heroActions}>
                {heroActions.map((action) => (
                  <Pressable
                    key={action.id}
                    testID={action.testID}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    disabled={!client}
                    hitSlop={8}
                    onPress={() => router.push(action.href as never)}
                    style={({ pressed }) => [
                      styles.heroIconAction,
                      {
                        backgroundColor: action.variant === "primary" ? palette.accent.base : palette.surface.default,
                        borderColor: action.variant === "primary" ? palette.accent.base : palette.border.default,
                        opacity: client ? 1 : 0.5,
                      },
                      pressed ? styles.controlPressed : null,
                    ]}
                  >
                    <Ionicons
                      name={action.icon}
                      size={19}
                      color={action.variant === "primary" ? palette.text.onAccent : palette.text.primary}
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Card>

          <Card variant="compact" contentStyle={styles.stack}>
            <ListRow
              title={t("trainer.clientOverview.dietNote")}
              subtitle={dietPreference || t("trainer.clientOverview.notShared")}
              trailing={
                <InlineStateBadge
                  active={Boolean(dietPreference)}
                  activeLabel={t("trainer.clientOverview.shared")}
                  inactiveLabel={t("trainer.clientOverview.missing")}
                />
              }
            />
            <ListRow
              title={t("trainer.clientOverview.allergyNote")}
              subtitle={allergies || t("trainer.clientOverview.noneAdded")}
              trailing={
                <InlineStateBadge
                  active={Boolean(allergies)}
                  activeLabel={t("trainer.clientOverview.shared")}
                  inactiveLabel={t("trainer.clientOverview.notAdded")}
                />
              }
            />
            <ListRow
              title={t("trainer.clientOverview.lastCheckIn")}
              subtitle={formatDateTime(lastWorkoutStartedAt, t("trainer.clientOverview.noWorkoutLogged"), "en-IN")}
              trailing={
                <InlineStateBadge
                  active={Boolean(lastWorkoutStartedAt)}
                  activeLabel={t("trainer.clientOverview.tracked")}
                  inactiveLabel={t("trainer.clientOverview.noLog")}
                />
              }
            />
            <ListRow title={t("trainer.home.recentFeedback")} subtitle={averageCompletion === null ? t("trainer.clients.activePlanCount", { count: activePlans, label: activePlans === 1 ? t("trainer.home.plan") : t("trainer.home.plans") }) : t("trainer.clientOverview.averagePlanCompletion", { percent: averageCompletion })} trailing={<StatusChip status={averageCompletion === null ? t("trainer.clientOverview.needsFeedback") : `${averageCompletion}%`} tone="amber" />} />
          </Card>

          <Card variant="compact" contentStyle={styles.disclosureCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showNoteForm }}
              onPress={() => setShowNoteForm((current) => !current)}
              style={({ pressed }) => [styles.disclosureHeader, pressed ? styles.controlPressed : null]}
            >
              <View style={[styles.disclosureIcon, { backgroundColor: palette.surface.accentSoft }]}>
                <Ionicons name="create-outline" size={18} color={palette.accent.base} />
              </View>
              <View style={styles.disclosureCopy}>
                <Text style={[styles.disclosureTitle, { color: palette.text.primary }]}>{t("trainer.clientOverview.trainerNote")}</Text>
                <Text style={[styles.disclosureBody, { color: palette.text.secondary }]} numberOfLines={1}>
                  {noteText.trim() || t("trainer.clientOverview.notAdded")}
                </Text>
              </View>
              <Ionicons name={showNoteForm ? "chevron-up" : "chevron-down"} size={18} color={palette.text.tertiary} />
            </Pressable>
            {showNoteForm ? (
              <View style={styles.stack}>
                <FormField testID="trainer-note" label={t("trainer.clientOverview.trainerNote")} value={noteText} onChangeText={setNoteText} multiline placeholder={t("trainer.clientOverview.trainerNotePlaceholder")} />
                <ZookButton testID="trainer-save-note-button" onPress={() => void saveNote()} disabled={!client} icon={noteSaved ? "checkmark-outline" : "save-outline"}>{noteSaved ? t("trainer.clientOverview.saved") : t("trainer.clientOverview.saveNote")}</ZookButton>
                <AuditWarning>{t("trainer.clientOverview.noteAudit")}</AuditWarning>
              </View>
            ) : null}
          </Card>

          <Card variant="compact" contentStyle={styles.disclosureCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showBodyForm }}
              onPress={() => setShowBodyForm((current) => !current)}
              style={({ pressed }) => [styles.disclosureHeader, pressed ? styles.controlPressed : null]}
            >
              <View style={[styles.disclosureIcon, { backgroundColor: palette.surface.accentSoft }]}>
                <Ionicons name="analytics-outline" size={18} color={palette.accent.base} />
              </View>
              <View style={styles.disclosureCopy}>
                <Text style={[styles.disclosureTitle, { color: palette.text.primary }]}>{t("trainer.clientOverview.recordBodyProgress")}</Text>
                <Text style={[styles.disclosureBody, { color: palette.text.secondary }]} numberOfLines={1}>
                  {trendEntries[0] ? formatLongDate(trendEntries[0].measuredAt) : t("trainer.clientOverview.noMeasurements")}
                </Text>
              </View>
              <Ionicons name={showBodyForm ? "chevron-up" : "chevron-down"} size={18} color={palette.text.tertiary} />
            </Pressable>
            {showBodyForm ? (
              <View style={styles.stack}>
                <FormField testID="trainer-client-body-weight" label={t("trainer.clientOverview.weightKg")} value={bodyWeight} onChangeText={setBodyWeight} keyboardType="decimal-pad" placeholder="72.5" />
                <FormField label={t("trainer.clientOverview.waistCm")} value={bodyWaist} onChangeText={setBodyWaist} keyboardType="decimal-pad" placeholder="82" />
                <FormField label={t("trainer.clientOverview.bodyFatPercent")} value={bodyFat} onChangeText={setBodyFat} keyboardType="decimal-pad" placeholder="18" />
                <ZookButton testID="trainer-client-body-save" onPress={() => void saveBodyProgress()} disabled={!client} icon="analytics-outline">{t("trainer.clientOverview.recordBodyProgress")}</ZookButton>
              </View>
            ) : null}
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
  backIcon: { ...typography.screenTitle, lineHeight: 28 },
  notFoundContent: { alignItems: "center", gap: spacing.md },
  nextStepCard: { gap: spacing.md },
  nextStepHeader: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  nextStepIcon: { alignItems: "center", borderRadius: 16, height: 44, justifyContent: "center", width: 44 },
  nextStepCopy: { flex: 1, gap: spacing.xs },
  nextStepEyebrow: { ...typography.caption, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  nextStepTitle: { ...typography.cardTitle },
  nextStepBody: { ...typography.body },
  clientHeroContent: { gap: 18, padding: 20 },
  clientHeroTop: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  clientAvatar: { alignItems: "center", borderRadius: 48, borderWidth: 2, height: 96, justifyContent: "center", width: 96 },
  clientAvatarText: { ...typography.metric },
  clientHeroCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  clientHeroName: { ...typography.metric },
  clientStatusRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  clientStatusText: { ...typography.sectionTitle },
  clientHeroMetrics: { flexDirection: "row", gap: spacing.lg },
  clientHeroMetric: { flex: 1, gap: 6 },
  heroActions: { alignSelf: "flex-end", flexDirection: "row", gap: 8 },
  heroIconAction: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  metricLabel: { ...typography.body, lineHeight: 20 },
  metricValue: { ...typography.sectionTitle },
  cardTitle: { ...typography.cardTitle },
  stack: { gap: spacing.sm },
  inlineStateBadge: {
    alignItems: "center",
    borderRadius: 13,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  disclosureCard: { gap: spacing.sm },
  disclosureHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  disclosureIcon: { alignItems: "center", borderRadius: 14, height: 38, justifyContent: "center", width: 38 },
  disclosureCopy: { flex: 1, gap: 2, minWidth: 0 },
  disclosureTitle: { ...typography.bodyStrong },
  disclosureBody: { ...typography.small },
  trendRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  trendDate: { ...typography.caption, flex: 1 },
  trendWeight: { ...typography.bodyStrong, marginHorizontal: spacing.sm },
  trendDelta: { ...typography.caption, minWidth: 72, textAlign: "right" },
});

import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AuditWarning,
  FormField,
  Card,
  IconBubble,
  ListRow,
  AppHeader,
  SegmentedControl,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import {
  averageCompletionFor,
  clientDetailTabs,
  fitnessGoalFor,
  initialsFor,
  planCountLabel,
  selectedTrainerClient,
  trainerClientDetailPath,
  type ClientDetailTab,
} from "@/features/trainer/helpers";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { trainerApi } from "@/lib/domain-api";
import { useTrainerClients } from "@/lib/domains";
import { formatDateTime } from "@/lib/formatting";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

export default function TrainerClientOverviewScreen() {
  const router = useRouter();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { palette } = useTheme();
  const clientsQuery = useTrainerClients();
  const client = selectedTrainerClient(clientsQuery.data?.clients, id);
  const clientName = client?.user?.name ?? (clientsQuery.isLoading ? "Client" : "Client not found");
  const fitnessGoal = fitnessGoalFor(client);
  const averageCompletion = averageCompletionFor(client);
  const recentWorkouts = client?.summary?.recentWorkouts ?? [];
  const lastWorkoutStartedAt = recentWorkouts[0]?.startedAt;
  const activePlans = client?.summary?.activePlans ?? 0;
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [bodyWeight, setBodyWeight] = useState("");
  const [bodyWaist, setBodyWaist] = useState("");
  const [bodyFat, setBodyFat] = useState("");

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
      showToast({ tone: "success", haptic: "success", message: "Trainer note saved." });
    } catch (error) {
      showToast({ title: "Action failed", message: getApiErrorMessage(error), tone: "danger", haptic: "error" });
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
      setBodyWeight("");
      setBodyWaist("");
      setBodyFat("");
      showToast({ tone: "success", haptic: "success", message: "Body progress recorded." });
    } catch (error) {
      showToast({ title: "Action failed", message: getApiErrorMessage(error), tone: "danger", haptic: "error" });
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
            title="Client Detail"
            subtitle={clientName}
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/trainer/clients" as never))}
                accessibilityRole="button"
                accessibilityLabel="Back to clients"
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: palette.surface.raised, borderColor: palette.border.default },
                  pressed ? styles.controlPressed : null,
                ]}
              >
                <Text style={[styles.backIcon, { color: palette.text.primary }]}>‹</Text>
              </Pressable>
            }
            chip={<StatusChip status="Trainer" tone="neutral" />}
          />
          <SegmentedControl options={clientDetailTabs} value="overview" onChange={selectTab} />

          {!clientsQuery.isLoading && !client ? (
            <Card variant="compact" contentStyle={styles.notFoundContent}>
              <IconBubble icon="person-outline" tone="neutral" size={42} />
              <Text style={[styles.cardTitle, { color: palette.text.primary }]}>Client not found</Text>
              <ZookButton href="/trainer/clients" variant="secondary" icon="people-outline">Back to clients</ZookButton>
            </Card>
          ) : null}

          <Card variant="compact" contentStyle={styles.clientHeroContent}>
            <View style={styles.clientHeroTop}>
              <View style={[styles.clientAvatar, { backgroundColor: palette.surface.accentSoft, borderColor: palette.accent.base }]}>
                <Text style={[styles.clientAvatarText, { color: palette.text.primary }]}>{initialsFor(clientName)}</Text>
                <View style={[styles.clientAvatarDot, { backgroundColor: palette.accent.base, borderColor: palette.bg.elevated }]} />
              </View>
              <View style={styles.clientHeroCopy}>
                <Text numberOfLines={1} style={[styles.clientHeroName, { color: palette.text.primary }]}>{clientName}</Text>
                <View style={styles.clientStatusRow}>
                  <Ionicons name="person-outline" size={21} color={palette.accent.base} />
                  <Text style={[styles.clientStatusText, { color: palette.accent.base }]}>{client?.active ? "Active member" : "Paused member"}</Text>
                </View>
              </View>
            </View>
            <View style={styles.clientHeroMetrics}>
              <View style={styles.clientHeroMetric}>
                <Ionicons name="navigate-circle-outline" size={22} color={palette.accent.base} />
                <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>Goal</Text>
                <Text numberOfLines={1} style={[styles.metricValue, { color: palette.text.primary }]}>{fitnessGoal}</Text>
              </View>
              <View style={styles.clientHeroMetric}>
                <Ionicons name="barbell-outline" size={22} color={palette.accent.base} />
                <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>PT pack</Text>
                <Text numberOfLines={1} style={[styles.metricValue, { color: palette.text.primary }]}>{activePlans ? `${activePlans} active ${activePlans === 1 ? "plan" : "plans"}` : "Create first plan"}</Text>
              </View>
            </View>
            <ZookButton testID="trainer-create-plan-button" href={`/trainer/clients/${id}/plan` as never} icon="reader-outline" disabled={!client}>
              Create plan
            </ZookButton>
          </Card>

          <Card variant="compact" contentStyle={styles.stack}>
            <ListRow title="Fitness goal" subtitle={fitnessGoal} trailing={<StatusChip status={client?.active ? "Active" : "Paused"} />} />
            <ListRow title="Diet note" subtitle={client?.summary?.dietPreference ?? "Not shared"} trailing={<StatusChip status="Visible" tone="neutral" />} />
            <ListRow title="Allergy note" subtitle={client?.summary?.allergies ?? "None added"} trailing={<StatusChip status="Clear" tone="neutral" />} />
            <ListRow
              title="Last check-in"
              subtitle={formatDateTime(lastWorkoutStartedAt, "No workout logged", "en-IN")}
              trailing={<StatusChip status={lastWorkoutStartedAt ? "Tracked" : "No log"} tone="neutral" />}
            />
            <ListRow title="Recent progress" subtitle={averageCompletion === null ? planCountLabel(activePlans) : `${averageCompletion}% average plan completion`} trailing={<StatusChip status={averageCompletion === null ? "Needs feedback" : `${averageCompletion}%`} tone="amber" />} />
          </Card>

          <Card contentStyle={styles.stack}>
            <FormField testID="trainer-note" label="Trainer note" value={noteText} onChangeText={setNoteText} multiline placeholder="Add coaching note for your own follow-up..." />
            <ZookButton testID="trainer-save-note-button" onPress={() => void saveNote()} disabled={!client} icon={noteSaved ? "checkmark-outline" : "save-outline"}>{noteSaved ? "Saved" : "Save note"}</ZookButton>
            <AuditWarning>Only assigned trainers and owners/admins can see trainer notes.</AuditWarning>
          </Card>

          <Card contentStyle={styles.stack}>
            <FormField testID="trainer-client-body-weight" label="Weight kg" value={bodyWeight} onChangeText={setBodyWeight} keyboardType="decimal-pad" placeholder="72.5" />
            <FormField label="Waist cm" value={bodyWaist} onChangeText={setBodyWaist} keyboardType="decimal-pad" placeholder="82" />
            <FormField label="Body fat %" value={bodyFat} onChangeText={setBodyFat} keyboardType="decimal-pad" placeholder="18" />
            <ZookButton testID="trainer-client-body-save" onPress={() => void saveBodyProgress()} disabled={!client} icon="analytics-outline">Record body progress</ZookButton>
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
  clientAvatarDot: { borderRadius: 11, borderWidth: 4, bottom: 10, height: 22, position: "absolute", right: 2, width: 22 },
  clientHeroCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  clientHeroName: { fontFamily: "Inter_700Bold", fontSize: 30, lineHeight: 36 },
  clientStatusRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  clientStatusText: { fontFamily: "Inter_600SemiBold", fontSize: 17, lineHeight: 23 },
  clientHeroMetrics: { flexDirection: "row", gap: spacing.lg },
  clientHeroMetric: { flex: 1, gap: 6 },
  metricLabel: { fontSize: 15, lineHeight: 20 },
  metricValue: { fontFamily: "Inter_600SemiBold", fontSize: 18, lineHeight: 24 },
  cardTitle: { ...typography.cardTitle },
  stack: { gap: spacing.sm },
});

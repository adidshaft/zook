import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AuditWarning,
  FormField,
  GlassCard,
  IconBubble,
  ListRow,
  MobileHeader,
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
} from "@/features/trainer/helpers";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { trainerApi } from "@/lib/domain-api";
import { useTrainerClients } from "@/lib/domains";
import { legacyColors, layout, spacing, typography } from "@/lib/theme";
import { showToast } from "@/lib/toast";

export default function TrainerClientOverviewScreen() {
  const router = useRouter();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const clientsQuery = useTrainerClients();
  const client = clientsQuery.data?.clients.find((candidate) => candidate.memberUserId === id) ?? null;
  const clientName = client?.user?.name ?? (clientsQuery.isLoading ? "Client" : "Client not found");
  const fitnessGoal = fitnessGoalFor(client);
  const averageCompletion = averageCompletionFor(client);
  const recentWorkouts = client?.summary?.recentWorkouts ?? [];
  const activePlans = client?.summary?.activePlans ?? 0;
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="trainer-client-detail-screen">
        <KeyboardAwareScreen scrollViewProps={{ contentInsetAdjustmentBehavior: "never", showsVerticalScrollIndicator: false, contentContainerStyle: styles.content }}>
          <MobileHeader
            title="Client Detail"
            subtitle=""
            leading={<Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/trainer/clients" as never))} accessibilityRole="button" accessibilityLabel="Back to clients" style={styles.iconButton}><Text style={styles.backIcon}>‹</Text></Pressable>}
            chip={<StatusChip status="Trainer" tone="neutral" />}
          />
          <SegmentedControl options={clientDetailTabs} value="overview" onChange={(tab) => router.replace(`/trainer/clients/${id}${tab === "overview" ? "" : `/${tab}`}` as never)} />

          {!clientsQuery.isLoading && !client ? (
            <GlassCard variant="compact" contentStyle={styles.notFoundContent}>
              <IconBubble icon="person-outline" tone="neutral" size={42} />
              <Text style={styles.cardTitle}>Client not found</Text>
              <ZookButton href="/trainer/clients" tone="secondary" icon="people-outline">Back to clients</ZookButton>
            </GlassCard>
          ) : null}

          <GlassCard variant="compact" contentStyle={styles.clientHeroContent}>
            <View style={styles.clientHeroTop}>
              <View style={styles.clientAvatar}>
                <Text style={styles.clientAvatarText}>{initialsFor(clientName)}</Text>
                <View style={styles.clientAvatarDot} />
              </View>
              <View style={styles.clientHeroCopy}>
                <Text numberOfLines={1} style={styles.clientHeroName}>{clientName}</Text>
                <View style={styles.clientStatusRow}>
                  <Ionicons name="person-outline" size={21} color={legacyColors.lime} />
                  <Text style={styles.clientStatusText}>{client?.active ? "Active member" : "Paused member"}</Text>
                </View>
              </View>
            </View>
            <View style={styles.clientHeroMetrics}>
              <View style={styles.clientHeroMetric}>
                <Ionicons name="navigate-circle-outline" size={22} color={legacyColors.lime} />
                <Text style={styles.metricLabel}>Goal</Text>
                <Text numberOfLines={1} style={styles.metricValue}>{fitnessGoal}</Text>
              </View>
              <View style={styles.clientHeroMetric}>
                <Ionicons name="barbell-outline" size={22} color={legacyColors.lime} />
                <Text style={styles.metricLabel}>PT pack</Text>
                <Text numberOfLines={1} style={styles.metricValue}>{activePlans ? `${activePlans} active plans` : "Create first plan"}</Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard variant="compact" contentStyle={styles.stack}>
            <ListRow title="Fitness goal" subtitle={fitnessGoal} trailing={<StatusChip status={client?.active ? "Active" : "Paused"} />} />
            <ListRow title="Diet note" subtitle={client?.summary?.dietPreference ?? "Not shared"} trailing={<StatusChip status="Visible" tone="neutral" />} />
            <ListRow title="Allergy note" subtitle={client?.summary?.allergies ?? "None added"} trailing={<StatusChip status="Clear" tone="neutral" />} />
            <ListRow title="Last check-in" subtitle={recentWorkouts[0]?.startedAt ?? "Today 7:14 AM"} trailing={<StatusChip status="Tracked" tone="neutral" />} />
            <ListRow title="Recent progress" subtitle={averageCompletion === null ? planCountLabel(activePlans) : `${averageCompletion}% average plan completion`} trailing={<StatusChip status={averageCompletion === null ? "Review" : `${averageCompletion}%`} tone="amber" />} />
          </GlassCard>

          <GlassCard contentStyle={styles.stack}>
            <FormField testID="trainer-note" label="Trainer note" value={noteText} onChangeText={setNoteText} multiline placeholder="Add coaching note for your own follow-up..." />
            <ZookButton testID="trainer-save-note-button" onPress={() => void saveNote()} disabled={!client} icon={noteSaved ? "checkmark-outline" : "save-outline"}>{noteSaved ? "Saved" : "Save note"}</ZookButton>
            <AuditWarning>Only assigned trainers and owners/admins can see trainer notes.</AuditWarning>
          </GlassCard>
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: 12, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding + 32, paddingTop: 8, width: "100%" },
  iconButton: { alignItems: "center", backgroundColor: legacyColors.panel, borderColor: legacyColors.border, borderRadius: 16, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  backIcon: { color: legacyColors.text, fontSize: 26, lineHeight: 28 },
  notFoundContent: { alignItems: "center", gap: spacing.md },
  clientHeroContent: { gap: 18, padding: 20 },
  clientHeroTop: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  clientAvatar: { alignItems: "center", backgroundColor: "rgba(185,244,85,0.12)", borderColor: legacyColors.lime, borderRadius: 48, borderWidth: 2, height: 96, justifyContent: "center", width: 96 },
  clientAvatarText: { color: legacyColors.text, fontFamily: "Inter_700Bold", fontSize: 30, lineHeight: 36 },
  clientAvatarDot: { backgroundColor: legacyColors.lime, borderColor: legacyColors.bg, borderRadius: 11, borderWidth: 4, bottom: 10, height: 22, position: "absolute", right: 2, width: 22 },
  clientHeroCopy: { flex: 1, gap: 8, minWidth: 0 },
  clientHeroName: { color: legacyColors.text, fontFamily: "Inter_700Bold", fontSize: 30, lineHeight: 36 },
  clientStatusRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  clientStatusText: { color: legacyColors.lime, fontFamily: "Inter_600SemiBold", fontSize: 17, lineHeight: 23 },
  clientHeroMetrics: { flexDirection: "row", gap: spacing.lg },
  clientHeroMetric: { flex: 1, gap: 6 },
  metricLabel: { color: legacyColors.muted, fontSize: 15, lineHeight: 20 },
  metricValue: { color: legacyColors.text, fontFamily: "Inter_600SemiBold", fontSize: 18, lineHeight: 24 },
  cardTitle: { color: legacyColors.text, ...typography.cardTitle },
  stack: { gap: 10 },
});

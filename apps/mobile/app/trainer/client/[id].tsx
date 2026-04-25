import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Card,
  GlassInput,
  InfoRow,
  Pill,
  PrimaryButton,
  PrimaryLink,
  Screen,
  ScreenHeader,
  SectionHeader,
  SecondaryButton,
} from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { useAuth, getApiErrorMessage } from "@/lib/auth";
import { useTrainerClients } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

export default function TrainerClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  
  const clientsQuery = useTrainerClients();
  const clients = clientsQuery.data?.clients ?? [];
  const selectedClient = clients.find((client) => client.memberUserId === id);
  const activeClientId = id;

  const [planTitle, setPlanTitle] = useState("3-Day Strength Reset");
  const [planPrompt, setPlanPrompt] = useState(
    "Create a safe 3-day strength plan for a beginner gym member.",
  );
  const [importedSummary, setImportedSummary] = useState("");
  const [messageDraft, setMessageDraft] = useState(
    "Plan update: open Zook to review your latest workout draft.",
  );
  const [latestPlanId, setLatestPlanId] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function generateDraft() {
    if (!token || !activeOrgId) return;
    setBusy("draft");
    try {
      const result = await mobileApiFetch<{ createdPlan?: { id: string; title: string } }>(
        "/ai/generate-plan",
        {
          method: "POST",
          token,
          orgId: activeOrgId,
          body: {
            orgId: activeOrgId,
            title: planTitle,
            type: "WORKOUT",
            prompt: [
              selectedClient?.summary?.fitnessGoal ? `Client goal: ${selectedClient.summary.fitnessGoal}` : null,
              selectedClient?.summary?.weightKg ? `Weight: ${selectedClient.summary.weightKg} kg` : null,
              selectedClient?.summary?.dietPreference ? `Diet: ${selectedClient.summary.dietPreference}` : null,
              selectedClient?.summary?.allergies ? `Allergies: ${selectedClient.summary.allergies}` : null,
              importedSummary ? `Imported client summary: ${importedSummary}` : null,
              `Trainer request: ${planPrompt}`,
            ].filter(Boolean).join("\n"),
            persistDraft: true,
          },
        },
      );
      setLatestPlanId(result.createdPlan?.id);
      setStatusMessage(
        result.createdPlan
          ? `Draft ready: ${result.createdPlan.title}. You can assign it below.`
          : "AI returned a draft response.",
      );
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "dashboard"] });
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function assignDraft() {
    if (!token || !activeOrgId || !latestPlanId || !activeClientId) {
      setStatusMessage("Generate a draft first.");
      return;
    }
    setBusy("assign");
    try {
      await mobileApiFetch(`/orgs/${activeOrgId}/plans/${latestPlanId}/assign`, {
        method: "POST",
        token,
        orgId: activeOrgId,
        body: {
          assignedToUserId: activeClientId,
          audience: "selected_member",
        },
      });
      setStatusMessage("Draft successfully assigned to the client.");
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function recordPtSubscription() {
    if (!token || !activeOrgId || !activeClientId || !session?.user.id) return;
    setBusy("pt");
    try {
      await mobileApiFetch(`/orgs/${activeOrgId}/pt-subscriptions`, {
        method: "POST",
        token,
        orgId: activeOrgId,
        body: {
          memberUserId: activeClientId,
          trainerUserId: session.user.id,
          amountPaise: 150000, // TODO: make configurable from trainer input
          paymentMode: "CASH",
          totalSessions: 12,
          notes: "Recorded from mobile.",
        },
      });
      setStatusMessage("Offline PT subscription recorded.");
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function sendAssignedNotification() {
    if (!token || !activeOrgId || !activeClientId) return;
    setBusy("notify");
    try {
      await mobileApiFetch(`/orgs/${activeOrgId}/notifications`, {
        method: "POST",
        token,
        orgId: activeOrgId,
        body: {
          type: "PLAN",
          title: "Trainer update",
          body: messageDraft,
          audience: "selected_members",
          selectedUserIds: [activeClientId],
          pushEnabled: true,
          excludeMinors: false,
        },
      });
      setStatusMessage("Client notification sent.");
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  if (!selectedClient) {
    return (
      <Screen>
        <ScreenHeader title="Loading client..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Client Dashboard"
          title={selectedClient.user?.name ?? selectedClient.memberUserId}
          subtitle={`Goal: ${selectedClient.profile?.fitnessGoal ?? "General fitness"}`}
        />

        <Card style={styles.selectedCard}>
          <View style={styles.clientTopRow}>
            <Pill tone="lime">Trainer visible</Pill>
            <Pill tone="blue">{selectedClient.summary?.activePlans ?? 0} active plans</Pill>
          </View>
          <Text style={styles.sectionTitle}>Client summary</Text>
          <Text style={styles.sectionBody}>
            {selectedClient.summary?.summaryNote ?? "Import or write context before generating a plan."}
          </Text>
          <View style={styles.infoStack}>
            <InfoRow label="Goal" value={selectedClient.summary?.fitnessGoal ?? selectedClient.profile?.fitnessGoal ?? "General fitness"} tone="lime" />
            <InfoRow label="Weight" value={selectedClient.summary?.weightKg ? `${selectedClient.summary.weightKg} kg` : "Not added"} tone="blue" />
            <InfoRow label="Diet" value={selectedClient.summary?.dietPreference ?? "Not added"} tone="amber" />
            <InfoRow label="Allergies" value={selectedClient.summary?.allergies ?? "None added"} tone="neutral" />
          </View>
          <View style={styles.quickActions}>
            <SecondaryButton onPress={() => void recordPtSubscription()} style={styles.quickAction}>
              {busy === "pt" ? "Recording..." : "Record PT pack"}
            </SecondaryButton>
            <PrimaryLink href="/assistant" style={styles.quickAction}>
              AI chat
            </PrimaryLink>
          </View>
        </Card>

        <SectionHeader
          eyebrow="Import"
          title="Client data"
          subtitle="Paste a body-composition result, WhatsApp summary, or intake note."
        />

        <Card style={styles.formCard}>
          <GlassInput
            label="Imported summary"
            value={importedSummary}
            onChangeText={setImportedSummary}
            multiline
            placeholder="Example: sleeps late, vegetarian, knee pain, wants fat loss..."
          />
        </Card>

        <SectionHeader
          eyebrow="AI workflow"
          title="Plan Draft Studio"
          subtitle="Generate a tailored workout and assign it instantly."
        />

        <Card style={styles.formCard}>
          <GlassInput
            label="Draft title"
            value={planTitle}
            onChangeText={setPlanTitle}
          />
          <GlassInput
            label="Prompt context"
            value={planPrompt}
            onChangeText={setPlanPrompt}
            multiline
          />
          
          <PrimaryButton onPress={() => void generateDraft()}>
            {busy === "draft" ? "Generating AI..." : "Step 1: Generate AI Draft"}
          </PrimaryButton>
          
          {latestPlanId ? (
            <SecondaryButton onPress={() => void assignDraft()}>
              {busy === "assign" ? "Assigning..." : "Step 2: Assign Generated Draft"}
            </SecondaryButton>
          ) : null}
        </Card>

        <SectionHeader
          eyebrow="Messaging"
          title="Direct Update"
          subtitle="Send a push notification directly to this client's inbox."
        />

        <Card style={styles.formCard}>
          <GlassInput
            label="Message body"
            value={messageDraft}
            onChangeText={setMessageDraft}
            multiline
          />
          <PrimaryButton onPress={() => void sendAssignedNotification()}>
            {busy === "notify" ? "Sending..." : "Send Push Update"}
          </PrimaryButton>
        </Card>

        {statusMessage ? (
          <Card>
            <Text style={styles.statusTitle}>Latest Activity</Text>
            <Text style={styles.statusMessage}>{statusMessage}</Text>
          </Card>
        ) : null}
        
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, paddingBottom: 60 },
  selectedCard: { gap: 12 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "900" },
  sectionBody: { color: colors.muted, lineHeight: 21 },
  quickActions: { flexDirection: "row", gap: 10 },
  quickAction: { flex: 1 },
  clientTopRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoStack: { gap: 10 },
  formCard: { gap: 14 },
  statusTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  statusMessage: { color: colors.lime, marginTop: 4, lineHeight: 21 },
});

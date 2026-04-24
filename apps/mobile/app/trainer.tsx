import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, Pill, PrimaryButton, Screen } from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { useAuth, getApiErrorMessage } from "@/lib/auth";
import { useTrainerClients } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

type TrainerClient = {
  memberUserId: string;
  user?: { name?: string; email?: string } | null;
  profile?: { fitnessGoal?: string | null } | null;
};

export default function Trainer() {
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const clientsQuery = useTrainerClients();
  const clients = (clientsQuery.data?.clients ?? []) as TrainerClient[];
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [planTitle, setPlanTitle] = useState("3-Day Strength Reset");
  const [planPrompt, setPlanPrompt] = useState("Create a safe 3-day strength plan for a beginner gym member.");
  const [messageDraft, setMessageDraft] = useState("Plan update: open Zook to review your latest workout draft.");
  const [latestPlanId, setLatestPlanId] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState("Generate an AI draft, assign it to a client, then send a scoped message.");
  const [busy, setBusy] = useState<string | null>(null);

  async function generateDraft() {
    if (!token || !activeOrgId) {
      return;
    }
    setBusy("draft");
    try {
      const result = await mobileApiFetch<{ createdPlan?: { id: string; title: string } }>("/ai/generate-plan", {
        method: "POST",
        token,
        orgId: activeOrgId,
        body: {
          orgId: activeOrgId,
          title: planTitle,
          type: "WORKOUT",
          prompt: planPrompt,
          persistDraft: true
        }
      });
      setLatestPlanId(result.createdPlan?.id);
      setStatusMessage(result.createdPlan ? `Draft ready: ${result.createdPlan.title}` : "AI returned a draft response.");
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "dashboard"] });
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function assignDraft() {
    if (!token || !activeOrgId || !latestPlanId || !selectedClientId) {
      setStatusMessage("Pick a client and generate a draft first.");
      return;
    }
    setBusy("assign");
    try {
      await mobileApiFetch(`/orgs/${activeOrgId}/plans/${latestPlanId}/assign`, {
        method: "POST",
        token,
        orgId: activeOrgId,
        body: {
          assignedToUserId: selectedClientId,
          audience: "selected_member"
        }
      });
      setStatusMessage("Draft assigned to the selected client.");
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "trainer", session?.user.id, "clients"] });
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function recordPtSubscription() {
    if (!token || !activeOrgId || !selectedClientId || !session?.user.id) {
      setStatusMessage("Select a client first.");
      return;
    }
    setBusy("pt");
    try {
      await mobileApiFetch(`/orgs/${activeOrgId}/pt-subscriptions`, {
        method: "POST",
        token,
        orgId: activeOrgId,
        body: {
          memberUserId: selectedClientId,
          trainerUserId: session.user.id,
          amountPaise: 150000,
          paymentMode: "CASH",
          totalSessions: 12,
          notes: "Recorded from the mobile trainer surface."
        }
      });
      setStatusMessage("Offline PT subscription recorded.");
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function sendAssignedNotification() {
    if (!token || !activeOrgId) {
      return;
    }
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
          audience: "assigned_clients",
          selectedUserIds: [],
          pushEnabled: false,
          excludeMinors: false
        }
      });
      setStatusMessage("Assigned-client notification sent.");
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen title="Trainer">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Card>
          <Pill tone="lime">Backend AI + assigned-client scope</Pill>
          <Text style={styles.title} selectable>
            {session?.user.name ?? "Trainer"}
          </Text>
          <Text style={styles.body} selectable>
            Publish workout and nutrition guidance only to assigned clients unless the owner grants broader permission.
          </Text>
          <Text style={styles.body} selectable>
            {clientsQuery.isLoading ? "Loading assigned clients..." : `${clients.length} assigned clients in the current organization.`}
          </Text>
        </Card>

        <Card>
          <Text style={styles.title} selectable>
            Assigned clients
          </Text>
          <View style={styles.clientList}>
            {clients.map((client) => {
              const selected = selectedClientId === client.memberUserId;
              return (
                <Pressable
                  key={client.memberUserId}
                  onPress={() => setSelectedClientId(client.memberUserId)}
                  style={[styles.clientCard, selected ? styles.clientCardSelected : undefined]}
                >
                  <Text style={styles.clientName}>{client.user?.name ?? client.user?.email ?? client.memberUserId}</Text>
                  <Text style={styles.clientMeta}>{client.profile?.fitnessGoal ?? "General fitness"}</Text>
                </Pressable>
              );
            })}
            {!clients.length && !clientsQuery.isLoading ? (
              <Text style={styles.body}>No assigned clients yet.</Text>
            ) : null}
          </View>
        </Card>

        <Card>
          <Text style={styles.title} selectable>
            AI plan draft
          </Text>
          <TextInput
            value={planTitle}
            onChangeText={setPlanTitle}
            style={styles.input}
            placeholder="Draft title"
            placeholderTextColor={colors.muted}
          />
          <TextInput
            value={planPrompt}
            onChangeText={setPlanPrompt}
            style={[styles.input, styles.notesInput]}
            multiline
            placeholder="Describe the workout or diet draft you want"
            placeholderTextColor={colors.muted}
          />
          <PrimaryButton onPress={() => void generateDraft()}>
            {busy === "draft" ? "Generating..." : "Generate AI draft"}
          </PrimaryButton>
          <View style={styles.actionGap} />
          <PrimaryButton onPress={() => void assignDraft()}>
            {busy === "assign" ? "Assigning..." : "Assign latest draft"}
          </PrimaryButton>
        </Card>

        <Card>
          <Text style={styles.title} selectable>
            PT and messaging
          </Text>
          <PrimaryButton onPress={() => void recordPtSubscription()}>
            {busy === "pt" ? "Recording..." : "Record offline PT pack"}
          </PrimaryButton>
          <TextInput
            value={messageDraft}
            onChangeText={setMessageDraft}
            style={[styles.input, styles.notesInput]}
            multiline
            placeholder="Assigned-client notification"
            placeholderTextColor={colors.muted}
          />
          <PrimaryButton onPress={() => void sendAssignedNotification()}>
            {busy === "notify" ? "Sending..." : "Send to assigned clients"}
          </PrimaryButton>
        </Card>

        <Card>
          <Text style={styles.status} selectable>
            {statusMessage}
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 8 },
  body: { color: colors.muted, lineHeight: 20, marginVertical: 12 },
  clientList: { gap: 10, marginTop: 14 },
  clientCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 14
  },
  clientCardSelected: {
    borderColor: "rgba(185,244,85,0.35)"
  },
  clientName: { color: colors.text, fontWeight: "800" },
  clientMeta: { color: colors.muted, marginTop: 6, fontSize: 12 },
  input: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  notesInput: { minHeight: 120, paddingTop: 14 },
  actionGap: { height: 12 },
  status: { color: colors.text, lineHeight: 20 }
});

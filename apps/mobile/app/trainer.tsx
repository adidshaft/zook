import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  GlassInput,
  LoadingState,
  MetricTile,
  Pill,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SectionHeader,
  SecondaryButton,
} from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { useAuth, getApiErrorMessage } from "@/lib/auth";
import { useTrainerClients } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

export default function Trainer() {
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const clientsQuery = useTrainerClients();
  const clients = clientsQuery.data?.clients ?? [];
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [planTitle, setPlanTitle] = useState("3-Day Strength Reset");
  const [planPrompt, setPlanPrompt] = useState(
    "Create a safe 3-day strength plan for a beginner gym member.",
  );
  const [messageDraft, setMessageDraft] = useState(
    "Plan update: open Zook to review your latest workout draft.",
  );
  const [latestPlanId, setLatestPlanId] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState(
    "Generate an AI draft, assign it to a client, then send a scoped message.",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const selectedClient =
    clients.find((client) => client.memberUserId === selectedClientId) ?? clients[0] ?? null;
  const activeClientId = selectedClient?.memberUserId ?? selectedClientId;

  async function generateDraft() {
    if (!token || !activeOrgId) {
      return;
    }
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
            prompt: planPrompt,
            persistDraft: true,
          },
        },
      );
      setLatestPlanId(result.createdPlan?.id);
      setStatusMessage(
        result.createdPlan
          ? `Draft ready: ${result.createdPlan.title}`
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
          assignedToUserId: activeClientId,
          audience: "selected_member",
        },
      });
      setStatusMessage("Draft assigned to the selected client.");
      await queryClient.invalidateQueries({
        queryKey: ["org", activeOrgId, "trainer", session?.user.id, "clients"],
      });
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function recordPtSubscription() {
    if (!token || !activeOrgId || !activeClientId || !session?.user.id) {
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
          memberUserId: activeClientId,
          trainerUserId: session.user.id,
          amountPaise: 150000,
          paymentMode: "CASH",
          totalSessions: 12,
          notes: "Recorded from the mobile trainer surface.",
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
          excludeMinors: false,
        },
      });
      setStatusMessage("Assigned-client notification sent.");
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Trainer desk"
          title={session?.user.name ?? "Trainer"}
          subtitle="Assigned clients, scoped AI drafting, PT recording, and member-safe messaging all live here."
          trailing={<Pill tone="lime">Assigned only</Pill>}
        />

        <View style={styles.metricGrid}>
          <MetricTile
            label="Assigned clients"
            value={String(clients.length)}
            detail={
              clientsQuery.isLoading
                ? "Loading roster..."
                : "Only your assigned members appear here."
            }
            tone="blue"
          />
          <MetricTile
            label="Selected member"
            value={selectedClient ? (selectedClient.user?.name ?? "Ready") : "None"}
            detail={
              selectedClient?.profile?.fitnessGoal ?? "Choose a client to tailor the plan draft."
            }
            tone={selectedClient ? "lime" : "amber"}
          />
          <MetricTile
            label="Latest draft"
            value={latestPlanId ? "Ready" : "Not started"}
            detail={
              latestPlanId
                ? "You can assign the newest AI draft now."
                : "Generate a workout draft to continue."
            }
            tone={latestPlanId ? "lime" : "neutral"}
          />
          <MetricTile
            label="PT pack"
            value="₹1,500"
            detail="12 sessions recorded as a quick offline package."
            tone="amber"
          />
        </View>

        <SectionHeader
          eyebrow="Roster"
          title="Assigned clients"
          subtitle="Pick a member, then keep every action scoped to that selection."
        />

        {clientsQuery.isLoading ? (
          <LoadingState
            title="Loading assigned clients"
            body="Syncing trainer assignments for the active organization."
          />
        ) : null}

        {!clientsQuery.isLoading && !clients.length ? (
          <EmptyState
            title="No assigned clients yet"
            body="Once members are assigned to you, they’ll appear here with their fitness goal and quick actions."
          />
        ) : null}

        <View style={styles.clientList}>
          {clients.map((client) => {
            const selected = client.memberUserId === activeClientId;
            return (
              <Pressable
                key={client.memberUserId}
                onPress={() => setSelectedClientId(client.memberUserId)}
                style={[styles.clientCard, selected ? styles.clientCardSelected : null]}
              >
                <View style={styles.clientHeader}>
                  <View style={styles.clientCopy}>
                    <Text style={styles.clientName}>
                      {client.user?.name ?? client.user?.email ?? client.memberUserId}
                    </Text>
                    <Text style={styles.clientMeta}>
                      {client.user?.email ?? "No member email available"}
                    </Text>
                  </View>
                  <Pill tone={selected ? "lime" : "neutral"}>
                    {selected ? "Selected" : "Choose"}
                  </Pill>
                </View>
                <Text style={styles.clientGoal}>
                  {client.profile?.fitnessGoal ?? "General fitness"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedClient ? (
          <Card style={styles.selectedCard}>
            <Text style={styles.sectionTitle} selectable>
              Client spotlight
            </Text>
            <Text style={styles.sectionBody} selectable>
              {selectedClient.user?.name ?? "This client"} is set for{" "}
              {selectedClient.profile?.fitnessGoal ?? "general fitness"}. Generate a plan draft,
              assign it, then follow up with a scoped message.
            </Text>
            <View style={styles.quickActions}>
              <SecondaryButton
                onPress={() => void recordPtSubscription()}
                style={styles.quickAction}
              >
                {busy === "pt" ? "Recording..." : "Record PT pack"}
              </SecondaryButton>
              <SecondaryButton onPress={() => void assignDraft()} style={styles.quickAction}>
                {busy === "assign" ? "Assigning..." : "Assign latest draft"}
              </SecondaryButton>
            </View>
          </Card>
        ) : null}

        <SectionHeader
          eyebrow="AI workflow"
          title="Plan draft studio"
          subtitle="Create a safe draft first, then assign it only to the selected client."
        />

        <Card style={styles.formCard}>
          <GlassInput
            label="Draft title"
            value={planTitle}
            onChangeText={setPlanTitle}
            placeholder="3-Day Strength Reset"
          />
          <GlassInput
            label="Prompt"
            value={planPrompt}
            onChangeText={setPlanPrompt}
            multiline
            placeholder="Describe the workout or diet draft you want"
          />
          <View style={styles.quickActions}>
            <PrimaryButton onPress={() => void generateDraft()} style={styles.quickAction}>
              {busy === "draft" ? "Generating..." : "Generate AI draft"}
            </PrimaryButton>
            <SecondaryButton onPress={() => void assignDraft()} style={styles.quickAction}>
              {busy === "assign" ? "Assigning..." : "Assign latest draft"}
            </SecondaryButton>
          </View>
        </Card>

        <SectionHeader
          eyebrow="Messaging"
          title="PT and follow-up"
          subtitle="Keep the message scoped to assigned clients and log offline PT packs directly from mobile."
        />

        <Card style={styles.formCard}>
          <GlassInput
            label="Assigned-client update"
            value={messageDraft}
            onChangeText={setMessageDraft}
            multiline
            placeholder="Assigned-client notification"
          />
          <View style={styles.quickActions}>
            <SecondaryButton onPress={() => void recordPtSubscription()} style={styles.quickAction}>
              {busy === "pt" ? "Recording..." : "Record offline PT"}
            </SecondaryButton>
            <PrimaryButton
              onPress={() => void sendAssignedNotification()}
              style={styles.quickAction}
            >
              {busy === "notify" ? "Sending..." : "Send update"}
            </PrimaryButton>
          </View>
        </Card>

        <Card>
          <Text style={styles.statusTitle} selectable>
            Live status
          </Text>
          <Text style={styles.statusMessage} selectable>
            {statusMessage}
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  clientList: {
    gap: 12,
  },
  clientCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 16,
    gap: 10,
  },
  clientCardSelected: {
    borderColor: "rgba(185,244,85,0.32)",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  clientHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  clientCopy: {
    flex: 1,
    gap: 6,
  },
  clientName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  clientMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  clientGoal: {
    color: colors.muted,
    lineHeight: 20,
  },
  selectedCard: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  sectionBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  quickActions: {
    flexDirection: "row",
    gap: 10,
  },
  quickAction: {
    flex: 1,
  },
  formCard: {
    gap: 14,
  },
  statusTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  statusMessage: {
    color: colors.muted,
    marginTop: 8,
    lineHeight: 21,
  },
});

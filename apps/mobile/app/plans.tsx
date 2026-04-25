import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Dock, GlassInput, Pill, PrimaryButton, Screen } from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { useAuth, getApiErrorMessage } from "@/lib/auth";
import { useMyPlans } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

type AssignedPlan = {
  id: string;
  audience?: string;
  plan?: {
    id: string;
    title?: string;
    description?: string | null;
    type?: string;
    status?: string;
  } | null;
  progress?: {
    completionPct?: number;
    feedback?: string | null;
  } | null;
};

export default function Plans() {
  const routeParams = useLocalSearchParams<{
    assignmentId?: string;
    focus?: string;
    notificationId?: string;
    planId?: string;
  }>();
  const { activeOrgId, token } = useAuth();
  const queryClient = useQueryClient();
  const plansQuery = useMyPlans();
  const plans = (plansQuery.data?.plans ?? []) as AssignedPlan[];
  const sortedPlans = [...plans].sort((left, right) => {
    if (left.id === routeParams.assignmentId) {
      return -1;
    }
    if (right.id === routeParams.assignmentId) {
      return 1;
    }
    return 0;
  });
  const [assistantPrompt, setAssistantPrompt] = useState("How should I approach today's assigned workout?");
  const [assistantReply, setAssistantReply] = useState("Ask a backend AI question about your assigned plan.");
  const [busyAssignmentId, setBusyAssignmentId] = useState<string | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);

  async function updateProgress(assignmentId: string, currentCompletionPct = 0) {
    if (!token) {
      return;
    }
    setBusyAssignmentId(assignmentId);
    try {
      const nextCompletion = Math.min(currentCompletionPct + 20, 100);
      await mobileApiFetch(`/me/plans/${assignmentId}/progress`, {
        method: "POST",
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        body: {
          ...(activeOrgId ? { orgId: activeOrgId } : {}),
          completionPct: nextCompletion,
          progressJson: { lastMarkedAt: new Date().toISOString(), source: "mobile_plan_screen" }
        }
      });
      setAssistantReply(nextCompletion === 100 ? "Nice. That assignment is now marked complete." : `Progress updated to ${nextCompletion}%.`);
      await queryClient.invalidateQueries({ queryKey: ["me", "plans"] });
    } catch (error) {
      setAssistantReply(getApiErrorMessage(error));
    } finally {
      setBusyAssignmentId(null);
    }
  }

  async function askAssistant() {
    if (!token) {
      return;
    }
    setAssistantLoading(true);
    try {
      const result = await mobileApiFetch<{ response: string | Record<string, unknown> }>("/ai/chat", {
        method: "POST",
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        body: cleanOrgBody(activeOrgId, { prompt: assistantPrompt })
      });
      setAssistantReply(typeof result.response === "string" ? result.response : JSON.stringify(result.response));
    } catch (error) {
      setAssistantReply(getApiErrorMessage(error));
    } finally {
      setAssistantLoading(false);
    }
  }

  return (
    <Screen title="Plans">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {routeParams.focus ? (
          <Card style={styles.calloutCard}>
            <Pill tone={routeParams.focus === "pt-update" ? "amber" : "blue"}>
              {routeParams.focus === "pt-update" ? "PT update" : "Opened from push"}
            </Pill>
            <Text style={styles.calloutTitle}>
              {routeParams.focus === "pt-update"
                ? "Personal training context landed in plans."
                : "Assigned plan context is active."}
            </Text>
            <Text style={styles.body}>
              {routeParams.assignmentId
                ? "Your plan has been updated."
                : "Check your assigned plans below."}
            </Text>
          </Card>
        ) : null}
        {plansQuery.isLoading ? (
          <Card>
            <Text style={styles.body}>Loading assigned plans...</Text>
          </Card>
        ) : null}
        {!plansQuery.isLoading && !plans.length ? (
          <Card>
            <Text style={styles.body}>No plans have been assigned yet.</Text>
          </Card>
        ) : null}
        {sortedPlans.map((assignment) => {
          const completion = assignment.progress?.completionPct ?? 0;
          return (
            <Card
              key={assignment.id}
              style={assignment.id === routeParams.assignmentId ? styles.cardHighlighted : undefined}
            >
              <View style={styles.rowBetween}>
                <Pill tone={assignment.id === routeParams.assignmentId ? "blue" : "lime"}>
                  {assignment.id === routeParams.assignmentId
                    ? "Opened from notification"
                    : assignment.plan?.status ?? "Assigned"}
                </Pill>
                <Text style={styles.meta}>{completion}% complete</Text>
              </View>
              <Text style={styles.title}>
                {assignment.plan?.title ?? "Plan assignment"}
              </Text>
              <Text style={styles.body}>
                {assignment.plan?.description ?? `Audience: ${assignment.audience ?? "selected_member"}`}
              </Text>
              <Text style={styles.meta}>
                {assignment.plan?.type ?? "WORKOUT"}
              </Text>
              {assignment.progress?.feedback ? (
                <Text style={styles.feedback}>
                  Latest feedback: {assignment.progress.feedback}
                </Text>
              ) : null}
              <PrimaryButton onPress={() => void updateProgress(assignment.id, completion)}>
                {busyAssignmentId === assignment.id ? "Saving..." : completion >= 100 ? "Mark reviewed" : "Mark progress"}
              </PrimaryButton>
            </Card>
          );
        })}
        <Card>
          <Text style={styles.title}>
            AI plan assistant
          </Text>
          <Text style={styles.body}>
            Ask about your workout, recovery, or plan details.
          </Text>
          <GlassInput
            label="Your question"
            value={assistantPrompt}
            onChangeText={setAssistantPrompt}
            multiline
            placeholder="Ask about recovery, pacing, or workout sequencing"
          />
          <PrimaryButton onPress={() => void askAssistant()}>
            {assistantLoading ? "Thinking..." : "Ask about my plan"}
          </PrimaryButton>
          <Text style={styles.reply}>
            {assistantReply}
          </Text>
        </Card>

      <Dock />
    </Screen>
  );
}

function cleanOrgBody(orgId: string | undefined, body: Record<string, unknown>) {
  return orgId ? { ...body, orgId } : body;
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 120 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  calloutCard: {
    gap: 10
  },
  calloutTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  cardHighlighted: {
    borderColor: "rgba(96,165,250,0.4)",
    backgroundColor: "rgba(96,165,250,0.07)"
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 14 },
  body: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  meta: { color: colors.lime, marginTop: 10, fontSize: 12, fontWeight: "700" },
  feedback: { color: colors.text, lineHeight: 20, marginTop: 12 },
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
  notesInput: {
    minHeight: 120,
    paddingTop: 14
  },
  reply: {
    color: colors.text,
    marginTop: 14,
    lineHeight: 20
  }
});

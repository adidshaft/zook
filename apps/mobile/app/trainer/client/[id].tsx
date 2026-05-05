import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  AuditWarning,
  BottomNav,
  FormField,
  GlassCard,
  IconBubble,
  ListRow,
  MobileHeader,
  SecondaryButton,
  SegmentedControl,
  SectionHeader,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { plansApi } from "@/lib/domain-api";
import { useTrainerClients } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

type ClientTab = "summary" | "plans" | "progress" | "notes";

function planCountLabel(count: number) {
  return `${count} active ${count === 1 ? "plan" : "plans"}`;
}

const tabs: Array<{ label: string; value: ClientTab }> = [
  { label: "Summary", value: "summary" },
  { label: "Plans", value: "plans" },
  { label: "Progress", value: "progress" },
  { label: "Notes", value: "notes" },
];

export default function TrainerClientDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = id ?? "";
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const [tab, setTab] = useState<ClientTab>("summary");
  const [status, setStatus] = useState("");
  const [planTitle, setPlanTitle] = useState("Push Day Strength Block");
  const [savingPlan, setSavingPlan] = useState(false);
  const [savedPlan, setSavedPlan] = useState<{ id: string; title: string } | null>(null);
  const clientsQuery = useTrainerClients();
  const client =
    clientsQuery.data?.clients.find((candidate) => candidate.memberUserId === clientId) ?? null;
  const aiDraftHref = (
    client ? `/trainer/client/${client.memberUserId}/ai-draft` : "/trainer?view=clients"
  ) as Href;
  const clientName =
    client?.user?.name ?? (clientsQuery.isLoading ? "Loading client..." : "Client not found");
  const fitnessGoal =
    client?.summary?.fitnessGoal ?? client?.profile?.fitnessGoal ?? "General fitness";
  const activePlans = client?.summary?.activePlans ?? 0;
  const recentFeedback = client?.summary?.recentFeedback ?? [];
  const recentWorkouts = client?.summary?.recentWorkouts ?? [];

  function buildPlanPayload() {
    return {
      title: planTitle.trim() || `${clientName} workout plan`,
      type: "WORKOUT",
      description: `Trainer-created plan for ${clientName}. Goal: ${fitnessGoal}.`,
      visibility: "selected",
      aiGenerated: false,
      content: {
        goal: fitnessGoal,
        sections: [
          {
            title: "Workout focus",
            body: "Edit this draft with exercises, sets, recovery notes, and coaching cues before assignment.",
          },
        ],
        exercises: [],
      },
    };
  }

  async function saveDraft() {
    if (!token || !activeOrgId || !client) {
      setStatus("Select a client before saving.");
      return null;
    }
    setSavingPlan(true);
    setStatus("");
    try {
      const result = await plansApi.create<{ plan: { id: string; title: string } }>({
        token,
        orgId: activeOrgId,
        body: buildPlanPayload(),
      });
      setSavedPlan({ id: result.plan.id, title: result.plan.title });
      setStatus(`${result.plan.title} saved as a draft.`);
      return result.plan;
    } catch (error) {
      setStatus(getApiErrorMessage(error));
      return null;
    } finally {
      setSavingPlan(false);
    }
  }

  async function assignPlan() {
    if (!token || !activeOrgId || !client) {
      setStatus("Select a client before assigning.");
      return;
    }
    setSavingPlan(true);
    setStatus("");
    try {
      const plan =
        savedPlan && savedPlan.title === planTitle
          ? savedPlan
          : await plansApi
              .create<{ plan: { id: string; title: string } }>({
                token,
                orgId: activeOrgId,
                body: buildPlanPayload(),
              })
              .then((result) => result.plan);
      setSavedPlan({ id: plan.id, title: plan.title });
      await plansApi.assign({
        token,
        orgId: activeOrgId,
        planId: plan.id,
        assignedToUserId: client.memberUserId,
        audience: "selected_member",
      });
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "trainer"] });
      await queryClient.invalidateQueries({ queryKey: ["me", "notifications"] });
      setStatus(`${plan.title} assigned. ${clientName} can now see it.`);
    } catch (error) {
      setStatus(getApiErrorMessage(error));
    } finally {
      setSavingPlan(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            title={clientName}
            subtitle="Client Detail"
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/trainer"))}
                accessibilityRole="button"
                accessibilityLabel="Back to trainer"
                style={styles.iconButton}
              >
                <Text style={styles.backIcon}>‹</Text>
              </Pressable>
            }
            chip={<StatusChip status="Trainer" tone="neutral" />}
          />

          <GlassCard variant="compact" contentStyle={styles.snapshotContent}>
            <SectionHeader
              title="Coaching snapshot"
              subtitle="Goal, plan load, and access before plan work."
            />
            <ListRow
              title="Goal"
              subtitle={fitnessGoal}
              leading={<IconBubble icon="flag-outline" tone="lime" />}
              trailing={<StatusChip status={client?.active ? "Active" : "Paused"} />}
            />
            <ListRow
              title="Plan load"
              subtitle={`${activePlans} active ${activePlans === 1 ? "plan" : "plans"}`}
              leading={<IconBubble icon="reader-outline" tone={activePlans ? "blue" : "neutral"} />}
              trailing={
                <StatusChip
                  status={activePlans ? "Review" : "Create"}
                  tone={activePlans ? "amber" : "neutral"}
                />
              }
            />
            <ListRow
              title="Access"
              subtitle="Visible to assigned trainers and gym admins."
              leading={<IconBubble icon="lock-closed-outline" tone="neutral" />}
              trailing={<StatusChip status="Private" tone="neutral" />}
            />
          </GlassCard>

          <View style={styles.actionRow}>
            <ZookButton
              onPress={() => setTab("plans")}
              disabled={!client}
              style={styles.actionHalf}
              icon="add-circle-outline"
            >
              Create Plan
            </ZookButton>
            <ZookButton
              href={aiDraftHref}
              disabled={!client}
              tone="secondary"
              style={styles.actionHalf}
              icon="sparkles-outline"
            >
              Generate Draft
            </ZookButton>
          </View>

          <SegmentedControl options={tabs} value={tab} onChange={setTab} />

          {tab === "summary" ? (
            <GlassCard variant="compact" contentStyle={styles.stack}>
              <ListRow
                title="Fitness goal"
                subtitle={fitnessGoal}
                trailing={<StatusChip status={client?.active ? "Active" : "Paused"} />}
              />
              <ListRow
                title="Diet note"
                subtitle={client?.summary?.dietPreference ?? "Not shared"}
                trailing={<StatusChip status="Visible" tone="neutral" />}
              />
              <ListRow
                title="Allergy note"
                subtitle={client?.summary?.allergies ?? "None added"}
                trailing={<StatusChip status="Clear" tone="neutral" />}
              />
              <ListRow
                title="Body progress"
                subtitle={
                  client?.summary?.weightKg ? `${client.summary.weightKg} kg` : "No recent entry"
                }
                trailing={<StatusChip status="Tracking" tone="neutral" />}
              />
              <ListRow
                title="Recent progress"
                subtitle={planCountLabel(activePlans)}
                trailing={<StatusChip status="Review" tone="amber" />}
              />
            </GlassCard>
          ) : null}

          {tab === "plans" ? (
            <GlassCard contentStyle={styles.stack}>
              <SectionHeader
                title="Plan builder"
                subtitle="Create a trainer-owned draft before assigning."
              />
              <FormField label="Plan title" value={planTitle} onChangeText={setPlanTitle} />
              <View style={styles.chipRow}>
                {["Workout", "Diet", "Routine", "Trainer Note", "Machine Guide", "Recovery"].map(
                  (label) => (
                    <StatusChip
                      key={label}
                      status={label}
                      tone={label === "Workout" ? "lime" : "neutral"}
                    />
                  ),
                )}
              </View>
              <ZookButton
                onPress={() => void saveDraft()}
                icon="save-outline"
                disabled={savingPlan}
              >
                Save Draft
              </ZookButton>
              <SecondaryButton onPress={() => void assignPlan()} disabled={savingPlan}>
                Assign Plan
              </SecondaryButton>
            </GlassCard>
          ) : null}

          {tab === "progress" ? (
            <GlassCard variant="compact" contentStyle={styles.stack}>
              {recentFeedback.length ? (
                recentFeedback.map((entry) => (
                  <ListRow
                    key={`${entry.assignmentId}-${entry.updatedAt ?? "feedback"}`}
                    title={entry.feedback ? "Plan feedback" : "Plan progress"}
                    subtitle={entry.feedback ?? `${entry.completionPct}% complete`}
                    trailing={<StatusChip status={`${entry.completionPct}%`} tone="lime" />}
                  />
                ))
              ) : (
                <ListRow
                  title="Plan feedback"
                  subtitle="No member feedback yet."
                  trailing={<StatusChip status="Waiting" tone="neutral" />}
                />
              )}
              {recentWorkouts.map((workout) => (
                <ListRow
                  key={workout.id}
                  title={workout.title}
                  subtitle={[
                    workout.workoutType,
                    workout.durationMinutes ? `${workout.durationMinutes} min` : null,
                    workout.notes,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  trailing={<StatusChip status="Logged" tone="blue" />}
                />
              ))}
              <ListRow
                title="Plans"
                subtitle={`${activePlans} active for client`}
                trailing={<StatusChip status="Active" tone="lime" />}
              />
            </GlassCard>
          ) : null}

          {tab === "notes" ? (
            <GlassCard contentStyle={styles.stack}>
              <FormField
                label="Trainer note"
                multiline
                placeholder="Add coaching note for your own follow-up..."
              />
              <AuditWarning>
                Only assigned trainers and owners/admins can see trainer notes.
              </AuditWarning>
            </GlassCard>
          ) : null}

          <GlassCard variant="warning" contentStyle={styles.draftPromptContent}>
            <View style={styles.attentionHeader}>
              <IconBubble icon="reader-outline" tone="amber" />
              <View style={styles.clientCopy}>
                <Text style={styles.cardTitle}>Draft review</Text>
                <Text style={styles.cardBody}>
                  Generated plans require edits and approval before assigning.
                </Text>
              </View>
            </View>
            <Link href={aiDraftHref} asChild>
              <Pressable accessibilityRole="link">
                <StatusChip status="Open review" tone="amber" icon="chevron-forward" />
              </Pressable>
            </Link>
          </GlassCard>

          {status ? (
            <GlassCard variant="success" contentStyle={styles.statusContent}>
              <Text style={styles.statusText}>{status}</Text>
            </GlassCard>
          ) : null}
        </ScrollView>
        <BottomNav selectedPath="/trainer/client" role="TRAINER" />
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 8,
    gap: 12,
    paddingBottom: layout.bottomNavContentPadding + 32,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 28,
  },
  clientContent: {
    gap: 14,
  },
  snapshotContent: {
    gap: 10,
  },
  clientTop: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  clientCopy: {
    flex: 1,
    gap: 4,
  },
  clientName: {
    color: colors.text,
    ...typography.headerTitle,
  },
  cardTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  cardBody: {
    color: colors.muted,
    ...typography.body,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionHalf: {
    flex: 1,
  },
  stack: {
    gap: 10,
  },
  attentionHeader: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  draftPromptContent: {
    gap: 12,
  },
  statusContent: {
    padding: 14,
  },
  statusText: {
    color: colors.lime,
    ...typography.bodyStrong,
  },
});

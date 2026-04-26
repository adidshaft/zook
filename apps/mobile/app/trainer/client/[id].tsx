import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { zookDemoFixtures, zookMockServices } from "@zook/core";
import {
  ActiveGymPill,
  AuditWarning,
  Card,
  Dock,
  FormField,
  IconBubble,
  ListRow,
  Pill,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SegmentedControl,
  SectionHeader,
} from "@/components/primitives";
import { colors } from "@/lib/theme";

type ClientTab = "summary" | "plans" | "progress" | "notes";
type Draft = Awaited<ReturnType<typeof zookMockServices.planService.generateAiPlanDraft>>;

const tabs: Array<{ label: string; value: ClientTab }> = [
  { label: "Summary", value: "summary" },
  { label: "Plans", value: "plans" },
  { label: "Progress", value: "progress" },
  { label: "Notes", value: "notes" },
];

export default function TrainerClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = id || "user-aarav";
  const [tab, setTab] = useState<ClientTab>("summary");
  const [draft, setDraft] = useState<Draft | null>(zookDemoFixtures.planDrafts[0] ?? null);
  const [status, setStatus] = useState("");
  const [planTitle, setPlanTitle] = useState("4-week Push/Pull Routine");
  const client = zookDemoFixtures.users.find((user) => user.id === clientId) ?? zookDemoFixtures.users.find((user) => user.id === "user-aarav");
  const profile = zookDemoFixtures.memberProfiles.find((item) => item.userId === client?.id);
  const membership = zookDemoFixtures.memberships.find((item) => item.memberUserId === client?.id);
  const ptPack = zookDemoFixtures.ptPacks.find((item) => item.memberUserId === client?.id);
  const plans = zookMockServices.state.trainingPlans.filter((plan) => plan.memberUserId === client?.id);

  async function generateDraft() {
    const nextDraft = await zookMockServices.planService.generateAiPlanDraft({
      trainerUserId: "user-rhea",
      clientId: client?.id ?? "user-aarav",
      goal: profile?.goal ?? "Muscle gain",
    });
    setDraft(nextDraft);
    setStatus("AI draft created. It is not visible to the client yet.");
  }

  async function assignDraft() {
    if (!draft || !client) return;
    const plan = await zookMockServices.planService.assignDraft(draft.id, client.id);
    setStatus(`${plan.title} assigned. Member notification generated.`);
  }

  function discardDraft() {
    setDraft(null);
    setStatus("Draft discarded before assignment.");
  }

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <ActiveGymPill label="Iron Temple Gym · Pune" />
            <Text style={styles.title}>Client Detail</Text>
            <Text style={styles.subtitle}>You're viewing your assigned client only.</Text>
          </View>
          <Pill tone="blue">Trainer</Pill>
        </View>

        <Card style={styles.clientCard}>
          <View style={styles.clientTop}>
            <IconBubble icon="person-outline" tone="lime" size={54} />
            <View style={styles.clientCopy}>
              <Text style={styles.clientName}>{client?.name ?? "Aarav Mehta"}</Text>
              <Text style={styles.cardBody}>Active member · Goal: {profile?.goal ?? "Muscle gain"}</Text>
            </View>
          </View>
          <View style={styles.chipRow}>
            <Pill tone="lime">PT Pack: {ptPack?.sessionsLeft ?? 6} sessions left</Pill>
            <Pill tone={profile?.trainerVisibleTracking ? "lime" : "amber"}>
              Tracking: {profile?.trainerVisibleTracking ? "Opted in" : "Private"}
            </Pill>
          </View>
        </Card>

        <SegmentedControl options={tabs} value={tab} onChange={setTab} />

        {tab === "summary" ? (
          <Card style={styles.stack}>
            <ListRow title="Fitness goal" subtitle={profile?.goal ?? "Muscle gain"} trailing={<Pill tone="lime">Active</Pill>} />
            <ListRow title="Diet note" subtitle={profile?.dietPreference ?? "Vegetarian"} trailing={<Pill tone="blue">Visible</Pill>} />
            <ListRow title="Allergy note" subtitle={profile?.allergyNote ?? "None added"} trailing={<Pill tone="neutral">Clear</Pill>} />
            <ListRow title="Last check-in" subtitle={`Today ${membership?.lastCheckInLabel ?? "7:14 AM"}`} trailing={<Pill tone="lime">Checked in</Pill>} />
            <ListRow title="Recent progress" subtitle="2 workouts completed this week" trailing={<Pill tone="amber">Review</Pill>} />
          </Card>
        ) : null}

        {tab === "plans" ? (
          <Card style={styles.stack}>
            <SectionHeader title="Plan Builder" subtitle="Create, save, and assign plans to this client." />
            <FormField label="Plan title" value={planTitle} onChangeText={setPlanTitle} />
            <View style={styles.chipRow}>
              {["Workout", "Diet", "Routine", "Transformation", "Trainer Note", "Advisory", "Machine Guide", "Recovery"].map((label) => (
                <Pill key={label} tone={label === "Workout" ? "lime" : "neutral"}>{label}</Pill>
              ))}
            </View>
            <PrimaryButton onPress={() => setStatus(`${planTitle} saved as trainer draft.`)}>Save Draft</PrimaryButton>
            <SecondaryButton onPress={() => setStatus(`${planTitle} assigned and member notified.`)}>Assign Plan</SecondaryButton>
          </Card>
        ) : null}

        {tab === "progress" ? (
          <Card style={styles.stack}>
            <ListRow title="Weekly workouts" subtitle="2 completed this week" trailing={<Pill tone="lime">40%</Pill>} />
            <ListRow title="Last check-in" subtitle="Today 7:14 AM · Default Branch" trailing={<Pill tone="blue">QR</Pill>} />
            <ListRow title="Assigned plans" subtitle={`${plans.filter((plan) => plan.visibleToMember).length} visible to client`} trailing={<Pill tone="lime">Scoped</Pill>} />
          </Card>
        ) : null}

        {tab === "notes" ? (
          <Card style={styles.stack}>
            <FormField label="Trainer note" multiline placeholder="Add coaching note for your own follow-up..." />
            <AuditWarning>Only assigned trainers and owners/admins can see trainer notes.</AuditWarning>
          </Card>
        ) : null}

        <SectionHeader title="AI Draft Review" subtitle="Drafts require trainer review before assignment." />
        {draft ? (
          <Card style={styles.draftCard}>
            <View style={styles.draftHeader}>
              <View>
                <Text style={styles.cardEyebrow}>Review required</Text>
                <Text style={styles.cardTitle}>{draft.title}</Text>
              </View>
              <Pill tone="amber">Hidden</Pill>
            </View>
            <Text style={styles.cardBody}>Client: {client?.name ?? "Aarav Mehta"} · Goal: {draft.goal} · Difficulty: {draft.difficulty}</Text>
            <AuditWarning>AI generated this draft. Edit and approve before assigning.</AuditWarning>
            <View style={styles.stack}>
              {draft.sections.map((section) => (
                <ListRow key={section.title} title={section.title} subtitle={section.body} />
              ))}
            </View>
            <Card style={styles.safetyPanel}>
              <Text style={styles.cardTitle}>Safety panel</Text>
              <ListRow title="Blocked content" subtitle={draft.safety.blockedContent} trailing={<Pill tone="lime">Clear</Pill>} />
              <ListRow title="Medical-risk check" subtitle={draft.safety.medicalRisk} trailing={<Pill tone="lime">Clear</Pill>} />
              <ListRow title="Trainer approval" subtitle={draft.safety.trainerApproval} trailing={<Pill tone="amber">Required</Pill>} />
              <Text style={styles.cardBody}>This draft is not visible to the client yet.</Text>
            </Card>
            <View style={styles.actionRow}>
              <PrimaryButton onPress={() => void assignDraft()} style={styles.actionHalf}>Assign Plan</PrimaryButton>
              <SecondaryButton onPress={() => setStatus("Draft opened for editing.")} style={styles.actionHalf}>Edit Draft</SecondaryButton>
            </View>
            <SecondaryButton onPress={discardDraft}>Discard</SecondaryButton>
          </Card>
        ) : (
          <Card style={styles.stack}>
            <Text style={styles.cardBody}>No active draft. Generate a new AI draft for trainer review.</Text>
            <PrimaryButton onPress={() => void generateDraft()}>Generate AI Draft</PrimaryButton>
          </Card>
        )}

        {status ? (
          <Card>
            <Text style={styles.statusText}>{status}</Text>
          </Card>
        ) : null}
      </ScrollView>
      <Dock />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 22,
  },
  clientCard: {
    gap: 14,
  },
  clientTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  clientCopy: {
    flex: 1,
    gap: 5,
  },
  clientName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stack: {
    gap: 12,
  },
  draftCard: {
    gap: 14,
    borderColor: "rgba(245,200,75,0.24)",
    backgroundColor: "rgba(245,200,75,0.08)",
  },
  draftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cardEyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  cardBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  safetyPanel: {
    gap: 10,
    backgroundColor: "rgba(7,9,8,0.36)",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionHalf: {
    flex: 1,
  },
  statusText: {
    color: colors.lime,
    lineHeight: 21,
    fontWeight: "800",
  },
});

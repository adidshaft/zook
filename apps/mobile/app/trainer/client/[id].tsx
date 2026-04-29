import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
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
import { useTrainerClients } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

type ClientTab = "summary" | "plans" | "progress" | "notes";

const tabs: Array<{ label: string; value: ClientTab }> = [
  { label: "Summary", value: "summary" },
  { label: "Plans", value: "plans" },
  { label: "Progress", value: "progress" },
  { label: "Notes", value: "notes" },
];

export default function TrainerClientDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = id || "user-aarav";
  const [tab, setTab] = useState<ClientTab>("summary");
  const [status, setStatus] = useState("");
  const [planTitle, setPlanTitle] = useState("Push Day Strength Block");
  const clientsQuery = useTrainerClients();
  const client = clientsQuery.data?.clients.find((candidate) => candidate.memberUserId === clientId) ?? null;
  const aiDraftHref = `/trainer/client/${client?.memberUserId ?? clientId}/ai-draft` as Href;
  const clientName = client?.user?.name ?? "Assigned client";
  const fitnessGoal = client?.summary?.fitnessGoal ?? client?.profile?.fitnessGoal ?? "General fitness";
  const activePlans = client?.summary?.activePlans ?? 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            title="Client Detail"
            subtitle="You’re viewing your assigned client only."
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace("/trainer")}
                accessibilityRole="button"
                accessibilityLabel="Back to trainer"
                style={styles.iconButton}
              >
                <Text style={styles.backIcon}>‹</Text>
              </Pressable>
            }
            chip={<StatusChip status="Trainer" tone="neutral" />}
          />

          <GlassCard contentStyle={styles.clientContent}>
            <View style={styles.clientTop}>
              <IconBubble icon="person-outline" tone="lime" size={54} />
              <View style={styles.clientCopy}>
                <Text style={styles.clientName}>{clientName}</Text>
                <Text style={styles.cardBody}>Assigned member · Goal: {fitnessGoal}</Text>
              </View>
            </View>
            <View style={styles.chipRow}>
              <StatusChip status={`Active plans: ${activePlans}`} tone={activePlans ? "lime" : "neutral"} />
              <StatusChip status="Trainer scoped" tone="lime" />
            </View>
          </GlassCard>

          <View style={styles.actionRow}>
            <ZookButton onPress={() => setTab("plans")} style={styles.actionHalf} icon="add-circle-outline">
              Create Plan
            </ZookButton>
            <ZookButton href={aiDraftHref} tone="secondary" style={styles.actionHalf} icon="sparkles-outline">
              Generate AI Draft
            </ZookButton>
          </View>

          <SegmentedControl options={tabs} value={tab} onChange={setTab} />

          {tab === "summary" ? (
            <GlassCard variant="compact" contentStyle={styles.stack}>
              <ListRow title="Fitness goal" subtitle={fitnessGoal} trailing={<StatusChip status={client?.active ? "Active" : "Assigned"} />} />
              <ListRow title="Diet note" subtitle={client?.summary?.dietPreference ?? "Not shared"} trailing={<StatusChip status="Visible" tone="neutral" />} />
              <ListRow title="Allergy note" subtitle={client?.summary?.allergies ?? "None added"} trailing={<StatusChip status="Clear" tone="neutral" />} />
              <ListRow title="Body progress" subtitle={client?.summary?.weightKg ? `${client.summary.weightKg} kg` : "No recent entry"} trailing={<StatusChip status="Tracking" tone="neutral" />} />
              <ListRow title="Recent progress" subtitle={`${activePlans} active assigned plans`} trailing={<StatusChip status="Review" tone="amber" />} />
            </GlassCard>
          ) : null}

          {tab === "plans" ? (
            <GlassCard contentStyle={styles.stack}>
              <SectionHeader title="Plan builder" subtitle="Create a trainer-owned draft before assigning." />
              <FormField label="Plan title" value={planTitle} onChangeText={setPlanTitle} />
              <View style={styles.chipRow}>
                {["Workout", "Diet", "Routine", "Trainer Note", "Machine Guide", "Recovery"].map((label) => (
                  <StatusChip key={label} status={label} tone={label === "Workout" ? "lime" : "neutral"} />
                ))}
              </View>
              <ZookButton onPress={() => setStatus(`${planTitle} saved as trainer draft.`)} icon="save-outline">
                Save Draft
              </ZookButton>
              <SecondaryButton onPress={() => setStatus(`${planTitle} assigned and member notified.`)}>
                Assign Later
              </SecondaryButton>
            </GlassCard>
          ) : null}

          {tab === "progress" ? (
            <GlassCard variant="compact" contentStyle={styles.stack}>
              <ListRow title="Weekly workouts" subtitle="Use member tracking summary for details" trailing={<StatusChip status="Scoped" tone="neutral" />} />
              <ListRow title="Last check-in" subtitle="Available in owner/member view" trailing={<StatusChip status="QR" tone="neutral" />} />
              <ListRow title="Assigned plans" subtitle={`${activePlans} active for client`} trailing={<StatusChip status="Scoped" tone="lime" />} />
            </GlassCard>
          ) : null}

          {tab === "notes" ? (
            <GlassCard contentStyle={styles.stack}>
              <FormField label="Trainer note" multiline placeholder="Add coaching note for your own follow-up..." />
              <AuditWarning>Only assigned trainers and owners/admins can see trainer notes.</AuditWarning>
            </GlassCard>
          ) : null}

          <GlassCard variant="warning" contentStyle={styles.draftPromptContent}>
            <View style={styles.attentionHeader}>
              <IconBubble icon="reader-outline" tone="amber" />
              <View style={styles.clientCopy}>
                <Text style={styles.cardTitle}>AI draft review</Text>
                <Text style={styles.cardBody}>Generated plans require edits and approval before assigning.</Text>
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
    paddingTop: 14,
    gap: 14,
    paddingBottom: 128,
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

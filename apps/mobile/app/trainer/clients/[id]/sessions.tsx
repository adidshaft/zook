import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import {
  Card,
  IconBubble,
  ListRow,
  AppHeader,
  SegmentedControl,
  StatusChip,
  ZookScreen,
} from "@/components/primitives";
import {
  averageCompletionFor,
  clientDetailTabs,
  planCountLabel,
  progressTimelineFor,
  type ClientDetailTab,
} from "@/features/trainer/helpers";
import { useTrainerClients } from "@/lib/domains";
import { layout, useTheme } from "@/lib/theme";

export default function TrainerClientSessionsScreen() {
  const router = useRouter();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const { palette } = useTheme();
  const clientsQuery = useTrainerClients();
  const client = clientsQuery.data?.clients.find((candidate) => candidate.memberUserId === id) ?? null;
  const clientName = client?.user?.name ?? "Client";
  const activePlans = client?.summary?.activePlans ?? 0;
  const averageCompletion = averageCompletionFor(client);
  const progressTimeline = progressTimelineFor(client);

  function selectTab(tab: ClientDetailTab) {
    router.replace(`/trainer/clients/${id}${tab === "overview" ? "" : `/${tab}`}` as never);
  }

  return (
    <>
      <ZookScreen testID="trainer-client-sessions-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <AppHeader
            title="Client Detail"
            subtitle={clientName}
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/trainer/clients" as never))}
                accessibilityRole="button"
                accessibilityLabel="Back to clients"
                style={[styles.iconButton, { backgroundColor: palette.surface.raised, borderColor: palette.border.default }]}
              >
                <Text style={[styles.backIcon, { color: palette.text.primary }]}>‹</Text>
              </Pressable>
            }
            chip={<StatusChip status="Trainer" tone="neutral" />}
          />
          <SegmentedControl options={clientDetailTabs} value="sessions" onChange={selectTab} />
          <Card variant="compact" contentStyle={styles.stack}>
            <ListRow
              title="Adherence"
              subtitle={averageCompletion === null ? "Waiting for member feedback and workout logs." : `${averageCompletion}% average completion across recent plan feedback.`}
              leading={<IconBubble icon="analytics-outline" tone="lime" />}
              trailing={<StatusChip status={averageCompletion === null ? "Waiting" : `${averageCompletion}%`} tone={averageCompletion === null ? "neutral" : "lime"} />}
            />
            {progressTimeline.length ? (
              progressTimeline.map((entry) => (
                <ListRow key={entry.id} title={entry.title} subtitle={entry.body || "No details added."} trailing={<StatusChip status={entry.status} tone={entry.tone} />} />
              ))
            ) : (
              <ListRow title="Plan feedback" subtitle="No member feedback yet." trailing={<StatusChip status="Waiting" tone="neutral" />} />
            )}
            <ListRow title="Plans" subtitle={planCountLabel(activePlans)} trailing={<StatusChip status="Active" tone="lime" />} />
          </Card>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: 12, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding + 32, paddingTop: 8, width: "100%" },
  iconButton: { alignItems: "center", borderRadius: 16, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  backIcon: { fontSize: 26, lineHeight: 28 },
  stack: { gap: 10 },
});

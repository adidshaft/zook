import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Card,
  EmptyState,
  IconBubble,
  Pill,
  QueryErrorState,
  SectionHeader,
  ZookScreen,
} from "@/components/primitives";
import { useClassRoster, type ClassRosterEntry } from "@/lib/domains/trainer/queries";
import { gymBrandColor } from "@/lib/gym-brand";
import { formatTime } from "@/lib/formatting";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

function RosterRow({ entry }: { entry: ClassRosterEntry }) {
  const { palette } = useTheme();
  const name = entry.name ?? "Member";
  const brand = gymBrandColor(name);
  return (
    <Card variant="compact" contentStyle={styles.row}>
      <View style={[styles.avatar, { backgroundColor: brand.soft }]}>
        <Text style={[styles.avatarText, { color: brand.solid }]}>{brand.initial}</Text>
      </View>
      <Text style={[styles.name, { color: palette.text.primary }]} numberOfLines={1}>
        {name}
      </Text>
      <Pill tone={entry.status === "waitlisted" ? "amber" : "lime"}>
        {entry.status === "waitlisted" ? "Waitlist" : "Confirmed"}
      </Pill>
    </Card>
  );
}

export default function ClassRosterRoute() {
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ classId?: string; name?: string }>();
  const classId = typeof params.classId === "string" ? params.classId : undefined;
  const rosterQuery = useClassRoster(classId);
  const [refreshing, setRefreshing] = useState(false);

  const data = rosterQuery.data;
  const roster = data?.roster ?? [];
  const confirmed = roster.filter((entry) => entry.status === "confirmed");
  const waitlisted = roster.filter((entry) => entry.status === "waitlisted");
  const title = data?.class.name ?? params.name ?? "Class roster";

  async function refresh() {
    setRefreshing(true);
    await rosterQuery.refetch();
    setRefreshing(false);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="class-roster-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.accent.base} colors={[palette.accent.base]} />}
        >
          <AppHeader
            title={String(title)}
            subtitle={
              data?.class
                ? `${formatTime(data.class.startTime)} · ${confirmed.length}/${data.class.maxCapacity} booked`
                : "Who's coming to this class"
            }
            showProfileShortcut={false}
            showBack
          />

          {rosterQuery.isError ? (
            <QueryErrorState error={rosterQuery.error} onRetry={() => void rosterQuery.refetch()} />
          ) : null}

          {!rosterQuery.isLoading && roster.length === 0 ? (
            <Card variant="compact">
              <EmptyState icon="people-outline" title="No bookings yet" body="Members who book this class will show up here." />
            </Card>
          ) : null}

          {confirmed.length ? (
            <>
              <SectionHeader title={`Confirmed (${confirmed.length})`} />
              <View style={styles.stack}>
                {confirmed.map((entry) => (
                  <RosterRow key={entry.memberId} entry={entry} />
                ))}
              </View>
            </>
          ) : null}

          {waitlisted.length ? (
            <>
              <SectionHeader title={`Waitlist (${waitlisted.length})`} />
              <View style={styles.stack}>
                {waitlisted.map((entry) => (
                  <RosterRow key={entry.memberId} entry={entry} />
                ))}
              </View>
            </>
          ) : null}

          {!rosterQuery.isLoading && roster.length ? (
            <Card variant="compact" contentStyle={styles.hintRow}>
              <IconBubble icon="information-circle-outline" tone="neutral" size={34} />
              <Text style={[styles.hint, { color: palette.text.secondary }]}>
                Waitlisted members are promoted automatically when someone cancels.
              </Text>
            </Card>
          ) : null}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  stack: { gap: spacing.sm },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  avatar: { alignItems: "center", borderRadius: 999, height: 38, justifyContent: "center", width: 38 },
  avatarText: { ...typography.cardTitle },
  name: { ...typography.body, flex: 1, minWidth: 0 },
  hintRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  hint: { ...typography.small, flex: 1 },
});

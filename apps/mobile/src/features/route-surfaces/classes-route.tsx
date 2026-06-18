import { Stack } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import {
  AppHeader,
  BranchSelectorChip,
  Card,
  EmptyState,
  Pill,
  QueryErrorState,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useBranchSelection } from "@/lib/branch-selection";
import { useEnrollInClass, useMyClasses } from "@/lib/domains";
import { formatClassSchedule } from "@/lib/formatting";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

function enrollmentLabel(status?: string | null, remainingCapacity?: number) {
  if (status === "confirmed") return "Booked";
  if (status === "waitlisted") return "Waitlisted";
  if ((remainingCapacity ?? 0) <= 0) return "Join waitlist";
  return "Book class";
}

export default function ClassesRoute() {
  const { palette } = useTheme();
  const { selectedBranch } = useBranchSelection();
  const classesQuery = useMyClasses();
  const enrollMutation = useEnrollInClass();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    await classesQuery.refetch();
    setRefreshing(false);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="member-classes-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
        >
          <AppHeader
            title="Classes"
            subtitle={
              selectedBranch
                ? `${selectedBranch.name} schedule`
                : "See upcoming sessions and reserve your spot."
            }
            showProfileShortcut={false}
            showBack
          />

          <Card variant="compact" contentStyle={styles.helperCard}>
            <View style={styles.helperHeader}>
              <View style={styles.helperCopy}>
                <Text style={[styles.helperTitle, { color: palette.text.primary }]}>
                  Upcoming group sessions
                </Text>
                <Text style={[styles.helperMeta, { color: palette.text.secondary }]}>
                  {selectedBranch
                    ? "Bookings and waitlists follow the active branch."
                    : "Pick a branch to see its upcoming sessions."}
                </Text>
              </View>
              <View style={styles.helperBadge}>
                <BranchSelectorChip />
                <Pill>{selectedBranch?.name ?? "All branches"}</Pill>
              </View>
            </View>
            <Text style={[styles.helperBody, { color: palette.text.secondary }]}>
              Book classes in the active branch. If a session fills up, Zook will add you to the
              waitlist instead.
            </Text>
          </Card>

          {classesQuery.isError ? (
            <Card variant="compact">
              <QueryErrorState
                error={
                  classesQuery.error instanceof Error
                    ? classesQuery.error
                    : new Error("Classes could not load.")
                }
                onRetry={() => void classesQuery.refetch()}
              />
            </Card>
          ) : null}

          {!classesQuery.isLoading && !classesQuery.data?.classes.length ? (
            <Card variant="compact">
              <EmptyState
                icon="calendar-outline"
                title="No classes yet"
                body="Your gym has not scheduled any upcoming classes for this branch."
              />
            </Card>
          ) : null}

          <View style={styles.stack}>
            {(classesQuery.data?.classes ?? []).map((entry, index) => {
              const busy = enrollMutation.isPending && enrollMutation.variables?.classId === entry.id;
              const alreadyBooked = entry.myEnrollmentStatus === "confirmed";
              const alreadyWaitlisted = entry.myEnrollmentStatus === "waitlisted";
              return (
                <Card
                  key={entry.id}
                  testID={index === 0 ? "class-row-first" : `class-row-${entry.id}`}
                  variant="compact"
                  contentStyle={styles.classCard}
                >
                  <View style={styles.classHeader}>
                    <View style={styles.classTitleBlock}>
                      <Text style={[styles.classTitle, { color: palette.text.primary }]}>
                        {entry.name}
                      </Text>
                      <Text style={[styles.classSchedule, { color: palette.text.secondary }]}>
                        {formatClassSchedule(entry.startTime, entry.endTime)}
                      </Text>
                    </View>
                    <Pill
                    >
                      {entry.myEnrollmentStatus === "confirmed"
                        ? "Booked"
                        : entry.remainingCapacity > 0
                          ? `${entry.remainingCapacity} left`
                          : "Waitlist"}
                    </Pill>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaText, { color: palette.text.secondary }]}>
                      {entry.classType}
                    </Text>
                    <Text style={[styles.metaText, { color: palette.text.secondary }]}>
                      {entry.trainerName
                        ? `Coach ${entry.trainerName}`
                        : `${entry.enrollmentCount}/${entry.maxCapacity} booked`}
                    </Text>
                  </View>
                  {entry.description ? (
                    <Text style={[styles.description, { color: palette.text.secondary }]}>
                      {entry.description}
                    </Text>
                  ) : null}
                  <ZookButton
                    testID={index === 0 ? "class-book-first" : `class-book-${entry.id}`}
                    onPress={() => enrollMutation.mutate({ classId: entry.id })}
                    disabled={busy || alreadyBooked || alreadyWaitlisted}
                    variant={alreadyBooked || alreadyWaitlisted ? "secondary" : "primary"}
                  >
                    {busy
                      ? "Saving..."
                      : enrollmentLabel(entry.myEnrollmentStatus, entry.remainingCapacity)}
                  </ZookButton>
                </Card>
              );
            })}
          </View>
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
  helperCard: {
    gap: spacing.sm,
  },
  helperHeader: {
    gap: spacing.sm,
  },
  helperCopy: {
    gap: 4,
  },
  helperBadge: {
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  helperTitle: {
    ...typography.cardTitle,
  },
  helperMeta: {
    ...typography.caption,
  },
  helperBody: {
    ...typography.body,
    lineHeight: 20,
  },
  stack: {
    gap: spacing.md,
  },
  classCard: {
    gap: spacing.md,
  },
  classHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  classTitleBlock: {
    flex: 1,
    gap: 4,
  },
  classTitle: {
    ...typography.cardTitle,
  },
  classSchedule: {
    ...typography.body,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metaText: {
    ...typography.caption,
  },
  description: {
    ...typography.body,
  },
});

import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import {
  AppHeader,
  BranchSelectorChip,
  Card,
  EmptyState,
  IconBubble,
  Pill,
  QueryErrorState,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { ClassesSkeleton } from "@/components/skeletons";
import { useBranchSelection } from "@/lib/branch-selection";
import { useCancelEnrollment, useEnrollInClass, useMyClasses } from "@/lib/domains";
import type { MemberClassRecord } from "@/lib/domains/shared/types";
import { formatInr, formatTime } from "@/lib/formatting";
import { layout, radii, spacing, typography, useTheme } from "@/lib/theme";
import {
  classDayHeading,
  classTypeGradient,
  classTypeVisual,
} from "@/features/member/classes/class-display";

function bookingLabel(entry: MemberClassRecord) {
  if (entry.myEnrollmentStatus === "confirmed") return "Booked";
  if (entry.myEnrollmentStatus === "pending_payment") return "Continue payment";
  if (entry.myEnrollmentStatus === "waitlisted") return "On waitlist";
  if (entry.remainingCapacity <= 0) return "Join waitlist";
  return entry.pricePaise && entry.pricePaise > 0 ? `Book · ${formatInr(entry.pricePaise)}` : "Book class";
}

function statusPill(entry: MemberClassRecord) {
  if (entry.myEnrollmentStatus === "confirmed") return { label: "Booked", tone: "lime" as const };
  if (entry.myEnrollmentStatus === "pending_payment")
    return { label: "Payment due", tone: "amber" as const };
  if (entry.myEnrollmentStatus === "waitlisted")
    return { label: "Waitlisted", tone: "amber" as const };
  if (entry.remainingCapacity <= 0) return { label: "Full", tone: "red" as const };
  if (entry.remainingCapacity <= 3)
    return { label: `${entry.remainingCapacity} left`, tone: "amber" as const };
  return { label: `${entry.remainingCapacity} spots`, tone: "neutral" as const };
}

function groupByDay(classes: MemberClassRecord[]) {
  const groups: Array<{ heading: string; items: MemberClassRecord[] }> = [];
  for (const entry of classes) {
    const heading = classDayHeading(entry.startTime);
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) {
      last.items.push(entry);
    } else {
      groups.push({ heading, items: [entry] });
    }
  }
  return groups;
}

function ClassCard({
  entry,
  busy,
  cancelling,
  onBook,
  onCancel,
}: {
  entry: MemberClassRecord;
  busy: boolean;
  cancelling: boolean;
  onBook: () => void;
  onCancel: () => void;
}) {
  const { palette } = useTheme();
  const visual = classTypeVisual(entry.classType);
  const pill = statusPill(entry);
  const booked = entry.myEnrollmentStatus === "confirmed";
  const pendingPayment = entry.myEnrollmentStatus === "pending_payment";
  const waitlisted = entry.myEnrollmentStatus === "waitlisted";
  const meta = [
    entry.classType,
    entry.pricePaise && entry.pricePaise > 0 ? formatInr(entry.pricePaise) : "Free",
    entry.trainerName ? `Coach ${entry.trainerName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View
      style={[
        styles.classCard,
        { borderColor: palette.border.subtle, backgroundColor: palette.surface.default },
      ]}
    >
      <LinearGradient
        colors={classTypeGradient(entry.classType)}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.classContent}>
        <View style={styles.classHeader}>
          <IconBubble icon={visual.icon} tone={visual.tone} size={46} />
          <View style={styles.classTitleBlock}>
            <Text style={[styles.classTitle, { color: palette.text.primary }]}>{entry.name}</Text>
            <Text style={[styles.classTime, { color: palette.text.secondary }]}>
              {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
            </Text>
          </View>
          <Pill tone={pill.tone}>{pill.label}</Pill>
        </View>
        {meta ? (
          <Text style={[styles.metaText, { color: palette.text.secondary }]}>{meta}</Text>
        ) : null}
        {entry.description ? (
          <Text style={[styles.description, { color: palette.text.secondary }]} numberOfLines={2}>
            {entry.description}
          </Text>
        ) : null}
        {booked || waitlisted ? (
          <View style={styles.actionRow}>
            <View style={styles.bookedBadge}>
              <Pill tone={waitlisted ? "amber" : "lime"}>
                {waitlisted ? "On waitlist" : "Booked"}
              </Pill>
            </View>
            <ZookButton
              onPress={onCancel}
              disabled={cancelling}
              variant="secondary"
              icon="close-circle-outline"
              style={styles.cancelButton}
            >
              {cancelling ? "Cancelling..." : "Cancel"}
            </ZookButton>
          </View>
        ) : pendingPayment ? (
          <ZookButton onPress={onBook} disabled={busy} variant="primary">
            {busy ? "Opening..." : bookingLabel(entry)}
          </ZookButton>
        ) : (
          <ZookButton onPress={onBook} disabled={busy} variant="primary">
            {busy ? "Saving..." : bookingLabel(entry)}
          </ZookButton>
        )}
      </View>
    </View>
  );
}

export default function ClassesRoute() {
  const { palette } = useTheme();
  const { selectedBranch } = useBranchSelection();
  const classesQuery = useMyClasses();
  const enrollMutation = useEnrollInClass();
  const cancelMutation = useCancelEnrollment();
  const [refreshing, setRefreshing] = useState(false);

  const classes = useMemo(
    () => classesQuery.data?.classes ?? [],
    [classesQuery.data?.classes],
  );
  const groups = useMemo(() => groupByDay(classes), [classes]);

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
                : "Reserve your spot in upcoming group sessions."
            }
            contextSlot={<BranchSelectorChip />}
            showProfileShortcut={false}
            showBack
          />

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

          {classesQuery.isLoading ? <ClassesSkeleton /> : null}

          {!classesQuery.isLoading && !classesQuery.isError && classes.length === 0 ? (
            <Card variant="compact">
              <EmptyState
                icon="calendar-outline"
                title="No classes scheduled"
                body="Check back soon — new group sessions are added every week."
              />
            </Card>
          ) : null}

          {groups.map((group) => (
            <View key={group.heading} style={styles.group}>
              <Text style={[styles.dayHeading, { color: palette.text.tertiary }]}>
                {group.heading}
              </Text>
              <View style={styles.stack}>
                {group.items.map((entry) => {
                  const busy =
                    enrollMutation.isPending && enrollMutation.variables?.classId === entry.id;
                  const cancelling =
                    cancelMutation.isPending && cancelMutation.variables?.classId === entry.id;
                  return (
                    <ClassCard
                      key={entry.id}
                      entry={entry}
                      busy={busy}
                      cancelling={cancelling}
                      onBook={() => enrollMutation.mutate({ classId: entry.id })}
                      onCancel={() => cancelMutation.mutate({ classId: entry.id })}
                    />
                  );
                })}
              </View>
            </View>
          ))}
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
  group: {
    gap: spacing.sm,
  },
  dayHeading: {
    ...typography.eyebrow,
    textTransform: "uppercase",
  },
  stack: {
    gap: spacing.md,
  },
  classCard: {
    borderRadius: radii.card,
    borderCurve: "continuous",
    borderWidth: 1,
    overflow: "hidden",
  },
  classContent: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  classHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  classTitleBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  classTitle: {
    ...typography.cardTitle,
  },
  classTime: {
    ...typography.body,
  },
  metaText: {
    ...typography.caption,
  },
  description: {
    ...typography.body,
  },
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  bookedBadge: {
    flex: 1,
  },
  cancelButton: {
    minWidth: 120,
  },
});

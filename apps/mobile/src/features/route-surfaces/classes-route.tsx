import { Stack, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { useT, type TranslationKey } from "@/lib/i18n";
import { layout, radii, spacing, typography, useTheme } from "@/lib/theme";
import {
  classDayHeading,
  classTypeGradient,
  classTypeVisual,
} from "@/features/member/classes/class-display";

type TFunction = (key: TranslationKey, values?: Record<string, string | number>) => string;

function bookingLabel(entry: MemberClassRecord, t: TFunction) {
  if (entry.myEnrollmentStatus === "confirmed") return t("member.classes.booked");
  if (entry.myEnrollmentStatus === "pending_payment") return t("member.classes.continuePayment");
  if (entry.myEnrollmentStatus === "waitlisted") return t("member.classes.onWaitlist");
  if (entry.remainingCapacity <= 0) return t("member.classes.joinWaitlist");
  return entry.pricePaise && entry.pricePaise > 0 ? t("member.classes.bookWithPrice", { price: formatInr(entry.pricePaise) }) : t("member.classes.bookClass");
}

function statusPill(entry: MemberClassRecord, t: TFunction) {
  if (entry.myEnrollmentStatus === "confirmed") return { label: t("member.classes.booked"), tone: "lime" as const };
  if (entry.myEnrollmentStatus === "pending_payment")
    return { label: t("member.classes.paymentDue"), tone: "amber" as const };
  if (entry.myEnrollmentStatus === "waitlisted")
    return { label: t("member.classes.waitlisted"), tone: "amber" as const };
  if (entry.remainingCapacity <= 0) return { label: t("member.classes.full"), tone: "red" as const };
  if (entry.remainingCapacity <= 3)
    return { label: t("member.classes.left", { count: entry.remainingCapacity }), tone: "amber" as const };
  return { label: t("member.classes.spots", { count: entry.remainingCapacity }), tone: "neutral" as const };
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
  onOpen,
  onBook,
  onCancel,
}: {
  entry: MemberClassRecord;
  busy: boolean;
  cancelling: boolean;
  onOpen: () => void;
  onBook: () => void;
  onCancel: () => void;
}) {
  const { palette, mode } = useTheme();
  const t = useT();
  const visual = classTypeVisual(entry.classType);
  const pill = statusPill(entry, t);
  const booked = entry.myEnrollmentStatus === "confirmed";
  const pendingPayment = entry.myEnrollmentStatus === "pending_payment";
  const waitlisted = entry.myEnrollmentStatus === "waitlisted";
  const meta = [
    entry.classType,
    entry.pricePaise && entry.pricePaise > 0 ? formatInr(entry.pricePaise) : t("member.classes.free"),
    entry.trainerName ? t("member.classes.coachName", { name: entry.trainerName }) : null,
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
        colors={classTypeGradient(entry.classType, mode)}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.classContent}>
        <Pressable accessibilityRole="button" onPress={onOpen} style={styles.detailPressable}>
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
        </Pressable>
        {booked || waitlisted ? (
          <View style={styles.actionRow}>
            <View style={styles.bookedBadge}>
              <Pill tone={waitlisted ? "amber" : "lime"}>
                {waitlisted ? t("member.classes.onWaitlist") : t("member.classes.booked")}
              </Pill>
            </View>
            <ZookButton
              onPress={onCancel}
              disabled={cancelling}
              variant="secondary"
              icon="close-circle-outline"
              style={styles.cancelButton}
            >
              {cancelling ? t("member.classes.cancelling") : t("common.cancel")}
            </ZookButton>
          </View>
        ) : pendingPayment ? (
          <ZookButton
            onPress={onBook}
            disabled={busy}
            variant="primary"
          >
            {busy ? t("member.classes.opening") : bookingLabel(entry, t)}
          </ZookButton>
        ) : (
          <ZookButton
            onPress={onBook}
            disabled={busy}
            variant="primary"
          >
            {busy ? t("common.saving") : bookingLabel(entry, t)}
          </ZookButton>
        )}
      </View>
    </View>
  );
}

export default function ClassesRoute() {
  const { palette } = useTheme();
  const router = useRouter();
  const t = useT();
  const { selectedBranch } = useBranchSelection();
  const classesQuery = useMyClasses();
  const enrollMutation = useEnrollInClass();
  const cancelMutation = useCancelEnrollment();
  const [refreshing, setRefreshing] = useState(false);

  const classes = useMemo(
    () => (classesQuery.data?.classes ?? []).filter((entry) => entry.status !== "CANCELLED"),
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
            title={t("member.classes.title")}
            subtitle={
              selectedBranch
                ? t("member.classes.branchSchedule", { branch: selectedBranch.name })
                : t("member.classes.subtitle")
            }
            contextSlot={<BranchSelectorChip />}
            showBack
          />

          {classesQuery.isError ? (
            <Card variant="compact">
              <QueryErrorState
                error={
                  classesQuery.error instanceof Error
                    ? classesQuery.error
                    : new Error(t("member.classes.couldNotLoad"))
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
                title={t("member.classes.noClasses")}
                body={t("member.classes.noClassesBody")}
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
                      onOpen={() => router.push(`/classes/${entry.id}` as never)}
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
  detailPressable: {
    gap: spacing.sm,
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

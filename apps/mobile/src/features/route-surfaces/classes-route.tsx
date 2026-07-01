import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
  ZookScreen,
} from "@/components/primitives";
import { ClassesSkeleton } from "@/components/skeletons";
import { useCancelEnrollment, useEnrollInClass, useMyClasses } from "@/lib/domains";
import type { MemberClassRecord } from "@/lib/domains/shared/types";
import { formatInr, formatTime } from "@/lib/formatting";
import { useT, type TranslationKey } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { classDayHeading, classTypeVisual } from "@/features/member/classes/class-display";

type TFunction = (key: TranslationKey, values?: Record<string, string | number>) => string;
type ClassFilter = "all" | "booked" | "open";

function bookingLabel(entry: MemberClassRecord, t: TFunction) {
  if (entry.myEnrollmentStatus === "confirmed") return t("member.classes.booked");
  if (entry.myEnrollmentStatus === "pending_payment") {
    return entry.pricePaise && entry.pricePaise > 0
      ? t("member.classes.payAmountNow", { amount: formatInr(entry.pricePaise) })
      : t("member.classes.continuePayment");
  }
  if (entry.myEnrollmentStatus === "waitlisted") return t("member.classes.onWaitlist");
  if (entry.remainingCapacity <= 0) return t("member.classes.joinWaitlist");
  return entry.pricePaise && entry.pricePaise > 0 ? t("member.classes.bookWithPrice", { price: formatInr(entry.pricePaise) }) : t("member.classes.bookClass");
}

function statusPill(entry: MemberClassRecord, t: TFunction) {
  if (entry.myEnrollmentStatus === "confirmed")
    return { label: t("member.classes.booked"), accessibilityLabel: t("member.classes.booked"), tone: "lime" as const };
  if (entry.myEnrollmentStatus === "pending_payment")
    return { label: t("member.classes.paymentDue"), accessibilityLabel: t("member.classes.paymentDue"), tone: "amber" as const };
  if (entry.myEnrollmentStatus === "waitlisted")
    return { label: t("member.classes.waitlisted"), accessibilityLabel: t("member.classes.waitlisted"), tone: "amber" as const };
  if (entry.remainingCapacity <= 0)
    return { label: t("member.classes.full"), accessibilityLabel: t("member.classes.full"), tone: "red" as const };
  if (entry.remainingCapacity <= 3)
    return {
      label: t("member.classes.left", { count: entry.remainingCapacity }),
      accessibilityLabel: t("member.classes.spots", { count: entry.remainingCapacity }),
      tone: "amber" as const,
    };
  return {
    label: t("member.classes.spots", { count: entry.remainingCapacity }),
    accessibilityLabel: t("member.classes.spots", { count: entry.remainingCapacity }),
    tone: "neutral" as const,
  };
}

function actionIcon(entry: MemberClassRecord) {
  if (entry.myEnrollmentStatus === "confirmed" || entry.myEnrollmentStatus === "waitlisted") {
    return "close-circle-outline" as const;
  }
  if (entry.myEnrollmentStatus === "pending_payment") return "card-outline" as const;
  if (entry.remainingCapacity <= 0) return "people-outline" as const;
  return "add-circle-outline" as const;
}

const classTypeLabelKeys: Record<string, TranslationKey> = {
  boxing: "trainer.classes.typeBoxing",
  cycling: "trainer.classes.typeCycling",
  dance: "trainer.classes.typeDance",
  hiit: "trainer.classes.typeHiit",
  mobility: "trainer.classes.typeMobility",
  strength: "trainer.classes.typeStrength",
  yoga: "trainer.classes.typeYoga",
};

function classTypeLabel(classType: string | null | undefined, t: TFunction) {
  const key = (classType ?? "").trim().toLowerCase();
  const labelKey = classTypeLabelKeys[key];
  return labelKey ? t(labelKey) : classType;
}

function groupByDay(classes: MemberClassRecord[], t: TFunction) {
  const groups: Array<{ heading: string; items: MemberClassRecord[] }> = [];
  for (const entry of classes) {
    const heading = classDayHeading(entry.startTime, t);
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) {
      last.items.push(entry);
    } else {
      groups.push({ heading, items: [entry] });
    }
  }
  return groups;
}

function classStartMs(entry: MemberClassRecord) {
  const timestamp = new Date(entry.startTime).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
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
  const { palette } = useTheme();
  const t = useT();
  const visual = classTypeVisual(entry.classType);
  const pill = statusPill(entry, t);
  const booked = entry.myEnrollmentStatus === "confirmed";
  const pendingPayment = entry.myEnrollmentStatus === "pending_payment";
  const waitlisted = entry.myEnrollmentStatus === "waitlisted";
  const actionDisabled = booked || waitlisted ? cancelling : busy;
  const actionLabel = booked || waitlisted
    ? (cancelling ? t("member.classes.cancelling") : t("common.cancel"))
    : (busy ? (pendingPayment ? t("member.classes.opening") : t("common.saving")) : bookingLabel(entry, t));
  const actionTone = booked || waitlisted ? palette.text.secondary : palette.text.primary;
  const priceLabel = entry.pricePaise && entry.pricePaise > 0 ? formatInr(entry.pricePaise) : null;
  const meta = [
    classTypeLabel(entry.classType, t),
    entry.trainerName ? t("member.classes.coachName", { name: entry.trainerName }) : null,
    priceLabel,
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
      <View style={styles.classContent}>
        <View style={styles.classHeader}>
          <Pressable accessibilityRole="button" onPress={onOpen} style={styles.detailPressable}>
            <View style={styles.classTimeBlock}>
              <Text style={[styles.classTime, { color: palette.text.primary }]}>
                {formatTime(entry.startTime)}
              </Text>
              <Text style={[styles.classEndTime, { color: palette.text.tertiary }]}>
                {formatTime(entry.endTime)}
              </Text>
            </View>
            <IconBubble icon={visual.icon} tone={visual.tone} size={34} />
            <View style={styles.classTitleBlock}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.88}
                style={[styles.classTitle, { color: palette.text.primary }]}
              >
                {entry.name}
              </Text>
              <Text numberOfLines={1} style={[styles.metaText, { color: palette.text.secondary }]}>
                {meta}
              </Text>
            </View>
          </Pressable>
          <Pill tone={pill.tone} accessibilityLabel={pill.accessibilityLabel}>{pill.label}</Pill>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            disabled={actionDisabled}
            onPress={booked || waitlisted ? onCancel : onBook}
            style={({ pressed }) => [
              styles.classIconAction,
              {
                borderColor: palette.border.default,
                backgroundColor: palette.surface.raised,
                opacity: actionDisabled ? 0.56 : 1,
              },
              pressed ? styles.classIconActionPressed : null,
            ]}
          >
            <Ionicons name={actionIcon(entry)} size={20} color={actionTone} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function ClassesRoute() {
  const { palette } = useTheme();
  const router = useRouter();
  const t = useT();
  const classesQuery = useMyClasses();
  const enrollMutation = useEnrollInClass();
  const cancelMutation = useCancelEnrollment();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ClassFilter>("all");

  const classes = useMemo(
    () =>
      (classesQuery.data?.classes ?? [])
        .filter((entry) => entry.status !== "CANCELLED")
        .sort((left, right) => classStartMs(left) - classStartMs(right)),
    [classesQuery.data?.classes],
  );
  const classCounts = useMemo(() => {
    const booked = classes.filter((entry) =>
      entry.myEnrollmentStatus === "confirmed" ||
      entry.myEnrollmentStatus === "pending_payment" ||
      entry.myEnrollmentStatus === "waitlisted"
    ).length;
    const open = classes.filter((entry) => !entry.myEnrollmentStatus && entry.remainingCapacity > 0).length;
    return { all: classes.length, booked, open };
  }, [classes]);
  const filterOptions = useMemo(
    () => [
      {
        count: classCounts.all,
        icon: "calendar-outline" as const,
        label: t("member.classes.filterAll", { count: classCounts.all }),
        value: "all" as const,
      },
      {
        count: classCounts.booked,
        icon: "checkmark-circle-outline" as const,
        label: t("member.classes.filterBooked", { count: classCounts.booked }),
        value: "booked" as const,
      },
      {
        count: classCounts.open,
        icon: "add-circle-outline" as const,
        label: t("member.classes.filterOpen", { count: classCounts.open }),
        value: "open" as const,
      },
    ],
    [classCounts.all, classCounts.booked, classCounts.open, t],
  );
  const filteredClasses = useMemo(() => {
    if (filter === "booked") {
      return classes.filter((entry) =>
        entry.myEnrollmentStatus === "confirmed" ||
        entry.myEnrollmentStatus === "pending_payment" ||
        entry.myEnrollmentStatus === "waitlisted"
      );
    }
    if (filter === "open") {
      return classes.filter((entry) => !entry.myEnrollmentStatus && entry.remainingCapacity > 0);
    }
    return classes;
  }, [classes, filter]);
  const groups = useMemo(() => groupByDay(filteredClasses, t), [filteredClasses, t]);

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
            contextSlot={<BranchSelectorChip variant="inline" style={styles.headerBranchSelector} />}
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

          {!classesQuery.isLoading && !classesQuery.isError && classes.length > 0 ? (
            <View style={styles.filterRail}>
              {filterOptions.map((option) => {
                const selected = option.value === filter;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected }}
                    onPress={() => setFilter(option.value)}
                    style={({ pressed }) => [
                      styles.filterChip,
                      {
                        backgroundColor: selected ? palette.accent.fill : palette.surface.default,
                        borderColor: selected ? palette.accent.strong : palette.border.subtle,
                      },
                      pressed ? styles.filterChipPressed : null,
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={15}
                      color={selected ? palette.text.onAccent : palette.text.secondary}
                    />
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.86}
                      style={[
                        styles.filterChipText,
                        { color: selected ? palette.text.onAccent : palette.text.secondary },
                      ]}
                    >
                      {option.label.replace(String(option.count), "").trim()}
                    </Text>
                    <View
                      style={[
                        styles.filterCount,
                        { backgroundColor: selected ? "rgba(0,0,0,0.16)" : palette.bg.sunken },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.filterCountText,
                          { color: selected ? palette.text.onAccent : palette.text.tertiary },
                        ]}
                      >
                        {option.count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {!classesQuery.isLoading && !classesQuery.isError && classes.length > 0 && filteredClasses.length === 0 ? (
            <Card variant="compact">
              <EmptyState
                icon={filter === "booked" ? "checkmark-circle-outline" : "calendar-outline"}
                title={filter === "booked" ? t("member.classes.noBookedClasses") : t("member.classes.noOpenClasses")}
                body={
                  filter === "booked"
                    ? t("member.classes.noBookedClassesBody")
                    : t("member.classes.noOpenClassesBody")
                }
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
  headerBranchSelector: {
    flex: 1,
    minWidth: 190,
  },
  group: {
    gap: spacing.sm,
  },
  dayHeading: {
    ...typography.eyebrow,
    textTransform: "uppercase",
  },
  stack: {
    gap: spacing.sm,
  },
  filterRail: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  filterChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 0,
    paddingHorizontal: 8,
  },
  filterChipPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  filterChipText: {
    ...typography.caption,
    flexShrink: 1,
    minWidth: 0,
  },
  filterCount: {
    alignItems: "center",
    borderRadius: 999,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 5,
  },
  filterCountText: {
    ...typography.navLabel,
  },
  classCard: {
    borderRadius: 16,
    borderCurve: "continuous",
    borderWidth: 1,
    overflow: "hidden",
  },
  classContent: {
    padding: spacing.sm,
  },
  detailPressable: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 0,
  },
  classHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  classTimeBlock: {
    alignItems: "flex-start",
    minWidth: 48,
  },
  classTime: {
    ...typography.bodyStrong,
    fontVariant: ["tabular-nums"],
  },
  classEndTime: {
    ...typography.small,
    fontVariant: ["tabular-nums"],
  },
  classTitleBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  classTitle: {
    ...typography.cardTitle,
  },
  metaText: {
    ...typography.caption,
  },
  classIconAction: {
    alignItems: "center",
    borderRadius: 13,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  classIconActionPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
});

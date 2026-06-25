import { Stack, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import {
  AppHeader,
  Card,
  EmptyState,
  IconBubble,
  Pill,
  QueryErrorState,
  Skeleton,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useCancelEnrollment, useClassDetail, useEnrollInClass } from "@/lib/domains";
import type { MemberClassRecord } from "@/lib/domains/shared/types";
import { formatInr, formatTime } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { layout, radii, spacing, typography, useTheme } from "@/lib/theme";
import {
  classDayHeading,
  classTypeGradient,
  classTypeVisual,
} from "@/features/member/classes/class-display";

function statusPill(entry: MemberClassRecord, t: ReturnType<typeof useT>) {
  if (entry.myEnrollmentStatus === "confirmed") return { label: t("member.classDetail.booked"), tone: "lime" as const };
  if (entry.myEnrollmentStatus === "pending_payment")
    return { label: t("member.classDetail.paymentDue"), tone: "amber" as const };
  if (entry.myEnrollmentStatus === "waitlisted")
    return { label: t("member.classDetail.waitlisted"), tone: "amber" as const };
  if (entry.remainingCapacity <= 0) return { label: t("member.classDetail.full"), tone: "red" as const };
  if (entry.remainingCapacity <= 3)
    return { label: t("member.classDetail.left", { count: entry.remainingCapacity }), tone: "amber" as const };
  return { label: t("member.classDetail.spots", { count: entry.remainingCapacity }), tone: "neutral" as const };
}

function bookingLabel(entry: MemberClassRecord, t: ReturnType<typeof useT>) {
  if (entry.myEnrollmentStatus === "pending_payment") return t("member.classDetail.continuePayment");
  if (entry.remainingCapacity <= 0) return t("member.classDetail.joinWaitlist");
  return entry.pricePaise && entry.pricePaise > 0
    ? t("member.classDetail.bookWithPrice", { price: formatInr(entry.pricePaise) })
    : t("member.classDetail.bookClass");
}

function ClassDetailSkeleton() {
  return (
    <Card contentStyle={styles.skeletonCard}>
      <Skeleton width={56} height={56} borderRadius={28} />
      <Skeleton width="64%" height={24} borderRadius={12} />
      <Skeleton width="42%" height={14} borderRadius={7} />
      <Skeleton width="100%" height={48} borderRadius={24} />
    </Card>
  );
}

export default function MemberClassDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const classId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { palette, mode } = useTheme();
  const t = useT();
  const classQuery = useClassDetail(classId);
  const enrollMutation = useEnrollInClass();
  const cancelMutation = useCancelEnrollment();
  const [refreshing, setRefreshing] = useState(false);
  const entry = classQuery.data?.class ?? null;

  async function refresh() {
    setRefreshing(true);
    await classQuery.refetch();
    setRefreshing(false);
  }

  function book() {
    if (!entry) return;
    enrollMutation.mutate(
      { classId: entry.id },
      { onSuccess: () => void classQuery.refetch() },
    );
  }

  function cancel() {
    if (!entry) return;
    cancelMutation.mutate(
      { classId: entry.id },
      { onSuccess: () => void classQuery.refetch() },
    );
  }

  const visual = entry ? classTypeVisual(entry.classType) : null;
  const pill = entry ? statusPill(entry, t) : null;
  const booked = entry?.myEnrollmentStatus === "confirmed";
  const waitlisted = entry?.myEnrollmentStatus === "waitlisted";
  const busy = Boolean(entry && enrollMutation.isPending && enrollMutation.variables?.classId === entry.id);
  const cancelling = Boolean(
    entry && cancelMutation.isPending && cancelMutation.variables?.classId === entry.id,
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="member-class-detail-screen">
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
            title={entry?.name ?? t("member.classDetail.classFallback")}
            subtitle={entry ? `${classDayHeading(entry.startTime)} · ${formatTime(entry.startTime)}` : t("member.classDetail.classDetails")}
            showBack
          />

          {classQuery.isLoading ? <ClassDetailSkeleton /> : null}

          {classQuery.isError ? (
            <Card variant="compact">
              <QueryErrorState error={classQuery.error} onRetry={() => void classQuery.refetch()} />
            </Card>
          ) : null}

          {!classQuery.isLoading && !classQuery.isError && !entry ? (
            <Card variant="compact">
              <EmptyState icon="calendar-outline" title={t("member.classDetail.notFound")} />
            </Card>
          ) : null}

          {entry && visual && pill ? (
            <Card style={styles.heroCard} contentStyle={styles.heroContent}>
              <LinearGradient
                colors={classTypeGradient(entry.classType, mode)}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.heroTop}>
                <IconBubble icon={visual.icon} tone={visual.tone} size={56} />
                <Pill tone={pill.tone}>{pill.label}</Pill>
              </View>
              <View style={styles.titleBlock}>
                <Text style={[styles.title, { color: palette.text.primary }]}>{entry.name}</Text>
                <Text style={[styles.meta, { color: palette.text.secondary }]}>
                  {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                </Text>
                <Text style={[styles.meta, { color: palette.text.tertiary }]}>
                  {[entry.classType, entry.trainerName ? t("member.classDetail.coachName", { name: entry.trainerName }) : null, entry.branchName]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <View style={styles.capacityRow}>
                <Text style={[styles.capacity, { color: palette.text.primary }]}>
                  {entry.enrollmentCount}/{entry.maxCapacity}
                </Text>
                <Text style={[styles.meta, { color: palette.text.secondary }]}>{t("member.classDetail.spotsBooked")}</Text>
              </View>
              {entry.description ? (
                <Text style={[styles.description, { color: palette.text.secondary }]}>
                  {entry.description}
                </Text>
              ) : null}
              {booked || waitlisted ? (
                <ZookButton
                  onPress={cancel}
                  disabled={cancelling}
                  variant="secondary"
                  icon="close-circle-outline"
                >
                  {cancelling ? t("member.classDetail.cancelling") : t("member.classDetail.cancelBooking")}
                </ZookButton>
              ) : (
                <ZookButton onPress={book} disabled={busy} variant="primary">
                  {busy ? t("settings.saving") : bookingLabel(entry, t)}
                </ZookButton>
              )}
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
  heroCard: {
    borderRadius: radii.card,
    overflow: "hidden",
  },
  heroContent: {
    gap: spacing.md,
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  titleBlock: {
    gap: 6,
  },
  title: {
    ...typography.screenTitle,
  },
  meta: {
    ...typography.small,
  },
  capacityRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.xs,
  },
  capacity: {
    ...typography.cardTitle,
  },
  description: {
    ...typography.body,
    lineHeight: 22,
  },
  skeletonCard: {
    gap: spacing.sm,
  },
});

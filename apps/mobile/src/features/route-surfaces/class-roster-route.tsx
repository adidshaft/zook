import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

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
import { getTonePalette } from "@/components/primitives/tone-palette";
import {
  useClassRoster,
  useMarkClassAttendance,
  type ClassAttendanceStatus,
  type ClassRosterEntry,
} from "@/lib/domains/trainer/queries";
import { gymBrandColor } from "@/lib/gym-brand";
import { formatTime } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

function AttendanceButton({
  icon,
  tone,
  active,
  busy,
  accessibilityLabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: "lime" | "red";
  active: boolean;
  busy: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { palette, mode } = useTheme();
  const tonePalette = getTonePalette(tone, mode, palette);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active, disabled: busy }}
      hitSlop={6}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.attendanceButton,
        {
          backgroundColor: active ? tonePalette.backgroundColor : palette.surface.default,
          borderColor: active ? tonePalette.borderColor : palette.border.subtle,
        },
        pressed ? styles.pressed : null,
        busy ? styles.disabled : null,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={tonePalette.color} />
      ) : (
        <Ionicons name={icon} size={16} color={active ? tonePalette.color : palette.text.secondary} />
      )}
    </Pressable>
  );
}

function RosterRow({
  entry,
  showAttendanceActions,
  onMarkAttendance,
  pendingStatus,
}: {
  entry: ClassRosterEntry;
  showAttendanceActions: boolean;
  onMarkAttendance: (memberId: string, status: ClassAttendanceStatus) => void;
  pendingStatus: ClassAttendanceStatus | null;
}) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const name = entry.name ?? t("classRoster.memberFallback");
  const brand = gymBrandColor(name);
  const isAttended = entry.attendanceStatus === "ATTENDED";
  const isNoShow = entry.attendanceStatus === "NO_SHOW";
  return (
    <Card variant="compact" contentStyle={styles.row}>
      <View style={[styles.avatar, { backgroundColor: brand.soft }]}>
        <Text style={[styles.avatarText, { color: brand.solid }]}>{brand.initial}</Text>
      </View>
      <Text style={[styles.name, { color: palette.text.primary }]} numberOfLines={1}>
        {name}
      </Text>
      <Pill tone={entry.status === "waitlisted" ? "amber" : "lime"}>
        {entry.status === "waitlisted" ? t("classRoster.waitlist") : t("classRoster.confirmed")}
      </Pill>
      {showAttendanceActions ? (
        <View style={styles.attendanceActions}>
          <AttendanceButton
            icon="checkmark"
            tone="lime"
            active={isAttended}
            busy={pendingStatus === "ATTENDED"}
            accessibilityLabel={
              isAttended
                ? t("classRoster.markedPresentAccessibility", { name })
                : t("classRoster.markPresentAccessibility", { name })
            }
            onPress={() => onMarkAttendance(entry.memberId, isAttended ? "PENDING" : "ATTENDED")}
          />
          <AttendanceButton
            icon="close"
            tone="red"
            active={isNoShow}
            busy={pendingStatus === "NO_SHOW"}
            accessibilityLabel={
              isNoShow
                ? t("classRoster.markedNoShowAccessibility", { name })
                : t("classRoster.markNoShowAccessibility", { name })
            }
            onPress={() => onMarkAttendance(entry.memberId, isNoShow ? "PENDING" : "NO_SHOW")}
          />
        </View>
      ) : null}
    </Card>
  );
}

export default function ClassRosterRoute() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ classId?: string; name?: string }>();
  const classId = typeof params.classId === "string" ? params.classId : undefined;
  const rosterQuery = useClassRoster(classId);
  const markAttendance = useMarkClassAttendance(classId);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<ClassAttendanceStatus | null>(null);

  const data = rosterQuery.data;
  const roster = data?.roster ?? [];
  const confirmed = roster.filter((entry) => entry.status === "confirmed");
  const waitlisted = roster.filter((entry) => entry.status === "waitlisted");
  const title = data?.class.name ?? params.name ?? t("classRoster.title");
  const classHasStarted = data?.class.startTime
    ? new Date(data.class.startTime).getTime() <= Date.now()
    : false;

  async function refresh() {
    setRefreshing(true);
    await rosterQuery.refetch();
    setRefreshing(false);
  }

  function handleMarkAttendance(memberId: string, status: ClassAttendanceStatus) {
    setPendingMemberId(memberId);
    setPendingStatus(status);
    markAttendance.mutate(
      { memberId, status },
      {
        onSettled: () => {
          setPendingMemberId(null);
          setPendingStatus(null);
        },
      },
    );
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
                : t("classRoster.subtitle")
            }
            showBack
          />

          {rosterQuery.isError ? (
            <QueryErrorState error={rosterQuery.error} onRetry={() => void rosterQuery.refetch()} />
          ) : null}

          {!rosterQuery.isLoading && roster.length === 0 ? (
            <Card variant="compact">
              <EmptyState icon="people-outline" title={t("classRoster.noBookings")} body={t("classRoster.noBookingsBody")} />
            </Card>
          ) : null}

          {confirmed.length ? (
            <>
              <SectionHeader title={t("classRoster.confirmedCount", { count: confirmed.length })} />
              <View style={styles.stack}>
                {confirmed.map((entry) => (
                  <RosterRow
                    key={entry.memberId}
                    entry={entry}
                    showAttendanceActions={classHasStarted}
                    onMarkAttendance={handleMarkAttendance}
                    pendingStatus={pendingMemberId === entry.memberId ? pendingStatus : null}
                  />
                ))}
              </View>
            </>
          ) : null}

          {waitlisted.length ? (
            <>
              <SectionHeader title={t("classRoster.waitlistCount", { count: waitlisted.length })} />
              <View style={styles.stack}>
                {waitlisted.map((entry) => (
                  <RosterRow
                    key={entry.memberId}
                    entry={entry}
                    showAttendanceActions={false}
                    onMarkAttendance={handleMarkAttendance}
                    pendingStatus={null}
                  />
                ))}
              </View>
            </>
          ) : null}

          {!rosterQuery.isLoading && roster.length ? (
            <Card variant="compact" contentStyle={styles.hintRow}>
              <IconBubble icon="information-circle-outline" tone="neutral" size={34} />
              <Text style={[styles.hint, { color: palette.text.secondary }]}>
                {classHasStarted
                  ? t("classRoster.attendanceHint")
                  : t("classRoster.waitlistHint")}
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
  attendanceActions: { flexDirection: "row", gap: spacing.xs },
  attendanceButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.6 },
});

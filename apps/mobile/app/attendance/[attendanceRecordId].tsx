import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  ListRow,
  MobileHeader,
  StatusRing,
  StatusChip,
  ZookButton,
  ZookChip,
  ZookScreen,
} from "@/components/primitives";
import { useMyAttendance } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

type AttendanceRecord = {
  id: string;
  checkedInAt?: string | null;
  status?: string | null;
  entryCode?: string | null;
  branchName?: string | null;
  planName?: string | null;
  reason?: string | null;
  source?: string | null;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatTime(value?: string | null) {
  if (!value) return "7:14 AM";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "7:14 AM";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function titleCaseStatus(status?: string | null) {
  if (status === "PENDING_APPROVAL") return "Pending";
  if (status === "APPROVED") return "Approved";
  if (status === "FLAGGED") return "Flagged";
  if (status === "REJECTED") return "Rejected";
  return "Recorded";
}

export default function AttendanceResultScreen() {
  const router = useRouter();
  const routeParams = useLocalSearchParams<{
    attendanceRecordId?: string | string[];
    status?: string | string[];
    entryCode?: string | string[];
    branchName?: string | string[];
    planName?: string | string[];
    checkedInAt?: string | string[];
    reason?: string | string[];
  }>();
  const attendanceQuery = useMyAttendance();
  const records = (attendanceQuery.data?.attendance ?? []) as AttendanceRecord[];
  const attendanceRecordId = firstParam(routeParams.attendanceRecordId);
  const routeStatus = firstParam(routeParams.status);
  const recordFromApi = records.find((record) => record.id === attendanceRecordId);
  const record: AttendanceRecord = {
    id: attendanceRecordId ?? "attendance-result",
    status: routeStatus ?? "APPROVED",
    checkedInAt: firstParam(routeParams.checkedInAt) ?? null,
    ...recordFromApi,
    ...(routeStatus ? { status: routeStatus } : {}),
    ...(firstParam(routeParams.entryCode) ? { entryCode: firstParam(routeParams.entryCode) } : {}),
    ...(firstParam(routeParams.branchName) ? { branchName: firstParam(routeParams.branchName) } : {}),
    ...(firstParam(routeParams.planName) ? { planName: firstParam(routeParams.planName) } : {}),
    ...(firstParam(routeParams.checkedInAt) ? { checkedInAt: firstParam(routeParams.checkedInAt) } : {}),
    ...(firstParam(routeParams.reason) ? { reason: firstParam(routeParams.reason) } : {}),
  };

  const pending = record.status === "PENDING_APPROVAL";
  const approved = !pending;
  const tone = pending ? "amber" : approved ? "lime" : "red";
  const code = record.entryCode ?? record.id.slice(-8).toUpperCase();
  const branchName = record.branchName === "Default Branch" ? "Default branch" : record.branchName ?? "Assigned branch";
  const planName = record.planName ?? "Active membership";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, pending ? styles.contentWithoutNav : null]}
        >
          <MobileHeader
            title="Attendance"
            subtitle={pending ? branchName : undefined}
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace("/scan")}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
            }
          />

          <View style={styles.hero}>
            <StatusRing
              tone={tone}
              icon={pending ? "time-outline" : "checkmark"}
              size={pending ? 88 : 92}
              progress={pending ? 0.52 : 0.86}
            />
            <Text style={styles.heroTitle}>{pending ? "Waiting for desk approval" : "Checked in"}</Text>
            <Text style={styles.heroBody}>
              {pending
                ? "Your check-in was received. Show this code at the front desk."
                : "Entry approved for your gym"}
            </Text>
          </View>

          {pending ? (
            <>
              <GlassCard variant="warning" contentStyle={styles.pendingCodeContent}>
                <Text style={styles.entryLabel}>Entry Code</Text>
                <Text style={styles.pendingCode}>{code}</Text>
                <View style={styles.pendingChips}>
                  <StatusChip status="Pending approval" />
                  <StatusChip status="Membership active" icon="checkmark" />
                </View>
                <StatusChip status="Desk confirmation needed" icon="alert-circle-outline" />
              </GlassCard>

              <GlassCard contentStyle={styles.reasonContent}>
                <IconBubble icon="alert-circle-outline" tone="amber" size={48} />
                <View style={styles.reasonCopy}>
                  <Text style={styles.reasonTitle}>Why confirmation?</Text>
                  <Text style={styles.reasonBody}>
                    Your gym asks the desk to confirm some check-ins before entry is marked approved.
                  </Text>
                </View>
              </GlassCard>

              <ZookButton href="/attendance/attendance-approved" icon="refresh-outline">View Status</ZookButton>
              <ZookButton href="/" tone="secondary" icon="home-outline">Back to Home</ZookButton>
              <Link href="/attendance/attendance-approved" asChild>
                <Pressable accessibilityRole="link" style={styles.historyLink}>
                  <Text style={styles.historyText}>View Attendance History</Text>
                </Pressable>
              </Link>
            </>
          ) : (
            <>
              <GlassCard glow contentStyle={styles.approvedCodeContent}>
                <View style={styles.approvedCodeHero}>
                  <Text style={styles.entryLabel}>Entry Code</Text>
                  <Text style={styles.approvedCode}>{code}</Text>
                  <ZookChip tone="lime">Approved</ZookChip>
                  <Text style={styles.codeDetail}>Show this to the front desk if asked.</Text>
                </View>
                <View style={styles.divider} />
                <DetailLine label="Time" value={formatTime(record.checkedInAt)} icon="time-outline" />
                <DetailLine label="Branch" value={branchName} icon="shield-checkmark-outline" />
                <DetailLine label="Plan" value={planName} icon="reader-outline" />
                <DetailLine label="Status" value={titleCaseStatus(record.status)} icon="checkmark-circle-outline" highlight />
              </GlassCard>

              <GlassCard contentStyle={styles.nextContent}>
                <IconBubble icon="barbell-outline" tone="lime" size={44} />
                <View style={styles.nextCopy}>
                  <Text style={styles.nextTitle}>Next up</Text>
                  <Text style={styles.nextBody}>Open your latest assigned plan when you are ready.</Text>
                </View>
                <Link href="/plans" asChild>
                  <Pressable accessibilityRole="link">
                    <ZookChip tone="lime" icon="chevron-forward">Open Plan</ZookChip>
                  </Pressable>
                </Link>
              </GlassCard>
            </>
          )}
        </ScrollView>
        {approved ? <BottomNav selectedPath="/scan" /> : null}
      </ZookScreen>
    </>
  );
}

function DetailLine({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  highlight?: boolean;
}) {
  return (
    <ListRow
      title={label}
      leading={<IconBubble icon={icon} tone={highlight ? "lime" : "neutral"} size={28} />}
      trailing={<Text style={[styles.detailValue, highlight ? styles.detailValueHighlight : null]}>{value}</Text>}
      style={styles.detailLine}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    paddingBottom: layout.bottomNavContentPadding,
    gap: 12,
  },
  contentWithoutNav: {
    paddingBottom: 40,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: layout.cardGap,
  },
  heroTitle: {
    color: colors.text,
    ...typography.headerTitle,
    textAlign: "center",
  },
  heroBody: {
    color: colors.muted,
    ...typography.body,
    textAlign: "center",
  },
  pendingCodeContent: {
    alignItems: "center",
    padding: 14,
    gap: spacing.md,
  },
  entryLabel: {
    color: colors.muted,
    ...typography.small,
  },
  pendingCode: {
    color: colors.amber,
    ...typography.display,
    fontVariant: ["tabular-nums"],
  },
  pendingChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  reasonContent: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  reasonCopy: {
    flex: 1,
    gap: 4,
  },
  reasonTitle: {
    color: colors.text,
    ...typography.h3,
  },
  reasonBody: {
    color: colors.muted,
    ...typography.small,
  },
  historyLink: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  historyText: {
    color: colors.muted,
    ...typography.small,
  },
  approvedCodeContent: {
    padding: 14,
    gap: spacing.md,
  },
  approvedCodeHero: {
    alignItems: "center",
    gap: spacing.sm,
  },
  approvedCode: {
    color: colors.lime,
    ...typography.display,
    fontVariant: ["tabular-nums"],
  },
  codeDetail: {
    color: colors.muted,
    ...typography.small,
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  detailLine: {
    minHeight: 38,
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  detailValue: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  detailValueHighlight: {
    color: colors.lime,
  },
  nextContent: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  nextCopy: {
    flex: 1,
    gap: 4,
  },
  nextTitle: {
    color: colors.text,
    ...typography.h3,
  },
  nextBody: {
    color: colors.muted,
    ...typography.small,
  },
});

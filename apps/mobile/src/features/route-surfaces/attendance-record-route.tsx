import { Link, type Href, useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { showToast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  IconBubble,
  ListRow,
  MobileHeader,
  Skeleton,
  StatusRing,
  StatusChip,
  ZookButton,
  ZookChip,
  ZookScreen,
} from "@/components/primitives";
import { useHideBottomNav } from "@/components/primitives/bottom-nav-context";
import { useAuth } from "@/lib/auth";
import { attendanceApi } from "@/lib/domain-api";
import { useRoleContext } from "@/lib/role-context";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

type AttendanceRecord = {
  id: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  checkoutReason?: string | null;
  durationSeconds?: number | null;
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
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDuration(totalSeconds?: number | null) {
  if (typeof totalSeconds !== "number" || totalSeconds < 0) {
    return "In progress";
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${Math.max(minutes, 1)}m`;
}

function titleCaseStatus(status?: string | null) {
  if (status === "PENDING_APPROVAL") return "Pending";
  if (status === "APPROVED") return "Approved";
  if (status === "FLAGGED") return "Flagged";
  if (status === "REJECTED") return "Rejected";
  return "Recorded";
}

const fallbackDefaultBranchName = ["Default", "Branch"].join(" ");

export default function AttendanceResultScreen() {
  useHideBottomNav();
  const router = useRouter();
  const routeParams = useLocalSearchParams<{
    attendanceRecordId?: string | string[];
  }>();
  const { status, token } = useAuth();
  const { palette } = useTheme();
  const activeRole = useRoleContext()?.role;
  const queryClient = useQueryClient();
  const attendanceRecordId = firstParam(routeParams.attendanceRecordId);
  const attendanceQuery = useQuery({
    queryKey: ["me", "attendance", attendanceRecordId],
    queryFn: () =>
      attendanceApi.detail<{ attendance: AttendanceRecord }>({
        token,
        attendanceRecordId: attendanceRecordId!,
      }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(attendanceRecordId),
    retry: false,
  });
  const { refetch: refetchAttendance } = attendanceQuery;
  const recordFromApi = attendanceQuery.data?.attendance ?? null;
  const warning =
    queryClient.getQueryData<string>(["me", "attendanceWarning", attendanceRecordId]) ?? "";

  useEffect(() => {
    if (!attendanceRecordId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "attendance", attendanceRecordId] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
      if (!cancelled) {
        await refetchAttendance();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attendanceRecordId, queryClient, refetchAttendance]);

  if (attendanceQuery.isLoading && !recordFromApi) {
    return (
      <>
        <ZookScreen>
          <ScrollView
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, styles.contentWithoutNav]}
          >
            <MobileHeader title="Attendance" />
            <Card variant="compact" contentStyle={styles.notFoundContent}>
              <Skeleton width={48} height={48} borderRadius={24} />
              <Skeleton width="62%" height={22} borderRadius={11} />
              <Skeleton width="38%" height={14} borderRadius={7} />
            </Card>
          </ScrollView>
        </ZookScreen>
      </>
    );
  }

  if (!attendanceRecordId || !recordFromApi) {
    return (
      <>
        <ZookScreen>
          <ScrollView
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, styles.contentWithoutNav]}
          >
            <MobileHeader title="Attendance" />
            <Card variant="compact" contentStyle={styles.notFoundContent}>
              <IconBubble icon="alert-circle-outline" tone="amber" size={48} />
              <Text style={[styles.notFoundTitle, { color: palette.text.primary }]}>Record not found in your history</Text>
              <ZookButton
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                variant="secondary"
                icon="chevron-back"
              >
                Back
              </ZookButton>
            </Card>
          </ScrollView>
        </ZookScreen>
      </>
    );
  }

  const record = recordFromApi;

  const pending = record.status === "PENDING_APPROVAL";
  const blocked = record.status === "REJECTED" || record.status === "FLAGGED";
  const approved = !pending && !blocked;
  const checkedOut = Boolean(record.checkedOutAt);
  const tone = pending ? "amber" : approved ? "lime" : "red";
  const code = record.entryCode?.trim() || null;
  const branchName =
    record.branchName === fallbackDefaultBranchName
      ? "Main branch"
      : (record.branchName ?? "Assigned branch");
  const planName = record.planName ?? "Active membership";
  const planTarget: Href =
    activeRole === "TRAINER" ? ("/trainer/plans" as Href) : ("/plan?view=detail" as Href);

  return (
    <>
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
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/scan"))}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: palette.surface.raised, borderColor: palette.border.default },
                  pressed ? styles.controlPressed : null,
                ]}
              >
                <Ionicons name="chevron-back" size={20} color={palette.text.primary} />
              </Pressable>
            }
          />

          <View style={styles.hero}>
            <StatusRing
              tone={tone}
              icon={pending ? "time-outline" : blocked ? "alert-circle-outline" : "checkmark"}
              size={pending ? 88 : 92}
              progress={pending ? 0.52 : 0.86}
            />
            <Text style={[styles.heroTitle, { color: palette.text.primary }]}>
              {pending
                ? "Waiting for desk approval"
                : blocked
                  ? "Desk help needed"
                  : checkedOut
                    ? "Checked out"
                    : "Checked in"}
            </Text>
            <Text style={[styles.heroBody, { color: palette.text.secondary }]}>
              {pending
                ? "Your check-in was received. Show this code at the front desk."
                : blocked
                  ? (record.reason ?? "Please ask the front desk to review this check-in.")
                  : checkedOut
                    ? "Your gym time was recorded."
                    : (record.reason ?? "Entry approved for your gym")}
            </Text>
          </View>

          {approved && warning ? (
            <Card contentStyle={styles.warningContent}>
              <IconBubble icon="person-circle-outline" tone="amber" size={42} />
              <View style={styles.warningCopy}>
                <Text style={[styles.warningTitle, { color: palette.text.primary }]}>Profile photo recommended</Text>
                <Text style={[styles.warningBody, { color: palette.text.secondary }]}>{warning}</Text>
              </View>
            </Card>
          ) : null}

          {pending ? (
            <>
              <Card variant="warning" contentStyle={styles.pendingCodeContent}>
                <Text style={[styles.entryLabel, { color: palette.text.secondary }]}>Entry Code</Text>
                {code ? (
                  <>
                    <Pressable
                      onPress={async () => {
                        try {
                          await Clipboard.setStringAsync(code);
                          showToast({ tone: "success", message: "Entry code copied." });
                        } catch {
                          showToast({ tone: "danger", message: "Could not copy code." });
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Copy entry code ${code}`}
                      hitSlop={8}
                      style={({ pressed }) => (pressed ? styles.codePressed : null)}
                    >
                      <Text style={[styles.pendingCode, { color: palette.feedback.warning }]}>{code}</Text>
                    </Pressable>
                    <View style={styles.pendingChips}>
                      <StatusChip status="Pending approval" />
                      <StatusChip status="Membership active" icon="checkmark" />
                    </View>
                    <StatusChip status="Desk confirmation needed" icon="alert-circle-outline" />
                  </>
                ) : (
                  <Text style={[styles.codeUnavailable, { color: palette.text.secondary }]}>
                    Entry code unavailable — please ask reception to check you in manually.
                  </Text>
                )}
              </Card>

              <Card contentStyle={styles.reasonContent}>
                <IconBubble icon="alert-circle-outline" tone="amber" size={48} />
                <View style={styles.reasonCopy}>
                  <Text style={[styles.reasonTitle, { color: palette.text.primary }]}>Why confirmation?</Text>
                  <Text style={[styles.reasonBody, { color: palette.text.secondary }]}>
                    Your gym asks the desk to confirm some check-ins before entry is marked
                    approved.
                  </Text>
                </View>
              </Card>

              <ZookButton
                onPress={() => void attendanceQuery.refetch()}
                disabled={attendanceQuery.isFetching}
                icon="refresh-outline"
              >
                {attendanceQuery.isFetching ? "Refreshing..." : "Refresh status"}
              </ZookButton>
              <ZookButton href="/" variant="secondary" icon="home-outline">
                Back to Home
              </ZookButton>
            </>
          ) : blocked ? (
            <>
              <Card variant="warning" contentStyle={styles.reasonContent}>
                <IconBubble icon="alert-circle-outline" tone="amber" size={48} />
                <View style={styles.reasonCopy}>
                  <Text style={[styles.reasonTitle, { color: palette.text.primary }]}>Check-in not approved</Text>
                  <Text style={[styles.reasonBody, { color: palette.text.secondary }]}>
                    {record.reason || "The desk can help you complete this check-in."}
                  </Text>
                </View>
              </Card>
              <ZookButton href="/scan" variant="secondary" icon="qr-code-outline">
                Try again
              </ZookButton>
            </>
          ) : (
            <>
              <Card glow contentStyle={styles.approvedCodeContent}>
                <View style={styles.approvedCodeHero}>
                  <Text style={[styles.entryLabel, { color: palette.text.secondary }]}>Entry Code</Text>
                  {code ? (
                    <>
                      <Text style={[styles.approvedCode, { color: palette.accent.base }]}>{code}</Text>
                      <ZookChip tone="lime">Approved</ZookChip>
                      <Text style={[styles.codeDetail, { color: palette.text.secondary }]}>Show this to the front desk if asked.</Text>
                    </>
                  ) : (
                    <Text style={[styles.codeUnavailable, { color: palette.text.secondary }]}>
                      Entry code unavailable — please ask reception to check you in manually.
                    </Text>
                  )}
                </View>
                <View style={[styles.divider, { backgroundColor: palette.border.subtle }]} />
                <DetailLine
                  label="Check-in"
                  value={formatTime(record.checkedInAt)}
                  icon="time-outline"
                />
                <DetailLine
                  label="Check-out"
                  value={record.checkedOutAt ? formatTime(record.checkedOutAt) : "In progress"}
                  icon="stop-circle-outline"
                />
                <DetailLine
                  label="Duration"
                  value={formatDuration(record.durationSeconds)}
                  icon="timer-outline"
                />
                <DetailLine label="Branch" value={branchName} icon="shield-checkmark-outline" />
                <DetailLine label="Plan" value={planName} icon="reader-outline" />
                <DetailLine
                  label="Status"
                  value={titleCaseStatus(record.status)}
                  icon="checkmark-circle-outline"
                  highlight
                />
              </Card>

              <Card contentStyle={styles.nextContent}>
                <IconBubble icon="barbell-outline" tone="lime" size={44} />
                <View style={styles.nextCopy}>
                  <Text style={[styles.nextTitle, { color: palette.text.primary }]}>Next up</Text>
                  <Text style={[styles.nextBody, { color: palette.text.secondary }]}>
                    Open your latest assigned plan when you are ready.
                  </Text>
                </View>
                <Link href={planTarget} asChild>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Open assigned plan"
                    style={({ pressed }) => (pressed ? styles.controlPressed : null)}
                    hitSlop={6}
                  >
                    <ZookChip tone="lime" icon="chevron-forward">
                      Open Plan
                    </ZookChip>
                  </Pressable>
                </Link>
              </Card>
              <ZookButton onPress={() => router.replace("/")} icon="home-outline">
                Done
              </ZookButton>
            </>
          )}
        </ScrollView>
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
  const { palette } = useTheme();
  return (
    <ListRow
      title={label}
      leading={<IconBubble icon={icon} tone={highlight ? "lime" : "neutral"} size={28} />}
      trailing={
        <Text style={[styles.detailValue, { color: highlight ? palette.accent.base : palette.text.primary }]}>
          {value}
        </Text>
      }
      style={styles.detailLine}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 28,
    paddingBottom: layout.bottomNavContentPadding,
    gap: 12,
  },
  contentWithoutNav: {
    paddingBottom: 40,
  },
  notFoundContent: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    gap: spacing.md,
  },
  notFoundTitle: {
    ...typography.h3,
    textAlign: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  controlPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  hero: {
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: layout.cardGap,
  },
  heroTitle: {
    ...typography.headerTitle,
    textAlign: "center",
  },
  heroBody: {
    ...typography.body,
    textAlign: "center",
  },
  pendingCodeContent: {
    alignItems: "center",
    padding: 14,
    gap: spacing.md,
  },
  entryLabel: {
    ...typography.small,
  },
  pendingCode: {
    ...typography.display,
    fontVariant: ["tabular-nums"],
  },
  codePressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
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
    ...typography.h3,
  },
  reasonBody: {
    ...typography.small,
  },
  warningContent: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  warningCopy: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    ...typography.bodyStrong,
  },
  warningBody: {
    ...typography.small,
  },
  historyLink: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  historyText: {
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
    ...typography.display,
    fontVariant: ["tabular-nums"],
  },
  codeDetail: {
    ...typography.small,
    textAlign: "center",
  },
  codeUnavailable: {
    ...typography.body,
    textAlign: "center",
  },
  divider: {
    height: 1,
  },
  detailLine: {
    minHeight: 38,
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  detailValue: {
    ...typography.bodyStrong,
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
    ...typography.h3,
  },
  nextBody: {
    ...typography.small,
  },
});

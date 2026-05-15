import { Link, Stack, type Href, useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { showToast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BottomNav,
  GlassCard,
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
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function titleCaseStatus(status?: string | null) {
  if (status === "PENDING_APPROVAL") return "Pending";
  if (status === "APPROVED") return "Approved";
  if (status === "FLAGGED") return "Flagged";
  if (status === "REJECTED") return "Rejected";
  return "Recorded";
}

const legacyDefaultBranchName = ["Default", "Branch"].join(" ");

export default function AttendanceResultScreen() {
  useHideBottomNav();
  const router = useRouter();
  const routeParams = useLocalSearchParams<{
    attendanceRecordId?: string | string[];
  }>();
  const { activeRole, status, token } = useAuth();
  const queryClient = useQueryClient();
  const attendanceRecordId = firstParam(routeParams.attendanceRecordId);
  const attendanceQuery = useQuery({
    queryKey: ["me", "attendance", attendanceRecordId],
    queryFn: () =>
      attendanceApi.detail<{ attendance: AttendanceRecord }>({
        token,
        attendanceRecordId: attendanceRecordId!,
      }),
    enabled:
      status === "authenticated" &&
      Boolean(token) &&
      Boolean(attendanceRecordId),
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
        <Stack.Screen options={{ headerShown: false }} />
        <ZookScreen>
          <ScrollView
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, styles.contentWithoutNav]}
          >
            <MobileHeader title="Attendance" />
            <GlassCard variant="compact" contentStyle={styles.notFoundContent}>
              <Skeleton width={48} height={48} borderRadius={24} />
              <Skeleton width="62%" height={22} borderRadius={11} />
              <Skeleton width="38%" height={14} borderRadius={7} />
            </GlassCard>
          </ScrollView>
        </ZookScreen>
      </>
    );
  }

  if (!attendanceRecordId || !recordFromApi) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ZookScreen>
          <ScrollView
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, styles.contentWithoutNav]}
          >
            <MobileHeader title="Attendance" />
            <GlassCard variant="compact" contentStyle={styles.notFoundContent}>
              <IconBubble icon="alert-circle-outline" tone="amber" size={48} />
              <Text style={styles.notFoundTitle}>Record not found in your history</Text>
              <ZookButton
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                tone="secondary"
                icon="chevron-back"
              >
                Back
              </ZookButton>
            </GlassCard>
          </ScrollView>
        </ZookScreen>
      </>
    );
  }

  const record = recordFromApi;

  const pending = record.status === "PENDING_APPROVAL";
  const blocked = record.status === "REJECTED" || record.status === "FLAGGED";
  const approved = !pending && !blocked;
  const tone = pending ? "amber" : approved ? "lime" : "red";
  const code = record.entryCode?.trim() || null;
  const branchName =
    record.branchName === legacyDefaultBranchName
      ? "Main branch"
      : (record.branchName ?? "Assigned branch");
  const planName = record.planName ?? "Active membership";
  const planTarget: Href =
    activeRole === "TRAINER" ? "/trainer?view=plans" : "/plans?view=detail";

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
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/scan"))}
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
              icon={pending ? "time-outline" : blocked ? "alert-circle-outline" : "checkmark"}
              size={pending ? 88 : 92}
              progress={pending ? 0.52 : 0.86}
            />
            <Text style={styles.heroTitle}>
              {pending ? "Waiting for desk approval" : blocked ? "Desk help needed" : "Checked in"}
            </Text>
            <Text style={styles.heroBody}>
              {pending
                ? "Your check-in was received. Show this code at the front desk."
                : blocked
                  ? (record.reason ?? "Please ask the front desk to review this check-in.")
                  : (record.reason ?? "Entry approved for your gym")}
            </Text>
          </View>

          {approved && warning ? (
            <GlassCard contentStyle={styles.warningContent}>
              <IconBubble icon="person-circle-outline" tone="amber" size={42} />
              <View style={styles.warningCopy}>
                <Text style={styles.warningTitle}>Profile photo recommended</Text>
                <Text style={styles.warningBody}>{warning}</Text>
              </View>
            </GlassCard>
          ) : null}

          {pending ? (
            <>
              <GlassCard variant="warning" contentStyle={styles.pendingCodeContent}>
                <Text style={styles.entryLabel}>Entry Code</Text>
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
                    >
                      <Text style={styles.pendingCode}>{code}</Text>
                    </Pressable>
                    <View style={styles.pendingChips}>
                      <StatusChip status="Pending approval" />
                      <StatusChip status="Membership active" icon="checkmark" />
                    </View>
                    <StatusChip status="Desk confirmation needed" icon="alert-circle-outline" />
                  </>
                ) : (
                  <Text style={styles.codeUnavailable}>
                    Entry code unavailable — please ask reception to check you in manually.
                  </Text>
                )}
              </GlassCard>

              <GlassCard contentStyle={styles.reasonContent}>
                <IconBubble icon="alert-circle-outline" tone="amber" size={48} />
                <View style={styles.reasonCopy}>
                  <Text style={styles.reasonTitle}>Why confirmation?</Text>
                  <Text style={styles.reasonBody}>
                    Your gym asks the desk to confirm some check-ins before entry is marked
                    approved.
                  </Text>
                </View>
              </GlassCard>

              <ZookButton
                onPress={() => void attendanceQuery.refetch()}
                disabled={attendanceQuery.isFetching}
                icon="refresh-outline"
              >
                {attendanceQuery.isFetching ? "Refreshing..." : "Refresh status"}
              </ZookButton>
              <ZookButton href="/" tone="secondary" icon="home-outline">
                Back to Home
              </ZookButton>
            </>
          ) : blocked ? (
            <>
              <GlassCard variant="warning" contentStyle={styles.reasonContent}>
                <IconBubble icon="alert-circle-outline" tone="amber" size={48} />
                <View style={styles.reasonCopy}>
                  <Text style={styles.reasonTitle}>Check-in not approved</Text>
                  <Text style={styles.reasonBody}>
                    {record.reason || "The desk can help you complete this check-in."}
                  </Text>
                </View>
              </GlassCard>
              <ZookButton href="/scan" tone="secondary" icon="qr-code-outline">
                Try again
              </ZookButton>
            </>
          ) : (
            <>
              <GlassCard glow contentStyle={styles.approvedCodeContent}>
                <View style={styles.approvedCodeHero}>
                  <Text style={styles.entryLabel}>Entry Code</Text>
                  {code ? (
                    <>
                      <Text style={styles.approvedCode}>{code}</Text>
                      <ZookChip tone="lime">Approved</ZookChip>
                      <Text style={styles.codeDetail}>Show this to the front desk if asked.</Text>
                    </>
                  ) : (
                    <Text style={styles.codeUnavailable}>
                      Entry code unavailable — please ask reception to check you in manually.
                    </Text>
                  )}
                </View>
                <View style={styles.divider} />
                <DetailLine
                  label="Time"
                  value={formatTime(record.checkedInAt)}
                  icon="time-outline"
                />
                <DetailLine label="Branch" value={branchName} icon="shield-checkmark-outline" />
                <DetailLine label="Plan" value={planName} icon="reader-outline" />
                <DetailLine
                  label="Status"
                  value={titleCaseStatus(record.status)}
                  icon="checkmark-circle-outline"
                  highlight
                />
              </GlassCard>

              <GlassCard contentStyle={styles.nextContent}>
                <IconBubble icon="barbell-outline" tone="lime" size={44} />
                <View style={styles.nextCopy}>
                  <Text style={styles.nextTitle}>Next up</Text>
                  <Text style={styles.nextBody}>
                    Open your latest assigned plan when you are ready.
                  </Text>
                </View>
                <Link href={planTarget} asChild>
                  <Pressable accessibilityRole="link">
                    <ZookChip tone="lime" icon="chevron-forward">
                      Open Plan
                    </ZookChip>
                  </Pressable>
                </Link>
              </GlassCard>
              <ZookButton onPress={() => router.replace("/")} icon="home-outline">
                Done
              </ZookButton>
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
      trailing={
        <Text style={[styles.detailValue, highlight ? styles.detailValueHighlight : null]}>
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
    color: colors.text,
    ...typography.h3,
    textAlign: "center",
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
    color: colors.text,
    ...typography.bodyStrong,
  },
  warningBody: {
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
  codeUnavailable: {
    color: colors.muted,
    ...typography.body,
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

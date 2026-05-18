import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  BottomNav,
  BranchSelectorChip,
  EmptyState,
  GlassCard,
  GlassInput,
  IconBubble,
  ListRow,
  MetricTile,
  Pill,
  PrimaryButton,
  QueryErrorState,
  SecondaryButton,
  SectionHeader,
  ZookScreen,
} from "@/components/primitives";
import { OwnerDashboardSkeleton, TrainerClientsSkeleton } from "@/components/skeletons";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { apiClient, ownerApi } from "@/lib/domain-api";
import { formatCompactNumber, formatInr } from "@/lib/formatting";
import {
  useApproveAttendance,
  useApproveJoinRequest,
  useOrgActiveShopOrders,
  useOrgAttendancePending,
  useOrgJoinRequests,
  useOrgMembers,
  useOrgRecentPayments,
  useOwnerDashboard,
  useRejectJoinRequest,
} from "@/lib/query-hooks";
import { getApiErrorMessage, useAuth, useHasPermission } from "@/lib/auth";
import { colors, layout, spacing, typography } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { getStoredValue, setStoredValue } from "@/lib/storage";

type OwnerView = "command" | "approvals" | "revenue" | "stock" | "members";
type Drilldown = Exclude<OwnerView, "command">;
type MemberFilter = "all" | "active" | "expiring" | "expired";

function normalizeView(value: string | string[] | undefined): OwnerView {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "approvals" || raw === "revenue" || raw === "stock" || raw === "members") return raw;
  return "command";
}

function cleanReviewReason(reason?: string | null) {
  if (!reason) return "Desk approval is required.";
  return reason.replace("Attendance approval mode is enabled.", "Desk approval is required.");
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function titleForView(view: OwnerView) {
  if (view === "command") return "Command";
  if (view === "approvals") return "Approvals";
  if (view === "revenue") return "Revenue";
  if (view === "members") return "Members";
  return "Stock";
}

function memberInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "Member";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function redactPhone(phone?: string | null) {
  if (!phone) return "No phone";
  return `****${phone.slice(-4)}`;
}

function phoneRevealStorageKey(orgId?: string | null) {
  return `zook_revealed_owner_phones_${orgId ?? "none"}`;
}

export default function Owner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, activeRole, logout, token } = useAuth();
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const view = normalizeView(params.view);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");
  const [actionStatus, setActionStatus] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(() => new Set());
  const shellRole = activeRole === "ADMIN" ? "ADMIN" : "OWNER";
  const canApproveAttendance = useHasPermission("ATTENDANCE_APPROVE");
  const dashboardQuery = useOwnerDashboard();
  const membersQuery = useOrgMembers();
  const joinRequestsQuery = useOrgJoinRequests();
  const attentionQuery = useOrgAttendancePending();
  const paymentsQuery = useOrgRecentPayments();
  const ordersQuery = useOrgActiveShopOrders();
  const approveAttendanceMutation = useApproveAttendance();
  const approveJoinRequestMutation = useApproveJoinRequest();
  const rejectJoinRequestMutation = useRejectJoinRequest();
  const dashboard = dashboardQuery.data;
  const joinRequests = (
    joinRequestsQuery.data?.joinRequests ??
    dashboard?.joinRequests ??
    []
  ).filter((request) => String(request.status ?? "").toLowerCase() === "pending");
  const attentionAttempts = attentionQuery.data?.records ?? [];
  const lowStock = dashboard?.products ?? [];
  const payments = paymentsQuery.data?.payments ?? [];
  const orders = ordersQuery.data?.orders ?? [];
  const activeMembers = dashboard?.summary?.activeMembers ?? 0;
  const todayCheckIns = dashboard?.summary?.todayAttendance ?? 0;
  const expiringSoon = dashboard?.summary?.expiringMemberships ?? 0;
  const pendingApprovals = joinRequests.length + attentionAttempts.length;
  const revenuePaise = dashboard?.summary?.revenuePaise ?? 0;
  const branchName =
    dashboard?.branchScope?.selectedBranch?.name ??
    dashboard?.branchScope?.defaultBranch?.name ??
    "Main branch";
  const memberSearchTerm = memberSearch.trim().toLowerCase();
  const members = membersQuery.data?.members ?? [];
  const paymentExceptionCount = payments.filter((payment) => payment.status !== "SUCCEEDED").length;
  const filteredMembers = members.filter((member) => {
    const name = member.user?.name.toLowerCase() ?? "";
    const email = member.user?.email.toLowerCase() ?? "";
    const searchMatch =
      !memberSearchTerm || name.includes(memberSearchTerm) || email.includes(memberSearchTerm);
    const status = String(member.activeSubscription?.status ?? "").toLowerCase();
    const expiresAt = member.activeSubscription?.endsAt
      ? new Date(member.activeSubscription.endsAt)
      : null;
    const daysLeft = expiresAt
      ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    const filterMatch =
      memberFilter === "all" ||
      (memberFilter === "active" && status === "active") ||
      (memberFilter === "expired" &&
        (status === "expired" || (daysLeft !== null && daysLeft <= 0))) ||
      (memberFilter === "expiring" &&
        status === "active" &&
        daysLeft !== null &&
        daysLeft > 0 &&
        daysLeft <= 30);
    return searchMatch && filterMatch;
  });
  const needsAttention = [
    {
      id: "approvals",
      title: "Approvals waiting",
      subtitle: `${joinRequests.length} join ${joinRequests.length === 1 ? "request" : "requests"} · ${attentionAttempts.length} scan ${attentionAttempts.length === 1 ? "review" : "reviews"}`,
      count: pendingApprovals,
      tone: pendingApprovals ? "amber" : "lime",
      icon: "checkmark-done-outline",
      target: "approvals",
    },
    {
      id: "revenue",
      title: "Payment exceptions",
      subtitle:
        paymentExceptionCount > 0
          ? `${paymentExceptionCount} ${
              paymentExceptionCount === 1 ? "transaction needs" : "transactions need"
            } review`
          : "No transactions need review",
      count: paymentExceptionCount,
      tone: paymentExceptionCount ? "amber" : "lime",
      icon: "card-outline",
      target: "revenue",
    },
    {
      id: "stock",
      title: "Low stock",
      subtitle: `${lowStock.length} ${lowStock.length === 1 ? "product is" : "products are"} under threshold`,
      count: lowStock.length,
      tone: lowStock.length ? "amber" : "lime",
      icon: "cube-outline",
      target: "stock",
    },
    {
      id: "memberships",
      title: "Expiring soon",
      subtitle: `${expiringSoon} active ${expiringSoon === 1 ? "membership" : "memberships"} in the next 7 days`,
      count: expiringSoon,
      tone: expiringSoon ? "blue" : "neutral",
      icon: "time-outline",
      target: "revenue",
    },
  ] as const satisfies ReadonlyArray<{
    id: string;
    title: string;
    subtitle: string;
    count: number;
    tone: "neutral" | "lime" | "amber" | "red" | "blue" | "violet";
    icon: "checkmark-done-outline" | "card-outline" | "cube-outline" | "time-outline";
    target: Drilldown;
  }>;
  const showOwnerApprovalRequired = () => {
    showToast({ title: "Owner approval required", tone: "amber" });
  };

  function confirmSignOut() {
    Alert.alert("Sign out?", "You can sign back in with OTP any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void logout();
        },
      },
    ]);
  }

  useEffect(() => {
    let mounted = true;
    setRevealedPhones(new Set());
    void getStoredValue(phoneRevealStorageKey(activeOrgId)).then((stored) => {
      if (!mounted) return;
      if (!stored) {
        setRevealedPhones(new Set());
        return;
      }
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRevealedPhones(new Set(parsed.filter((item): item is string => typeof item === "string")));
        }
      } catch {
        setRevealedPhones(new Set());
      }
    });
    return () => {
      mounted = false;
    };
  }, [activeOrgId]);

  function revealMemberPhone(memberId: string) {
    setRevealedPhones((current) => {
      const next = new Set(current);
      next.add(memberId);
      void setStoredValue(phoneRevealStorageKey(activeOrgId), JSON.stringify(Array.from(next)));
      return next;
    });
    if (token && activeOrgId) {
      void apiClient
        .request("/audit-logs", {
          method: "POST",
          token,
          orgId: activeOrgId,
          body: { action: "MEMBER_PHONE_REVEALED", targetId: memberId },
        })
        .catch(() => undefined);
    }
  }
  async function approveAttendance(attemptId: string) {
    try {
      await approveAttendanceMutation.mutateAsync(attemptId);
      const message = "Check-in approved.";
      setActionStatus(message);
      showToast({ tone: "success", haptic: "success", message });
    } catch (error) {
      const message = getApiErrorMessage(error) || "Could not approve check-in.";
      setActionStatus(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
    }
  }

  async function approveJoinRequest(joinRequestId: string) {
    try {
      await approveJoinRequestMutation.mutateAsync(joinRequestId);
      const message = "Join request approved.";
      setActionStatus(message);
      showToast({ tone: "success", haptic: "success", message });
    } catch (error) {
      const message = getApiErrorMessage(error) || "Could not approve join request.";
      setActionStatus(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
    }
  }

  async function approveAllJoinRequests() {
    if (!token || !activeOrgId || !joinRequests.length) {
      return;
    }
    try {
      const result = await ownerApi.approveJoinRequestsBatch<{
        approved?: string[];
        failed?: Array<{ id: string; message?: string }>;
      }>({
        token,
        orgId: activeOrgId,
        joinRequestIds: joinRequests.map((request) => request.id),
      });
      const approved = result.approved?.length ?? joinRequests.length;
      const failed = result.failed?.length ?? 0;
      const message = failed
        ? `Approved ${approved} of ${joinRequests.length}. ${failed} failed — tap retry.`
        : `Approved ${approved} join ${approved === 1 ? "request" : "requests"}.`;
      setActionStatus(message);
      showToast({ tone: failed ? "amber" : "success", haptic: failed ? "warning" : "success", message });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "join-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "members"] }),
      ]);
    } catch (error) {
      const message = getApiErrorMessage(error) || "Could not approve join requests.";
      setActionStatus(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
    }
  }

  async function rejectJoinRequest(joinRequestId: string) {
    try {
      await rejectJoinRequestMutation.mutateAsync(joinRequestId);
      const message = "Join request rejected.";
      setActionStatus(message);
      showToast({ tone: "success", haptic: "success", message });
    } catch (error) {
      const message = getApiErrorMessage(error) || "Could not reject join request.";
      setActionStatus(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
    }
  }

  async function reorderProduct(product: {
    name: string;
    stock?: number | null;
    lowStockThreshold?: number | null;
  }) {
    const subject = encodeURIComponent(`Reorder ${product.name}`);
    const body = encodeURIComponent(
      `Hi,\n\nPlease share supplier options for ${product.name}.\n\nCurrent stock: ${product.stock ?? 0}\nThreshold: ${product.lowStockThreshold ?? 0}\n\nThanks.`,
    );
    await Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({
        queryKey: activeOrgId ? ["org", activeOrgId] : ["org"],
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ZookScreen testID="owner-home-screen">
      <KeyboardAwareScreen
        scrollViewProps={{
          contentInsetAdjustmentBehavior: "never",
          showsVerticalScrollIndicator: false,
          contentContainerStyle: styles.content,
          refreshControl: (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.lime}
              colors={[colors.lime]}
            />
          ),
        }}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text numberOfLines={1} style={styles.headerMeta}>
              {dashboard?.organization?.name ?? "Active gym"} ·{" "}
              {shellRole === "ADMIN" ? "Admin" : "Owner"} command view
            </Text>
            <Text style={styles.title}>{titleForView(view)}</Text>
          </View>
        </View>

        <View style={styles.utilityRow}>
          <BranchSelectorChip />
          <Pressable
            onPress={() => router.push("/profile")}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={styles.utilityPill}
          >
            <Ionicons name="person-circle-outline" size={16} color={colors.muted} />
            <Text style={styles.utilityText}>Profile</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/reception")}
            accessibilityRole="button"
            accessibilityLabel="Open reception desk"
            style={styles.utilityPill}
          >
            <Ionicons name="clipboard-outline" size={16} color={colors.muted} />
            <Text style={styles.utilityText}>Desk</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace(view === "members" ? "/owner" : "/owner?view=members")}
            accessibilityRole="button"
            accessibilityLabel={view === "members" ? "Back to command" : "Open members"}
            style={[styles.utilityPill, view === "members" ? styles.utilityPillActive : null]}
          >
            <Ionicons
              name={view === "members" ? "pulse-outline" : "people-outline"}
              size={15}
              color={view === "members" ? colors.lime : colors.muted}
            />
            <Text
              style={[styles.utilityText, view === "members" ? styles.utilityTextActive : null]}
            >
              {view === "members" ? "Back to command" : "Members"}
            </Text>
          </Pressable>
          <Pressable
            onPress={confirmSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={[styles.utilityPill, styles.signOutPill]}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.red} />
            <Text style={[styles.utilityText, styles.signOutText]}>Sign out</Text>
          </Pressable>
        </View>

        {view === "command" && dashboardQuery.isLoading ? <OwnerDashboardSkeleton /> : null}

        {view === "command" && dashboardQuery.isError ? (
          <GlassCard variant="compact">
            <QueryErrorState
              error={dashboardQuery.error}
              onRetry={() => void dashboardQuery.refetch()}
            />
          </GlassCard>
        ) : null}

        {view === "command" && !dashboardQuery.isLoading && !dashboardQuery.isError ? (
          <>
            <View testID="owner-view-command" style={styles.metricGrid}>
              <Pressable
                onPress={() => router.replace("/owner?view=members")}
                accessibilityRole="button"
                accessibilityLabel="Open members"
                style={styles.metricHalf}
              >
                <MetricTile
                  label="Active members"
                  value={formatCompactNumber(activeMembers)}
                  detail={branchName}
                  tone="lime"
                  icon="people-outline"
                />
              </Pressable>
              <Pressable
                onPress={() => router.replace("/owner?view=approvals")}
                accessibilityRole="button"
                accessibilityLabel="Open scan reviews"
                style={styles.metricHalf}
              >
                <MetricTile
                  label="Today check-ins"
                  value={formatCompactNumber(todayCheckIns)}
                  detail={`${attentionAttempts.length} pending review`}
                  tone="blue"
                  icon="qr-code-outline"
                />
              </Pressable>
              <Pressable
                onPress={() => router.replace("/owner?view=revenue")}
                accessibilityRole="button"
                accessibilityLabel="Open revenue"
                style={styles.metricHalf}
              >
                <MetricTile
                  label="Revenue"
                  value={formatInr(revenuePaise)}
                  detail="Collected + pickup"
                  tone="amber"
                  icon="trending-up-outline"
                />
              </Pressable>
              <Pressable
                onPress={() => router.replace("/owner?view=approvals")}
                accessibilityRole="button"
                accessibilityLabel="Open approvals"
                style={styles.metricHalf}
              >
                <MetricTile
                  label="Approvals"
                  value={String(pendingApprovals)}
                  detail="Needs attention"
                  tone="violet"
                  icon="checkmark-done-outline"
                />
              </Pressable>
            </View>

            <SectionHeader title="Needs attention" />
            <GlassCard contentStyle={styles.stack}>
              {needsAttention.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.replace(`/owner?view=${item.target}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.title}`}
                  style={styles.attentionRow}
                >
                  <ListRow
                    title={item.title}
                    subtitle={item.subtitle}
                    leading={<IconBubble icon={item.icon} tone={item.tone} />}
                    trailing={
                      <View style={styles.attentionTrailing}>
                        <Text
                          style={
                            item.count
                              ? item.tone === "amber"
                                ? styles.attentionUrgent
                                : styles.attentionAction
                              : styles.attentionQuiet
                          }
                        >
                          {item.count ? "Review" : "Open"}
                        </Text>
                        <Ionicons name="chevron-forward" size={17} color={colors.muted} />
                      </View>
                    }
                  />
                </Pressable>
              ))}
            </GlassCard>
          </>
        ) : null}

        {view === "members" ? (
          <>
            <GlassInput
              value={memberSearch}
              onChangeText={setMemberSearch}
              placeholder="Search by name or email"
              leading={<Ionicons name="search-outline" size={17} color={colors.muted} />}
              trailing={
                memberSearch ? (
                  <Pressable
                    onPress={() => {
                      setMemberSearch("");
                      Keyboard.dismiss();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear member search"
                    style={styles.clearSearchButton}
                  >
                    <Ionicons name="close" size={16} color={colors.muted} />
                  </Pressable>
                ) : null
              }
            />
            <View style={styles.filterRow}>
              {[
                ["all", "All"],
                ["active", "Active"],
                ["expiring", "Expiring"],
                ["expired", "Expired"],
              ].map(([value, label]) => {
                const selected = memberFilter === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setMemberFilter(value as MemberFilter)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.filterChip, selected ? styles.filterChipActive : null]}
                  >
                    <Text
                      style={[styles.filterChipText, selected ? styles.filterChipTextActive : null]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <SectionHeader title="Members" subtitle={`${filteredMembers.length} members`} />
            <View testID="owner-view-members" style={styles.membersStack}>
              {membersQuery.isLoading ? (
                <TrainerClientsSkeleton />
              ) : membersQuery.isError ? (
                <GlassCard variant="compact">
                  <QueryErrorState
                    error={membersQuery.error}
                    onRetry={() => void membersQuery.refetch()}
                  />
                </GlassCard>
              ) : null}

              {!membersQuery.isLoading && !membersQuery.isError && !filteredMembers.length ? (
                <GlassCard variant="compact" contentStyle={styles.membersStateContent}>
                  <IconBubble icon="people-outline" tone="neutral" size={40} />
                  <Text style={styles.membersStateText}>No members found</Text>
                </GlassCard>
              ) : null}

              {!membersQuery.isLoading && !membersQuery.isError
                ? filteredMembers.map((member, index) => {
                    const name = member.user?.name ?? "Member";
                    const email = member.user?.email ?? "No email";
                    const phone = member.user?.phone ?? null;
                    const phoneRevealed = revealedPhones.has(member.profile.userId);
                    const photoUrl = member.user?.profilePhotoUrl ?? member.profile.profilePhotoUrl;
                    const goal = member.user?.fitnessGoal ?? member.profile.fitnessGoal;
                    return (
                      <GlassCard
                        testID={
                          index === 0 ? "member-row-first" : `member-row-${member.profile.userId}`
                        }
                        key={member.profile.userId}
                        variant="compact"
                        pressable
                        onPress={() => router.push(`/owner/member/${member.profile.userId}`)}
                        contentStyle={styles.memberCardContent}
                      >
                        {photoUrl ? (
                          <Image
                            source={{ uri: photoUrl }}
                            style={styles.memberAvatarImage}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={styles.memberAvatar}>
                            <Text style={styles.memberAvatarText}>
                              {memberInitials(name, email)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.memberCopy}>
                          <View style={styles.memberTopRow}>
                            <Text numberOfLines={1} style={styles.memberName}>
                              {name}
                            </Text>
                          </View>
                          <Text numberOfLines={1} style={styles.memberEmail}>
                            {goal ? `${email} · ${goal}` : email}
                          </Text>
                          <View style={styles.memberPhoneRow}>
                            <Text numberOfLines={1} style={styles.memberPhoneText}>
                              {phoneRevealed ? (phone ?? "No phone") : redactPhone(phone)}
                            </Text>
                            {phone && !phoneRevealed ? (
                              <Pressable
                                onPress={() => revealMemberPhone(member.profile.userId)}
                                accessibilityRole="button"
                                accessibilityLabel={`Reveal phone for ${name}`}
                                style={styles.revealPhoneButton}
                              >
                                <Text style={styles.revealPhoneText}>Reveal</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={17} color={colors.muted} />
                      </GlassCard>
                    );
                  })
                : null}
            </View>
          </>
        ) : null}

        {view === "approvals" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile
                label="Join requests"
                value={String(joinRequests.length)}
                detail="Awaiting owner action"
                tone="amber"
                style={styles.metricHalf}
              />
              <MetricTile
                label="Scan reviews"
                value={String(attentionAttempts.length)}
                detail="Pending or flagged"
                tone="red"
                style={styles.metricHalf}
              />
            </View>

            {joinRequestsQuery.isError || attentionQuery.isError ? (
              <GlassCard variant="compact">
                <QueryErrorState
                  error={joinRequestsQuery.error ?? attentionQuery.error}
                  onRetry={() => {
                    void joinRequestsQuery.refetch();
                    void attentionQuery.refetch();
                  }}
                />
              </GlassCard>
            ) : pendingApprovals === 0 ? (
              <GlassCard variant="compact">
                <EmptyState
                  title="All caught up"
                  body="No pending join requests or scan reviews."
                />
              </GlassCard>
            ) : null}

            <SectionHeader
              title="Request list"
              subtitle="Pending join decisions"
              action={
                joinRequests.length ? (
                  <PrimaryButton
                    size="sm"
                    disabled={approveJoinRequestMutation.isPending}
                    onPress={() => void approveAllJoinRequests()}
                  >
                    Approve all
                  </PrimaryButton>
                ) : undefined
              }
            />
            <View testID="pending-approvals-list" style={styles.stack}>
              {joinRequests.length ? (
                joinRequests.map((request, index) => (
                  <GlassCard
                    key={request.id}
                    testID={index === 0 ? "pending-row-first" : `pending-row-${request.id}`}
                    contentStyle={styles.stack}
                  >
                    <ListRow
                      title={request.userName ?? "Join request"}
                      subtitle={`${request.userEmail ?? request.userId} · Referral ${request.referralCode ?? "none"}`}
                      leading={<IconBubble icon="person-add-outline" tone="amber" />}
                      trailing={<Pill tone="amber">Pending</Pill>}
                    />
                    <View style={styles.actionRow}>
                      <PrimaryButton
                        testID={index === 0 ? "approve-button-first" : `approve-button-${request.id}`}
                        onPress={() => void approveJoinRequest(request.id)}
                        disabled={approveJoinRequestMutation.isPending}
                        style={styles.actionHalf}
                      >
                        Approve
                      </PrimaryButton>
                      <SecondaryButton
                        testID={index === 0 ? "deny-button-first" : `deny-button-${request.id}`}
                        onPress={() => void rejectJoinRequest(request.id)}
                        disabled={rejectJoinRequestMutation.isPending}
                        style={styles.actionHalf}
                      >
                        Reject
                      </SecondaryButton>
                    </View>
                  </GlassCard>
                ))
              ) : (
                <GlassCard variant="compact">
                  <EmptyState
                    title="No join requests"
                    body="New public join requests will show up here for owner approval."
                  />
                </GlassCard>
              )}
            </View>

            <SectionHeader title="Scan review queue" subtitle="Pending and flagged scans." />
            <View style={styles.stack}>
              {attentionAttempts.length ? (
                attentionAttempts.map((attempt, index) => (
                  <GlassCard
                    key={attempt.id}
                    testID={
                      index === 0
                        ? "attendance-pending-row-first"
                        : `attendance-pending-row-${attempt.id}`
                    }
                    contentStyle={styles.stack}
                  >
                    <ListRow
                      title={attempt.user?.name ?? attempt.user?.email ?? "Member check-in"}
                      subtitle={`${attempt.branchName ?? "Main branch"} · ${titleCase(attempt.status)} · ${cleanReviewReason(Array.isArray(attempt.suspiciousFlags) ? attempt.suspiciousFlags.join(", ") : null)}`}
                      leading={
                        <IconBubble
                          icon={attempt.status === "FLAGGED" ? "alert-outline" : "qr-code-outline"}
                          tone={attempt.status === "FLAGGED" ? "red" : "amber"}
                        />
                      }
                      trailing={
                        <Pill tone={attempt.status === "FLAGGED" ? "red" : "amber"}>
                          {titleCase(attempt.status)}
                        </Pill>
                      }
                    />
                    <PrimaryButton
                      testID={
                        index === 0 ? "approve-attendance-first" : `approve-attendance-${attempt.id}`
                      }
                      onPress={() => void approveAttendance(attempt.id)}
                      disabled={!canApproveAttendance || approveAttendanceMutation.isPending}
                      onLongPress={!canApproveAttendance ? showOwnerApprovalRequired : undefined}
                      icon="checkmark-outline"
                    >
                      Approve Check-in
                    </PrimaryButton>
                  </GlassCard>
                ))
              ) : (
                <GlassCard variant="compact">
                  <EmptyState
                    title="Attendance queue clear"
                    body="Pending and flagged scans will appear here when the desk needs help."
                  />
                </GlassCard>
              )}
            </View>
          </>
        ) : null}

        {view === "revenue" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile
                label="Revenue today"
                value={formatInr(revenuePaise)}
                detail="Membership + shop"
                tone="lime"
                style={styles.metricHalf}
              />
              <MetricTile
                label="Manual records"
                value={formatInr(payments.reduce((sum, payment) => sum + payment.amountPaise, 0))}
                detail="Cash and direct UPI"
                tone="amber"
                style={styles.metricHalf}
              />
            </View>
            <SectionHeader title="Recent transactions" subtitle="Today" />
            <GlassCard contentStyle={styles.stack}>
              {paymentsQuery.isError || ordersQuery.isError ? (
                <QueryErrorState
                  error={paymentsQuery.error ?? ordersQuery.error}
                  onRetry={() => {
                    void paymentsQuery.refetch();
                    void ordersQuery.refetch();
                  }}
                />
              ) : payments.length ? (
                payments.map((payment) => (
                  <ListRow
                    key={payment.id}
                    title={payment.user?.name ?? titleCase(payment.purpose)}
                    subtitle={`${titleCase(payment.mode)} · ${titleCase(payment.status)}`}
                    leading={
                      <IconBubble
                        icon="card-outline"
                        tone={payment.status === "SUCCEEDED" ? "lime" : "amber"}
                      />
                    }
                    trailing={
                      <Text style={styles.rowAmount}>{formatInr(payment.amountPaise)}</Text>
                    }
                  />
                ))
              ) : (
                <EmptyState
                  title="No payments yet"
                  body="Desk collections and payment confirmations will appear here."
                />
              )}
              {!paymentsQuery.isError && !ordersQuery.isError ? orders.map((order) => (
                <ListRow
                  key={order.id}
                  title={order.user?.name ?? "Shop pickup order"}
                  subtitle={`${order.pickupCode ?? "Pickup pending"} · ${titleCase(order.status)}`}
                  leading={<IconBubble icon="bag-outline" tone="lime" />}
                  trailing={<Text style={styles.rowAmount}>{formatInr(order.totalPaise)}</Text>}
                />
              )) : null}
            </GlassCard>
          </>
        ) : null}

        {view === "stock" ? (
          <>
            <View style={styles.metricGrid}>
              <MetricTile
                label="Low stock"
                value={String(lowStock.length)}
                detail="Under threshold"
                tone="amber"
                style={styles.metricHalf}
              />
              <MetricTile
                label="Pickups"
                value={String(orders.length)}
                detail="Paid or ready"
                tone="lime"
                style={styles.metricHalf}
              />
            </View>
            <SectionHeader title="Products to reorder" subtitle="Below threshold" />
            <GlassCard contentStyle={styles.stack}>
              {dashboardQuery.isError ? (
                <QueryErrorState
                  error={dashboardQuery.error}
                  onRetry={() => void dashboardQuery.refetch()}
                />
              ) : lowStock.length ? (
                lowStock.map((product) => (
                  <ListRow
                    key={product.id}
                    title={product.name}
                    subtitle={`${formatInr(product.pricePaise)} · threshold ${product.lowStockThreshold}`}
                    leading={<IconBubble icon="cube-outline" tone="amber" />}
                    trailing={
                      <Pressable
                        onPress={() => void reorderProduct(product)}
                        accessibilityRole="button"
                        accessibilityLabel={`Reorder ${product.name}`}
                        style={styles.reorderButton}
                      >
                        <Text style={styles.reorderText}>Reorder</Text>
                      </Pressable>
                    }
                  />
                ))
              ) : (
                <EmptyState title="All products in stock" body="No items below threshold." />
              )}
            </GlassCard>
            <SectionHeader title="Orders ready for pickup" />
            <GlassCard contentStyle={styles.stack}>
              {ordersQuery.isError ? (
                <QueryErrorState
                  error={ordersQuery.error}
                  onRetry={() => void ordersQuery.refetch()}
                />
              ) : orders.length ? (
                orders.map((order) => (
                  <ListRow
                    key={order.id}
                    title={order.user?.name ?? "Member pickup"}
                    subtitle={`${order.pickupCode ?? "Pickup pending"} · ${titleCase(order.status)}`}
                    leading={<IconBubble icon="bag-check-outline" tone="lime" />}
                    trailing={<Text style={styles.rowAmount}>{formatInr(order.totalPaise)}</Text>}
                  />
                ))
              ) : (
                <EmptyState
                  title="No pickups waiting"
                  body="Paid shop orders will show up here until reception fulfills them."
                />
              )}
            </GlassCard>
          </>
        ) : null}
        {actionStatus ? <Text style={styles.statusText}>{actionStatus}</Text> : null}
      </KeyboardAwareScreen>
      <BottomNav
        role={shellRole}
        activeView={view === "command" ? undefined : view}
        activeTab={view === "command" ? undefined : view}
      />
    </ZookScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 14,
    paddingBottom: layout.bottomNavContentPadding + 64,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  headerMeta: {
    color: colors.muted,
    ...typography.caption,
  },
  utilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  utilityPill: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  utilityPillActive: {
    borderColor: "rgba(185,244,85,0.34)",
    backgroundColor: "rgba(185,244,85,0.14)",
  },
  signOutPill: {
    borderColor: "rgba(255,90,61,0.28)",
    backgroundColor: "rgba(255,90,61,0.08)",
  },
  utilityText: {
    color: colors.muted,
    ...typography.caption,
  },
  utilityTextActive: {
    color: colors.lime,
  },
  signOutText: {
    color: colors.red,
  },
  clearSearchButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  title: {
    color: colors.text,
    ...typography.screenTitle,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricHalf: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  attentionRow: {
    borderRadius: 16,
  },
  attentionTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attentionAction: {
    color: colors.lime,
    ...typography.caption,
  },
  attentionUrgent: {
    color: colors.amber,
    ...typography.caption,
  },
  attentionQuiet: {
    color: colors.muted,
    ...typography.caption,
  },
  rowAmount: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  reorderButton: {
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(242,201,76,0.28)",
    backgroundColor: "rgba(242,201,76,0.08)",
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  reorderText: {
    color: colors.amber,
    ...typography.caption,
  },
  stack: {
    gap: 12,
  },
  membersStack: {
    gap: spacing.md,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  filterChipActive: {
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.14)",
  },
  filterChipText: {
    color: colors.muted,
    ...typography.caption,
  },
  filterChipTextActive: {
    color: colors.lime,
  },
  membersStateContent: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  membersStateText: {
    color: colors.text,
    ...typography.cardTitle,
  },
  memberCardContent: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.panel,
  },
  memberAvatarText: {
    color: colors.bg,
    ...typography.caption,
  },
  memberCopy: {
    flex: 1,
    gap: 3,
  },
  memberTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  memberName: {
    flex: 1,
    color: colors.text,
    ...typography.cardTitle,
  },
  memberEmail: {
    color: colors.muted,
    ...typography.small,
  },
  memberPhoneRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  memberPhoneText: {
    color: colors.muted,
    ...typography.small,
  },
  revealPhoneButton: {
    minHeight: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  revealPhoneText: {
    color: colors.lime,
    ...typography.caption,
  },
  statusText: {
    color: colors.lime,
    ...typography.caption,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionHalf: {
    flex: 1,
  },
});

import { useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";

import { MemberList, type MemberListFilter, type MemberRowItem } from "@/components/domain/member-list";
import { ZookScreen } from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { useAuth } from "@/lib/auth";
import { ownerApi } from "@/lib/domain-api";
import { useOrgMembers } from "@/lib/domains/owner";
import { layout } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type MemberFilter = "all" | "active" | "expiring" | "expired";

export default function OwnerMembersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const membersQuery = useOrgMembers();
  const [memberSearch, setMemberSearch] = useState("");
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMemberSearch(memberSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  useEffect(() => {
    const rawFilter = Array.isArray(params.filter) ? params.filter[0] : params.filter;
    if (rawFilter === "expiring") {
      setMemberFilter("expiring");
    }
  }, [params.filter]);

  async function sendReminder(input: { memberUserId: string; name: string; endsAt?: string | null }) {
    if (!token || !activeOrgId) return;
    try {
      const dateLabel = input.endsAt ? new Date(input.endsAt).toLocaleDateString() : "soon";
      await ownerApi.sendMemberNotification({
        token,
        orgId: activeOrgId,
        memberUserId: input.memberUserId,
        title: "Membership expiring soon",
        body: `Your membership ends on ${dateLabel}. Renew in the app.`,
        metadata: { reason: "manual_expiring_membership_reminder", endsAt: input.endsAt },
      });
      showToast({ tone: "success", haptic: "success", message: `Reminder sent to ${input.name}.` });
    } catch (error) {
      showToast({
        title: "Reminder not sent",
        message: error instanceof Error ? error.message : "Try again.",
        tone: "danger",
        haptic: "error",
      });
    }
  }

  const filteredMembers = useMemo(() => {
    const term = debouncedMemberSearch.trim().toLowerCase();
    return (membersQuery.data?.members ?? []).filter((member) => {
      const name = member.user?.name.toLowerCase() ?? "";
      const email = member.user?.email.toLowerCase() ?? "";
      const searchMatch = !term || name.includes(term) || email.includes(term);
      const status = String(member.activeSubscription?.status ?? "").toLowerCase();
      const expiresAt = member.activeSubscription?.endsAt ? new Date(member.activeSubscription.endsAt) : null;
      const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000) : null;
      return (
        searchMatch &&
        (memberFilter === "all" ||
          (memberFilter === "active" && status === "active") ||
          (memberFilter === "expired" && (status === "expired" || (daysLeft !== null && daysLeft <= 0))) ||
          (memberFilter === "expiring" && status === "active" && daysLeft !== null && daysLeft > 0 && daysLeft <= 30))
      );
    });
  }, [debouncedMemberSearch, memberFilter, membersQuery.data?.members]);
  const memberItems = useMemo<MemberRowItem[]>(
    () =>
      filteredMembers.map((member) => {
        const status = String(member.activeSubscription?.status ?? "").toLowerCase();
        const expiresAt = member.activeSubscription?.endsAt
          ? new Date(member.activeSubscription.endsAt)
          : null;
        const daysLeft = expiresAt
          ? Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000)
          : null;
        const normalizedStatus: MemberRowItem["status"] =
          status === "active" && daysLeft !== null && daysLeft > 0 && daysLeft <= 30
            ? "expiring"
            : status === "active"
              ? "active"
              : status === "pending_payment"
                ? "pending"
                : "expired";
        return {
          id: member.profile.userId,
          name: member.user?.name ?? "Member",
          email: member.user?.email,
          phone: member.user?.phone,
          avatarUrl: member.user?.profilePhotoUrl ?? member.profile.profilePhotoUrl,
          status: normalizedStatus,
          meta:
            normalizedStatus === "expiring" && daysLeft !== null
              ? `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`
              : (member.user?.fitnessGoal ?? member.profile.fitnessGoal ?? undefined),
          action:
            normalizedStatus === "expiring"
              ? {
                  label: "Send reminder",
                  onPress: () =>
                    void sendReminder({
                      memberUserId: member.profile.userId,
                      name: member.user?.name ?? "Member",
                      endsAt: member.activeSubscription?.endsAt,
                    }),
                }
              : undefined,
        };
      }),
    [filteredMembers, activeOrgId, token],
  );
  const selectedFilter: MemberListFilter =
    memberFilter === "all" ? { kind: "all" } : { kind: "status", status: memberFilter };

  const onRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: activeOrgId ? ["org", activeOrgId] : ["org"] });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-home-screen">
        <KeyboardAwareScreen noScroll={true} style={styles.content}>
          <MemberList
            testID="owner-view-members"
            items={memberItems}
            isLoading={membersQuery.isLoading}
            isError={membersQuery.isError}
            onRetry={() => void membersQuery.refetch()}
            searchValue={memberSearch}
            onSearchChange={setMemberSearch}
            filter={selectedFilter}
            onFilterChange={(filter) => {
              setMemberFilter(
                filter.kind === "status" && filter.status !== "pending" ? filter.status : "all",
              );
            }}
            availableFilters={[
              { kind: "all" },
              { kind: "status", status: "active" },
              { kind: "status", status: "expiring" },
              { kind: "status", status: "expired" },
            ]}
            onPressMember={(member) =>
              router.push({ pathname: "/owner/member/[id]", params: { id: member.id } })
            }
            refreshing={membersQuery.isRefetching}
            onRefresh={onRefresh}
          />
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { width: "100%", maxWidth: layout.contentWidth, alignSelf: "center", paddingTop: 14, paddingHorizontal: 16, flex: 1 },
});

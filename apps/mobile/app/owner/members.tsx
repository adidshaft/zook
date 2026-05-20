import { useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { RefreshControl, StyleSheet } from "react-native";

import { MemberList, type MemberListFilter, type MemberRowItem } from "@/components/domain/member-list";
import { ZookScreen } from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { useAuth } from "@/lib/auth";
import { useOrgMembers } from "@/lib/domains/owner";
import { colors, layout } from "@/lib/theme";

type MemberFilter = "all" | "active" | "expiring" | "expired";

export default function OwnerMembersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId } = useAuth();
  const membersQuery = useOrgMembers();
  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");

  const filteredMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
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
  }, [memberFilter, memberSearch, membersQuery.data?.members]);
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
          meta: member.user?.fitnessGoal ?? member.profile.fitnessGoal ?? undefined,
        };
      }),
    [filteredMembers],
  );
  const selectedFilter: MemberListFilter =
    memberFilter === "all" ? { kind: "all" } : { kind: "status", status: memberFilter };

  const onRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: activeOrgId ? ["org", activeOrgId] : ["org"] });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-members-screen">
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
            refreshControl: <RefreshControl refreshing={membersQuery.isRefetching} onRefresh={onRefresh} tintColor={colors.brandLime} colors={[colors.brandLime]} />,
          }}
        >
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
          />
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { width: "100%", maxWidth: layout.contentWidth, alignSelf: "center", paddingTop: 14, gap: 14, paddingBottom: 96 },
});

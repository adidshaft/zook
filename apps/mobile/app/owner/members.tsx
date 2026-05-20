import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Keyboard, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { EmptyState, GlassCard, GlassInput, IconBubble, QueryErrorState, SectionHeader, ZookScreen } from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { TrainerClientsSkeleton } from "@/components/skeletons";
import { MemberRow } from "@/features/owner/components/member-row";
import { phoneRevealStorageKey } from "@/features/owner/helpers";
import { apiClient } from "@/lib/domain-api";
import { useAuth } from "@/lib/auth";
import { useOrgMembers } from "@/lib/domains/owner";
import { getStoredValue, setStoredValue } from "@/lib/storage";
import { colors, layout, spacing, typography } from "@/lib/theme";
import { useEffect } from "react";

type MemberFilter = "all" | "active" | "expiring" | "expired";

export default function OwnerMembersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const membersQuery = useOrgMembers();
  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let mounted = true;
    setRevealedPhones(new Set());
    void getStoredValue(phoneRevealStorageKey(activeOrgId)).then((stored) => {
      if (!mounted || !stored) return;
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setRevealedPhones(new Set(parsed.filter((item): item is string => typeof item === "string")));
      } catch {
        setRevealedPhones(new Set());
      }
    });
    return () => {
      mounted = false;
    };
  }, [activeOrgId]);

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

  function revealMemberPhone(memberId: string) {
    setRevealedPhones((current) => {
      const next = new Set(current);
      next.add(memberId);
      void setStoredValue(phoneRevealStorageKey(activeOrgId), JSON.stringify(Array.from(next)));
      return next;
    });
    if (token && activeOrgId) {
      void apiClient.request("/audit-logs", {
        method: "POST",
        token,
        orgId: activeOrgId,
        body: { action: "MEMBER_PHONE_REVEALED", targetId: memberId },
      }).catch(() => undefined);
    }
  }

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
          <GlassInput
            value={memberSearch}
            onChangeText={setMemberSearch}
            placeholder="Search by name or email"
            leading={<Ionicons name="search-outline" size={17} color={colors.textMuted} />}
            trailing={
              memberSearch ? (
                <Pressable onPress={() => { setMemberSearch(""); Keyboard.dismiss(); }} accessibilityRole="button" accessibilityLabel="Clear member search" style={styles.clearSearchButton}>
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </Pressable>
              ) : null
            }
          />
          <View style={styles.filterRow}>
            {(["all", "active", "expiring", "expired"] as const).map((value) => {
              const selected = memberFilter === value;
              return (
                <Pressable key={value} onPress={() => setMemberFilter(value)} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.filterChip, selected ? styles.filterChipActive : null]}>
                  <Text style={[styles.filterChipText, selected ? styles.filterChipTextActive : null]}>{value[0].toUpperCase() + value.slice(1)}</Text>
                </Pressable>
              );
            })}
          </View>
          <SectionHeader title="Members" subtitle={`${filteredMembers.length} members`} />
          <View testID="owner-view-members" style={styles.stack}>
            {membersQuery.isLoading ? <TrainerClientsSkeleton /> : null}
            {membersQuery.isError ? <QueryErrorState error={membersQuery.error} onRetry={() => void membersQuery.refetch()} /> : null}
            {!membersQuery.isLoading && !membersQuery.isError && !filteredMembers.length ? (
              <GlassCard variant="compact" contentStyle={styles.emptyContent}>
                <IconBubble icon="people-outline" tone="neutral" size={40} />
                <EmptyState title="No members found" body="Try another search or filter." />
              </GlassCard>
            ) : null}
            {!membersQuery.isLoading && !membersQuery.isError
              ? filteredMembers.map((member, index) => (
                  <MemberRow
                    key={member.profile.userId}
                    testID={index === 0 ? "member-row-first" : `member-row-${member.profile.userId}`}
                    member={member}
                    phoneRevealed={revealedPhones.has(member.profile.userId)}
                    onPress={() => router.push({ pathname: "/owner/member/[id]", params: { id: member.profile.userId } })}
                    onRevealPhone={() => revealMemberPhone(member.profile.userId)}
                  />
                ))
              : null}
          </View>
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { width: "100%", maxWidth: layout.contentWidth, alignSelf: "center", paddingTop: 14, gap: 14, paddingBottom: 96 },
  stack: { gap: spacing.md },
  clearSearchButton: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.glassFill },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { minHeight: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.glassStroke, backgroundColor: colors.glassFill, paddingHorizontal: 12, justifyContent: "center" },
  filterChipActive: { borderColor: colors.limeBorder, backgroundColor: colors.accentPanel },
  filterChipText: { color: colors.textMuted, ...typography.caption },
  filterChipTextActive: { color: colors.brandLime },
  emptyContent: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: spacing.md },
});

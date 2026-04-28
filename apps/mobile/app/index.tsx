import { Link, Stack } from "expo-router";
import type { Href } from "expo-router";
import { BlurView } from "expo-blur";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { zookDemoFixtures } from "@zook/core";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  SectionHeader,
  StatusRing,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { useMemberHome } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

const demoOrg = zookDemoFixtures.organizations[0];
const demoMembership = zookDemoFixtures.memberships.find((membership) => membership.id === "membership-aarav-hybrid");
const demoPlan = zookDemoFixtures.trainingPlans.find((plan) => plan.id === "plan-push-day");

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AM";
}

export default function Home() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { activeOrgId, session } = useAuth();
  const homeQuery = useMemberHome();
  const memberHome = homeQuery.data;
  const sessionOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization;
  const activeOrganization =
    memberHome?.activeOrganization ??
    sessionOrganization;
  const memberName = session?.user.name || "Aarav Mehta";
  const firstName = memberName.split(" ")[0] || "Aarav";
  const initials = initialsFor(memberName);
  const orgName = activeOrganization?.name ?? demoOrg?.name ?? "Iron Temple Gym";
  const city = activeOrganization?.city ?? demoOrg?.city ?? "Pune";
  const gymHref = sessionOrganization?.username
    ? (`/gym/${sessionOrganization.username}` as Href)
    : ("/find-gyms" as Href);
  const daysLeft = demoMembership?.daysLeft ?? 22;
  const remainingVisits = memberHome?.activeMembership?.remainingVisits ?? demoMembership?.remainingVisits ?? 8;
  const planName = memberHome?.activePlan?.name ?? demoPlan?.title ?? "Push Day";

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["me", "home"] });
    setRefreshing(false);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.lime}
              colors={[colors.lime]}
            />
          }
        >
          <BlurView intensity={58} tint="dark" style={styles.homeHeader}>
            <Link href="/profile" asChild>
              <Pressable
                style={({ pressed }) => pressed ? styles.pressedAvatar : null}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              </Pressable>
            </Link>
            <Link href={gymHref} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Open gym details"
                style={styles.headerCopy}
              >
                <Text numberOfLines={1} style={styles.greeting}>Good morning, {firstName}</Text>
                <View style={styles.gymLineRow}>
                  <Text numberOfLines={1} style={styles.gymLine}>{orgName}, {city}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.muted} />
                </View>
              </Pressable>
            </Link>
            <Link href="/shop" asChild>
              <Pressable style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Open shop">
                <Ionicons name="bag-outline" size={21} color={colors.text} />
              </Pressable>
            </Link>
            <Link href="/notifications" asChild>
              <Pressable style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Open notifications">
                <Ionicons name="notifications-outline" size={21} color={colors.text} />
                <View style={styles.unreadDot} />
              </Pressable>
            </Link>
          </BlurView>

          <GlassCard variant="success" contentStyle={styles.membershipContent}>
            <View style={styles.membershipTop}>
              <View style={styles.membershipCopy}>
                <View style={styles.membershipLabel}>
                  <IconBubble icon="shield-checkmark-outline" tone="lime" size={30} />
                  <Text style={styles.mutedSmall}>Active Membership</Text>
                </View>
                <View style={styles.membershipTitleRow}>
                  <Text style={styles.membershipTitle}>Hybrid Pro</Text>
                  <Text style={styles.daysLeft}>{daysLeft} days left</Text>
                </View>
                <Text style={styles.mutedBody}>{remainingVisits} visits remaining</Text>
              </View>
              <StatusRing tone="lime" value="73%" label="used" size={76} />
            </View>
          </GlassCard>

          <SectionHeader
            title="Today's Plan"
            action={
              <Link href="/plans" asChild>
                <Pressable accessibilityRole="link" style={styles.sectionAction}>
                  <Text style={styles.sectionActionText}>View all</Text>
                  <Ionicons name="chevron-forward" size={13} color={colors.lime} />
                </Pressable>
              </Link>
            }
          />

          <Link href="/plans" asChild>
            <Pressable accessibilityRole="link" accessibilityLabel="Open today's plan">
              <GlassCard contentStyle={styles.planContent}>
                <View style={styles.planRow}>
                  <IconBubble icon="barbell-outline" tone="lime" size={44} />
                  <View style={styles.planCopy}>
                    <Text numberOfLines={1} style={styles.planTitle}>{planName}</Text>
                    <Text numberOfLines={1} style={styles.mutedSmall}>6 exercises · Coach Rhea</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </View>
              </GlassCard>
            </Pressable>
          </Link>

        </ScrollView>
        <BottomNav />
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 12,
    paddingBottom: 128,
    gap: 12,
  },
  homeHeader: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(7,9,8,0.74)",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressedAvatar: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  avatarText: {
    color: colors.lime,
    ...typography.h3,
  },
  headerCopy: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 4,
  },
  greeting: {
    color: colors.text,
    ...typography.h3,
  },
  gymLineRow: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  gymLine: {
    flexShrink: 1,
    color: colors.muted,
    ...typography.small,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.lime,
  },
  membershipContent: {
    padding: 16,
    gap: 10,
  },
  membershipTop: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  membershipCopy: {
    flex: 1,
    gap: 8,
  },
  membershipLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  mutedSmall: {
    color: colors.muted,
    ...typography.small,
  },
  mutedBody: {
    color: colors.muted,
    ...typography.body,
  },
  membershipTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 6,
  },
  membershipTitle: {
    color: colors.text,
    ...typography.h2,
  },
  daysLeft: {
    color: colors.lime,
    ...typography.bodyStrong,
  },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 28,
  },
  sectionActionText: {
    color: colors.lime,
    ...typography.small,
  },
  planContent: {
    padding: 14,
  },
  planRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  planCopy: {
    flex: 1,
    gap: 2,
  },
  planTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
});

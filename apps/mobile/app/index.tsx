import { Link, Stack, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { BlurView } from "expo-blur";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  SectionHeader,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { titleCaseFromCode } from "@/lib/formatting";
import { useMemberHome } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AM";
}

function greetingForHour() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [gymsOpen, setGymsOpen] = useState(false);
  const { activeOrgId, session, setActiveOrgId } = useAuth();
  const homeQuery = useMemberHome();
  const memberHome = homeQuery.data;
  const sessionOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization;
  const activeOrganization =
    memberHome?.activeOrganization ??
    sessionOrganization;
  const memberName = session?.user.name || "Member";
  const firstName = memberName.split(" ")[0] || "Hey";
  const initials = initialsFor(memberName);
  const orgName = activeOrganization?.name ?? "Find a gym";
  const city = activeOrganization?.city ?? "Nearby";
  const gymHref = sessionOrganization?.username
    ? (`/gym/${sessionOrganization.username}` as Href)
    : ("/find-gyms" as Href);
  const daysLeft = memberHome?.activeMembership?.daysLeft ?? 0;
  const remainingVisits = memberHome?.activeMembership?.remainingVisits ?? 0;
  const planName = memberHome?.todayPlanName ?? memberHome?.activePlan?.name ?? "No plan assigned";
  const lastCheckIn = memberHome?.recentAttendance?.[0]?.checkedInAt
    ? new Date(memberHome.recentAttendance[0].checkedInAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "None";
  const enrolledGyms = session?.organizations ?? [];
  const hasGym = Boolean(activeOrganization);
  const hasMembership = Boolean(memberHome?.activeMembership);
  const neverCheckedIn = hasMembership && (memberHome?.recentAttendance?.length ?? 0) === 0;
  const firstRunState = !hasGym
    ? "NO_GYM"
    : !hasMembership
      ? "NO_MEMBERSHIP"
      : neverCheckedIn
        ? "NEVER_CHECKED_IN"
        : null;

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
          contentInsetAdjustmentBehavior="never"
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
            <Pressable
              onPress={() => setProfileOpen(true)}
              style={({ pressed }) => pressed ? styles.pressedAvatar : null}
              accessibilityRole="button"
              accessibilityLabel="Open account drawer"
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </Pressable>
            <Link href={gymHref} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Open gym details"
                style={styles.headerCopy}
              >
                <Text numberOfLines={1} style={styles.greeting}>{greetingForHour()}, {firstName}</Text>
                <View style={styles.gymLineRow}>
                  <Text numberOfLines={1} style={styles.gymLine}>{orgName}, {city}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.muted} />
                </View>
              </Pressable>
            </Link>
            <Link href="/notifications" asChild>
              <Pressable style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Open notifications">
                <Ionicons name="notifications-outline" size={21} color={colors.text} />
                {(memberHome?.unreadNotifications ?? 0) > 0 ? <View style={styles.unreadDot} /> : null}
              </Pressable>
            </Link>
          </BlurView>

          {firstRunState ? <FirstRunCard state={firstRunState} gymUsername={sessionOrganization?.username} /> : null}

          {hasMembership ? (
            <Link href="/scan" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="Check in at the gym">
                <GlassCard variant="success" contentStyle={styles.checkInContent}>
                  <IconBubble icon="qr-code-outline" tone="lime" size={46} />
                  <View style={styles.checkInCopy}>
                    <Text style={styles.checkInTitle}>Check in</Text>
                    <Text numberOfLines={1} style={styles.mutedSmall}>
                      Scan the gym QR when you arrive.
                    </Text>
                  </View>
                  <View style={styles.checkInCta}>
                    <Text style={styles.checkInCtaText}>Open</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.bg} />
                  </View>
                </GlassCard>
              </Pressable>
            </Link>
          ) : null}

          {hasMembership ? (
            <GlassCard variant="success" contentStyle={styles.membershipContent}>
              <View style={styles.membershipTop}>
                <View style={styles.membershipCopy}>
                  <View style={styles.membershipLabel}>
                    <IconBubble icon="shield-checkmark-outline" tone="lime" size={30} />
                    <Text style={styles.mutedSmall}>Active Membership</Text>
                  </View>
                  <View style={styles.membershipTitleRow}>
                    <Text style={styles.membershipTitle}>{memberHome?.activePlan?.name ?? "Membership"}</Text>
                    <Text style={styles.daysLeft}>{daysLeft} days left</Text>
                  </View>
                  <Text style={styles.mutedBody}>{remainingVisits} visits remaining</Text>
                </View>
                <Link href="/membership" asChild>
                  <Pressable accessibilityRole="link" style={styles.membershipCta}>
                    <Text style={styles.membershipCtaText}>Renew</Text>
                  </Pressable>
                </Link>
              </View>
            </GlassCard>
          ) : null}

          {hasMembership ? <SectionHeader title="Today's Plan" /> : null}

          {hasMembership ? (
            <Link href="/plans" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="Open today's plan">
                <GlassCard contentStyle={styles.planContent}>
                  <View style={styles.planRow}>
                    <IconBubble icon="barbell-outline" tone="lime" size={44} />
                    <View style={styles.planCopy}>
                      <Text numberOfLines={1} style={styles.planTitle}>{planName}</Text>
                      <Text numberOfLines={1} style={styles.mutedSmall}>
                        {memberHome?.activePlan?.type ? titleCaseFromCode(memberHome.activePlan.type) : "Tap to view"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </View>
                </GlassCard>
              </Pressable>
            </Link>
          ) : null}

          <Link href="/tracking" asChild>
            <Pressable accessibilityRole="link" accessibilityLabel="Open workout tracking">
              <GlassCard contentStyle={styles.trackContent}>
                <View style={styles.trackRow}>
                  <IconBubble icon="pulse-outline" tone="blue" size={42} />
                  <View style={styles.trackCopy}>
                    <Text style={styles.trackTitle}>Track progress</Text>
                    <Text numberOfLines={1} style={styles.mutedSmall}>
                      Log workouts and view your streak.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </View>
              </GlassCard>
            </Pressable>
          </Link>

          {hasMembership ? (
            <Text style={styles.progressSummary}>
              {remainingVisits} visits left · {memberHome?.streakDays ?? 0} day streak · Last visit {lastCheckIn}
            </Text>
          ) : null}

        </ScrollView>
        {profileOpen ? (
          <View style={styles.drawerScene}>
            <Pressable
              style={styles.drawerBackdrop}
              onPress={() => setProfileOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close profile"
            />
            <View style={styles.drawerPanel}>
              <ScrollView
                style={styles.drawerScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.drawerContent}
              >
                <View style={styles.drawerHeader}>
                  <View style={styles.drawerAvatar}>
                    <Text style={styles.drawerAvatarText}>{initials}</Text>
                  </View>
                  <View style={styles.drawerHeaderCopy}>
                    <Text numberOfLines={1} style={styles.drawerName}>{memberName}</Text>
                    <Text numberOfLines={1} style={styles.drawerMuted}>{session?.user.email ?? "member@zook.local"}</Text>
                  </View>
                  <Pressable
                    onPress={() => setProfileOpen(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    style={styles.drawerClose}
                  >
                    <Ionicons name="close" size={18} color={colors.text} />
                  </Pressable>
                </View>

                <DrawerToggle
                  title="Enrolled Gyms"
                  open={gymsOpen}
                  onPress={() => setGymsOpen((current) => !current)}
                />
                {gymsOpen ? (
                  <View style={styles.drawerGymList}>
                    {enrolledGyms.map((gym) => {
                      const selected = gym.orgId === activeOrgId;
                      return (
                        <Pressable
                          key={`${gym.name}-${gym.city}`}
                          onPress={() => void setActiveOrgId(gym.orgId)}
                          accessibilityRole="button"
                          accessibilityLabel={`Switch to ${gym.name}`}
                          style={[
                            styles.drawerGymRow,
                            selected ? styles.drawerGymRowActive : null,
                          ]}
                        >
                          <View style={styles.drawerGymLogo}>
                            <Text style={styles.drawerGymLogoText}>{initialsFor(gym.name)}</Text>
                          </View>
                          <View style={styles.drawerGymCopy}>
                            <Text numberOfLines={1} style={styles.drawerGymName}>{gym.name}</Text>
                            <Text numberOfLines={1} style={styles.drawerMuted}>
                              {gym.city}, {gym.state}
                            </Text>
                          </View>
                          <Text
                            style={
                              selected ? styles.drawerGymActiveText : styles.drawerGymSwitchText
                            }
                          >
                            {selected ? "Active" : "Switch"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
                <Pressable
                  onPress={() => {
                    setProfileOpen(false);
                    router.push("/settings");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Open settings"
                  style={styles.drawerSettings}
                >
                  <Ionicons name="settings-outline" size={18} color={colors.lime} />
                  <Text style={styles.drawerSettingsText}>Settings</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setProfileOpen(false);
                    router.push("/shop");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Open shop"
                  style={styles.drawerSettings}
                >
                  <Ionicons name="storefront-outline" size={18} color={colors.lime} />
                  <Text style={styles.drawerSettingsText}>Shop</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        ) : null}
        {!profileOpen ? <BottomNav /> : null}
      </ZookScreen>
    </>
  );
}

function FirstRunCard({
  state,
  gymUsername,
}: {
  state: "NO_GYM" | "NO_MEMBERSHIP" | "NEVER_CHECKED_IN";
  gymUsername?: string | null;
}) {
  const copy = {
    NO_GYM: {
      icon: "search-outline" as const,
      title: "Find your gym",
      body: "Join a nearby Zook gym to unlock check-ins, plans, payments, and progress.",
      cta: "Browse gyms",
      href: "/find-gyms" as Href,
    },
    NO_MEMBERSHIP: {
      icon: "card-outline" as const,
      title: "Choose a membership",
      body: "Pick an active plan before check-ins and daily programming start.",
      cta: "View plans",
      href: (gymUsername ? `/gym/${gymUsername}` : "/membership") as Href,
    },
    NEVER_CHECKED_IN: {
      icon: "qr-code-outline" as const,
      title: "First check-in pending",
      body: "Your membership is active. Scan the gym QR when you arrive for the first visit.",
      cta: "Open scanner",
      href: "/scan" as Href,
    },
  }[state];

  return (
    <Link href={copy.href} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={copy.cta}>
        <GlassCard variant="success" contentStyle={styles.firstRunContent}>
          <IconBubble icon={copy.icon} tone="lime" size={46} />
          <View style={styles.firstRunCopy}>
            <Text style={styles.firstRunTitle}>{copy.title}</Text>
            <Text style={styles.mutedBody}>{copy.body}</Text>
          </View>
          <View style={styles.checkInCta}>
            <Text style={styles.checkInCtaText}>{copy.cta}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.bg} />
          </View>
        </GlassCard>
      </Pressable>
    </Link>
  );
}

function DrawerToggle({
  title,
  subtitle,
  open,
  onPress,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.drawerToggle}>
      <View style={styles.drawerToggleCopy}>
        <Text style={styles.drawerToggleTitle}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={styles.drawerMuted}>{subtitle}</Text> : null}
      </View>
      <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 12,
    paddingBottom: layout.bottomNavContentPadding,
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
  checkInContent: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 14,
  },
  checkInCopy: {
    flex: 1,
    gap: 3,
  },
  checkInTitle: {
    color: colors.text,
    ...typography.headerTitle,
  },
  checkInCta: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.lime,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  checkInCtaText: {
    color: colors.bg,
    fontSize: 12,
    fontWeight: "800",
  },
  firstRunContent: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 14,
  },
  firstRunCopy: {
    flex: 1,
    gap: 4,
  },
  firstRunTitle: {
    color: colors.text,
    ...typography.headerTitle,
  },
  progressSummary: {
    color: colors.muted,
    ...typography.small,
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
  membershipCta: {
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: colors.lime,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  membershipCtaText: {
    color: colors.bg,
    ...typography.caption,
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
  trackContent: {
    padding: 14,
  },
  trackRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  trackCopy: {
    flex: 1,
    gap: 2,
  },
  trackTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  drawerScene: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 140,
    elevation: 140,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.26)",
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerPanel: {
    width: "84%",
    maxWidth: 336,
    height: "100%",
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(8,11,9,0.98)",
    overflow: "hidden",
  },
  drawerScroll: {
    zIndex: 1,
  },
  drawerContent: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 26,
    gap: 12,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
  },
  drawerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerAvatarText: {
    color: colors.bg,
    fontSize: 18,
    fontWeight: "900",
  },
  drawerHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  drawerName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  drawerMuted: {
    color: colors.muted,
    ...typography.small,
  },
  drawerClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerToggle: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  drawerToggleCopy: {
    flex: 1,
    gap: 2,
  },
  drawerToggleTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  drawerGymList: {
    gap: 8,
  },
  drawerGymRow: {
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(185,244,85,0.08)",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  drawerGymRowActive: {
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.12)",
  },
  drawerGymLogo: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(185,244,85,0.14)",
    borderWidth: 1,
    borderColor: colors.limeBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerGymLogoText: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "900",
  },
  drawerGymCopy: {
    flex: 1,
    gap: 2,
  },
  drawerGymName: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  drawerGymActiveText: {
    color: colors.lime,
    ...typography.caption,
  },
  drawerGymSwitchText: {
    color: colors.muted,
    ...typography.caption,
  },
  drawerSettings: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(7,9,8,0.72)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  drawerSettingsText: {
    color: colors.text,
    ...typography.bodyStrong,
  },
});

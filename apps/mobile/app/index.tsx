import { Link, Stack, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { BlurView } from "expo-blur";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  SectionHeader,
  StatusRing,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { titleCaseFromCode } from "@/lib/formatting";
import { useMemberHome } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

const dietOptions = ["Vegetarian", "High protein", "Jain", "No preference"];
const goalOptions = ["Muscle gain", "Fat loss", "Strength", "Mobility"];
const allergyOptions = ["Peanuts", "Lactose", "Gluten", "Soy"];

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
  const [healthOpen, setHealthOpen] = useState(false);
  const [dietOpen, setDietOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [dob, setDob] = useState("");
  const [diet, setDiet] = useState("");
  const [goal, setGoal] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [trainerNote, setTrainerNote] = useState("");
  const { activeOrgId, session } = useAuth();
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
  const activePlan = memberHome?.activePlan;
  const totalDays = activePlan?.durationDays ?? activePlan?.validityDays ?? 30;
  const usedPercent = activePlan && totalDays > 0 ? Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100)) : 0;
  const planName = memberHome?.todayPlanName ?? memberHome?.activePlan?.name ?? "No plan assigned";
  const enrolledGyms = session?.organizations ?? [];

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
              accessibilityLabel="Open profile"
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
            <Link href="/shop" asChild>
              <Pressable style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Open shop">
                <Ionicons name="storefront-outline" size={21} color={colors.text} />
              </Pressable>
            </Link>
            <Link href="/notifications" asChild>
              <Pressable style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Open notifications">
                <Ionicons name="notifications-outline" size={21} color={colors.text} />
                {(memberHome?.unreadNotifications ?? 0) > 0 ? <View style={styles.unreadDot} /> : null}
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
                  <Text style={styles.membershipTitle}>{memberHome?.activePlan?.name ?? "Membership"}</Text>
                  <Text style={styles.daysLeft}>{daysLeft} days left</Text>
                </View>
                <Text style={styles.mutedBody}>{remainingVisits} visits remaining</Text>
              </View>
              <StatusRing tone="lime" value={`${usedPercent}%`} label="used" size={76} />
            </View>
          </GlassCard>

          <View style={styles.metricsRow}>
            <MiniMetric label="Visits" value={`${remainingVisits}`} />
            <MiniMetric label="Streak" value={`${memberHome?.streakDays ?? 0}`} />
            <MiniMetric label="Plans" value={`${memberHome?.assignedPlans ?? 0}`} />
          </View>

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
                    <Text numberOfLines={1} style={styles.mutedSmall}>
                      {memberHome?.activePlan?.type ? titleCaseFromCode(memberHome.activePlan.type) : "Tap to view"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </View>
              </GlassCard>
            </Pressable>
          </Link>

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
                    {enrolledGyms.map((gym) => (
                      <View key={`${gym.name}-${gym.city}`} style={styles.drawerGymRow}>
                        <View style={styles.drawerGymLogo}>
                          <Text style={styles.drawerGymLogoText}>{initialsFor(gym.name)}</Text>
                        </View>
                        <View style={styles.drawerGymCopy}>
                          <Text numberOfLines={1} style={styles.drawerGymName}>{gym.name}</Text>
                          <Text numberOfLines={1} style={styles.drawerMuted}>{gym.city}, {gym.state}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                <DrawerToggle
                  title="Health"
                  open={healthOpen}
                  onPress={() => setHealthOpen((current) => !current)}
                  subtitle={[weight ? `${weight} kg` : null, goal || null].filter(Boolean).join(" · ") || "Add details"}
                />
                {healthOpen ? (
                  <View style={styles.healthPanel}>
                    <View style={styles.healthPair}>
                      <Field label="Weight" value={weight} onChangeText={(value) => setWeight(value.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" />
                      <Field label="DOB" value={dob} onChangeText={setDob} />
                    </View>
                    <DropField
                      label="Diet"
                      value={diet}
                      open={dietOpen}
                      options={dietOptions}
                      onToggle={() => setDietOpen((current) => !current)}
                      onSelect={(value) => {
                        setDiet(value);
                        setDietOpen(false);
                      }}
                    />
                    <DropField
                      label="Goal"
                      value={goal}
                      open={goalOpen}
                      options={goalOptions}
                      onToggle={() => setGoalOpen((current) => !current)}
                      onSelect={(value) => {
                        setGoal(value);
                        setGoalOpen(false);
                      }}
                    />
                    <View style={styles.allergyWrap}>
                      {allergyOptions.map((item) => {
                        const selected = allergies.includes(item);
                        return (
                          <Pressable
                            key={item}
                            onPress={() => setAllergies((current) => selected ? current.filter((entry) => entry !== item) : [...current, item])}
                            accessibilityRole="button"
                            accessibilityLabel={item}
                            style={[styles.allergyChip, selected ? styles.allergyChipActive : null]}
                          >
                            <Text style={[styles.allergyText, selected ? styles.allergyTextActive : null]}>{item}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <TextInput
                      value={trainerNote}
                      onChangeText={setTrainerNote}
                      placeholder="Trainer note"
                      placeholderTextColor={colors.subtle}
                      multiline
                      style={styles.trainerNote}
                    />
                  </View>
                ) : null}
              </ScrollView>
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
            </View>
          </View>
        ) : null}
        <BottomNav />
      </ZookScreen>
    </>
  );
}

function MiniMetric({ label, value, bars }: { label: string; value: string; bars?: number[] }) {
  return (
    <View style={styles.metricCard}>
      {bars?.length ? (
        <View style={styles.metricChart}>
          {bars.map((bar, index) => (
            <View key={`${label}-${index}`} style={[styles.metricBar, { height: `${Math.round(bar * 100)}%` }]} />
          ))}
        </View>
      ) : null}
      <View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
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

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "decimal-pad";
}) {
  return (
    <View style={styles.fieldBox}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={colors.subtle}
        style={styles.fieldInput}
      />
    </View>
  );
}

function DropField({
  label,
  value,
  open,
  options,
  onToggle,
  onSelect,
}: {
  label: string;
  value: string;
  open: boolean;
  options: string[];
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.dropBox}>
      <Pressable onPress={onToggle} accessibilityRole="button" style={styles.dropHeader}>
        <View>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={styles.dropValue}>{value}</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={17} color={colors.muted} />
      </Pressable>
      {open ? (
        <View style={styles.dropOptions}>
          {options.map((option) => (
            <Pressable key={option} onPress={() => onSelect(option)} accessibilityRole="button" style={styles.dropOption}>
              <Text style={styles.dropOptionText}>{option}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
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
  metricsRow: {
    flexDirection: "row",
    gap: 8,
  },
  metricCard: {
    flex: 1,
    minHeight: 70,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  metricChart: {
    width: 28,
    height: 38,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  metricBar: {
    flex: 1,
    minHeight: 6,
    borderRadius: 999,
    backgroundColor: colors.lime,
    opacity: 0.8,
  },
  metricValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
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
  drawerScene: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
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
    paddingBottom: 92,
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
  healthPanel: {
    gap: 10,
  },
  healthPair: {
    flexDirection: "row",
    gap: 8,
  },
  fieldBox: {
    flex: 1,
    minHeight: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  fieldInput: {
    minHeight: 28,
    color: colors.text,
    padding: 0,
    ...typography.bodyStrong,
  },
  dropBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
  },
  dropHeader: {
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dropValue: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  dropOptions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 6,
    gap: 4,
  },
  dropOption: {
    minHeight: 34,
    borderRadius: 11,
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  dropOptionText: {
    color: colors.text,
    ...typography.small,
  },
  allergyWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  allergyChip: {
    minHeight: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  allergyChipActive: {
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.13)",
  },
  allergyText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  allergyTextActive: {
    color: colors.lime,
  },
  trainerNote: {
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 9,
    textAlignVertical: "top",
    ...typography.small,
  },
  drawerSettings: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    zIndex: 2,
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

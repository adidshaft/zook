import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { zookMockServices } from "@zook/core";
import {
  AuditWarning,
  BottomNav,
  CollapsibleSection,
  DetailRow,
  GlassCard,
  GlassInput,
  IconBubble,
  MobileHeader,
  Pill,
  PrimaryButton,
  ZookScreen,
} from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { titleCaseFromCode } from "@/lib/formatting";
import { mergeNotificationPreferences } from "@/lib/notification-preferences";
import { usePushNotifications } from "@/lib/push-notifications";
import { useMyNotificationPreferences, useMyProfile } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

export default function Profile() {
  const { activeOrgId, activeRole, logout, session, setActiveOrgId, setActiveRole, token } = useAuth();
  const router = useRouter();
  const {
    disablePush,
    error: pushError,
    openSystemSettings,
    requestEnablePush,
    syncStatus,
  } = usePushNotifications();
  const queryClient = useQueryClient();
  const preferencesQuery = useMyNotificationPreferences();
  const profileQuery = useMyProfile();
  const routeParams = useLocalSearchParams<{
    focus?: string;
    notificationId?: string;
    subscriptionId?: string;
  }>();
  const [busyPreferenceKey, setBusyPreferenceKey] = useState<string | null>(null);
  const [preferenceError, setPreferenceError] = useState<string | undefined>();
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [detailsStatus, setDetailsStatus] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [dietPreference, setDietPreference] = useState("");
  const [allergies, setAllergies] = useState("");
  const [summaryNote, setSummaryNote] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("");
  const activeOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization;
  const initials =
    session?.user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "Z";
  const allRoles = Array.from(
    new Set(session?.organizations.flatMap((organization) => organization.roles) ?? []),
  );
  const activeRoleLabel = titleCaseFromCode(activeRole ?? allRoles[0] ?? "MEMBER");
  const effectivePreferences = mergeNotificationPreferences(
    preferencesQuery.data?.preferences,
    activeOrgId,
  );

  useEffect(() => {
    const data = profileQuery.data;
    if (!data) {
      return;
    }
    setWeightKg(data.wellness?.weightKg ? String(data.wellness.weightKg) : "");
    setDateOfBirth(data.user.dateOfBirth ? data.user.dateOfBirth.slice(0, 10) : "");
    setFitnessGoal(data.user.fitnessGoal ?? "");
    setDietPreference(data.wellness?.dietPreference ?? "");
    setAllergies(data.wellness?.allergies ?? "");
    setSummaryNote(data.wellness?.summaryNote ?? "");
  }, [profileQuery.data]);

  async function updateNotificationPreference(
    key: "transactional" | "operational" | "promotional" | "engagement",
    value: boolean,
  ) {
    if (!token) {
      return;
    }
    try {
      setPreferenceError(undefined);
      setBusyPreferenceKey(key);
      await mobileApiFetch("/me/notification-preferences", {
        method: "PATCH",
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        body: {
          ...(activeOrgId ? { orgId: activeOrgId } : {}),
          [key]: value,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["me", "notification-preferences"] });
    } catch (error) {
      setPreferenceError(getApiErrorMessage(error));
    } finally {
      setBusyPreferenceKey(null);
    }
  }

  async function handlePushToggle(nextValue: boolean) {
    try {
      setPreferenceError(undefined);
      setBusyPreferenceKey("pushEnabled");
      if (nextValue) {
        const enabled = await requestEnablePush();
        if (!enabled) {
          setPreferenceError(pushError ?? "Push permission was not granted.");
        }
      } else {
        await disablePush();
      }
      await queryClient.invalidateQueries({ queryKey: ["me", "push-devices"] });
    } catch (error) {
      setPreferenceError(getApiErrorMessage(error));
    } finally {
      setBusyPreferenceKey(null);
    }
  }

  async function saveMemberDetails() {
    if (!token) {
      return;
    }
    setDetailsBusy(true);
    setDetailsStatus("");
    try {
      await mobileApiFetch("/me/profile", {
        method: "PATCH",
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        body: {
          ...(activeOrgId ? { orgId: activeOrgId } : {}),
          dateOfBirth: dateOfBirth || undefined,
          fitnessGoal: fitnessGoal || undefined,
          weightKg: weightKg ? Number(weightKg) : undefined,
          dietPreference: dietPreference || undefined,
          allergies: allergies || undefined,
          summaryNote: summaryNote || undefined,
        },
      });
      setDetailsStatus("Profile summary updated.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "profile", activeOrgId] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home", activeOrgId] }),
      ]);
    } catch (error) {
      setDetailsStatus(getApiErrorMessage(error));
    } finally {
      setDetailsBusy(false);
    }
  }

  async function switchRole(role: typeof allRoles[number]) {
    await setActiveRole(role);
    if (role === "TRAINER") {
      router.replace("/trainer");
      return;
    }
    if (role === "RECEPTIONIST") {
      router.replace("/reception");
      return;
    }
    if (role === "OWNER" || role === "ADMIN") {
      router.replace("/owner");
      return;
    }
    router.replace("/");
  }

  async function requestPrivacyExport() {
    const job = await zookMockServices.privacyService.requestExport(session?.user.id);
    setPrivacyStatus(`Data export job created: ${job.id}. Status: ${job.status}.`);
  }

  async function requestPrivacyDeletion() {
    const job = await zookMockServices.privacyService.requestDeletion(session?.user.id);
    setPrivacyStatus(`Deletion job created: ${job.id}. Status: ${job.status}.`);
  }

  const ageLabel = (() => {
    if (!dateOfBirth) {
      return "Not added";
    }
    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) {
      return "Check date";
    }
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
      years -= 1;
    }
    return `${years} years`;
  })();

  return (
    <ZookScreen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <MobileHeader
          title="Profile"
          subtitle={session?.user.email ?? session?.user.phone ?? "Account settings"}
        />

        {routeParams.focus === "membership" ? (
          <GlassCard variant="selected" contentStyle={styles.calloutContent}>
            <IconBubble icon="card-outline" tone="blue" size={36} />
            <View style={styles.calloutCopy}>
              <Text style={styles.calloutTitle}>Membership update</Text>
              <Text style={styles.calloutBody}>Your membership details are below.</Text>
            </View>
          </GlassCard>
        ) : null}

        <GlassCard padding={12} radius={18} contentStyle={styles.profileCardContent}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text numberOfLines={1} style={styles.profileName}>
                {session?.user.name ?? "Zook member"}
              </Text>
              <Text numberOfLines={1} style={styles.profileBody}>
                {session?.user.email ?? session?.user.phone ?? "Contact not added"}
              </Text>
              <View style={styles.activeLine}>
                <Ionicons name="business-outline" size={13} color={colors.lime} />
                <Text numberOfLines={1} style={styles.activeLineText}>
                  {activeOrganization?.name ?? "No gym selected"}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.roleSummaryRow}>
            <Pill tone="lime">{activeRoleLabel}</Pill>
            {allRoles.length > 1 ? <Pill tone="neutral">{allRoles.length} roles</Pill> : null}
          </View>
        </GlassCard>

        {session?.user.guardianPending ? (
          <GlassCard variant="warning" contentStyle={styles.minorContent}>
            <Pill tone="amber">Guardian consent required</Pill>
            <Text style={styles.calloutTitle}>Protected account gates are active.</Text>
            <Text style={styles.profileBody}>
              Membership activation, attendance, PT activation, plan assignment, personalized AI, and marketing stay blocked until guardian consent is verified.
            </Text>
          </GlassCard>
        ) : null}

        {/* Quick actions removed — bottom nav handles navigation */}

        <CollapsibleSection
          title="Gym"
          subtitle={activeOrganization ? `${activeOrganization.city}, ${activeOrganization.state}` : "Pick your gym"}
          count={session?.organizations.length ?? 0}
          defaultOpen={false}
        >
          <View style={styles.rowStack}>
            <DetailRow label="Active gym" value={activeOrganization?.name ?? "None selected"} />
            <DetailRow
              label="Status"
              value={titleCaseFromCode(activeOrganization?.status)}
            />
            <QuickActionTile onPress={() => router.push("/find-gyms")} icon="search-outline" label="Explore gyms" value="Find more" fullWidth />
          </View>
          <View style={styles.orgList}>
            {session?.organizations.map((organization) => {
              const selected = organization.orgId === activeOrganization?.orgId;
              return (
                <Pressable
                  key={organization.orgId}
                  onPress={() => void setActiveOrgId(organization.orgId)}
                  style={[styles.orgButton, selected ? styles.orgButtonActive : null]}
                  accessibilityLabel={`Switch to ${organization.name}`}
                  accessibilityRole="button"
                >
                  <View style={styles.orgButtonHeader}>
                    <View style={styles.orgButtonCopy}>
                      <Text numberOfLines={1} style={styles.orgName}>
                        {organization.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.orgMeta}>
                        {organization.city}, {organization.state}
                      </Text>
                    </View>
                    <Pill tone={selected ? "lime" : "neutral"}>{selected ? "Active" : "Switch"}</Pill>
                  </View>
                  <View style={styles.roleRow}>
                    {organization.roles.map((role) => (
                      <Pill
                        key={`${organization.orgId}-${role}`}
                        tone={organization.orgId === activeOrgId && role === activeRole ? "lime" : "neutral"}
                      >
                        {titleCaseFromCode(role)}
                      </Pill>
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </CollapsibleSection>

        <CollapsibleSection
          title="Health"
          subtitle={[fitnessGoal || "Goal not added", weightKg ? `${weightKg} kg` : null].filter(Boolean).join(" · ")}
          count={ageLabel}
          defaultOpen={false}
        >
          <View style={styles.summaryGrid}>
            <SummaryTile label="Weight" value={weightKg ? `${weightKg} kg` : "Add"} />
            <SummaryTile label="Age" value={ageLabel} />
            <SummaryTile label="Diet" value={dietPreference || "Add"} />
          </View>
          <View style={styles.detailGrid}>
            <GlassInput
              label="Weight kg"
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="decimal-pad"
              placeholder="72"
              style={styles.detailInput}
            />
            <GlassInput
              label="Birth date"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="1998-04-26"
              style={styles.detailInput}
            />
          </View>
          <GlassInput
            label="Fitness goal"
            value={fitnessGoal}
            onChangeText={setFitnessGoal}
            placeholder="Strength, fat loss, mobility..."
          />
          <GlassInput
            label="Diet preference"
            value={dietPreference}
            onChangeText={setDietPreference}
            placeholder="Vegetarian, high-protein, Jain..."
          />
          <GlassInput
            label="Allergies"
            value={allergies}
            onChangeText={setAllergies}
            placeholder="Peanuts, lactose, none..."
          />
          <GlassInput
            label="Trainer note"
            value={summaryNote}
            onChangeText={setSummaryNote}
            multiline
            placeholder="Injuries, schedule, food constraints..."
          />
          {detailsStatus ? <Text style={styles.detailsStatus}>{detailsStatus}</Text> : null}
          <PrimaryButton onPress={() => void saveMemberDetails()} disabled={detailsBusy}>
            {detailsBusy ? "Saving..." : "Save"}
          </PrimaryButton>
        </CollapsibleSection>

        <CollapsibleSection
          title="Alerts"
          subtitle={`Push ${syncStatus}`}
          count={effectivePreferences.pushEnabled ? "On" : "Off"}
          defaultOpen={false}
        >
          {pushError || preferenceError ? (
            <Text style={styles.errorText}>
              {preferenceError ?? pushError}
            </Text>
          ) : null}
          <Text style={styles.syncStatusText}>
            Push sync: {syncStatus}
          </Text>
          <PreferenceToggleRow
            label="Push notifications"
            hint="Stay updated with your gym."
            value={effectivePreferences.pushEnabled}
            busy={busyPreferenceKey === "pushEnabled"}
            onValueChange={(value) => void handlePushToggle(value)}
          />
          <PreferenceToggleRow
            label="Promotional"
            hint="Offers, discounts, and deals."
            value={effectivePreferences.promotional}
            busy={busyPreferenceKey === "promotional"}
            onValueChange={(value) => void updateNotificationPreference("promotional", value)}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Privacy"
          subtitle="Data export and deletion"
          defaultOpen={false}
        >
          <AuditWarning>Export and deletion requests create server jobs and audit logs. Zook does not fake instant deletion.</AuditWarning>
          <View style={styles.actionRow}>
            <PrimaryButton onPress={() => void requestPrivacyExport()} tone="secondary" style={styles.actionHalf}>
              Request export
            </PrimaryButton>
            <PrimaryButton onPress={() => void requestPrivacyDeletion()} tone="danger" style={styles.actionHalf}>
              Request deletion
            </PrimaryButton>
          </View>
          {privacyStatus ? <Text style={styles.detailsStatus}>{privacyStatus}</Text> : null}
        </CollapsibleSection>

        <CollapsibleSection
          title="Account"
          subtitle="Phone settings and sign out"
          defaultOpen={false}
        >
          <Text style={styles.sectionMiniLabel}>Switch role</Text>
          <View style={styles.roleRow}>
            {allRoles.length ? (
              allRoles.map((role) => (
                <Pressable
                  key={role}
                  onPress={() => void switchRole(role)}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${titleCaseFromCode(role)} role`}
                  style={styles.roleButton}
                >
                  <Pill key={role} tone={role === activeRole ? "lime" : "neutral"}>
                    {titleCaseFromCode(role)}
                  </Pill>
                </Pressable>
              ))
            ) : (
              <Pill tone="neutral">Member</Pill>
            )}
          </View>
          <View style={styles.actionRow}>
            <PrimaryButton
              onPress={() => void openSystemSettings()}
              tone="secondary"
              style={styles.actionHalf}
            >
              Phone settings
            </PrimaryButton>
            <PrimaryButton onPress={() => void logout()} tone="danger" style={styles.actionHalf}>
              Logout
            </PrimaryButton>
          </View>
        </CollapsibleSection>
      </ScrollView>
      <BottomNav />
    </ZookScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 10,
    paddingBottom: layout.bottomNavHeight + 40,
  },
  calloutContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  calloutCopy: {
    flex: 1,
    gap: 4,
  },
  calloutBody: {
    color: colors.muted,
    ...typography.body,
  },
  minorContent: {
    gap: spacing.sm,
  },
  profileCardContent: {
    gap: 10,
  },
  profileTop: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.bg,
    ...typography.headerTitle,
  },
  profileCopy: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    color: colors.text,
    ...typography.sectionTitle,
  },
  profileBody: {
    color: colors.muted,
    ...typography.body,
  },
  activeLine: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  activeLineText: {
    flex: 1,
    color: colors.lime,
    ...typography.caption,
  },
  roleRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  roleSummaryRow: {
    flexDirection: "row",
    gap: 6,
  },
  roleButton: {
    borderRadius: 999,
  },
  quickGrid: {
    gap: 10,
  },
  quickRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickTile: {
    flex: 1,
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quickTileFull: {
    flex: 0,
    width: "100%",
  },
  quickTilePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  quickLabel: {
    color: colors.text,
    ...typography.caption,
  },
  quickValue: {
    color: colors.muted,
    ...typography.small,
  },
  infoCard: {
    gap: 10,
  },
  rowStack: {
    gap: 10,
  },
  orgList: {
    gap: 10,
  },
  orgButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    padding: 12,
    gap: 10,
  },
  orgButtonActive: {
    borderColor: "rgba(185,244,85,0.3)",
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  orgButtonHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  orgButtonCopy: {
    flex: 1,
    gap: 6,
  },
  orgName: {
    color: colors.text,
    ...typography.cardTitle,
  },
  orgMeta: {
    color: colors.muted,
    ...typography.small,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionHalf: {
    flex: 1,
  },
  calloutTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  toggleCard: {
    gap: 14,
  },
  detailsCard: {
    gap: 14,
  },
  detailGrid: {
    flexDirection: "row",
    gap: 10,
  },
  detailInput: {
    flex: 1,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 8,
  },
  summaryTile: {
    flex: 1,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 9,
    justifyContent: "center",
    gap: 3,
  },
  summaryLabel: {
    color: colors.muted,
    ...typography.eyebrow,
  },
  summaryValue: {
    color: colors.text,
    ...typography.caption,
  },
  detailsStatus: {
    color: colors.lime,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleLabel: {
    color: colors.text,
    ...typography.cardTitle,
  },
  toggleHint: {
    color: colors.muted,
    ...typography.body,
  },
  errorText: {
    color: "#f59e0b",
    lineHeight: 20,
  },
  syncStatusText: {
    color: colors.muted,
    ...typography.caption,
  },
  sectionMiniLabel: {
    color: colors.muted,
    ...typography.eyebrow,
  },
});

function PreferenceToggleRow({
  label,
  hint,
  value,
  busy,
  onValueChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  busy: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleLabel}>
          {label}
        </Text>
        <Text style={styles.toggleHint}>
          {hint}
        </Text>
      </View>
      <Switch
        value={value}
        disabled={busy}
        onValueChange={onValueChange}
        thumbColor={value ? colors.lime : "#d1d5db"}
        trackColor={{ false: "rgba(255,255,255,0.12)", true: "rgba(185,244,85,0.35)" }}
      />
    </View>
  );
}

function QuickActionTile({
  icon,
  label,
  value,
  onPress,
  fullWidth = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
  fullWidth?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.quickTile,
        fullWidth ? styles.quickTileFull : null,
        pressed ? styles.quickTilePressed : null,
      ]}
    >
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={18} color={colors.lime} />
      </View>
      <View style={styles.quickCopy}>
        <Text numberOfLines={1} style={styles.quickLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.quickValue}>{value}</Text>
      </View>
    </Pressable>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryTile}>
      <Text numberOfLines={1} style={styles.summaryLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

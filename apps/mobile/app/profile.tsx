import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { zookMockServices } from "@zook/core";
import {
  AuditWarning,
  Card,
  Dock,
  GlassInput,
  InfoRow,
  Pill,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SectionHeader,
  SecondaryLink,
} from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { titleCaseFromCode } from "@/lib/formatting";
import { mergeNotificationPreferences } from "@/lib/notification-preferences";
import { usePushNotifications } from "@/lib/push-notifications";
import { useMyNotificationPreferences, useMyProfile } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

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
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Account"
          title={session?.user.name ?? "Zook member"}
        />

        {routeParams.focus === "membership" ? (
          <Card style={styles.calloutCard}>
            <Pill tone="blue">Membership update</Pill>
            <Text style={styles.calloutTitle}>
              Your membership details are below.
            </Text>
          </Card>
        ) : null}

        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.profileName}>
                {session?.user.email ?? "No email"}
              </Text>
              <Text style={styles.profileBody}>
                {session?.user.phone ?? "Phone not added"}
              </Text>
            </View>
          </View>
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
                  <Pill key={role} tone={role === activeRole ? "lime" : "blue"}>
                    {role === activeRole ? `Active ${titleCaseFromCode(role)}` : titleCaseFromCode(role)}
                  </Pill>
                </Pressable>
              ))
            ) : (
              <Pill tone="neutral">Member</Pill>
            )}
          </View>
        </Card>

        {session?.user.guardianPending ? (
          <Card style={styles.minorCard}>
            <Pill tone="amber">Guardian consent required</Pill>
            <Text style={styles.calloutTitle}>Protected account gates are active.</Text>
            <Text style={styles.profileBody}>
              Membership activation, attendance, PT activation, plan assignment, personalized AI, and marketing stay blocked until guardian consent is verified.
            </Text>
          </Card>
        ) : null}

        <SectionHeader
          eyebrow="My Gym"
          title="Active Location"
          action={<SecondaryLink href="/find-gyms">Explore</SecondaryLink>}
        />

        <Card style={styles.infoCard}>
          <InfoRow
            label="Active gym"
            value={activeOrganization?.name ?? "None selected"}
            tone={activeOrganization ? "lime" : "neutral"}
          />
          <InfoRow
            label="Location"
            value={
              activeOrganization
                ? `${activeOrganization.city}, ${activeOrganization.state}`
                : "Select a gym"
            }
            tone="blue"
          />
          <InfoRow
            label="Status"
            value={titleCaseFromCode(activeOrganization?.status)}
            tone={activeOrganization?.status === "ACTIVE" ? "lime" : "amber"}
          />
        </Card>

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
                    <Text style={styles.orgName}>
                      {organization.name}
                    </Text>
                    <Text style={styles.orgMeta}>
                      {organization.city}, {organization.state}
                    </Text>
                  </View>
                  <Pill tone={selected ? "lime" : "neutral"}>{selected ? "Active" : "Switch"}</Pill>
                </View>
                <View style={styles.roleRow}>
                  {organization.roles.map((role) => (
                    <Pill
                      key={`${organization.orgId}-${role}`}
                      tone={organization.orgId === activeOrgId && role === activeRole ? "lime" : "blue"}
                    >
                      {organization.orgId === activeOrgId && role === activeRole
                        ? `Active ${titleCaseFromCode(role)}`
                        : titleCaseFromCode(role)}
                    </Pill>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        <SectionHeader
          eyebrow="Health & Fitness"
          title="My Profile"
          action={<Pill tone="blue">{ageLabel}</Pill>}
        />

        <Card style={styles.detailsCard}>
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
            label="Summary visible to trainer"
            value={summaryNote}
            onChangeText={setSummaryNote}
            multiline
            placeholder="Injuries, schedule, food constraints, coaching notes..."
          />
          {detailsStatus ? <Text style={styles.detailsStatus}>{detailsStatus}</Text> : null}
          <PrimaryButton onPress={() => void saveMemberDetails()} disabled={detailsBusy}>
            {detailsBusy ? "Saving..." : "Update Profile"}
          </PrimaryButton>
        </Card>

        <SectionHeader
          eyebrow="Preferences"
          title="Alerts"
        />

        <Card style={styles.toggleCard}>
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
        </Card>

        <View style={styles.actionRow}>
          <SecondaryLink href="/notifications" style={styles.actionHalf}>
            Open inbox
          </SecondaryLink>
          <SecondaryLink href="/membership" style={styles.actionHalf}>
            Membership
          </SecondaryLink>
        </View>

        <View style={styles.actionRow}>
          <PrimaryButton
            onPress={() => void openSystemSettings()}
            tone="secondary"
            style={styles.actionHalf}
          >
            System settings
          </PrimaryButton>
          <SecondaryLink href="/plans" style={styles.actionHalf}>
            Plans
          </SecondaryLink>
        </View>

        <SectionHeader
          eyebrow="Privacy"
          title="Data rights"
        />

        <Card style={styles.detailsCard}>
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
        </Card>

        <PrimaryButton onPress={() => void logout()} tone="danger">
          Logout
        </PrimaryButton>
      </ScrollView>
      <Dock />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 120,
  },
  profileCard: {
    gap: 16,
  },
  profileTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.bg,
    fontWeight: "900",
    fontSize: 28,
  },
  profileCopy: {
    flex: 1,
    gap: 6,
  },
  profileName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  profileBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  roleRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  roleButton: {
    borderRadius: 999,
  },
  infoCard: {
    gap: 10,
  },
  orgList: {
    gap: 12,
  },
  orgButton: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 16,
    gap: 12,
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
    fontWeight: "800",
    fontSize: 18,
  },
  orgMeta: {
    color: colors.muted,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionHalf: {
    flex: 1,
  },
  calloutCard: {
    gap: 10,
  },
  minorCard: {
    gap: 10,
    borderColor: "rgba(245,200,75,0.24)",
    backgroundColor: "rgba(245,200,75,0.08)",
  },
  calloutTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
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
    fontSize: 16,
    fontWeight: "800",
  },
  toggleHint: {
    color: colors.muted,
    lineHeight: 20,
  },
  errorText: {
    color: "#f59e0b",
    lineHeight: 20,
  },
  syncStatusText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
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

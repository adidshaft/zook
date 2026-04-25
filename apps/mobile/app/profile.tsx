import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import {
  Card,
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
import { useMyNotificationPreferences } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

export default function Profile() {
  const { activeOrgId, logout, session, setActiveOrgId, token } = useAuth();
  const {
    disablePush,
    error: pushError,
    openSystemSettings,
    requestEnablePush,
    syncStatus,
  } = usePushNotifications();
  const queryClient = useQueryClient();
  const preferencesQuery = useMyNotificationPreferences();
  const routeParams = useLocalSearchParams<{
    focus?: string;
    notificationId?: string;
    subscriptionId?: string;
  }>();
  const [busyPreferenceKey, setBusyPreferenceKey] = useState<string | null>(null);
  const [preferenceError, setPreferenceError] = useState<string | undefined>();
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
                <Pill key={role} tone={role === "MEMBER" ? "lime" : "blue"}>
                  {titleCaseFromCode(role)}
                </Pill>
              ))
            ) : (
              <Pill tone="neutral">Member</Pill>
            )}
          </View>
        </Card>

        <SectionHeader
          eyebrow="Current gym"
          title="Switch gym"
          action={<SecondaryLink href="/find-gyms">Discover</SecondaryLink>}
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
                      tone={role === "MEMBER" ? "lime" : "blue"}
                    >
                      {titleCaseFromCode(role)}
                    </Pill>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        <SectionHeader
          eyebrow="Notifications"
          title="Push preferences"
        />

        <Card style={styles.infoCard}>
          <InfoRow
            label="Push status"
            value={titleCaseFromCode(syncStatus)}
            tone={
              syncStatus === "registered"
                ? "lime"
                : syncStatus === "denied" || syncStatus === "error"
                  ? "amber"
                  : "neutral"
            }
          />
          {pushError || preferenceError ? (
            <Text style={styles.errorText}>
              {preferenceError ?? pushError}
            </Text>
          ) : null}
        </Card>

        <Card style={styles.toggleCard}>
          <PreferenceToggleRow
            label="Push notifications"
            hint="Receive alerts on this device."
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

        <PrimaryButton onPress={() => void logout()} tone="danger">
          Logout
        </PrimaryButton>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
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
  calloutTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  toggleCard: {
    gap: 14,
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

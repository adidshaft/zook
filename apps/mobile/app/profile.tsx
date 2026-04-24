import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import {
  Card,
  InfoRow,
  MetricTile,
  Pill,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SectionHeader,
  SecondaryLink,
} from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { formatDateTime, formatRelativeDate, titleCaseFromCode } from "@/lib/formatting";
import { mergeNotificationPreferences } from "@/lib/notification-preferences";
import { usePushNotifications } from "@/lib/push-notifications";
import { useMyNotificationPreferences, useMyPushDevices } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

export default function Profile() {
  const { activeOrgId, logout, session, setActiveOrgId, token } = useAuth();
  const {
    disablePush,
    error: pushError,
    isExpoGo,
    openSystemSettings,
    permissionState,
    projectIdConfigured,
    refreshRegistration,
    requestEnablePush,
    syncStatus,
  } = usePushNotifications();
  const queryClient = useQueryClient();
  const preferencesQuery = useMyNotificationPreferences();
  const devicesQuery = useMyPushDevices();
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
  const devices = devicesQuery.data?.devices ?? [];

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
          setPreferenceError(pushError ?? "Push permission was not granted or device registration failed.");
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
          subtitle="Switch gyms, review consent state, and keep your account controls visible without leaving the mobile flow."
        />

        {routeParams.focus === "membership" ? (
          <Card style={styles.calloutCard}>
            <Pill tone="blue">Opened from membership notification</Pill>
            <Text style={styles.calloutTitle} selectable>
              Membership context is ready here.
            </Text>
            <Text style={styles.profileBody} selectable>
              {routeParams.subscriptionId
                ? `Subscription ${routeParams.subscriptionId} was included with the notification payload.`
                : "This alert did not include a subscription ID, so the profile screen is acting as the safest fallback."}
            </Text>
          </Card>
        ) : null}

        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.profileName} selectable>
                {session?.user.email ?? "No email"}
              </Text>
              <Text style={styles.profileBody} selectable>
                {session?.user.phone ?? "Phone not added yet"}
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
          <Text style={styles.profileBody} selectable>
            Profile photo consent is used for attendance verification only. Face recognition stays
            out of scope in the current mobile build.
          </Text>
        </Card>

        <View style={styles.metricGrid}>
          <MetricTile
            label="Organizations"
            value={String(session?.organizations.length ?? 0)}
            detail={
              activeOrganization
                ? `${activeOrganization.name} is active now.`
                : "Switch into a gym to personalize the app."
            }
            tone="blue"
          />
          <MetricTile
            label="AI consent"
            value={session?.user.aiConsent ? "Granted" : "Pending"}
            detail={
              session?.user.aiConsent
                ? "Plan assistant and mobile AI flows are available."
                : "Grant consent to unlock personalized AI help."
            }
            tone={session?.user.aiConsent ? "lime" : "amber"}
          />
          <MetricTile
            label="Marketing"
            value={session?.user.marketingOptIn ? "Opted in" : "Quiet mode"}
            detail="Marketing preference is reflected across membership and promotional messaging."
            tone={session?.user.marketingOptIn ? "violet" : "neutral"}
          />
          <MetricTile
            label="Guardian state"
            value={session?.user.guardianPending ? "Pending" : "Clear"}
            detail={
              session?.user.isMinor
                ? session.user.guardianPending
                  ? "Guardian approval is still required."
                  : "Minor safety requirements are satisfied."
                : "Adult account"
            }
            tone={session?.user.guardianPending ? "amber" : "lime"}
          />
        </View>

        <SectionHeader
          eyebrow="Current gym"
          title="Organization context"
          subtitle="Multi-gym members and staff can switch context here without breaking the member experience."
          action={<SecondaryLink href="/find-gyms">Discover more</SecondaryLink>}
        />

        <Card style={styles.infoCard}>
          <InfoRow
            label="Active gym"
            value={activeOrganization?.name ?? "No active organization selected"}
            tone={activeOrganization ? "lime" : "neutral"}
          />
          <InfoRow
            label="Location"
            value={
              activeOrganization
                ? `${activeOrganization.city}, ${activeOrganization.state}`
                : "Switch an organization to personalize this surface"
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
              >
                <View style={styles.orgButtonHeader}>
                  <View style={styles.orgButtonCopy}>
                    <Text style={styles.orgName} selectable>
                      {organization.name}
                    </Text>
                    <Text style={styles.orgMeta} selectable>
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
          eyebrow="Controls"
          title="Privacy and account actions"
          subtitle="These cards keep the current privacy posture visible even before full preference management lands."
        />

        <Card style={styles.infoCard}>
          <InfoRow
            label="Marketing preferences"
            value={session?.user.marketingOptIn ? "Allowed" : "Disabled"}
            tone={session?.user.marketingOptIn ? "violet" : "neutral"}
          />
          <InfoRow
            label="AI personalization"
            value={session?.user.aiConsent ? "Allowed" : "Pending"}
            tone={session?.user.aiConsent ? "lime" : "amber"}
          />
          <InfoRow
            label="Guardian review"
            value={session?.user.guardianPending ? "Pending" : "Not required"}
            tone={session?.user.guardianPending ? "amber" : "neutral"}
          />
        </Card>

        <SectionHeader
          eyebrow="Notifications"
          title="Push readiness"
          subtitle="Pilot members can manage device registration, permission state, and message categories from one place."
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
          <InfoRow
            label="Permission"
            value={titleCaseFromCode(permissionState)}
            tone={permissionState === "granted" ? "lime" : permissionState === "denied" ? "amber" : "neutral"}
          />
          <InfoRow
            label="Preference scope"
            value={
              effectivePreferences.scope === "organization"
                ? "Active gym override"
                : effectivePreferences.scope === "global"
                  ? "Global default"
                  : "App default"
            }
            tone="blue"
          />
          <InfoRow
            label="Build mode"
            value={isExpoGo ? "Expo Go" : "Development / standalone"}
            tone={isExpoGo ? "amber" : "lime"}
          />
          <InfoRow
            label="Expo project"
            value={projectIdConfigured ? "Configured" : "Missing"}
            tone={projectIdConfigured ? "lime" : "amber"}
          />
          <Text style={styles.profileBody} selectable>
            Pilot push validation still belongs on a physical device. The in-app inbox remains the fallback path whenever native banners are unavailable.
          </Text>
          {pushError || preferenceError ? (
            <Text style={styles.errorText} selectable>
              {preferenceError ?? pushError}
            </Text>
          ) : null}
        </Card>

        <Card style={styles.toggleCard}>
          <PreferenceToggleRow
            label="Push alerts"
            hint="Registers this device with Expo push when permission is granted."
            value={effectivePreferences.pushEnabled}
            busy={busyPreferenceKey === "pushEnabled"}
            onValueChange={(value) => void handlePushToggle(value)}
          />
          <PreferenceToggleRow
            label="Transactional"
            hint="Membership, order, and account notifications."
            value={effectivePreferences.transactional}
            busy={busyPreferenceKey === "transactional"}
            onValueChange={(value) => void updateNotificationPreference("transactional", value)}
          />
          <PreferenceToggleRow
            label="Operational"
            hint="Check-in, gym floor, and process updates."
            value={effectivePreferences.operational}
            busy={busyPreferenceKey === "operational"}
            onValueChange={(value) => void updateNotificationPreference("operational", value)}
          />
          <PreferenceToggleRow
            label="Promotional"
            hint="Offers, discounts, and marketing messages."
            value={effectivePreferences.promotional}
            busy={busyPreferenceKey === "promotional"}
            onValueChange={(value) => void updateNotificationPreference("promotional", value)}
          />
          <PreferenceToggleRow
            label="Engagement"
            hint="Plan nudges and reactivation prompts."
            value={effectivePreferences.engagement}
            busy={busyPreferenceKey === "engagement"}
            onValueChange={(value) => void updateNotificationPreference("engagement", value)}
          />
        </Card>

        <View style={styles.actionRow}>
          <SecondaryLink href="/notifications" style={styles.actionHalf}>
            Open inbox
          </SecondaryLink>
          <PrimaryButton
            onPress={() => void refreshRegistration()}
            tone="secondary"
            style={styles.actionHalf}
          >
            Refresh device
          </PrimaryButton>
        </View>

        <View style={styles.actionRow}>
          <PrimaryButton
            onPress={() => void openSystemSettings()}
            tone="secondary"
            style={styles.actionHalf}
          >
            Open settings
          </PrimaryButton>
          <SecondaryLink href="/plans" style={styles.actionHalf}>
            Open plans
          </SecondaryLink>
        </View>

        <SectionHeader
          eyebrow="Devices"
          title="Registered device visibility"
          subtitle="This mirrors the backend push-device registry so QA can confirm the right physical build is active."
        />

        {devicesQuery.isLoading ? (
          <Card>
            <Text style={styles.profileBody}>Loading registered devices...</Text>
          </Card>
        ) : null}

        {!devicesQuery.isLoading && !devices.length ? (
          <Card>
            <Text style={styles.profileBody}>
              No push device has been registered for this account yet. Enable push alerts on a physical device to create one.
            </Text>
          </Card>
        ) : null}

        {devices.length ? (
          <View style={styles.deviceList}>
            {devices.map((device) => (
              <Card key={device.id} style={styles.deviceCard}>
                <View style={styles.deviceHeader}>
                  <View style={styles.deviceCopy}>
                    <Text style={styles.deviceTitle} selectable>
                      {device.deviceLabel ?? "Unnamed device"}
                    </Text>
                    <Text style={styles.profileBody} selectable>
                      {titleCaseFromCode(device.platform ?? "unknown")} · {device.provider ?? "expo"}
                    </Text>
                  </View>
                  <Pill tone={device.status === "ACTIVE" ? "lime" : "amber"}>
                    {titleCaseFromCode(device.status)}
                  </Pill>
                </View>
                <Text style={styles.profileBody} selectable>
                  Last registered{" "}
                  {device.lastRegisteredAt
                    ? formatRelativeDate(device.lastRegisteredAt)
                    : "recently unavailable"}
                </Text>
                <Text style={styles.deviceMeta} selectable>
                  {device.lastRegisteredAt ? formatDateTime(device.lastRegisteredAt) : "No registration timestamp"}
                </Text>
                {device.failureReason ? (
                  <Text style={styles.errorText} selectable>
                    {device.failureReason}
                  </Text>
                ) : null}
              </Card>
            ))}
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <SecondaryLink href="/find-gyms" style={styles.actionHalf}>
            Discover more
          </SecondaryLink>
          <SecondaryLink href="/shop" style={styles.actionHalf}>
            Open shop
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
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
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
  deviceList: {
    gap: 12,
  },
  deviceCard: {
    gap: 10,
  },
  deviceHeader: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceCopy: {
    flex: 1,
    gap: 4,
  },
  deviceTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  deviceMeta: {
    color: colors.muted,
    fontSize: 12,
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
        <Text style={styles.toggleLabel} selectable>
          {label}
        </Text>
        <Text style={styles.toggleHint} selectable>
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

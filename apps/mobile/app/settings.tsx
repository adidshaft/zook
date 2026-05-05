import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { Role } from "@zook/core";
import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";
import {
  AuditWarning,
  BottomNav,
  CollapsibleSection,
  GlassCard,
  GlassInput,
  IconBubble,
  ListRow,
  MobileHeader,
  PrimaryButton,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { toWebUrl } from "@/lib/api";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { memberApi, notificationsApi, privacyApi } from "@/lib/domain-api";
import { titleCaseFromCode } from "@/lib/formatting";
import { mergeNotificationPreferences } from "@/lib/notification-preferences";
import { useGymProfile, useMyConsents, useMyNotificationPreferences, useMyProfile } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

type ReferralSource = {
  code?: string | null;
  status?: string | null;
};

const preferenceRows = [
  { key: "transactional", title: "Payments and receipts", subtitle: "Membership payments, checkout, and renewal notices" },
  { key: "operational", title: "Gym operations", subtitle: "Attendance, approvals, and facility updates" },
  { key: "engagement", title: "Training reminders", subtitle: "Plans, habits, streaks, and coach nudges" },
  { key: "promotional", title: "Offers", subtitle: "Referral, coupon, and gym campaign messages" },
] as const;

export default function Settings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, activeRole, logout, session, setActiveRole, token } = useAuth();
  const privacyQuery = useMyConsents();
  const profileQuery = useMyProfile();
  const notificationPreferencesQuery = useMyNotificationPreferences();
  const activeOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization ??
    null;
  const gymQuery = useGymProfile(activeOrganization?.username ?? "");
  const notificationPreferences = useMemo(
    () => mergeNotificationPreferences(notificationPreferencesQuery.data?.preferences, activeOrgId),
    [activeOrgId, notificationPreferencesQuery.data?.preferences],
  );
  const [profileForm, setProfileForm] = useState({
    name: session?.user.name ?? "",
    phone: session?.user.phone ?? "",
    fitnessGoal: "",
  });
  const [profileStatus, setProfileStatus] = useState("");
  const [preferenceStatus, setPreferenceStatus] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const latestExport = privacyQuery.data?.exportRequests?.[0] ?? null;
  const latestDeletion = privacyQuery.data?.deletionRequests?.[0] ?? null;
  const allRoles = Array.from(
    new Set([
      ...(session?.organizations.flatMap((organization) => organization.roles) ?? []),
      ...(session?.user.isPlatformAdmin ? (["PLATFORM_ADMIN"] as Role[]) : []),
    ]),
  );
  const referral = findReferral(profileQuery.data, gymQuery.data);
  const referralCode = referral?.code?.trim();
  const referralLink = referralCode ? toWebUrl(`/r/${referralCode}`) : "";

  useEffect(() => {
    const profile = profileQuery.data;
    setProfileForm({
      name: profile?.user.name ?? session?.user.name ?? "",
      phone: profile?.user.phone ?? session?.user.phone ?? "",
      fitnessGoal: profile?.user.fitnessGoal ?? profile?.wellness?.summaryNote ?? "",
    });
  }, [profileQuery.data, session?.user.name, session?.user.phone]);

  async function saveProfile() {
    if (!token) return;
    setBusy("profile");
    setProfileStatus("");
    try {
      await memberApi.updateProfile({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        body: {
          name: profileForm.name.trim(),
          phone: profileForm.phone.trim() || null,
          fitnessGoal: profileForm.fitnessGoal.trim() || null,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "profile", activeOrgId] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "me", activeOrgId] }),
      ]);
      setProfileStatus("Profile saved.");
    } catch (error) {
      setProfileStatus(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function updatePreference(key: (typeof preferenceRows)[number]["key"] | "pushEnabled", value: boolean) {
    if (!token) return;
    setBusy(`preference-${key}`);
    setPreferenceStatus("");
    try {
      await notificationsApi.updatePreferences({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        preferences: {
          ...(activeOrgId ? { orgId: activeOrgId } : {}),
          [key]: value,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["me", "notification-preferences"] });
      setPreferenceStatus("Notification preferences updated.");
    } catch (error) {
      setPreferenceStatus(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function requestPrivacyExport() {
    if (!token) return;
    setBusy("privacy");
    try {
      await privacyApi.requestDataExport({ token });
      await privacyQuery.refetch();
      setPrivacyStatus("Export requested. You'll receive an email when it's ready.");
    } catch (error) {
      setPrivacyStatus(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function requestPrivacyDeletion() {
    if (!token) return;
    setBusy("privacy");
    try {
      await privacyApi.requestAccountDeletion({ token });
      await privacyQuery.refetch();
      setPrivacyStatus("Deletion requested. This is being reviewed before execution.");
    } catch (error) {
      setPrivacyStatus(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function shareReferral() {
    if (!referralCode) return;
    await Share.share({
      message: `Join me on Zook with ${referralCode}: ${referralLink}`,
      url: referralLink,
    });
  }

  async function copyReferral() {
    if (!referralCode) return;
    const clipboard = (globalThis as {
      navigator?: { clipboard?: { writeText?: (value: string) => Promise<void> } };
    }).navigator?.clipboard;
    if (clipboard?.writeText) {
      await clipboard.writeText(referralLink || referralCode);
      setCopiedReferral(true);
      return;
    }
    await shareReferral();
  }

  async function switchRole(role: Role) {
    await setActiveRole(role);
    router.replace(routeForRole(role));
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          style={styles.scroller}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            title="Settings"
            subtitle="Account, notifications, and support"
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
            }
            showProfileShortcut={false}
          />

          <CollapsibleSection title="Profile" subtitle={session?.user.email ?? "Signed in"} defaultOpen>
            <GlassCard variant="compact" contentStyle={styles.accountContent}>
              <IconBubble icon="person-outline" tone="blue" size={36} />
              <View style={styles.accountCopy}>
                <Text style={styles.accountName}>{profileForm.name || "Zook user"}</Text>
                <Text style={styles.accountEmail}>
                  {session?.user.email ?? profileForm.phone ?? ""}
                </Text>
              </View>
            </GlassCard>
            <GlassInput
              label="Name"
              value={profileForm.name}
              onChangeText={(name) => setProfileForm((current) => ({ ...current, name }))}
              autoCapitalize="words"
            />
            <GlassInput
              label="Phone"
              value={profileForm.phone}
              onChangeText={(phone) => setProfileForm((current) => ({ ...current, phone }))}
              keyboardType="phone-pad"
            />
            <GlassInput
              label="Fitness goal"
              value={profileForm.fitnessGoal}
              onChangeText={(fitnessGoal) => setProfileForm((current) => ({ ...current, fitnessGoal }))}
              placeholder="Strength, fat loss, mobility..."
              multiline
            />
            <PrimaryButton onPress={() => void saveProfile()} disabled={busy === "profile"}>
              {busy === "profile" ? "Saving..." : "Save profile"}
            </PrimaryButton>
            {profileStatus ? <Text style={styles.statusText}>{profileStatus}</Text> : null}
          </CollapsibleSection>

          {allRoles.length > 1 ? (
            <CollapsibleSection title="Role" subtitle={`Using Zook as ${titleCaseFromCode(activeRole)}`}>
              <View style={styles.roleGrid}>
                <Text style={styles.sectionMiniLabel}>Use Zook as</Text>
                <View style={styles.roleRow}>
                  {allRoles.map((role) => (
                    <Pressable
                      key={role}
                      onPress={() => void switchRole(role)}
                      accessibilityRole="button"
                      accessibilityLabel={`Switch to ${titleCaseFromCode(role)}`}
                      style={[
                        styles.roleButton,
                        role === activeRole ? styles.roleButtonActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          role === activeRole ? styles.roleButtonTextActive : null,
                        ]}
                      >
                        {titleCaseFromCode(role)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </CollapsibleSection>
          ) : null}

          <CollapsibleSection
            title="Notifications"
            subtitle={`${notificationPreferences.scope === "organization" ? "Gym-specific" : "Global"} preferences`}
            defaultOpen
          >
            <GlassCard variant="compact" contentStyle={styles.preferenceStack}>
              <PreferenceToggle
                title="Push notifications"
                subtitle="Allow this device to receive enabled notification categories"
                value={notificationPreferences.pushEnabled}
                disabled={busy === "preference-pushEnabled"}
                onValueChange={(value) => void updatePreference("pushEnabled", value)}
              />
              {preferenceRows.map((row) => (
                <PreferenceToggle
                  key={row.key}
                  title={row.title}
                  subtitle={row.subtitle}
                  value={notificationPreferences[row.key]}
                  disabled={busy === `preference-${row.key}`}
                  onValueChange={(value) => void updatePreference(row.key, value)}
                />
              ))}
            </GlassCard>
            {preferenceStatus ? <Text style={styles.statusText}>{preferenceStatus}</Text> : null}
          </CollapsibleSection>

          {referralCode ? (
            <CollapsibleSection title="Referral" subtitle={`Code ${referralCode}`} defaultOpen={false}>
              <GlassCard variant="success" contentStyle={styles.referralContent}>
                <View style={styles.referralHeader}>
                  <IconBubble icon="gift-outline" tone="lime" size={40} />
                  <View style={styles.accountCopy}>
                    <Text style={styles.referralTitle}>{referralCode}</Text>
                    <Text style={styles.accountEmail}>
                      {referral?.status ? `${titleCaseFromCode(referral.status)} referral` : "Share with a friend"}
                    </Text>
                  </View>
                </View>
                <View style={styles.qrBlock} accessibilityLabel={`Referral code ${referralCode}`}>
                  {buildCodeGrid(referralCode).map((filled, index) => (
                    <View key={`${referralCode}-${index}`} style={[styles.qrCell, filled ? styles.qrCellFilled : null]} />
                  ))}
                </View>
                <Text numberOfLines={1} style={styles.referralLink}>
                  {referralLink}
                </Text>
                <View style={styles.actionRow}>
                  <ZookButton
                    onPress={() => void copyReferral()}
                    tone="secondary"
                    icon={copiedReferral ? "checkmark-outline" : "copy-outline"}
                    style={styles.actionHalf}
                  >
                    {copiedReferral ? "Copied" : "Copy"}
                  </ZookButton>
                  <ZookButton
                    onPress={() => void shareReferral()}
                    icon="share-social-outline"
                    style={styles.actionHalf}
                  >
                    Share
                  </ZookButton>
                </View>
              </GlassCard>
            </CollapsibleSection>
          ) : null}

          <CollapsibleSection title="App and support" subtitle="Help, policies, and app info" defaultOpen={false}>
            <GlassCard variant="compact" contentStyle={styles.privacyStatusCard}>
              <Pressable
                onPress={() => void Linking.openURL("mailto:help@zook.app")}
                accessibilityRole="button"
                accessibilityLabel="Contact support"
              >
                <ListRow
                  title="Contact support"
                  subtitle="Email help@zook.app with account or gym issues"
                  icon="mail-outline"
                  tone="blue"
                />
              </Pressable>
              <ListRow
                title="About Zook"
                subtitle="Gym operations, memberships, PT, and member experience"
                icon="information-circle-outline"
                tone="lime"
              />
              <ListRow
                title="Signed-in gym"
                subtitle={activeOrganization ? `${activeOrganization.name} · ${activeOrganization.city}` : "No active gym"}
                icon="business-outline"
                tone="neutral"
              />
            </GlassCard>
            <PrimaryButton onPress={() => void logout()} tone="danger">
              Logout
            </PrimaryButton>
          </CollapsibleSection>

          <CollapsibleSection title="Privacy" subtitle="Export or delete data" defaultOpen={false}>
            <AuditWarning>
              These requests are saved and reviewed before anything changes.
            </AuditWarning>
            <View style={styles.actionRow}>
              <PrimaryButton
                onPress={() => void requestPrivacyExport()}
                tone="secondary"
                style={styles.actionHalf}
                disabled={busy === "privacy"}
              >
                Export
              </PrimaryButton>
              <PrimaryButton
                onPress={() => void requestPrivacyDeletion()}
                tone="danger"
                style={styles.actionHalf}
                disabled={busy === "privacy"}
              >
                Delete
              </PrimaryButton>
            </View>
            {privacyStatus ? <Text style={styles.statusText}>{privacyStatus}</Text> : null}
            <GlassCard variant="compact" contentStyle={styles.privacyStatusCard}>
              <ListRow
                title="Latest export"
                subtitle={
                  latestExport
                    ? privacyStatusLine(
                        latestExport.status,
                        latestExport.completedAt ?? latestExport.createdAt,
                      )
                    : "No export request yet"
                }
                icon="download-outline"
                tone={latestExport?.status === "ready" ? "lime" : "blue"}
              />
              <ListRow
                title="Latest deletion"
                subtitle={
                  latestDeletion
                    ? privacyStatusLine(
                        latestDeletion.status,
                        latestDeletion.scheduledFor ?? latestDeletion.createdAt,
                      )
                    : "No deletion request yet"
                }
                icon="trash-outline"
                tone={latestDeletion ? "amber" : "neutral"}
              />
            </GlassCard>
          </CollapsibleSection>
        </ScrollView>
        <BottomNav />
      </ZookScreen>
    </>
  );
}

function PreferenceToggle({
  disabled,
  onValueChange,
  subtitle,
  title,
  value,
}: {
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
  subtitle: string;
  title: string;
  value: boolean;
}) {
  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceCopy}>
        <Text style={styles.preferenceTitle}>{title}</Text>
        <Text style={styles.preferenceSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: "rgba(255,255,255,0.14)", true: "rgba(185,244,85,0.35)" }}
        thumbColor={value ? colors.lime : colors.muted}
      />
    </View>
  );
}

function findReferral(...sources: unknown[]): ReferralSource | null {
  for (const source of sources) {
    const record = source as Record<string, unknown> | null | undefined;
    const referral = record?.referral as ReferralSource | undefined;
    const user = record?.user as Record<string, unknown> | undefined;
    const profile = record?.profile as Record<string, unknown> | undefined;
    const code =
      referral?.code ??
      (record?.referralCode as string | undefined) ??
      (user?.referralCode as string | undefined) ??
      (profile?.referralCode as string | undefined);
    if (code) {
      return { code, status: referral?.status ?? (record?.referralStatus as string | undefined) };
    }
  }
  return null;
}

function buildCodeGrid(code: string) {
  const chars = code.split("");
  return Array.from({ length: 49 }, (_, index) => {
    if (index < 7 || index % 7 === 0 || index % 7 === 6 || index > 41) return true;
    const charCode = chars[index % chars.length]?.charCodeAt(0) ?? 0;
    return (charCode + index) % 3 !== 0;
  });
}

function routeForRole(role: Role) {
  if (role === "TRAINER") return "/trainer";
  if (role === "RECEPTIONIST") return "/reception";
  if (role === "OWNER" || role === "ADMIN") return "/owner";
  if (role === "PLATFORM_ADMIN") return "/platform";
  return "/";
}

function privacyStatusLine(status: string, date?: string | null) {
  const label = status.replace(/_/g, " ");
  if (!date) {
    return label;
  }
  return `${label} · ${new Date(date).toLocaleDateString()}`;
}

const styles = StyleSheet.create({
  scroller: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: layout.contentWidth + layout.screenPadding * 2,
    alignSelf: "center",
    paddingHorizontal: layout.screenPadding,
    paddingTop: 14,
    paddingBottom: layout.bottomNavContentPadding + 32,
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionHalf: {
    flex: 1,
  },
  statusText: {
    color: colors.lime,
    ...typography.small,
  },
  accountContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  accountCopy: {
    flex: 1,
    gap: 4,
  },
  accountName: {
    color: colors.text,
    ...typography.cardTitle,
  },
  accountEmail: {
    color: colors.muted,
    ...typography.small,
  },
  privacyStatusCard: {
    gap: spacing.sm,
  },
  roleGrid: {
    gap: spacing.sm,
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  roleButton: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  roleButtonActive: {
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.14)",
  },
  roleButtonText: {
    color: colors.muted,
    ...typography.caption,
  },
  roleButtonTextActive: {
    color: colors.lime,
  },
  sectionMiniLabel: {
    color: colors.muted,
    ...typography.eyebrow,
  },
  preferenceStack: {
    gap: spacing.sm,
  },
  preferenceRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 4,
  },
  preferenceCopy: {
    flex: 1,
    gap: 3,
  },
  preferenceTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  preferenceSubtitle: {
    color: colors.muted,
    ...typography.small,
  },
  referralContent: {
    gap: spacing.md,
  },
  referralHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  referralTitle: {
    color: colors.text,
    ...typography.headerTitle,
  },
  referralLink: {
    color: colors.muted,
    ...typography.small,
  },
  qrBlock: {
    width: 154,
    height: 154,
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.26)",
    backgroundColor: "rgba(2,6,23,0.58)",
  },
  qrCell: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  qrCellFilled: {
    backgroundColor: colors.lime,
  },
});

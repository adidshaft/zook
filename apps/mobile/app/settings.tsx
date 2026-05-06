import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { Role } from "@zook/core";
import { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
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
import { useI18n, type LocalePreference, type TranslationKey } from "@/lib/i18n";
import { mergeNotificationPreferences } from "@/lib/notification-preferences";
import {
  useGymProfile,
  useMyConsents,
  useMyNotificationPreferences,
  useMyProfile,
} from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

type ReferralSource = {
  code?: string | null;
  status?: string | null;
};

function sanitizeOtpCode(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[^0-9]/g, "")
    .slice(0, 6);
}

const preferenceRows = [
  {
    key: "transactional",
    titleKey: "settings.paymentsReceipts",
    subtitleKey: "settings.paymentsReceiptsSubtitle",
  },
  {
    key: "operational",
    titleKey: "settings.gymOperations",
    subtitleKey: "settings.gymOperationsSubtitle",
  },
  {
    key: "engagement",
    titleKey: "settings.trainingReminders",
    subtitleKey: "settings.trainingRemindersSubtitle",
  },
  {
    key: "promotional",
    titleKey: "settings.offers",
    subtitleKey: "settings.offersSubtitle",
  },
] as const;

const localeOptions: Array<{ labelKey: TranslationKey; value: LocalePreference }> = [
  { labelKey: "settings.languageSystem", value: "system" },
  { labelKey: "settings.languageEnglish", value: "en" },
  { labelKey: "settings.languageHindi", value: "hi" },
];

export default function Settings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, activeRole, logout, refresh, session, setActiveRole, token } = useAuth();
  const { preference: localePreference, setLocalePreference, t } = useI18n();
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
    email: session?.user.email ?? "",
    phone: session?.user.phone ?? "",
    fitnessGoal: "",
  });
  const [profileStatus, setProfileStatus] = useState("");
  const [contactStatus, setContactStatus] = useState("");
  const [contactOtp, setContactOtp] = useState<{
    kind: "email" | "phone";
    identifier: string;
    code: string;
  } | null>(null);
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
    if (!copiedReferral) return;
    const timeout = setTimeout(() => setCopiedReferral(false), 2000);
    return () => clearTimeout(timeout);
  }, [copiedReferral]);

  useEffect(() => {
    const profile = profileQuery.data;
    setProfileForm({
      name: profile?.user.name ?? session?.user.name ?? "",
      email: profile?.user.email || session?.user.email || "",
      phone: profile?.user.phone ?? session?.user.phone ?? "",
      fitnessGoal: profile?.user.fitnessGoal ?? profile?.wellness?.summaryNote ?? "",
    });
  }, [profileQuery.data, session?.user.email, session?.user.name, session?.user.phone]);

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
          fitnessGoal: profileForm.fitnessGoal.trim() || null,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "profile", activeOrgId] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "me", activeOrgId] }),
      ]);
      setProfileStatus(t("settings.profileSaved"));
    } catch (error) {
      setProfileStatus(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function requestContactOtp(kind: "email" | "phone") {
    if (!token) return;
    const identifier = (kind === "email" ? profileForm.email : profileForm.phone).trim();
    if (!identifier) {
      setContactStatus(
        t("settings.enterContact", {
          kind: kind === "email" ? t("settings.email") : t("settings.phone"),
        }),
      );
      return;
    }
    setBusy(`contact-${kind}`);
    setContactStatus("");
    try {
      const result = await memberApi.requestContactOtp({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        identifier,
      });
      const seededCode = sanitizeOtpCode(result.devOtp ?? "");
      setContactOtp({ kind, identifier, code: seededCode });
      setContactStatus(t("settings.contactCodeSent", { identifier }));
    } catch (error) {
      setContactStatus(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function verifyContactOtp() {
    if (!token || !contactOtp) return;
    const code = sanitizeOtpCode(contactOtp.code);
    if (code.length !== 6) {
      setContactStatus(t("settings.enterSixDigitCode"));
      return;
    }
    setBusy("contact-verify");
    setContactStatus("");
    try {
      await memberApi.verifyContactOtp({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        identifier: contactOtp.identifier,
        code,
      });
      setContactOtp(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "profile", activeOrgId] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "me", activeOrgId] }),
      ]);
      await refresh();
      setContactStatus(
        contactOtp.kind === "email" ? t("settings.emailVerified") : t("settings.phoneVerified"),
      );
    } catch (error) {
      setContactStatus(getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function updatePreference(
    key: (typeof preferenceRows)[number]["key"] | "pushEnabled",
    value: boolean,
  ) {
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
      setPreferenceStatus(t("settings.preferencesUpdated"));
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
      setPrivacyStatus(t("settings.exportRequested"));
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
      setPrivacyStatus(t("settings.deletionRequested"));
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
    const clipboard = (
      globalThis as {
        navigator?: { clipboard?: { writeText?: (value: string) => Promise<void> } };
      }
    ).navigator?.clipboard;
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
            title={t("settings.profileTitle")}
            subtitle={t("settings.profileSubtitle")}
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                accessibilityRole="button"
                accessibilityLabel={t("settings.goBack")}
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
            }
            showProfileShortcut={false}
          />

          <CollapsibleSection
            title={t("settings.account")}
            subtitle={session?.user.email || profileForm.phone || t("settings.signedIn")}
            defaultOpen
          >
            <GlassCard variant="compact" contentStyle={styles.accountContent}>
              <IconBubble icon="person-outline" tone="blue" size={36} />
              <View style={styles.accountCopy}>
                <Text style={styles.accountName}>{profileForm.name || "Zook user"}</Text>
                <Text style={styles.accountEmail}>
                  {session?.user.email || profileForm.email || profileForm.phone || ""}
                </Text>
              </View>
            </GlassCard>
            {allRoles.length > 1 ? (
              <View style={styles.roleGrid}>
                <Text style={styles.sectionMiniLabel}>{t("settings.useZookAs")}</Text>
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
            ) : null}
            <GlassInput
              label={t("settings.name")}
              value={profileForm.name}
              onChangeText={(name) => setProfileForm((current) => ({ ...current, name }))}
              autoCapitalize="words"
            />
            <GlassInput
              label={t("settings.email")}
              value={profileForm.email}
              onChangeText={(email) => setProfileForm((current) => ({ ...current, email }))}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder={t("settings.emailPlaceholder")}
            />
            <ZookButton
              onPress={() => void requestContactOtp("email")}
              disabled={busy === "contact-email"}
              tone="secondary"
            >
              {t("settings.sendEmailCode")}
            </ZookButton>
            <GlassInput
              label={t("settings.phone")}
              value={profileForm.phone}
              onChangeText={(phone) => setProfileForm((current) => ({ ...current, phone }))}
              keyboardType="phone-pad"
            />
            <ZookButton
              onPress={() => void requestContactOtp("phone")}
              disabled={busy === "contact-phone"}
              tone="secondary"
            >
              {t("settings.sendPhoneCode")}
            </ZookButton>
            {contactOtp ? (
              <GlassCard variant="compact" contentStyle={styles.contactOtpCard}>
                <GlassInput
                  label={
                    contactOtp.kind === "email" ? t("settings.emailCode") : t("settings.phoneCode")
                  }
                  value={contactOtp.code}
                  onChangeText={(code) =>
                    setContactOtp((current) =>
                      current ? { ...current, code: sanitizeOtpCode(code) } : current,
                    )
                  }
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                />
                <PrimaryButton
                  onPress={() => void verifyContactOtp()}
                  disabled={busy === "contact-verify"}
                >
                  {busy === "contact-verify"
                    ? t("settings.verifying")
                    : t("settings.verifyContact")}
                </PrimaryButton>
              </GlassCard>
            ) : null}
            {contactStatus ? <Text style={styles.statusText}>{contactStatus}</Text> : null}
            <GlassInput
              label={t("settings.fitnessGoal")}
              value={profileForm.fitnessGoal}
              onChangeText={(fitnessGoal) =>
                setProfileForm((current) => ({ ...current, fitnessGoal }))
              }
              placeholder={t("settings.fitnessGoalPlaceholder")}
              multiline
            />
            <PrimaryButton onPress={() => void saveProfile()} disabled={busy === "profile"}>
              {busy === "profile" ? t("settings.saving") : t("settings.saveProfile")}
            </PrimaryButton>
            {profileStatus ? <Text style={styles.statusText}>{profileStatus}</Text> : null}
            {referralCode ? (
              <GlassCard variant="success" contentStyle={styles.referralContent}>
                <View style={styles.referralHeader}>
                  <IconBubble icon="gift-outline" tone="lime" size={40} />
                  <View style={styles.accountCopy}>
                    <Text style={styles.referralTitle}>{referralCode}</Text>
                    <Text style={styles.accountEmail}>
                      {referral?.status
                        ? `${titleCaseFromCode(referral.status)} referral`
                        : t("settings.shareFriend")}
                    </Text>
                  </View>
                </View>
                <View style={styles.qrBlock} accessibilityLabel={`Referral code ${referralCode}`}>
                  {buildCodeGrid(referralCode).map((filled, index) => (
                    <View
                      key={`${referralCode}-${index}`}
                      style={[styles.qrCell, filled ? styles.qrCellFilled : null]}
                    />
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
                    {copiedReferral ? t("settings.copied") : t("settings.copy")}
                  </ZookButton>
                  <ZookButton
                    onPress={() => void shareReferral()}
                    icon="share-social-outline"
                    style={styles.actionHalf}
                  >
                    {t("settings.share")}
                  </ZookButton>
                </View>
              </GlassCard>
            ) : null}
          </CollapsibleSection>

          <CollapsibleSection
            title={t("settings.notifications")}
            subtitle={t("settings.notificationScope", {
              scope:
                notificationPreferences.scope === "organization"
                  ? t("settings.notificationScopeGym")
                  : t("settings.notificationScopeGlobal"),
            })}
            defaultOpen
          >
            <GlassCard variant="compact" contentStyle={styles.preferenceStack}>
              <PreferenceToggle
                title={t("settings.pushNotifications")}
                subtitle={t("settings.pushNotificationsSubtitle")}
                value={notificationPreferences.pushEnabled}
                disabled={busy === "preference-pushEnabled"}
                onValueChange={(value) => void updatePreference("pushEnabled", value)}
              />
              {preferenceRows.map((row) => (
                <PreferenceToggle
                  key={row.key}
                  title={t(row.titleKey)}
                  subtitle={t(row.subtitleKey)}
                  value={notificationPreferences[row.key]}
                  disabled={busy === `preference-${row.key}`}
                  onValueChange={(value) => void updatePreference(row.key, value)}
                />
              ))}
            </GlassCard>
            {preferenceStatus ? <Text style={styles.statusText}>{preferenceStatus}</Text> : null}
          </CollapsibleSection>

          <CollapsibleSection
            title={t("settings.language")}
            subtitle={t("settings.languageSubtitle")}
            defaultOpen={false}
          >
            <GlassCard variant="compact" contentStyle={styles.languageContent}>
              <View style={styles.languageRow}>
                {localeOptions.map((option) => {
                  const selected = localePreference === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => void setLocalePreference(option.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[styles.languageButton, selected ? styles.languageButtonActive : null]}
                    >
                      <Text
                        style={[
                          styles.languageButtonText,
                          selected ? styles.languageButtonTextActive : null,
                        ]}
                      >
                        {t(option.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </GlassCard>
          </CollapsibleSection>

          <CollapsibleSection
            title={t("settings.privacyData")}
            subtitle={t("settings.privacySubtitle")}
            defaultOpen={false}
          >
            <AuditWarning>{t("settings.privacyWarning")}</AuditWarning>
            <View style={styles.actionRow}>
              <PrimaryButton
                onPress={() => void requestPrivacyExport()}
                tone="secondary"
                style={styles.actionHalf}
                disabled={busy === "privacy"}
              >
                {t("settings.export")}
              </PrimaryButton>
              <PrimaryButton
                onPress={() => void requestPrivacyDeletion()}
                tone="danger"
                style={styles.actionHalf}
                disabled={busy === "privacy"}
              >
                {t("settings.delete")}
              </PrimaryButton>
            </View>
            {privacyStatus ? <Text style={styles.statusText}>{privacyStatus}</Text> : null}
            <GlassCard variant="compact" contentStyle={styles.privacyStatusCard}>
              <ListRow
                title={t("settings.latestExport")}
                subtitle={
                  latestExport
                    ? privacyStatusLine(
                        latestExport.status,
                        latestExport.completedAt ?? latestExport.createdAt,
                      )
                    : t("settings.noExport")
                }
                icon="download-outline"
                tone={latestExport?.status === "ready" ? "lime" : "blue"}
              />
              <ListRow
                title={t("settings.latestDeletion")}
                subtitle={
                  latestDeletion
                    ? privacyStatusLine(
                        latestDeletion.status,
                        latestDeletion.scheduledFor ?? latestDeletion.createdAt,
                      )
                    : t("settings.noDeletion")
                }
                icon="trash-outline"
                tone={latestDeletion ? "amber" : "neutral"}
              />
            </GlassCard>
          </CollapsibleSection>

          <CollapsibleSection
            title={t("settings.system")}
            subtitle={t("settings.systemSubtitle")}
            defaultOpen={false}
          >
            <GlassCard variant="compact" contentStyle={styles.privacyStatusCard}>
              <Pressable
                onPress={() => void Linking.openURL("mailto:help@zook.app")}
                accessibilityRole="button"
                accessibilityLabel={t("settings.contactSupport")}
              >
                <ListRow
                  title={t("settings.contactSupport")}
                  subtitle={t("settings.contactSupportSubtitle")}
                  icon="mail-outline"
                  tone="blue"
                />
              </Pressable>
              <ListRow
                title={t("settings.aboutZook")}
                subtitle={t("settings.aboutZookSubtitle")}
                icon="information-circle-outline"
                tone="lime"
              />
              <ListRow
                title={t("settings.signedInGym")}
                subtitle={
                  activeOrganization
                    ? `${activeOrganization.name} · ${activeOrganization.city}`
                    : t("settings.noActiveGym")
                }
                icon="business-outline"
                tone="neutral"
              />
            </GlassCard>
          </CollapsibleSection>

          <PrimaryButton onPress={() => void logout()} tone="danger">
            {t("settings.logout")}
          </PrimaryButton>
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
  contactOtpCard: {
    gap: spacing.md,
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
  languageContent: {
    gap: spacing.sm,
  },
  languageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  languageButton: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  languageButtonActive: {
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.14)",
  },
  languageButtonText: {
    color: colors.muted,
    ...typography.caption,
  },
  languageButtonTextActive: {
    color: colors.lime,
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

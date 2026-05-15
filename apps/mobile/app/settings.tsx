import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import {
  AuditWarning,
  BottomNav,
  CollapsibleSection,
  GlassCard,
  ListRow,
  MobileHeader,
  PrimaryButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { SettingsSkeleton } from "@/components/skeletons";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { toWebUrl } from "@/lib/api";
import { notificationsApi, privacyApi } from "@/lib/domain-api";
import { useI18n, type LocalePreference, type TranslationKey } from "@/lib/i18n";
import { mergeNotificationPreferences } from "@/lib/notification-preferences";
import { useMyConsents, useMyNotificationPreferences } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

type SettingsSection = "notifications" | "language" | "privacy" | "system";

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
  const { activeOrgId, logout, session, token } = useAuth();
  const { preference: localePreference, setLocalePreference, t } = useI18n();
  const privacyQuery = useMyConsents();
  const notificationPreferencesQuery = useMyNotificationPreferences();
  const activeOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization ??
    null;
  const notificationPreferences = useMemo(
    () => mergeNotificationPreferences(notificationPreferencesQuery.data?.preferences, activeOrgId),
    [activeOrgId, notificationPreferencesQuery.data?.preferences],
  );
  const [openSection, setOpenSection] = useState<SettingsSection | null>("notifications");
  const [preferenceStatus, setPreferenceStatus] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("");
  const [clipboardStatus, setClipboardStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const latestExport = privacyQuery.data?.exportRequests?.[0] ?? null;
  const latestDeletion = privacyQuery.data?.deletionRequests?.[0] ?? null;
  const settingsLoading = privacyQuery.isLoading || notificationPreferencesQuery.isLoading;

  function sectionProps(section: SettingsSection) {
    return {
      open: openSection === section,
      onOpenChange: (open: boolean) => setOpenSection(open ? section : null),
    };
  }

  function confirmSignOut() {
    Alert.alert("Sign out?", "You can sign back in with OTP any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void logout();
        },
      },
    ]);
  }

  async function changeLocalePreference(nextPreference: LocalePreference) {
    await setLocalePreference(nextPreference);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me", "profile"] }),
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
    ]);
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

  async function copyInviteLink() {
    const url = activeOrganization?.username
      ? toWebUrl(`/join/${activeOrganization.username}`)
      : toWebUrl("/");
    await Clipboard.setStringAsync(url);
    setClipboardStatus(t("settings.copied"));
    setTimeout(() => setClipboardStatus(""), 2000);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <KeyboardAwareScreen
          scrollViewProps={{
            style: styles.scroller,
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
          }}
        >
          <MobileHeader
            title="Settings"
            subtitle="Notifications, language, privacy, and support"
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

          {settingsLoading ? <SettingsSkeleton /> : null}
          {!settingsLoading ? (
            <>
          <CollapsibleSection
            title={t("settings.notifications")}
            subtitle={t("settings.notificationScope", {
              scope:
                notificationPreferences.scope === "organization"
                  ? t("settings.notificationScopeGym")
                  : t("settings.notificationScopeGlobal"),
            })}
            {...sectionProps("notifications")}
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
            {...sectionProps("language")}
          >
            <GlassCard variant="compact" contentStyle={styles.languageContent}>
              <View style={styles.languageRow}>
                {localeOptions.map((option) => {
                  const selected = localePreference === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => void changeLocalePreference(option.value)}
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
            {...sectionProps("privacy")}
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
            {...sectionProps("system")}
          >
            <GlassCard variant="compact" contentStyle={styles.privacyStatusCard}>
              <Pressable
                onPress={() => void Linking.openURL("mailto:support@zookfit.in")}
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
                title={t("settings.shareFriend")}
                subtitle={clipboardStatus || "Copy a Zook join link to your clipboard"}
                icon="share-outline"
                tone="amber"
                trailing={
                  <Pressable
                    onPress={() => void copyInviteLink()}
                    accessibilityRole="button"
                    accessibilityLabel={t("settings.copy")}
                    style={styles.copyButton}
                  >
                    <Text style={styles.copyButtonText}>{t("settings.copy")}</Text>
                  </Pressable>
                }
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

          <Pressable
            onPress={confirmSignOut}
            accessibilityRole="button"
            accessibilityLabel={t("settings.logout")}
            style={({ pressed }) => [styles.logoutLink, pressed ? styles.logoutLinkPressed : null]}
          >
            <Text style={styles.logoutLinkText}>{t("settings.logout")}</Text>
          </Pressable>
            </>
          ) : null}
        </KeyboardAwareScreen>
        <BottomNav selectedPath="/profile" />
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
  logoutLink: {
    minHeight: 48,
    marginTop: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutLinkPressed: {
    opacity: 0.72,
  },
  logoutLinkText: {
    color: colors.red,
    ...typography.caption,
  },
  statusText: {
    color: colors.lime,
    ...typography.small,
  },
  privacyStatusCard: {
    gap: spacing.sm,
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
  copyButton: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.12)",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  copyButtonText: {
    color: colors.lime,
    ...typography.caption,
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
});

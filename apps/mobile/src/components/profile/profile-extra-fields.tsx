import DateTimePicker from "@react-native-community/datetimepicker";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import {
  GlassCard,
  GlassInput,
  Pill,
  SegmentedControl,
} from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { memberApi } from "@/lib/domain-api";
import { useI18n } from "@/lib/i18n";
import { useMyProfile } from "@/lib/query-hooks";
import { colors, spacing, typography } from "@/lib/theme";

type GenderValue = "male" | "female" | "non_binary" | "prefer_not_to_say";
type LocaleValue = "en" | "hi";
type SaveKey =
  | "dateOfBirth"
  | "gender"
  | "emergencyContactName"
  | "emergencyContactPhone"
  | "marketingOptIn"
  | "aiConsent"
  | "preferredLocale";

const genderOptions: Array<{ label: string; value: GenderValue }> = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Non-binary", value: "non_binary" },
  { label: "Prefer not to say", value: "prefer_not_to_say" },
];

const localeOptions: Array<{ label: string; value: LocaleValue }> = [
  { label: "EN", value: "en" },
  { label: "हिन्दी", value: "hi" },
];

function dateOnly(value?: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isUnder18(value?: Date | null) {
  if (!value) return false;
  const today = new Date();
  let age = today.getFullYear() - value.getFullYear();
  const monthDelta = today.getMonth() - value.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < value.getDate())) {
    age -= 1;
  }
  return age < 18;
}

function displayDate(value?: Date | null) {
  if (!value) return "Add date of birth";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function normalizeGender(value?: string | null): GenderValue {
  if (value === "male" || value === "female" || value === "non_binary") return value;
  return "prefer_not_to_say";
}

function normalizeLocale(value?: string | null): LocaleValue {
  return value === "hi" ? "hi" : "en";
}

export function ProfileExtraFields() {
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const { locale, setLocalePreference } = useI18n();
  const profileQuery = useMyProfile();
  const profileUser = profileQuery.data?.user;
  const sessionUser = session?.user;
  const [dob, setDob] = useState<Date | null>(parseDate(profileUser?.dateOfBirth ?? null));
  const [showDobPicker, setShowDobPicker] = useState(Platform.OS === "ios");
  const [gender, setGender] = useState<GenderValue>(normalizeGender(profileUser?.gender));
  const [emergencyName, setEmergencyName] = useState(profileUser?.emergencyContact?.name ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(profileUser?.emergencyContact?.phone ?? "");
  const [marketingOptIn, setMarketingOptIn] = useState(
    Boolean(profileUser?.marketingOptIn ?? sessionUser?.marketingOptIn),
  );
  const [aiConsent, setAiConsent] = useState(Boolean(profileUser?.aiConsent ?? sessionUser?.aiConsent));
  const [preferredLocale, setPreferredLocale] = useState<LocaleValue>(
    normalizeLocale(profileUser?.preferredLocale ?? sessionUser?.preferredLocale ?? locale),
  );
  const [savingKey, setSavingKey] = useState<SaveKey | null>(null);
  const [savedKey, setSavedKey] = useState<SaveKey | null>(null);
  const [error, setError] = useState("");
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const minor = useMemo(() => isUnder18(dob), [dob]);

  useEffect(() => {
    setDob(parseDate(profileUser?.dateOfBirth ?? null));
    setGender(normalizeGender(profileUser?.gender));
    setEmergencyName(profileUser?.emergencyContact?.name ?? "");
    setEmergencyPhone(profileUser?.emergencyContact?.phone ?? "");
    setMarketingOptIn(Boolean(profileUser?.marketingOptIn ?? sessionUser?.marketingOptIn));
    setAiConsent(Boolean(profileUser?.aiConsent ?? sessionUser?.aiConsent));
    setPreferredLocale(
      normalizeLocale(profileUser?.preferredLocale ?? sessionUser?.preferredLocale ?? locale),
    );
  }, [
    locale,
    profileUser?.aiConsent,
    profileUser?.dateOfBirth,
    profileUser?.emergencyContact?.name,
    profileUser?.emergencyContact?.phone,
    profileUser?.gender,
    profileUser?.marketingOptIn,
    profileUser?.preferredLocale,
    sessionUser?.aiConsent,
    sessionUser?.marketingOptIn,
    sessionUser?.preferredLocale,
  ]);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  async function saveField(key: SaveKey, body: Record<string, unknown>) {
    if (!token) return;
    setSavingKey(key);
    setError("");
    try {
      // CODEX: assumed PATCH /me/profile accepts Sprint 2C fields as first-class user fields.
      await memberApi.updateProfile({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        body,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "profile", activeOrgId] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "me", activeOrgId] }),
      ]);
      setSavedKey(key);
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
      savedTimeoutRef.current = setTimeout(() => setSavedKey(null), 2000);
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSavingKey(null);
    }
  }

  function saveEmergency(nextName = emergencyName, nextPhone = emergencyPhone, key: SaveKey) {
    void saveField(key, {
      emergencyContact: {
        name: nextName.trim() || null,
        phone: nextPhone.trim() || null,
      },
    });
  }

  return (
    <GlassCard contentStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Profile details</Text>
          <Text style={styles.subtitle}>Safety, consent, and gym KYC fields.</Text>
        </View>
        {savedKey ? <Pill tone="lime">Saved</Pill> : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Date of birth</Text>
        <Pressable
          onPress={() => setShowDobPicker(true)}
          accessibilityRole="button"
          style={styles.dateButton}
        >
          <Text style={dob ? styles.dateText : styles.datePlaceholder}>{displayDate(dob)}</Text>
        </Pressable>
        {showDobPicker ? (
          <DateTimePicker
            value={dob ?? new Date(1998, 0, 1)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={new Date()}
            onChange={(_, selectedDate) => {
              if (Platform.OS !== "ios") {
                setShowDobPicker(false);
              }
              if (!selectedDate) return;
              setDob(selectedDate);
              void saveField("dateOfBirth", { dateOfBirth: dateOnly(selectedDate) });
            }}
          />
        ) : null}
        {minor ? (
          <Text style={styles.warningText}>Please have a guardian complete this.</Text>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Gender</Text>
        <SegmentedControl
          options={genderOptions}
          value={gender}
          onChange={(nextGender) => {
            setGender(nextGender);
            void saveField("gender", {
              gender: nextGender === "prefer_not_to_say" ? null : nextGender,
            });
          }}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Emergency contact</Text>
        <GlassInput
          label="Name"
          value={emergencyName}
          onChangeText={setEmergencyName}
          onBlur={() => saveEmergency(undefined, undefined, "emergencyContactName")}
          editable={savingKey !== "emergencyContactName"}
          returnKeyType="next"
        />
        <GlassInput
          label="Phone"
          value={emergencyPhone}
          onChangeText={setEmergencyPhone}
          onBlur={() => saveEmergency(undefined, undefined, "emergencyContactPhone")}
          editable={savingKey !== "emergencyContactPhone"}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
      </View>

      <PreferenceToggle
        title="Marketing opt-in"
        subtitle="Offers and gym updates. Disabled automatically for minors."
        value={marketingOptIn}
        disabled={minor || savingKey === "marketingOptIn"}
        onValueChange={(value) => {
          setMarketingOptIn(value);
          void saveField("marketingOptIn", { marketingOptIn: value });
        }}
      />

      <PreferenceToggle
        title="AI consent"
        subtitle="Allow AI features to use your profile context."
        value={aiConsent}
        disabled={minor || savingKey === "aiConsent"}
        onValueChange={(value) => {
          setAiConsent(value);
          void saveField("aiConsent", { aiConsent: value });
        }}
      />

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Locale</Text>
        <SegmentedControl
          options={localeOptions}
          value={preferredLocale}
          onChange={(nextLocale) => {
            setPreferredLocale(nextLocale);
            void setLocalePreference(nextLocale);
            void saveField("preferredLocale", { preferredLocale: nextLocale });
          }}
        />
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </GlassCard>
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

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  title: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.muted,
    textTransform: "uppercase",
  },
  dateButton: {
    minHeight: 50,
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: spacing.md,
  },
  dateText: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  datePlaceholder: {
    ...typography.body,
    color: colors.subtle,
  },
  warningText: {
    ...typography.small,
    color: colors.amber,
  },
  preferenceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  preferenceCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  preferenceTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  preferenceSubtitle: {
    ...typography.small,
    color: colors.muted,
  },
  errorText: {
    ...typography.body,
    color: colors.red,
  },
});

export default ProfileExtraFields;

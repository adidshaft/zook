import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  DatePickerField,
  Card,
  Input,
  Pill,
  SegmentedControl,
  ThemedSwitch,
} from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { memberApi } from "@/lib/domain-api";
import { useI18n } from "@/lib/i18n";
import { useMyProfile } from "@/lib/domains";
import { spacing, typography, useTheme } from "@/lib/theme";

type GenderValue = "male" | "female" | "non_binary" | "prefer_not_to_say";
type LocaleValue = "en" | "hi";
type SaveKey =
  | "dateOfBirth"
  | "gender"
  | "emergencyContactName"
  | "emergencyContactPhone"
  | "marketingOptIn"
  | "aiConsent"
  | "preferredLocale"
  | "weeklyWorkoutGoal";

const genderOptions: Array<{ label: string; value: GenderValue }> = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Non-binary", value: "non_binary" },
  { label: "Not specified", value: "prefer_not_to_say" },
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

function normalizeGender(value?: string | null): GenderValue {
  if (value === "male" || value === "female" || value === "non_binary") return value;
  return "prefer_not_to_say";
}

function normalizeLocale(value?: string | null): LocaleValue {
  return value === "hi" ? "hi" : "en";
}

export function ProfileExtraFields() {
  const { palette } = useTheme();
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const { locale, setLocalePreference } = useI18n();
  const profileQuery = useMyProfile();
  const profileUser = profileQuery.data?.user;
  const sessionUser = session?.user;
  const [dob, setDob] = useState<Date | null>(parseDate(profileUser?.dateOfBirth ?? null));
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
  const [weeklyWorkoutGoal, setWeeklyWorkoutGoal] = useState(
    profileUser?.weeklyWorkoutGoal ?? sessionUser?.weeklyWorkoutGoal ?? 5,
  );
  const [savingKey, setSavingKey] = useState<SaveKey | null>(null);
  const [savedKey, setSavedKey] = useState<SaveKey | null>(null);
  const [error, setError] = useState("");
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldSurface = palette.surface.raised;
  const decreaseGoalDisabled = weeklyWorkoutGoal <= 1 || savingKey === "weeklyWorkoutGoal";
  const increaseGoalDisabled = weeklyWorkoutGoal >= 14 || savingKey === "weeklyWorkoutGoal";

  const completedCount = [
    dob,
    gender !== "prefer_not_to_say",
    emergencyName.trim() && emergencyPhone.trim(),
    preferredLocale,
    weeklyWorkoutGoal,
  ].filter(Boolean).length;

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
    setWeeklyWorkoutGoal(profileUser?.weeklyWorkoutGoal ?? sessionUser?.weeklyWorkoutGoal ?? 5);
  }, [
    locale,
    profileUser?.aiConsent,
    profileUser?.dateOfBirth,
    profileUser?.emergencyContact?.name,
    profileUser?.emergencyContact?.phone,
    profileUser?.gender,
    profileUser?.marketingOptIn,
    profileUser?.preferredLocale,
    profileUser?.weeklyWorkoutGoal,
    sessionUser?.aiConsent,
    sessionUser?.marketingOptIn,
    sessionUser?.preferredLocale,
    sessionUser?.weeklyWorkoutGoal,
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
    <Card contentStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: palette.text.primary }]}>Profile details</Text>
          <Text style={[styles.subtitle, { color: palette.text.secondary }]}>
            {completedCount}/5 safety and KYC fields complete.
          </Text>
        </View>
        {savedKey ? <Pill tone="blue">Saved</Pill> : null}
      </View>

      <View style={styles.fieldGroup}>
        <DatePickerField
          accessibilityLabel="Date of birth"
          label="Date of birth"
          maximumDate={new Date()}
          onChange={(selectedDate) => {
            setDob(selectedDate);
            void saveField("dateOfBirth", { dateOfBirth: dateOnly(selectedDate) });
          }}
          placeholder="Add date of birth"
          value={dob}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.text.secondary }]}>Gender</Text>
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
        <Text style={[styles.label, { color: palette.text.secondary }]}>Emergency contact</Text>
        <Input
          label="Name"
          value={emergencyName}
          onChangeText={setEmergencyName}
          onBlur={() => saveEmergency(undefined, undefined, "emergencyContactName")}
          editable={savingKey !== "emergencyContactName"}
          returnKeyType="next"
        />
        <Input
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
        subtitle="Offers and gym updates."
        value={marketingOptIn}
        disabled={savingKey === "marketingOptIn"}
        onValueChange={(value) => {
          setMarketingOptIn(value);
          void saveField("marketingOptIn", { marketingOptIn: value });
        }}
      />

      <PreferenceToggle
        title="AI consent"
        subtitle="Allow AI features to use your profile context."
        value={aiConsent}
        disabled={savingKey === "aiConsent"}
        onValueChange={(value) => {
          setAiConsent(value);
          void saveField("aiConsent", { aiConsent: value });
        }}
      />

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.text.secondary }]}>Locale</Text>
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

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.text.secondary }]}>Weekly workout goal</Text>
        <View style={styles.stepperRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decrease weekly workout goal"
            disabled={decreaseGoalDisabled}
            onPress={() => {
              const nextGoal = Math.max(1, weeklyWorkoutGoal - 1);
              setWeeklyWorkoutGoal(nextGoal);
              void saveField("weeklyWorkoutGoal", { weeklyWorkoutGoal: nextGoal });
            }}
            style={[
              styles.stepperButton,
              {
                borderColor: palette.border.default,
                backgroundColor: fieldSurface,
                opacity: decreaseGoalDisabled ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons
              name="remove"
              size={19}
              color={decreaseGoalDisabled ? palette.text.tertiary : palette.text.primary}
            />
          </Pressable>
          <Text style={[styles.stepperValue, { color: palette.text.primary }]}>
            {weeklyWorkoutGoal} / week
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase weekly workout goal"
            disabled={increaseGoalDisabled}
            onPress={() => {
              const nextGoal = Math.min(14, weeklyWorkoutGoal + 1);
              setWeeklyWorkoutGoal(nextGoal);
              void saveField("weeklyWorkoutGoal", { weeklyWorkoutGoal: nextGoal });
            }}
            style={[
              styles.stepperButton,
              {
                borderColor: palette.border.default,
                backgroundColor: fieldSurface,
                opacity: increaseGoalDisabled ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons
              name="add"
              size={19}
              color={increaseGoalDisabled ? palette.text.tertiary : palette.text.primary}
            />
          </Pressable>
        </View>
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={[styles.errorText, { color: palette.feedback.danger }]}>
          {error}
        </Text>
      ) : null}
    </Card>
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
  const { palette } = useTheme();
  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceCopy}>
        <Text style={[styles.preferenceTitle, { color: palette.text.primary }]}>{title}</Text>
        <Text style={[styles.preferenceSubtitle, { color: palette.text.secondary }]}>{subtitle}</Text>
      </View>
      <ThemedSwitch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
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
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    textTransform: "uppercase",
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
  },
  preferenceSubtitle: {
    ...typography.small,
  },
  errorText: {
    ...typography.body,
  },
  stepperRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  stepperButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  stepperValue: {
    ...typography.bodyStrong,
    flex: 1,
    textAlign: "center",
  },
});

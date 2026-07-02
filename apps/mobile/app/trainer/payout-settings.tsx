import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Card,
  FormField,
  QueryErrorState,
  ScreenHeader,
  SectionHeader,
  Skeleton,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import {
  useMyTrainerPayoutConfig,
  useTrainerProfile,
  useUpdateMyTrainerPayoutConfig,
  useUpdateTrainerProfile,
} from "@/lib/domains/trainer/queries";
import { useI18n } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

export default function TrainerPayoutSettings() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const configQuery = useMyTrainerPayoutConfig();
  const profileQuery = useTrainerProfile();
  const updateConfig = useUpdateMyTrainerPayoutConfig();
  const updateProfile = useUpdateTrainerProfile();

  const [baseMonthly, setBaseMonthly] = useState("");
  const [ptCommission, setPtCommission] = useState("");
  const [perSessionFee, setPerSessionFee] = useState("");
  const [payDay, setPayDay] = useState("");
  const [bio, setBio] = useState("");
  const [upiId, setUpiId] = useState("");
  const [configLoaded, setConfigLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const config = configQuery.data?.config;
  const profile = profileQuery.data?.profile;

  useEffect(() => {
    if (config && !configLoaded) {
      setBaseMonthly(config.baseMonthlyPaise ? String(Math.round(config.baseMonthlyPaise / 100)) : "");
      setPtCommission(config.ptCommissionPercent ? String(config.ptCommissionPercent) : "");
      setPerSessionFee(config.perSessionFeePaise ? String(Math.round(config.perSessionFeePaise / 100)) : "");
      setPayDay(config.payDay ? String(config.payDay) : "5");
      setConfigLoaded(true);
    }
  }, [config, configLoaded]);

  useEffect(() => {
    if (profile && !profileLoaded) {
      setBio(profile.bio ?? "");
      setUpiId(profile.upiId ?? "");
      setProfileLoaded(true);
    }
  }, [profile, profileLoaded]);

  const isLoading = configQuery.isLoading || profileQuery.isLoading;
  const isSaving = updateConfig.isPending || updateProfile.isPending;
  const parsedCommission = Number.parseInt(ptCommission, 10);
  const parsedPayDay = Number.parseInt(payDay, 10);
  const commissionInvalid = ptCommission.trim().length > 0 && (Number.isNaN(parsedCommission) || parsedCommission < 0 || parsedCommission > 100);
  const payDayInvalid = payDay.trim().length > 0 && (Number.isNaN(parsedPayDay) || parsedPayDay < 1 || parsedPayDay > 28);
  const payDayValue = Math.min(28, Math.max(1, Number.parseInt(payDay, 10) || 5));
  const canSave = !isSaving && !commissionInvalid && !payDayInvalid;

  function save() {
    if (!canSave) return;
    updateConfig.mutate({
      baseMonthlyPaise: (Number.parseInt(baseMonthly, 10) || 0) * 100,
      ptCommissionPercent: Math.min(100, Math.max(0, Number.parseInt(ptCommission, 10) || 0)),
      perSessionFeePaise: (Number.parseInt(perSessionFee, 10) || 0) * 100,
      payDay: payDayValue,
    });
    updateProfile.mutate({
      bio: bio.trim(),
      upiId: upiId.trim(),
    });
  }

  const hasError = configQuery.isError || profileQuery.isError;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="trainer-payout-settings-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            title={t("trainer.payoutSettings.title")}
            leading={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("common.back")}
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.iconButton,
                  { borderColor: palette.border.subtle, backgroundColor: palette.surface.default },
                  pressed ? styles.controlPressed : null,
                ]}
              >
                <Ionicons name="chevron-back" size={21} color={palette.text.primary} />
              </Pressable>
            }
            trailing={
              <ZookButton
                onPress={save}
                disabled={!canSave}
                busy={isSaving}
                busyLabel={t("common.saving")}
                icon="checkmark-circle-outline"
                size="sm"
              >
                {t("trainer.payoutSettings.saveChanges")}
              </ZookButton>
            }
          />

          {hasError ? (
            <QueryErrorState
              error={configQuery.error ?? profileQuery.error}
              onRetry={() => {
                void configQuery.refetch();
                void profileQuery.refetch();
              }}
            />
          ) : null}

          {isLoading ? (
            <Card variant="compact" contentStyle={styles.loadingCard}>
              <Skeleton height={16} width="40%" />
              <Skeleton height={44} width="100%" />
              <Skeleton height={44} width="100%" />
              <Skeleton height={44} width="100%" />
            </Card>
          ) : (
            <>
              <SectionHeader title={t("trainer.payoutSettings.compensation")} />
              <Card contentStyle={styles.formCard}>
                <FormField
                  label={t("trainer.payoutSettings.baseMonthly")}
                  value={baseMonthly}
                  onChangeText={setBaseMonthly}
                  keyboardType="number-pad"
                  placeholder="15000"
                />
                <FormField
                  label={t("trainer.payoutSettings.ptCommission")}
                  value={ptCommission}
                  onChangeText={setPtCommission}
                  keyboardType="number-pad"
                  placeholder="40"
                  hint={t("trainer.payoutSettings.ptCommissionHint")}
                  error={commissionInvalid ? t("trainer.payoutSettings.ptCommissionInvalid") : undefined}
                />
                <FormField
                  label={t("trainer.payoutSettings.perSessionFee")}
                  value={perSessionFee}
                  onChangeText={setPerSessionFee}
                  keyboardType="number-pad"
                  placeholder="300"
                  hint={t("trainer.payoutSettings.perSessionFeeHint")}
                />
                <FormField
                  label={t("trainer.payoutSettings.payDay")}
                  value={payDay}
                  onChangeText={setPayDay}
                  keyboardType="number-pad"
                  placeholder="5"
                  hint={t("trainer.payoutSettings.payDayHint")}
                  error={payDayInvalid ? t("trainer.payoutSettings.payDayInvalid") : undefined}
                />
              </Card>

              <SectionHeader title={t("trainer.payoutSettings.profileUpi")} />
              <Card contentStyle={styles.formCard}>
                <FormField
                  label={t("trainer.payoutSettings.bio")}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  placeholder={t("trainer.payoutSettings.bioPlaceholder")}
                  style={styles.bioField}
                />
                <FormField
                  label={t("trainer.payoutSettings.upiId")}
                  value={upiId}
                  onChangeText={setUpiId}
                  autoCapitalize="none"
                  placeholder="yourname@upi"
                  hint={t("trainer.payoutSettings.upiHint")}
                />
              </Card>

              <View style={styles.footnote}>
                <Text style={[styles.footnoteText, { color: palette.text.tertiary }]}>
                  {t("trainer.payoutSettings.footnote")}
                </Text>
              </View>

            </>
          )}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  controlPressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  loadingCard: { gap: spacing.sm },
  formCard: { gap: spacing.md },
  bioField: { minHeight: 84 },
  footnote: { paddingHorizontal: spacing.xs },
  footnoteText: { ...typography.small },
});

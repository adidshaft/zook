import { Image } from "expo-image";
import {
  BottomSheetModal,
  BottomSheetView,
} from "@/components/expo-safe-bottom-sheet";
import { useEffect } from "react";
import { AccessibilityInfo, InteractionManager, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated from "@/lib/reanimated-lite";
import { FormField, PrimaryButton, SecondaryButton } from "@/components/primitives";
import { useT } from "@/lib/i18n";
import { useShake } from "@/lib/motion";
import { useTheme } from "@/lib/theme";
import { reasonSuggestions } from "./constants";
import { receptionWorkspaceStyles as styles } from "./styles";
import { useReceptionWorkspace } from "./desk-context";

export function ApprovalDecisionSheet() {
  const { mode, palette } = useTheme();
  const t = useT();
  const isDark = mode === "dark";
  const {
    approveAttendance,
    approveAttendanceMutation,
    closeDecisionSheet,
    decisionReason,
    decisionSheetRef,
    rejectAttendance,
    rejectAttendanceMutation,
    renderDecisionBackdrop,
    selectedDecisionAttempt,
    setDecisionReason,
    setSelectedDecisionAttempt,
  } = useReceptionWorkspace();
  useEffect(() => {
    if (!selectedDecisionAttempt) {
      return;
    }
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        if (!cancelled) {
          decisionSheetRef.current?.present();
        }
      });
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [decisionSheetRef, selectedDecisionAttempt]);
  const sheetBackground = StyleSheet.flatten([
    styles.sheetBackground,
    {
      borderColor: palette.border.default,
      backgroundColor: isDark ? palette.bg.elevated : palette.surface.raised,
    },
  ]);
  const sheetHandle = StyleSheet.flatten([
    styles.sheetHandle,
    { backgroundColor: palette.border.strong },
  ]);

  return (
    <BottomSheetModal
      ref={decisionSheetRef}
      snapPoints={["48%"]}
      enablePanDownToClose
      backdropComponent={renderDecisionBackdrop}
      backgroundStyle={sheetBackground}
      handleIndicatorStyle={sheetHandle}
      onDismiss={() => {
        setSelectedDecisionAttempt(null);
        setDecisionReason("");
      }}
    >
      <BottomSheetView style={styles.decisionSheetContent}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleCopy}>
            <Text style={[styles.sheetEyebrow, { color: palette.accent.base }]}>
              {t("reception.decision.reason")}
            </Text>
            <Text style={[styles.sheetTitle, { color: palette.text.primary }]}>
              {selectedDecisionAttempt?.user?.name ??
                selectedDecisionAttempt?.user?.email ??
                t("reception.decision.memberCheckIn")}
            </Text>
            <Text style={[styles.cardBody, { color: palette.text.secondary }]}>
              {t("reception.decision.addDeskNote")}
            </Text>
          </View>
          <Pressable
            onPress={closeDecisionSheet}
            accessibilityRole="button"
            accessibilityLabel={t("reception.decision.closeSheet")}
            style={({ pressed }) => [
              styles.sheetCloseButton,
              { borderColor: palette.border.default, backgroundColor: palette.surface.raised },
              pressed ? styles.sheetCloseButtonPressed : null,
            ]}
          >
            <Ionicons name="close-outline" size={16} color={palette.text.secondary} />
            <Text style={[styles.sheetCloseText, { color: palette.text.secondary }]}>
              {t("reception.decision.close")}
            </Text>
          </Pressable>
        </View>
        <FormField
          label={t("reception.decision.reason")}
          value={decisionReason}
          onChangeText={setDecisionReason}
          multiline
        />
        <View style={styles.suggestionRow}>
          {reasonSuggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              onPress={() => setDecisionReason(suggestion)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.suggestionChip,
                {
                  borderColor:
                    decisionReason === suggestion ? palette.border.focus : palette.border.default,
                  backgroundColor:
                    decisionReason === suggestion
                      ? palette.surface.accentSoft
                      : palette.surface.raised,
                },
                pressed ? styles.suggestionChipPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.suggestionText,
                  {
                    color:
                      decisionReason === suggestion
                        ? palette.accent.base
                        : palette.text.secondary,
                  },
                ]}
              >
                {suggestion}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.actionRow}>
          <PrimaryButton
            testID="reception-decision-approve"
            icon="checkmark-circle-outline"
            disabled={!selectedDecisionAttempt || approveAttendanceMutation.isPending}
            onPress={() => {
              if (selectedDecisionAttempt) {
                void approveAttendance(selectedDecisionAttempt.id, decisionReason);
              }
            }}
            style={styles.actionHalf}
          >
            {approveAttendanceMutation.isPending
              ? t("reception.decision.approving")
              : t("reception.decision.approve")}
          </PrimaryButton>
          <SecondaryButton
            testID="reception-decision-reject"
            icon="close-circle-outline"
            disabled={!selectedDecisionAttempt || rejectAttendanceMutation.isPending}
            onPress={() => {
              if (selectedDecisionAttempt) {
                void rejectAttendance(selectedDecisionAttempt.id, decisionReason);
              }
            }}
            style={styles.actionHalf}
          >
            {rejectAttendanceMutation.isPending
              ? t("reception.decision.rejecting")
              : t("reception.decision.reject")}
          </SecondaryButton>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

export function VerificationResultModal() {
  const { palette } = useTheme();
  const t = useT();
  const { dismissVerificationResult, verificationResult } = useReceptionWorkspace();
  const success = verificationResult?.tone === "success";
  const { animatedStyle: shakeStyle, shake } = useShake();
  useEffect(() => {
    if (!verificationResult) return;
    if (!success) shake();
    AccessibilityInfo.announceForAccessibility(
      [
        success
          ? t("reception.workspace.verificationSuccessful")
          : t("reception.workspace.verificationFailed"),
        verificationResult.message,
        verificationResult.name,
        verificationResult.detail,
      ]
        .filter(Boolean)
        .join(" "),
    );
    const timer = setTimeout(dismissVerificationResult, success ? 1400 : 4000);
    return () => clearTimeout(timer);
  }, [dismissVerificationResult, shake, success, t, verificationResult]);
  const photo = verificationResult?.photoUrl;
  const backdropColor = success ? "rgba(17,21,15,0.94)" : `${palette.feedback.danger}E6`;
  return (
    <Modal
      animationType="fade"
      transparent
      visible={Boolean(verificationResult)}
      onRequestClose={dismissVerificationResult}
    >
      <View
        style={[
          styles.verificationModalBackdrop,
          { backgroundColor: backdropColor },
        ]}
      >
        <Reanimated.View style={[styles.verificationModalContent, success ? null : shakeStyle]}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={photo}
              transition={150}
              style={[
                styles.verificationModalPhoto,
                { backgroundColor: palette.surface.raised },
              ]}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View
              style={styles.verificationModalPhotoFallback}
            >
              <Ionicons
                name={success ? "checkmark-circle-outline" : "alert-circle-outline"}
                size={92}
                color={palette.text.inverse}
              />
            </View>
          )}
          <Text style={[styles.verificationModalEyebrow, { color: palette.text.inverse }]}>
            {verificationResult?.type === "pickup"
              ? t("reception.orders.pickupCode")
              : t("reception.workspace.entryCode")}
          </Text>
          <Text style={[styles.verificationModalTitle, { color: palette.text.inverse }]}>
            {verificationResult?.message}
          </Text>
          {verificationResult?.name ? (
            <Text style={[styles.verificationModalName, { color: palette.text.inverse }]}>
              {verificationResult.name}
            </Text>
          ) : null}
          {verificationResult?.detail ? (
            <Text style={[styles.verificationModalDetail, { color: palette.text.inverse }]}>
              {verificationResult.detail}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={dismissVerificationResult}
            style={({ pressed }) => [
              styles.verificationModalDismiss,
              pressed ? styles.verificationModalDismissPressed : null,
            ]}
          >
            <Text style={[styles.verificationModalDismissText, { color: palette.text.inverse }]}>
              {t("common.dismiss")}
            </Text>
          </Pressable>
        </Reanimated.View>
      </View>
    </Modal>
  );
}

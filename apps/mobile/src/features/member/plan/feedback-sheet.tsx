import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { useCallback, type RefObject } from "react";
import {
  InputAccessoryView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ZookButton } from "@/components/primitives";
import { useT } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";

export function FeedbackSheet({
  accessoryId,
  feedbackNote,
  feedbackStatus,
  onChangeFeedbackNote,
  onClose,
  onDismiss,
  onSend,
  sheetRef,
  snapPoints,
}: {
  accessoryId: string;
  feedbackNote: string;
  feedbackStatus: string;
  onChangeFeedbackNote: (value: string) => void;
  onClose: () => void;
  onDismiss: () => void;
  onSend: () => void;
  sheetRef: RefObject<BottomSheetModal | null>;
  snapPoints: string[];
}) {
  const { mode, palette } = useTheme();
  const t = useT();
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        ...styles.sheetBackground,
        backgroundColor: palette.bg.elevated,
        borderColor: palette.border.default,
      }}
      handleIndicatorStyle={{ ...styles.sheetHandle, backgroundColor: palette.border.strong }}
      onDismiss={onDismiss}
    >
      <BottomSheetView style={styles.feedbackSheetContent}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleCopy}>
            <Text style={[styles.cardTitle, { color: palette.text.primary }]}>
              {t("member.planDetail.tellCoach")}
            </Text>
            <Text style={[styles.cardBody, { color: palette.text.secondary }]}>
              {t("member.planDetail.feedbackSheetBody")}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("member.planDetail.closeFeedback")}
            style={[styles.sheetCloseButton, { borderColor: palette.border.default }]}
          >
            <Ionicons name="close" size={18} color={palette.text.primary} />
          </Pressable>
        </View>
        <View style={styles.feedbackOptions}>
          {[
            t("member.planDetail.tooHard"),
            t("member.planDetail.needSwap"),
            t("member.planDetail.pain"),
            t("member.planDetail.done"),
          ].map((option) => (
            <Pressable
              key={option}
              onPress={() => onChangeFeedbackNote(option)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.feedbackOption,
                {
                  backgroundColor:
                    feedbackNote === option ? palette.surface.accentSoft : palette.surface.raised,
                  borderColor:
                    feedbackNote === option ? palette.accent.strong : palette.border.default,
                },
                pressed ? styles.feedbackOptionPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.feedbackOptionText,
                  {
                    color:
                      feedbackNote === option ? palette.accent.strong : palette.text.secondary,
                  },
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
        {Platform.OS === "ios" ? null : (
          <ZookButton
            testID="plan-detail-feedback-send"
            onPress={onSend}
            icon="send-outline"
            style={styles.feedbackSendButton}
          >
            {t("member.planDetail.send")}
          </ZookButton>
        )}
        <TextInput
          testID="plan-detail-feedback-input"
          inputAccessoryViewID={Platform.OS === "ios" ? accessoryId : undefined}
          value={feedbackNote}
          onChangeText={onChangeFeedbackNote}
          accessibilityLabel={t("member.planDetail.addShortNote")}
          onSubmitEditing={onSend}
          returnKeyType="send"
          maxLength={280}
          placeholder={t("member.planDetail.addShortNote")}
          placeholderTextColor={palette.text.tertiary}
          style={[
            styles.feedbackInput,
            {
              backgroundColor: mode === "dark" ? palette.bg.overlay : palette.bg.app,
              borderColor: palette.border.default,
              color: palette.text.primary,
            },
          ]}
        />
        {Platform.OS === "ios" ? (
          <InputAccessoryView nativeID={accessoryId}>
            <View
              style={[
                styles.feedbackAccessory,
                { backgroundColor: palette.bg.elevated, borderTopColor: palette.border.default },
              ]}
            >
              <ZookButton
                testID="plan-detail-feedback-send"
                onPress={onSend}
                icon="send-outline"
                style={styles.feedbackAccessoryButton}
              >
                {t("member.planDetail.send")}
              </ZookButton>
            </View>
          </InputAccessoryView>
        ) : null}
        {feedbackStatus ? (
          <Text style={[styles.inlineStatus, { color: palette.accent.base }]}>
            {feedbackStatus}
          </Text>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderWidth: 1,
  },
  sheetHandle: {},
  feedbackSheetContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  sheetTitleCopy: {
    flex: 1,
    gap: 4,
  },
  sheetCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  feedbackOption: {
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackOptionPressed: {
    opacity: 0.84,
  },
  feedbackOptionText: {
    ...typography.caption,
  },
  feedbackInput: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    ...typography.body,
  },
  feedbackSendButton: {
    alignSelf: "flex-start",
    minWidth: 116,
  },
  feedbackAccessory: {
    borderTopWidth: 1,
    padding: spacing.sm,
  },
  feedbackAccessoryButton: {
    alignSelf: "stretch",
  },
  inlineStatus: {
    ...typography.caption,
    flexShrink: 1,
    minWidth: 0,
  },
  cardTitle: {
    ...typography.cardTitle,
  },
  cardBody: {
    ...typography.body,
  },
});

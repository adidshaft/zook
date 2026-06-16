import { useState } from "react";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "@/lib/i18n";
import { radii, spacing, typography, useTheme } from "@/lib/theme";

export function DatePickerField({
  accessibilityLabel,
  disabled = false,
  label,
  maximumDate,
  minimumDate,
  onChange,
  placeholder = "Select date",
  required = false,
  value,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  label: string;
  maximumDate?: Date;
  minimumDate?: Date;
  onChange: (value: Date) => void;
  placeholder?: string;
  required?: boolean;
  value?: Date | null;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { palette, mode } = useTheme();
  const [open, setOpen] = useState(false);
  const fallbackDate = value ?? maximumDate ?? new Date();
  const [draft, setDraft] = useState(fallbackDate);
  const isDark = mode === "dark";
  const formatted = value
    ? new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(value)
    : placeholder;
  const fieldSurface = mode === "dark" ? palette.surface.default : palette.surface.accentSoft;
  const sheetSurface =
    Platform.OS === "ios"
      ? isDark
        ? palette.bg.elevated
        : palette.surface.raised
      : palette.bg.elevated;
  const sheetOverlay =
    Platform.OS === "ios"
      ? isDark
        ? palette.surface.default
        : palette.surface.accentSoft
      : palette.bg.elevated;

  function close() {
    setDraft(value ?? fallbackDate);
    setOpen(false);
  }

  function commit() {
    onChange(draft);
    setOpen(false);
  }

  function handleAndroidChange(event: DateTimePickerEvent, nextDate?: Date) {
    if (event.type === "dismissed") {
      close();
      return;
    }
    if (nextDate) {
      setDraft(nextDate);
      onChange(nextDate);
    }
    setOpen(false);
  }

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: palette.text.secondary }]}>
        {label}
        {required ? <Text style={{ color: palette.feedback.danger }}> *</Text> : null}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          setDraft(value ?? fallbackDate);
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.input,
          {
            borderColor: palette.border.default,
            backgroundColor: fieldSurface,
          },
          pressed && !disabled ? styles.pressed : null,
          disabled ? styles.disabled : null,
        ]}
      >
        <Text style={[styles.value, { color: value ? palette.text.primary : palette.text.tertiary }]}>
          {formatted}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={palette.text.secondary} />
      </Pressable>
      {Platform.OS === "android" && open ? (
        <DateTimePicker
          display="calendar"
          mode="date"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          value={draft}
          onChange={handleAndroidChange}
        />
      ) : null}
      {Platform.OS !== "android" ? (
      <Modal animationType="fade" transparent visible={open} onRequestClose={close}>
        <Pressable
          accessibilityLabel={t("common.dismiss")}
          style={[
            styles.backdrop,
            { backgroundColor: palette.bg.overlay },
          ]}
          onPress={close}
        >
          <Pressable
            accessibilityLabel={t("common.datePicker")}
            onPress={(event) => event.stopPropagation()}
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
          >
            <View
              style={[
                styles.card,
                {
                  borderColor: palette.border.subtle,
                  backgroundColor: sheetSurface,
                  shadowColor: isDark ? palette.bg.sunken : palette.text.primary,
                  shadowOpacity: isDark ? 0.2 : 0.1,
                },
              ]}
            >
              {Platform.OS === "ios" ? (
                <BlurView
                  pointerEvents="none"
                  intensity={isDark ? 24 : 18}
                  tint={isDark ? "dark" : "light"}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: sheetOverlay,
                  },
                ]}
              />
              <View style={styles.cardContent}>
                <Text style={[styles.sheetTitle, { color: palette.text.primary }]}>{label}</Text>
                <DateTimePicker
                  display="spinner"
                  mode="date"
                  maximumDate={maximumDate}
                  minimumDate={minimumDate}
                  value={draft}
                  onChange={(_, nextDate) => {
                    if (nextDate) setDraft(nextDate);
                  }}
                />
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("common.cancel")}
                    onPress={close}
                    style={({ pressed }) => [
                      styles.ghostAction,
                      { borderColor: palette.border.default, backgroundColor: "transparent" },
                      pressed ? styles.actionPressed : null,
                    ]}
                  >
                    <Text style={[styles.ghostActionText, { color: palette.text.primary }]}>
                      {t("common.cancel")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("common.done")}
                    onPress={commit}
                    style={({ pressed }) => [
                      styles.primaryAction,
                      { borderColor: palette.accent.fill, backgroundColor: palette.accent.fill },
                      pressed ? styles.actionPressed : null,
                    ]}
                  >
                    <Text style={[styles.primaryActionText, { color: palette.text.onAccent }]}>
                      {t("common.done")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
  },
  input: {
    minHeight: 46,
    borderRadius: radii.input,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  value: {
    ...typography.body,
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.5,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    padding: spacing.lg,
  },
  card: {
    gap: spacing.lg,
    borderRadius: 28,
    borderWidth: 1,
    padding: spacing.lg,
    overflow: "hidden",
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 4,
  },
  androidCard: {
    borderRadius: 24,
  },
  cardContent: {
    gap: spacing.lg,
  },
  sheetTitle: {
    ...typography.headerTitle,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  ghostAction: {
    minHeight: 44,
    borderRadius: radii.input,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  ghostActionText: {
    ...typography.button,
  },
  primaryAction: {
    minHeight: 44,
    borderRadius: radii.input,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  actionPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  primaryActionText: {
    ...typography.button,
  },
});

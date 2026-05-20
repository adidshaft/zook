import { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "@/lib/i18n";
import { legacyColors, radii, shadows, spacing, typography } from "@/lib/theme";

export function DatePickerField({
  accessibilityLabel,
  disabled = false,
  label,
  maximumDate,
  minimumDate,
  onChange,
  required = false,
  value,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  label: string;
  maximumDate?: Date;
  minimumDate?: Date;
  onChange: (value: Date) => void;
  required?: boolean;
  value: Date;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const formatted = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);

  function close() {
    setDraft(value);
    setOpen(false);
  }

  function commit() {
    onChange(draft);
    setOpen(false);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.input,
          pressed && !disabled ? styles.pressed : null,
          disabled ? styles.disabled : null,
        ]}
      >
        <Text style={styles.value}>{formatted}</Text>
        <Ionicons name="calendar-outline" size={18} color={legacyColors.muted} />
      </Pressable>
      <Modal animationType="fade" transparent visible={open} onRequestClose={close}>
        <Pressable accessibilityLabel={t("common.dismiss")} style={styles.backdrop} onPress={close}>
          <Pressable
            accessibilityLabel={t("common.datePicker")}
            onPress={(event) => event.stopPropagation()}
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
          >
            <View style={styles.card}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <DateTimePicker
                display={Platform.OS === "ios" ? "spinner" : "default"}
                mode="date"
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                value={draft}
                onChange={(_, nextDate) => {
                  if (nextDate) setDraft(nextDate);
                }}
              />
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" accessibilityLabel={t("common.cancel")} onPress={close} style={styles.ghostAction}>
                  <Text style={styles.ghostActionText}>{t("common.cancel")}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={t("common.done")} onPress={commit} style={styles.primaryAction}>
                  <Text style={styles.primaryActionText}>{t("common.done")}</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  label: {
    color: legacyColors.muted,
    ...typography.caption,
  },
  required: {
    color: legacyColors.red,
  },
  input: {
    minHeight: 46,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: legacyColors.border,
    backgroundColor: legacyColors.panel,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  value: {
    color: legacyColors.text,
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
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  sheet: {
    padding: spacing.lg,
  },
  card: {
    gap: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: legacyColors.border,
    backgroundColor: legacyColors.panel,
    padding: spacing.lg,
    ...shadows.card,
  },
  sheetTitle: {
    color: legacyColors.text,
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
    borderColor: legacyColors.border,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  ghostActionText: {
    color: legacyColors.text,
    ...typography.button,
  },
  primaryAction: {
    minHeight: 44,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: legacyColors.lime,
    backgroundColor: legacyColors.lime,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  primaryActionText: {
    color: legacyColors.bg,
    ...typography.button,
  },
});

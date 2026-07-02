import { TextInput, StyleSheet } from "react-native";

import { Card, ZookButton } from "@/components/primitives";
import { spacing, typography, useTheme } from "@/lib/theme";

export function CustomExerciseSheet({
  addLabel,
  name,
  onAdd,
  onChangeName,
  placeholder,
}: {
  addLabel: string;
  name: string;
  onAdd: () => void;
  onChangeName: (value: string) => void;
  placeholder: string;
}) {
  const { mode, palette } = useTheme();

  return (
    <Card variant="compact" contentStyle={styles.card}>
      <TextInput
        testID="plan-detail-custom-exercise-input"
        value={name}
        onChangeText={onChangeName}
        accessibilityLabel={placeholder}
        onSubmitEditing={onAdd}
        returnKeyType="done"
        placeholder={placeholder}
        placeholderTextColor={palette.text.tertiary}
        style={[
          styles.input,
          {
            backgroundColor: mode === "dark" ? palette.bg.overlay : palette.bg.app,
            borderColor: palette.border.default,
            color: palette.text.primary,
          },
        ]}
      />
      <ZookButton
        testID="plan-detail-save-custom-exercise"
        onPress={onAdd}
        icon="checkmark-outline"
      style={styles.saveButton}
    >
        {addLabel}
      </ZookButton>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  input: {
    ...typography.body,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  saveButton: {
    minWidth: 88,
  },
});

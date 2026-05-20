import { forwardRef, useImperativeHandle, useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { sanitizeOtpValue } from "@/lib/otp";
import { legacyColors, radii, spacing, typography } from "@/lib/theme";

export type OtpInputHandle = {
  focus: () => void;
};

export const OtpInput = forwardRef<
  OtpInputHandle,
  {
    accessibilityLabel: string;
    disabled?: boolean;
    label: string;
    length?: number;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
    testID?: string;
    value: string;
  } & Pick<TextInputProps, "returnKeyType">
>(function OtpInput(
  {
    accessibilityLabel,
    disabled = false,
    label,
    length = 6,
    onChange,
    onComplete,
    returnKeyType = "done",
    testID,
    value,
  },
  ref,
) {
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }), []);

  function handleChange(nextValue: string) {
    const clean = sanitizeOtpValue(nextValue, length);
    onChange(clean);
    if (clean.length === length) {
      onComplete?.(clean);
    }
  }

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        testID={testID ? `${testID}-cells` : undefined}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => inputRef.current?.focus()}
        style={styles.cells}
      >
        {Array.from({ length }).map((_, index) => {
          const digit = value[index] ?? "";
          const active = !disabled && index === Math.min(value.length, length - 1);
          return (
            <View key={index} style={[styles.cell, active ? styles.cellActive : null]}>
              <Text style={styles.cellText}>{digit}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        testID={testID}
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        autoComplete="one-time-code"
        caretHidden
        editable={!disabled}
        keyboardType="number-pad"
        maxLength={length}
        returnKeyType={returnKeyType}
        textContentType="oneTimeCode"
        style={styles.hiddenInput}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  label: {
    color: legacyColors.muted,
    ...typography.caption,
  },
  cells: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cell: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: legacyColors.border,
    backgroundColor: legacyColors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  cellActive: {
    borderColor: legacyColors.lime,
    backgroundColor: legacyColors.accentPanel,
  },
  cellText: {
    color: legacyColors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
});

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { sanitizeOtpValue } from "@/lib/otp";
import { radii, spacing, typography, useTheme } from "@/lib/theme";

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
  const { palette } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const cellBackground = disabled
    ? palette.bg.sunken
    : palette.surface.raised;
  const activeBackground = disabled ? cellBackground : palette.surface.accentSoft;
  const cellOpacity = disabled ? 0.58 : 1;
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
      <Text style={[styles.label, { color: palette.text.secondary }]}>{label}</Text>
      <Pressable
        testID={testID ? `${testID}-cells` : undefined}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}. ${value.length} of ${length} digits entered.`}
        accessibilityValue={{ text: value ? value.split("").join(" ") : "No digits entered" }}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => inputRef.current?.focus()}
        style={styles.cells}
      >
        {Array.from({ length }).map((_, index) => {
          const digit = value[index] ?? "";
          const active = !disabled && index === Math.min(value.length, length - 1);
          return (
            <View
              key={index}
              style={[
                styles.cell,
                {
                  borderColor: active ? palette.border.focus : palette.border.default,
                  backgroundColor: active ? activeBackground : cellBackground,
                  opacity: cellOpacity,
                },
                active ? styles.cellActive : null,
              ]}
            >
              <Text style={[styles.cellText, { color: palette.text.primary }]}>{digit}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: value ? value.split("").join(" ") : "No digits entered" }}
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
    alignItems: "center",
    justifyContent: "center",
  },
  cellActive: {
  },
  cellText: {
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

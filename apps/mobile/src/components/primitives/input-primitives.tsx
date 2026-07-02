import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "@/components/primitives/linear-gradient";
import { useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { gradients, gradientsLight, radii, spacing, typography, useTheme } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { pressWithHaptics } from "./buttons";
import { Card } from "./foundation";
import { IconBubble } from "./icon-bubble";
import { useTonePalette, type PillTone } from "./tone-palette";

type IconName = keyof typeof Ionicons.glyphMap;

const PRODUCT_TONE_GRADIENT: Record<PillTone, readonly [string, string]> = {
  red: gradients.classRed,
  amber: gradients.classAmber,
  blue: gradients.classBlue,
  violet: gradients.classViolet,
  lime: gradients.heroCardAccent,
  neutral: gradients.cardSheen,
};

const PRODUCT_TONE_GRADIENT_LIGHT: Record<PillTone, readonly [string, string]> = {
  red: gradientsLight.classRed,
  amber: gradientsLight.classAmber,
  blue: gradientsLight.classBlue,
  violet: gradientsLight.classViolet,
  lime: gradientsLight.heroCardAccent,
  neutral: gradientsLight.cardSheen,
};

const iconOnlyHitSlop = { top: 8, right: 8, bottom: 8, left: 8 };

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  icon,
  tone = "neutral",
  onPress,
  accessibilityLabel,
  style,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  icon?: IconName;
  tone?: PillTone;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette, mode } = useTheme();
  const trailingContent =
    trailing ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={palette.text.tertiary} /> : null);
  const row = (
    <View
      style={[
        styles.listRow,
        {
          borderColor: palette.border.subtle,
          backgroundColor: mode === "dark" ? palette.surface.default : palette.bg.elevated,
        },
        style,
      ]}
    >
      {leading ?? (icon ? <IconBubble icon={icon} tone={tone} size={40} /> : null)}
      <View style={styles.listRowCopy}>
        <Text numberOfLines={2} style={[styles.listRowTitle, { color: palette.text.primary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={2} style={[styles.listRowSubtitle, { color: palette.text.secondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailingContent ? <View style={styles.listRowTrailing}>{trailingContent}</View> : null}
    </View>
  );

  if (!onPress) return row;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      android_ripple={{ color: palette.border.default, borderless: false }}
      onPress={() => pressWithHaptics(onPress)}
      style={({ pressed }) => (pressed ? styles.listRowPressed : null)}
    >
      {row}
    </Pressable>
  );
}

type TextFieldProps = Omit<TextInputProps, "style"> & {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  required?: boolean;
  readonly?: boolean;
  style?: StyleProp<ViewStyle>;
  inputWrapperStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  leading?: ReactNode;
  trailing?: ReactNode;
};

function TextField({
  label,
  hint,
  error,
  optional = false,
  required = false,
  readonly = false,
  style,
  inputWrapperStyle,
  inputStyle,
  leading,
  trailing,
  ...props
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const { palette, mode } = useTheme();
  const disabled = props.editable === false;
  const labelSuffix = required ? " *" : optional ? " optional" : "";
  const inputBorderColor = focused
    ? palette.border.focus
    : error
      ? palette.feedback.danger
      : palette.border.default;
  const inputSurface = error
    ? palette.surface.dangerSoft
    : focused
      ? mode === "dark"
        ? palette.surface.raised
        : palette.bg.elevated
      : readonly
        ? mode === "dark"
          ? palette.bg.sunken
          : palette.surface.accentSoft
        : mode === "dark"
          ? palette.surface.default
          : palette.surface.accentSoft;

  return (
    <View style={[styles.inputGroup, style]}>
      {label ? (
        <Text style={[styles.inputLabel, { color: palette.text.secondary }]}>
          {label}
          {labelSuffix}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor: inputBorderColor,
            backgroundColor: inputSurface,
          },
          disabled ? styles.inputWrapperDisabled : null,
          inputWrapperStyle,
        ]}
      >
        {leading}
        <TextInput
          {...props}
          editable={readonly ? false : props.editable}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          placeholderTextColor={palette.text.tertiary}
          style={[
            styles.input,
            { color: palette.text.primary },
            props.multiline ? styles.inputMultiline : null,
            inputStyle,
          ]}
        />
        {trailing}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={[styles.inputError, { color: palette.feedback.danger }]}>
          {error}
        </Text>
      ) : null}
      {!error && hint ? <Text style={[styles.inputHint, { color: palette.text.tertiary }]}>{hint}</Text> : null}
    </View>
  );
}

export function Input(props: Parameters<typeof TextField>[0]) {
  return <TextField {...props} />;
}

export function FormField(props: Parameters<typeof TextField>[0]) {
  return <TextField {...props} />;
}

export function SearchBar({
  placeholder = "Search",
  value,
  onChangeText,
  style,
  trailing,
}: {
  placeholder?: string;
  value?: string;
  onChangeText?: (value: string) => void;
  style?: StyleProp<ViewStyle>;
  trailing?: ReactNode;
}) {
  const { palette } = useTheme();
  const t = useT();
  const hasValue = Boolean(value?.trim());
  const resolvedTrailing =
    trailing ??
    (hasValue && onChangeText ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("assistant.clear")}
        hitSlop={iconOnlyHitSlop}
        onPress={() => pressWithHaptics(() => onChangeText(""))}
        style={({ pressed }) => [styles.searchClearButton, pressed ? styles.pressed : null]}
      >
        <Ionicons name="close" size={14} color={palette.text.secondary} />
      </Pressable>
    ) : null);
  return (
    <TextField
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      keyboardType="default"
      clearButtonMode="never"
      leading={<Ionicons name="search-outline" size={18} color={palette.text.tertiary} />}
      trailing={resolvedTrailing}
      style={style}
    />
  );
}

export function SearchField({
  label,
  ...props
}: Omit<Parameters<typeof TextField>[0], "leading"> & { label?: string }) {
  const { palette } = useTheme();
  return (
    <TextField
      label={label ?? "Search"}
      leading={<Ionicons name="search-outline" size={18} color={palette.text.tertiary} />}
      returnKeyType="search"
      {...props}
    />
  );
}

export function ProductCard({
  name,
  price,
  stock,
  tone = "neutral",
  icon = "bag-outline",
  imageUrl,
  compact = false,
  quantity = 0,
  disabled = false,
  incrementDisabled = false,
  onPress,
  onIncrement,
  onDecrement,
  style,
  testID,
}: {
  name: string;
  price: string;
  stock: string;
  tone?: PillTone;
  icon?: IconName;
  imageUrl?: string | null;
  compact?: boolean;
  quantity?: number;
  disabled?: boolean;
  incrementDisabled?: boolean;
  onPress?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { palette: themePalette, mode } = useTheme();
  const t = useT();
  const palette = useTonePalette(tone);
  const productGradient = mode === "light" ? PRODUCT_TONE_GRADIENT_LIGHT[tone] : PRODUCT_TONE_GRADIENT[tone];
  const increment = onIncrement ?? onPress;
  const canIncrement = !disabled && !incrementDisabled && Boolean(increment);
  const canDecrement = !disabled && Boolean(onDecrement);
  const addButtonDisabled = !canIncrement;
  const showStockBadge = tone === "red" || tone === "amber";

  return (
    <Card
      testID={testID}
      style={[styles.productCard, style]}
      contentStyle={[styles.productContent, compact ? styles.productContentCompact : null]}
      disabled={disabled}
    >
      <View
        style={[
          styles.productVisual,
          {
            borderColor: themePalette.border.subtle,
            backgroundColor: mode === "dark" ? themePalette.bg.sunken : themePalette.surface.default,
          },
          compact ? styles.productVisualCompact : null,
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.productImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={imageUrl}
            transition={150}
          />
        ) : (
          <>
            <LinearGradient
              colors={productGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Ionicons name={icon} size={40} color={palette.color} />
          </>
        )}
      </View>
      <View style={[styles.productInfo, compact ? styles.productInfoCompact : null]}>
        <Text numberOfLines={2} style={[styles.productName, { color: themePalette.text.primary }]}>
          {name}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          style={[styles.productMeta, { color: showStockBadge ? palette.color : themePalette.text.secondary }]}
        >
          {stock}
        </Text>
      </View>
      <View style={[styles.productFooter, compact ? styles.productFooterCompact : null]}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={[styles.productPrice, { color: themePalette.text.primary }]}
        >
          {price}
        </Text>
        {quantity > 0 ? (
          <View
            style={[
              styles.productStepper,
              compact ? styles.productStepperCompact : null,
              {
                borderColor: themePalette.accent.base,
                backgroundColor: themePalette.surface.accentSoft,
              },
            ]}
          >
            <Pressable
              testID={testID ? `${testID}-decrement` : undefined}
              onPress={() => {
                if (canDecrement) pressWithHaptics(onDecrement);
              }}
              disabled={!canDecrement}
              accessibilityRole="button"
              accessibilityLabel={t("shop.removeProductAccessibility", { name })}
              accessibilityState={{ disabled: !canDecrement }}
              hitSlop={iconOnlyHitSlop}
              style={[
                styles.productStepperButton,
                compact ? styles.productStepperButtonCompact : null,
                !canDecrement ? styles.disabled : null,
              ]}
            >
              <Ionicons name="remove" size={16} color={themePalette.accent.strong} />
            </Pressable>
            <Text style={[styles.productQuantity, { color: themePalette.text.primary }]}>{quantity}</Text>
            <Pressable
              testID={testID ? `${testID}-increment` : undefined}
              onPress={() => {
                if (canIncrement) pressWithHaptics(increment);
              }}
              disabled={!canIncrement}
              accessibilityRole="button"
              accessibilityLabel={t("shop.addProductAccessibility", { name })}
              accessibilityState={{ disabled: !canIncrement }}
              hitSlop={iconOnlyHitSlop}
              style={[
                styles.productStepperButton,
                compact ? styles.productStepperButtonCompact : null,
                !canIncrement ? styles.disabled : null,
              ]}
            >
              <Ionicons name="add" size={16} color={themePalette.accent.strong} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            testID={testID ? `${testID}-increment` : undefined}
            onPress={() => {
              if (canIncrement) pressWithHaptics(increment);
            }}
            disabled={!canIncrement}
            accessibilityRole="button"
            accessibilityLabel={t("shop.addProductAccessibility", { name })}
            accessibilityState={{ disabled: !canIncrement }}
            hitSlop={compact ? { top: 6, bottom: 6, left: 0, right: 0 } : undefined}
            style={[
              styles.productAdd,
              {
                borderColor: addButtonDisabled ? themePalette.border.subtle : themePalette.accent.base,
                backgroundColor: addButtonDisabled
                  ? mode === "dark"
                    ? themePalette.surface.default
                    : themePalette.bg.sunken
                  : themePalette.surface.accentSoft,
              },
              compact ? styles.productAddCompact : null,
            ]}
          >
            <Text
              style={[
                styles.productAddText,
                { color: addButtonDisabled ? themePalette.text.tertiary : themePalette.accent.strong },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {disabled ? t("shop.outShort") : t("shop.addShort")}
            </Text>
            <Ionicons
              name="add"
              size={16}
              color={addButtonDisabled ? themePalette.text.tertiary : themePalette.accent.strong}
            />
          </Pressable>
        )}
      </View>
    </Card>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}) {
  const { palette, mode } = useTheme();
  return (
    <View
      style={[
        styles.segmentedControl,
        {
          borderColor: palette.border.subtle,
          backgroundColor: mode === "dark" ? palette.surface.default : palette.surface.accentSoft,
        },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => pressWithHaptics(() => onChange(option.value))}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.segmentedOption,
              selected
                ? {
                    backgroundColor: palette.surface.accentSoft,
                    borderWidth: 1,
                    borderColor: palette.border.focus,
                  }
                : null,
              pressed ? styles.segmentedOptionPressed : null,
            ]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.92}
              style={[
                styles.segmentedOptionText,
                { color: selected ? palette.accent.base : palette.text.secondary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  listRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.medium,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  listRowPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  listRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  listRowTrailing: {
    flexShrink: 0,
  },
  listRowTitle: {
    ...typography.bodyStrong,
  },
  listRowSubtitle: {
    ...typography.small,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  inputLabel: {
    ...typography.caption,
  },
  inputWrapper: {
    minHeight: 50,
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 13,
  },
  input: {
    flex: 1,
    minHeight: 44,
    ...typography.body,
    paddingVertical: 11,
  },
  inputWrapperDisabled: {
    opacity: 0.55,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  inputHint: {
    ...typography.caption,
  },
  inputError: {
    ...typography.caption,
  },
  searchClearButton: {
    alignItems: "center",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  productCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: radii.medium,
  },
  productContent: {
    padding: 8,
    gap: 8,
  },
  productContentCompact: {
    gap: 5,
  },
  productVisual: {
    height: 122,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productVisualCompact: {
    height: 62,
    borderRadius: 12,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productInfo: {
    gap: 3,
    minHeight: 47,
  },
  productInfoCompact: {
    gap: 1,
    minHeight: 35,
  },
  productName: {
    ...typography.bodyStrong,
  },
  productMeta: {
    ...typography.small,
  },
  productFooter: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  productFooterCompact: {
    gap: 6,
  },
  productPrice: {
    ...typography.bodyStrong,
    flex: 1,
    minWidth: 0,
  },
  productAdd: {
    width: 108,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  productAddCompact: {
    width: 72,
    height: 34,
  },
  productAddText: {
    ...typography.caption,
  },
  productStepper: {
    width: 108,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  productStepperCompact: {
    width: 82,
    height: 34,
    borderRadius: 10,
  },
  productStepperButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  productStepperButtonCompact: {
    width: 34,
    height: 34,
  },
  productQuantity: {
    minWidth: 20,
    ...typography.caption,
    textAlign: "center",
  },

  segmentedControl: {
    minHeight: 50,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    padding: 4,
    gap: 4,
  },
  segmentedOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  segmentedOptionPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  segmentedOptionText: {
    ...typography.caption,
    textAlign: "center",
  },
});

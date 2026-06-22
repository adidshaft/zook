import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { ProfileShortcut } from "./profile-shortcut";
import { spacing, typography, useTheme } from "@/lib/theme";

export function AppHeader({
  eyebrow,
  title,
  subtitle,
  leading,
  trailing,
  chip,
  contextSlot,
  centered = false,
  showProfileShortcut = true,
  showBack = false,
  onBack,
  style,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  chip?: ReactNode;
  contextSlot?: ReactNode;
  centered?: boolean;
  showProfileShortcut?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const router = useRouter();

  let resolvedLeading = leading;
  if (!resolvedLeading && showBack) {
    resolvedLeading = (
      <Pressable
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={12}
        style={({ pressed }) => [
          styles.appHeaderBack,
          {
            backgroundColor: palette.bg.elevated,
            borderColor: palette.border.default,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Ionicons name="chevron-back" size={21} color={palette.text.primary} />
      </Pressable>
    );
  } else if (!resolvedLeading && !centered && showProfileShortcut) {
    resolvedLeading = <ProfileShortcut />;
  }

  return (
    <View style={[styles.mobileHeader, centered ? styles.mobileHeaderCentered : null, style]}>
      {resolvedLeading ? <View style={styles.headerSide}>{resolvedLeading}</View> : null}
      <View style={[styles.mobileHeaderCopy, centered ? styles.centeredCopy : null]}>
        {chip}
        {eyebrow ? (
          <Text style={[styles.headerEyebrow, { color: palette.text.tertiary }]}>{eyebrow}</Text>
        ) : null}
        <Text
          style={[
            styles.headerTitle,
            centered ? styles.centerText : null,
            { color: palette.text.primary },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.headerSubtitle,
              centered ? styles.centerText : null,
              { color: palette.text.secondary },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
        {contextSlot ? <View style={styles.headerContextSlot}>{contextSlot}</View> : null}
      </View>
      {trailing ? <View style={[styles.headerSide, styles.headerTrailingSide]}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  mobileHeaderCentered: {
    justifyContent: "center",
  },
  mobileHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  headerContextSlot: {
    alignSelf: "flex-start",
  },
  centeredCopy: {
    alignItems: "center",
  },
  headerSide: {
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTrailingSide: {
    alignItems: "flex-end",
  },
  appHeaderBack: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerEyebrow: {
    ...typography.eyebrow,
  },
  headerTitle: {
    // Pushed detail screens use the compact title scale so they read as a
    // navigated step beneath the larger tab-root landing headers.
    ...typography.headerTitle,
    letterSpacing: 0,
  },
  headerSubtitle: {
    ...typography.body,
  },
  centerText: {
    textAlign: "center",
  },
});

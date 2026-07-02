import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { typography, useTheme } from "@/lib/theme";

export function OfflineBanner({
  children = "Offline. Changes will save when connection returns.",
}: {
  children?: ReactNode;
}) {
  const { palette } = useTheme();
  const accessibilityLabel = typeof children === "string" ? children : "Offline";

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.offlineBanner,
        {
          borderColor: palette.feedback.warning,
          backgroundColor: palette.surface.warningSoft,
        },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={13} color={palette.feedback.warning} />
      <Text
        numberOfLines={1}
        style={[styles.offlineBannerText, { color: palette.text.primary }]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    alignSelf: "flex-end",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 28,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 7,
    width: 28,
  },
  offlineBannerText: {
    position: "absolute",
    opacity: 0,
    ...typography.small,
    lineHeight: 16,
  },
});

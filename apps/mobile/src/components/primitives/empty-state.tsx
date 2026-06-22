import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ZookButton } from "./buttons";
import { IconBubble } from "./icon-bubble";
import { spacing, typography, useTheme } from "@/lib/theme";

type IonIconName = keyof typeof Ionicons.glyphMap;

type EmptyStateCta = {
  label: string;
  onPress?: () => void;
  href?: Href;
};

export function EmptyState({
  icon,
  title,
  body,
  cta,
  action,
  testID,
}: {
  icon?: IonIconName;
  title: string;
  body?: string;
  cta?: EmptyStateCta;
  action?: ReactNode;
  testID?: string;
}) {
  const { palette } = useTheme();

  return (
    <View testID={testID} style={styles.container}>
      {icon ? <IconBubble icon={icon} size={48} tone="neutral" /> : null}
      <View style={styles.copy}>
        <Text style={[styles.title, { color: palette.text.primary }]}>{title}</Text>
        {body ? <Text style={[styles.body, { color: palette.text.secondary }]}>{body}</Text> : null}
      </View>
      {cta ? (
        <ZookButton
          variant="secondary"
          size="sm"
          href={cta.href}
          onPress={cta.onPress}
          accessibilityLabel={cta.label}
        >
          {cta.label}
        </ZookButton>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  copy: {
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    ...typography.cardTitle,
    textAlign: "center",
  },
  body: {
    ...typography.small,
    maxWidth: 280,
    textAlign: "center",
  },
  action: {
    alignItems: "center",
    width: "100%",
  },
});

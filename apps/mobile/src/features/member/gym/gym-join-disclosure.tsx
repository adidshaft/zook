import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/primitives";
import { spacing, typography, useTheme } from "@/lib/theme";

type JoinStep = {
  title: string;
  body: string;
};

export function GymJoinDisclosure({
  expanded,
  onToggle,
  steps,
  title,
  eyebrow,
}: {
  expanded: boolean;
  onToggle: () => void;
  steps: JoinStep[];
  title: string;
  eyebrow: string;
}) {
  const { palette } = useTheme();

  return (
    <Card variant="compact" contentStyle={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.header, pressed ? styles.pressed : null]}
      >
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: palette.text.secondary }]}>{eyebrow}</Text>
          <Text style={[styles.title, { color: palette.text.primary }]}>{title}</Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={19}
          color={palette.text.secondary}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.timeline}>
          {steps.map((step, index) => (
            <View key={step.title} style={styles.timelineRow}>
              <View
                style={[
                  styles.timelineMarker,
                  {
                    backgroundColor: palette.surface.accentSoft,
                    borderColor: palette.border.focus,
                  },
                ]}
              >
                <Text style={[styles.timelineMarkerText, { color: palette.accent.base }]}>
                  {index + 1}
                </Text>
              </View>
              <View style={styles.timelineCopy}>
                <Text style={[styles.timelineTitle, { color: palette.text.primary }]}>
                  {step.title}
                </Text>
                <Text style={[styles.timelineBody, { color: palette.text.secondary }]}>
                  {step.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: 42,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  eyebrow: {
    ...typography.eyebrow,
  },
  title: {
    ...typography.bodyStrong,
  },
  timeline: {
    gap: 16,
  },
  timelineRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  timelineMarker: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  timelineMarkerText: {
    ...typography.bodyStrong,
  },
  timelineCopy: {
    flex: 1,
    gap: 6,
  },
  timelineTitle: {
    ...typography.sectionTitle,
  },
  timelineBody: {
    ...typography.body,
  },
});

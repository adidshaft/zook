import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { Card } from "@/components/primitives";
import { useTheme } from "@/lib/theme";
import { scanStyles as styles } from "@/features/route-surfaces/member-scan-route.styles";

export type ScanVerificationStep = {
  key: "capture" | "decode" | "server";
  label: string;
  state: "idle" | "active" | "complete" | "failed";
};

export function ScanVerificationCard({
  steps,
}: {
  steps: ScanVerificationStep[];
}) {
  const { mode, palette } = useTheme();
  const isDark = mode === "dark";

  return (
    <Card variant="compact" contentStyle={styles.validationContent}>
      {steps.map((item) => (
        <View
          key={item.key}
          style={[
            styles.validationItem,
            {
              borderColor:
                item.state === "failed"
                  ? palette.feedback.danger
                  : item.state === "active"
                    ? palette.feedback.info
                    : item.state === "complete"
                      ? palette.feedback.success
                      : palette.border.subtle,
              backgroundColor:
                item.state === "failed"
                  ? palette.surface.dangerSoft
                  : item.state === "active"
                    ? isDark
                      ? palette.surface.raised
                      : palette.bg.sunken
                    : item.state === "complete"
                      ? palette.surface.successSoft
                      : palette.surface.default,
            },
          ]}
        >
          <Ionicons
            name={
              item.state === "failed"
                ? "close-circle-outline"
                : item.state === "active"
                  ? "radio-button-on"
                  : item.state === "complete"
                    ? "checkmark-circle"
                    : "ellipse-outline"
            }
            size={15}
            color={
              item.state === "failed"
                ? palette.feedback.danger
                : item.state === "active"
                  ? palette.feedback.info
                  : item.state === "complete"
                    ? palette.accent.base
                    : palette.text.secondary
            }
          />
          <Text style={[styles.validationText, { color: palette.text.primary }]}>
            {item.label}
          </Text>
        </View>
      ))}
    </Card>
  );
}

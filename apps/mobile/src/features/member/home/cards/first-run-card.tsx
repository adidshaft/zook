import { HomeCardShell } from "./card-shell";
import { useT } from "@/lib/i18n";
import { StyleSheet, Text, View } from "react-native";
import { spacing, typography, useTheme } from "@/lib/theme";

export default function FirstRunCard({ gymUsername }: { gymUsername?: string }) {
  const t = useT();
  const { palette } = useTheme();
  const steps = [
    t("member.home.firstRunStepFindGym"),
    t("member.home.firstRunStepChoosePlan"),
    t("member.home.firstRunStepStartTraining"),
  ];
  return (
    <HomeCardShell
      testID="home-state-first-run"
      icon="compass-outline"
      title={t("member.home.firstRunTitle")}
      body={t("member.home.firstRunBody")}
      ctaHref={gymUsername ? `/gyms/${gymUsername}` : "/gyms"}
      ctaLabel={t("member.home.findYourGym")}
      tone="neutral"
    >
      <View
        style={[
          styles.steps,
          { borderColor: palette.border.default, backgroundColor: palette.bg.sunken },
        ]}
      >
        {steps.map((step, index) => (
          <View
            key={step}
            style={[
              styles.step,
              index < steps.length - 1 ? { borderRightColor: palette.border.subtle } : null,
            ]}
          >
            <View
              style={[
                styles.stepNumber,
                { borderColor: palette.border.default, backgroundColor: palette.surface.default },
              ]}
            >
              <Text style={[styles.stepNumberText, { color: palette.text.primary }]}>
                {index + 1}
              </Text>
            </View>
            <Text
              numberOfLines={2}
              style={[styles.stepText, { color: palette.text.secondary }]}
            >
              {step}
            </Text>
          </View>
        ))}
      </View>
    </HomeCardShell>
  );
}

const styles = StyleSheet.create({
  steps: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  step: {
    alignItems: "center",
    borderRightWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 6,
    minWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: spacing.sm,
  },
  stepNumber: {
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  stepNumberText: {
    ...typography.caption,
    fontVariant: ["tabular-nums"],
  },
  stepText: {
    ...typography.caption,
    minWidth: 0,
    textAlign: "center",
  },
});

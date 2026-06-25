import { Text } from "react-native";

import { useT } from "@/lib/i18n";
import { typography, useTheme } from "@/lib/theme";
import { HomeCardShell } from "./card-shell";

export default function NoPlanCard({ daysLeft, gymName }: { daysLeft: number; gymName: string }) {
  const { palette } = useTheme();
  const t = useT();
  return (
    <HomeCardShell
      testID="home-state-no-plan"
      icon="chatbubble-ellipses-outline"
      title={t("member.home.noPlanAssigned")}
      body={t("member.home.noPlanBody", { gym: gymName })}
      ctaHref="/plan"
      ctaLabel={t("member.home.openPlan")}
      tone="blue"
    >
      <Text style={{ color: palette.text.secondary, ...typography.small }}>
        {daysLeft > 0 ? t("member.home.membershipDaysLeft", { count: daysLeft }) : t("member.home.membershipStatusActive")}
      </Text>
    </HomeCardShell>
  );
}

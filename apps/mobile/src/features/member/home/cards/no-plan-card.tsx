import { Text } from "react-native";

import { typography, useTheme } from "@/lib/theme";
import { HomeCardShell } from "./card-shell";

export default function NoPlanCard({ daysLeft, gymName }: { daysLeft: number; gymName: string }) {
  const { palette } = useTheme();
  return (
    <HomeCardShell
      testID="home-state-no-plan"
      icon="chatbubble-ellipses-outline"
      title="No plan assigned yet"
      body={`You are active at ${gymName}. Ask your trainer for a workout plan when you are ready.`}
      ctaHref="/plan"
      ctaLabel="Open Plan"
      tone="amber"
    >
      <Text style={{ color: palette.text.secondary, ...typography.small }}>
        {daysLeft > 0 ? `${daysLeft} membership days left.` : "Membership status is active."}
      </Text>
    </HomeCardShell>
  );
}

import { useState } from "react";
import { View } from "react-native";
import { ChipGroup, DatePickerField, NetworkBanner, OtpInput, QueryErrorState, ZookButton } from "@/components/primitives";
import { spacing } from "@/lib/theme";

export function MobileUxPrimitivesStory() {
  const [chip, setChip] = useState<"scan" | "code">("scan");
  const [date, setDate] = useState(new Date());
  const [otp, setOtp] = useState("");

  return (
    <View style={{ gap: spacing.lg, padding: spacing.lg }}>
      <NetworkBanner />
      <ChipGroup
        accessibilityLabel="Scan mode"
        value={chip}
        onChange={setChip}
        options={[
          { label: "Scan QR", value: "scan", icon: "qr-code-outline" },
          { label: "Enter code", value: "code", icon: "keypad-outline" },
        ]}
      />
      <ZookButton busy busyLabel="Saving">
        Save
      </ZookButton>
      <DatePickerField
        accessibilityLabel="Workout date"
        label="Workout date"
        value={date}
        onChange={setDate}
      />
      <OtpInput
        accessibilityLabel="One-time code"
        label="One-time code"
        value={otp}
        onChange={setOtp}
      />
      <QueryErrorState error={new Error("Network unavailable")} onRetry={() => undefined} />
    </View>
  );
}

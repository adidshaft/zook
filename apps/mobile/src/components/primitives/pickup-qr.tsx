import QRCode from "react-native-qrcode-svg";
import { View } from "react-native";
import Reanimated from "@/lib/reanimated-lite";
import { useBreathingScale } from "@/lib/motion";
import { useT } from "@/lib/i18n";
import { legacyColors, spacing } from "@/lib/theme";

export function PickupQrCode({ value }: { value: string }) {
  const breathingStyle = useBreathingScale(true);
  const t = useT();
  return (
    <Reanimated.View style={breathingStyle}>
      <View
        accessibilityRole="image"
        accessibilityLabel={t("shop.signedPickupQrCode")}
        style={{
          alignItems: "center",
          backgroundColor: legacyColors.paper,
          borderRadius: 18,
          padding: spacing.lg,
        }}
      >
        <QRCode value={value} size={176} backgroundColor={legacyColors.paper} color={legacyColors.ink} />
      </View>
    </Reanimated.View>
  );
}

import QRCode from "react-native-qrcode-svg";
import { View } from "react-native";
import Reanimated from "react-native-reanimated";
import { useBreathingScale } from "@/lib/motion";
import { colors, spacing } from "@/lib/theme";

export function PickupQrCode({ value }: { value: string }) {
  const breathingStyle = useBreathingScale(true);
  return (
    <Reanimated.View style={breathingStyle}>
      <View
        accessibilityRole="image"
        accessibilityLabel="Signed pickup QR code"
        style={{
          alignItems: "center",
          backgroundColor: colors.paper,
          borderRadius: 18,
          padding: spacing.lg,
        }}
      >
        <QRCode value={value} size={176} backgroundColor={colors.paper} color={colors.ink} />
      </View>
    </Reanimated.View>
  );
}

import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { normalizeWebUrl } from "@/lib/api";
import { gymBrandColor, seededGymLogoDataUri } from "@/lib/gym-brand";
import { typography } from "@/lib/theme";

export function GymBrandMark({
  brand,
  logoUrl,
  size = "compact",
}: {
  brand: ReturnType<typeof gymBrandColor>;
  logoUrl?: string | null;
  size?: "compact" | "regular" | "sheet" | "option";
}) {
  const [didFail, setDidFail] = useState(false);
  const normalizedLogoUrl = seededGymLogoDataUri(logoUrl) ?? normalizeWebUrl(logoUrl);
  const markStyle =
    size === "sheet"
      ? styles.sheetBrand
      : size === "option"
        ? styles.optionMark
        : size === "regular"
          ? styles.brandMark
          : styles.brandDot;
  const imageStyle =
    size === "sheet"
      ? styles.sheetLogo
      : size === "option"
        ? styles.optionLogo
        : size === "regular"
          ? styles.brandLogo
          : styles.brandDotLogo;
  const initialStyle =
    size === "sheet"
      ? styles.sheetInitial
      : size === "option"
        ? styles.optionInitial
        : size === "regular"
          ? styles.brandInitial
          : styles.brandDotInitial;

  useEffect(() => {
    setDidFail(false);
  }, [normalizedLogoUrl]);

  if (normalizedLogoUrl && !didFail) {
    return (
      <View style={[markStyle, { backgroundColor: brand.soft }]}>
        <Image
          source={{ uri: normalizedLogoUrl }}
          style={imageStyle}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={normalizedLogoUrl}
          transition={100}
          onError={() => setDidFail(true)}
        />
      </View>
    );
  }

  return (
    <View style={[markStyle, { backgroundColor: brand.soft }]}>
      <Text style={[initialStyle, { color: brand.solid }]}>{brand.initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandMark: {
    alignItems: "center",
    borderRadius: 9,
    height: 24,
    justifyContent: "center",
    overflow: "hidden",
    width: 24,
  },
  brandLogo: {
    height: 24,
    width: 24,
  },
  brandInitial: {
    ...typography.eyebrow,
    lineHeight: 13,
  },
  brandDot: {
    alignItems: "center",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    overflow: "hidden",
    width: 20,
  },
  brandDotLogo: {
    height: 20,
    width: 20,
  },
  brandDotInitial: {
    ...typography.eyebrow,
    lineHeight: 12,
  },
  sheetBrand: {
    alignItems: "center",
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    width: 48,
  },
  sheetLogo: {
    height: 48,
    width: 48,
  },
  sheetInitial: {
    ...typography.sectionTitle,
    lineHeight: 22,
  },
  optionMark: {
    alignItems: "center",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    overflow: "hidden",
    width: 38,
  },
  optionLogo: {
    height: 38,
    width: 38,
  },
  optionInitial: {
    ...typography.button,
    lineHeight: 17,
  },
});

import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "@/lib/reanimated-lite";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/components/primitives";
import { useReduceMotion } from "@/lib/motion";
import { useTheme } from "@/lib/theme";

export default function OnboardingSplash() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { mode, palette } = useTheme();
  const navigatedRef = useRef(false);
  const useStaticIntro = reduceMotion || Platform.OS === "android";
  const wordmarkOpacity = useSharedValue(useStaticIntro ? 1 : 0);
  const wordmarkScale = useSharedValue(useStaticIntro ? 1 : 0.96);
  const markOpacity = useSharedValue(useStaticIntro ? 1 : 0);
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ scale: wordmarkScale.value }],
  }));
  const markStyle = useAnimatedStyle(() => ({ opacity: markOpacity.value }));

  const navigateNext = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.push("/onboarding/language" as never);
  }, [router]);

  useEffect(() => {
    if (!useStaticIntro) {
      wordmarkOpacity.value = withTiming(1, {
        duration: 480,
        easing: Easing.out(Easing.cubic),
      });
      wordmarkScale.value = withTiming(1, {
        duration: 480,
        easing: Easing.out(Easing.cubic),
      });
      markOpacity.value = withDelay(
        480,
        withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }),
      );
    }

    const timer = setTimeout(() => {
      navigateNext();
    }, useStaticIntro ? 1200 : 1400);

    return () => clearTimeout(timer);
  }, [markOpacity, navigateNext, useStaticIntro, wordmarkOpacity, wordmarkScale]);

  return (
    <Pressable
      testID="onboarding-intro-screen"
      accessibilityRole="button"
      accessibilityLabel="Skip intro"
      onPress={navigateNext}
      style={[styles.screen, { backgroundColor: palette.bg.app, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.ambientOrb,
          styles.ambientOrbPrimary,
          { backgroundColor: mode === "dark" ? "rgba(185,244,85,0.12)" : "rgba(31,62,36,0.10)" },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.ambientOrb,
          styles.ambientOrbSecondary,
          { backgroundColor: mode === "dark" ? "rgba(125,211,252,0.10)" : "rgba(125,211,252,0.14)" },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.ambientOrb,
          styles.ambientOrbTertiary,
          { backgroundColor: mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(31,62,36,0.06)" },
        ]}
      />
      <View style={styles.center}>
        <View
          pointerEvents="none"
          style={[
            styles.stageFrame,
            {
              backgroundColor: mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.56)",
              borderColor: palette.border.subtle,
            },
          ]}
        />
        <Reanimated.View
          style={[
            styles.heroCard,
            wordmarkStyle,
            {
              backgroundColor: mode === "dark" ? palette.surface.default : palette.bg.elevated,
              borderColor: palette.border.default,
            },
          ]}
        >
          <View style={styles.wordmark}>
            <BrandMark size="lg" />
            <Text style={[styles.wordmarkText, { color: palette.text.primary }]}>Zook</Text>
          </View>
          <Text style={[styles.heroSubtitle, { color: palette.text.secondary }]}>
            Check-ins, memberships, plans, and the front desk flow in one place.
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={[styles.heroMetaChip, { borderColor: palette.border.subtle, backgroundColor: palette.surface.accentSoft }]}>
              <Text style={[styles.heroMetaText, { color: palette.accent.base }]}>Scan</Text>
            </View>
            <View style={[styles.heroMetaChip, { borderColor: palette.border.subtle, backgroundColor: palette.surface.accentSoft }]}>
              <Text style={[styles.heroMetaText, { color: palette.accent.base }]}>Plans</Text>
            </View>
            <View style={[styles.heroMetaChip, { borderColor: palette.border.subtle, backgroundColor: palette.surface.accentSoft }]}>
              <Text style={[styles.heroMetaText, { color: palette.accent.base }]}>Desk</Text>
            </View>
          </View>
        </Reanimated.View>
        <Reanimated.View style={[styles.scanMark, markStyle]}>
          <View
            style={[
              styles.scanBadge,
              {
                backgroundColor: mode === "dark" ? palette.surface.default : palette.surface.accentSoft,
                borderColor: palette.border.subtle,
              },
            ]}
          >
            <View style={[styles.scanGlyph, { borderColor: palette.accent.base }]}>
              <View style={[styles.scanGlyphCorner, styles.scanGlyphTopLeft, { borderColor: palette.accent.base }]} />
              <View style={[styles.scanGlyphCorner, styles.scanGlyphTopRight, { borderColor: palette.accent.base }]} />
              <View style={[styles.scanGlyphCorner, styles.scanGlyphBottomLeft, { borderColor: palette.accent.base }]} />
              <View style={[styles.scanGlyphCorner, styles.scanGlyphBottomRight, { borderColor: palette.accent.base }]} />
            </View>
            <Text style={[styles.scanLabel, { color: palette.text.primary }]}>Gym ops, without the clutter.</Text>
            <Text style={[styles.scanText, { color: palette.text.secondary }]}>Tap anywhere to continue</Text>
          </View>
        </Reanimated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  stageFrame: {
    position: "absolute",
    width: "100%",
    maxWidth: 372,
    height: 328,
    borderRadius: 36,
    borderWidth: 1,
  },
  ambientOrb: {
    position: "absolute",
    borderRadius: 999,
  },
  ambientOrbPrimary: {
    width: 260,
    height: 260,
    top: 96,
    right: -84,
  },
  ambientOrbSecondary: {
    width: 220,
    height: 220,
    bottom: 120,
    left: -72,
  },
  ambientOrbTertiary: {
    width: 140,
    height: 140,
    top: 210,
    left: 38,
  },
  heroCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 26,
    gap: 14,
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  wordmarkText: {
    fontFamily: "Inter_900Black",
    fontSize: 46,
    letterSpacing: 0,
  },
  heroSubtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 22,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  heroMetaChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroMetaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  scanMark: {
    alignItems: "center",
    gap: 12,
  },
  scanBadge: {
    minWidth: 220,
    alignItems: "center",
    gap: 12,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  scanLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 0,
  },
  scanGlyph: {
    width: 50,
    height: 50,
  },
  scanGlyphCorner: {
    position: "absolute",
    width: 14,
    height: 14,
  },
  scanGlyphTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  scanGlyphTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  scanGlyphBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  scanGlyphBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  scanText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0,
  },
});

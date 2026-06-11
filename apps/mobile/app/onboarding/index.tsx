import { useRouter } from "expo-router";
import { useEffect } from "react";
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
  const { palette } = useTheme();
  const useStaticIntro = reduceMotion || Platform.OS === "android";
  const wordmarkOpacity = useSharedValue(useStaticIntro ? 1 : 0);
  const wordmarkScale = useSharedValue(useStaticIntro ? 1 : 0.96);
  const markOpacity = useSharedValue(useStaticIntro ? 1 : 0);
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ scale: wordmarkScale.value }],
  }));
  const markStyle = useAnimatedStyle(() => ({ opacity: markOpacity.value }));

  useEffect(() => {
    if (!useStaticIntro) {
      wordmarkOpacity.value = withTiming(1, {
        duration: 720,
        easing: Easing.out(Easing.cubic),
      });
      wordmarkScale.value = withTiming(1, {
        duration: 720,
        easing: Easing.out(Easing.cubic),
      });
      markOpacity.value = withDelay(
        720,
        withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
      );
    }

    const timer = setTimeout(() => {
      router.push("/onboarding/language" as never);
    }, useStaticIntro ? 650 : 2000);

    return () => clearTimeout(timer);
  }, [markOpacity, router, useStaticIntro, wordmarkOpacity, wordmarkScale]);

  return (
    <Pressable
      testID="onboarding-intro-screen"
      accessibilityRole="button"
      accessibilityLabel="Skip intro"
      onPress={() => router.push("/onboarding/language" as never)}
      style={[styles.screen, { backgroundColor: palette.bg.app, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }]}
    >
      <View style={styles.center}>
        <Reanimated.View style={[styles.wordmark, wordmarkStyle]}>
          <BrandMark size="lg" />
          <Text style={[styles.wordmarkText, { color: palette.accent.base }]}>Zook</Text>
        </Reanimated.View>
        <Reanimated.View style={[styles.scanMark, markStyle]}>
          <View style={styles.scanCorners}>
            <View style={[styles.corner, styles.cornerTopLeft, { borderColor: palette.accent.base }]} />
            <View style={[styles.corner, styles.cornerTopRight, { borderColor: palette.accent.base }]} />
            <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: palette.accent.base }]} />
            <View style={[styles.corner, styles.cornerBottomRight, { borderColor: palette.accent.base }]} />
          </View>
          <Text style={[styles.scanText, { color: palette.text.secondary }]}>scan to enter</Text>
        </Reanimated.View>
      </View>
      <Text style={[styles.skipText, { color: palette.text.tertiary }]}>Tap to skip</Text>
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
  wordmark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  wordmarkText: {
    fontFamily: "Inter_900Black",
    fontSize: 58,
    letterSpacing: 0,
  },
  scanMark: {
    alignItems: "center",
    gap: 10,
  },
  scanCorners: {
    width: 64,
    height: 64,
  },
  corner: {
    position: "absolute",
    width: 18,
    height: 18,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBottomRight: {
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
  skipText: {
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});

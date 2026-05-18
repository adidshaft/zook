import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import { colors } from "@/lib/theme";

export default function OnboardingSplash() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const wordmarkOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const wordmarkScale = useSharedValue(reduceMotion ? 1 : 0.96);
  const markOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ scale: wordmarkScale.value }],
  }));
  const markStyle = useAnimatedStyle(() => ({ opacity: markOpacity.value }));

  useEffect(() => {
    if (!reduceMotion) {
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
    }, reduceMotion ? 650 : 2000);

    return () => clearTimeout(timer);
  }, [markOpacity, reduceMotion, router, wordmarkOpacity, wordmarkScale]);

  return (
    <Pressable
      testID="onboarding-intro-screen"
      accessibilityRole="button"
      accessibilityLabel="Skip intro"
      onPress={() => router.push("/onboarding/language" as never)}
      style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }]}
    >
      <View style={styles.center}>
        <Reanimated.View style={[styles.wordmark, wordmarkStyle]}>
          <BrandMark size="lg" />
          <Text style={styles.wordmarkText}>Zook</Text>
        </Reanimated.View>
        <Reanimated.View style={[styles.scanMark, markStyle]}>
          <View style={styles.scanCorners}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <Text style={styles.scanText}>scan to enter</Text>
        </Reanimated.View>
      </View>
      <Text style={styles.skipText}>Tap to skip</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
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
    color: colors.lime,
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
    borderColor: "rgba(185,244,85,0.72)",
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
    color: colors.muted,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0,
  },
  skipText: {
    color: colors.muted,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});

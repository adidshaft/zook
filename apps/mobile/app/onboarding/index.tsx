import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/components/primitives";
import { colors } from "@/lib/theme";

export default function OnboardingSplash() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkScale = useRef(new Animated.Value(0.96)).current;
  const markOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkScale, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(markOpacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.push("/onboarding/value-props" as never);
    }, 2000);

    return () => clearTimeout(timer);
  }, [markOpacity, router, wordmarkOpacity, wordmarkScale]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.wordmark,
            {
              opacity: wordmarkOpacity,
              transform: [{ scale: wordmarkScale }],
            },
          ]}
        >
          <BrandMark size="lg" />
          <Text style={styles.wordmarkText}>Zook</Text>
        </Animated.View>
        <Animated.View style={[styles.scanMark, { opacity: markOpacity }]}>
          <View style={styles.scanCorners}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <Text style={styles.scanText}>scan to enter</Text>
        </Animated.View>
      </View>
    </View>
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
    right: 0,
    bottom: 0,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  scanText: {
    color: colors.muted,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
  },
});

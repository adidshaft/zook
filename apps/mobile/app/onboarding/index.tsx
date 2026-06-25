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
import { useT } from "@/lib/i18n";
import { useReduceMotion } from "@/lib/motion";
import { layout, useTheme } from "@/lib/theme";

export default function OnboardingSplash() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { palette } = useTheme();
  const t = useT();
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
    router.replace("/onboarding/language" as never);
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
      accessibilityLabel={t("onboarding.skipIntro")}
      onPress={navigateNext}
      style={[styles.screen, { backgroundColor: palette.bg.app, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }]}
    >
      <View style={styles.center}>
        <Reanimated.View
          style={[
            styles.heroCard,
            wordmarkStyle,
            {
              backgroundColor: palette.surface.default,
              borderColor: palette.border.default,
            },
          ]}
        >
          <View style={styles.wordmark}>
            <BrandMark size="lg" />
            <Text style={[styles.wordmarkText, { color: palette.text.primary }]}>{t("onboarding.brand")}</Text>
          </View>
          <Text style={[styles.heroSubtitle, { color: palette.text.secondary }]}>
            {t("onboarding.splashSubtitle")}
          </Text>
        </Reanimated.View>
        <Reanimated.View style={[styles.scanMark, markStyle]}>
          <View
            style={[
              styles.scanBadge,
              {
                backgroundColor: palette.surface.accentSoft,
                borderColor: palette.border.subtle,
              },
            ]}
          >
            <Text style={[styles.scanLabel, { color: palette.text.primary }]}>{t("onboarding.splashBadge")}</Text>
          </View>
        </Reanimated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
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
});

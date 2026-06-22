import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconBubble, ZookButton } from "@/components/primitives";
import { setStoredValue } from "@/lib/storage";
import { gradients, layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

const ONBOARDING_STORAGE_KEY = "zook_onboarding_completed";
const INTRO_COMPLETE = "intro";

const valueProps: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  tone: "lime" | "blue" | "violet";
  gradient: readonly [string, string];
  eyebrow: string;
  copy: string;
}> = [
  {
    icon: "location-outline",
    tone: "lime",
    gradient: gradients.heroCardAccent,
    eyebrow: "Find your gym",
    copy: "Discover gyms near you across Pune, Mumbai, Bengaluru, Delhi and 50+ cities.",
  },
  {
    icon: "barbell-outline",
    tone: "blue",
    gradient: gradients.classBlue,
    eyebrow: "Train & track",
    copy: "Scan in seconds, follow your plan, and watch every workout add up.",
  },
  {
    icon: "sparkles-outline",
    tone: "violet",
    gradient: gradients.classViolet,
    eyebrow: "All in one",
    copy: "Memberships, classes, payments and store pickup — all in one place.",
  },
];

export default function OnboardingStep() {
  return <ValuePropsStep />;
}

export function ValuePropsStep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [userScrolled, setUserScrolled] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardWidth = width;
  const { palette } = useTheme();

  function clearAutoScrollTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    if (userScrolled) {
      return undefined;
    }
    timerRef.current = setInterval(() => {
      setActiveIndex((current) => {
        const next = Math.min(current + 1, valueProps.length - 1);
        if (next === current) {
          return current;
        }
        scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
        return next;
      });
    }, 2600);

    return clearAutoScrollTimer;
  }, [cardWidth, userScrolled]);

  useEffect(() => {
    return clearAutoScrollTimer;
  }, []);

  function stopAutoScroll() {
    setUserScrolled(true);
    clearAutoScrollTimer();
  }

  async function finishOnboarding() {
    setBusy(true);
    try {
      await setStoredValue(ONBOARDING_STORAGE_KEY, INTRO_COMPLETE);
      router.replace("/login" as never);
    } catch {
      showToast({
        title: "Couldn't save preference",
        message: "Try again.",
        tone: "amber",
        haptic: "warning",
      });
    } finally {
      setBusy(false);
    }
  }

  const isFinalSlide = activeIndex >= valueProps.length - 1;

  return (
    <View
      testID="onboarding-value-props-screen"
      style={[styles.screen, { backgroundColor: palette.bg.app, paddingTop: insets.top + 22, paddingBottom: insets.bottom + 22 }]}
    >
      <Pressable
        testID="onboarding-value-skip"
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
        disabled={busy}
        onPress={() => void finishOnboarding()}
        style={({ pressed }) => [
          styles.skipButton,
          {
            top: insets.top + 10,
            backgroundColor: palette.bg.elevated,
            borderColor: palette.border.subtle,
          },
          pressed && !busy ? styles.skipButtonPressed : null,
        ]}
      >
        <Text style={[styles.skipText, { color: palette.text.secondary }]}>Skip</Text>
      </Pressable>
      <View style={styles.header}>
        <Text style={[styles.brand, { color: palette.text.primary }]}>Zook</Text>
        <Text style={[styles.kicker, { color: palette.text.secondary }]}>Built for gym days</Text>
      </View>

      <View style={styles.valueStage}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={cardWidth}
          onScrollBeginDrag={stopAutoScroll}
          onMomentumScrollEnd={(event) => {
            setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / cardWidth));
          }}
          scrollEventThrottle={16}
        >
          {valueProps.map((item, index) => (
            <View key={item.eyebrow} style={[styles.valueCard, { width: cardWidth }]}>
              <View style={[styles.valuePanel, { borderColor: palette.border.subtle }]}>
                <LinearGradient
                  colors={item.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={[styles.valueNumber, { color: palette.text.tertiary }]}>
                  0{index + 1} / 0{valueProps.length}
                </Text>
                <View style={styles.valuePanelBody}>
                  <IconBubble icon={item.icon} tone={item.tone} size={56} />
                  <Text style={[styles.valueEyebrow, { color: palette.accent.base }]}>
                    {item.eyebrow.toUpperCase()}
                  </Text>
                  <Text style={[styles.valueCopy, { color: palette.text.primary }]}>{item.copy}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {valueProps.map((item, index) => (
            <View
              key={item.eyebrow}
              style={[
                styles.dot,
                { backgroundColor: palette.border.strong },
                activeIndex === index ? { backgroundColor: palette.accent.base, width: 34 } : null,
              ]}
            />
          ))}
        </View>
        <ZookButton
          testID="onboarding-value-continue"
          onPress={() => {
            if (isFinalSlide) {
              void finishOnboarding();
              return;
            }
            stopAutoScroll();
            const next = Math.min(activeIndex + 1, valueProps.length - 1);
            setActiveIndex(next);
            scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
          }}
          disabled={busy}
        >
          {busy ? "Saving..." : isFinalSlide ? "Continue to sign in" : "Continue"}
        </ZookButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    gap: 8,
    paddingHorizontal: layout.screenPadding,
  },
  brand: {
    ...typography.display,
  },
  kicker: {
    ...typography.body,
  },
  valueStage: {
    overflow: "hidden",
    alignSelf: "stretch",
  },
  valueCard: {
    minHeight: 400,
    justifyContent: "center",
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.lg,
  },
  valuePanel: {
    flex: 1,
    borderRadius: 28,
    borderCurve: "continuous",
    borderWidth: 1,
    overflow: "hidden",
    padding: spacing.xl,
    justifyContent: "space-between",
  },
  valuePanelBody: {
    gap: spacing.md,
  },
  valueNumber: {
    ...typography.caption,
    letterSpacing: 1,
  },
  valueEyebrow: {
    ...typography.eyebrow,
    letterSpacing: 1.4,
    marginTop: spacing.xs,
  },
  valueCopy: {
    ...typography.heroTitle,
  },
  footer: {
    gap: 20,
    paddingHorizontal: layout.screenPadding,
  },
  dots: {
    flexDirection: "row",
    alignSelf: "center",
    gap: 8,
  },
  dot: {
    width: 14,
    height: 6,
    borderRadius: 999,
  },
  skipButton: {
    position: "absolute",
    right: 18,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    minWidth: 64,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  skipButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  skipText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
});

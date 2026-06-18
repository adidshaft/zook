import { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "@/lib/reanimated-lite";

export const durations = {
  fast: 150,
  base: 250,
  slow: 350,
};

export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

export function useShake() {
  const reduceMotion = useReduceMotion();
  const offset = useSharedValue(0);
  const shake = useCallback(() => {
    if (reduceMotion) return;
    offset.value = withSequence(
      withTiming(-8, { duration: 45 }),
      withRepeat(withTiming(8, { duration: 70 }), 3, true),
      withTiming(0, { duration: 45 }),
    );
  }, [offset, reduceMotion]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  return { animatedStyle, shake };
}

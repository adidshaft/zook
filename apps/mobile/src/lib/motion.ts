import { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

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

export function useScalePulse() {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const pulse = useCallback(() => {
    if (reduceMotion) return;
    scale.value = withSequence(
      withSpring(1.08, { damping: 12, stiffness: 220 }),
      withSpring(1, { damping: 14, stiffness: 200 }),
    );
  }, [reduceMotion, scale]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return { animatedStyle, pulse };
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

export function useBreathingScale(enabled = true) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!enabled || reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [enabled, reduceMotion, scale]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

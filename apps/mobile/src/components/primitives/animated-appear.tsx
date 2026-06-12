import { useEffect, useRef, type ReactNode } from "react";
import { Animated, type ViewStyle } from "react-native";

import { durations, useReduceMotion } from "@/lib/motion";

/**
 * Lightweight on-mount entry animation: fade + slide up.
 * Uses the built-in RN Animated API (works alongside the reanimated-lite stub).
 */
export function AnimatedAppear({
  children,
  delay = 0,
  duration = durations.base,
  translateY = 12,
  style,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  translateY?: number;
  style?: ViewStyle;
}) {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay: reduceMotion ? 0 : delay,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [delay, duration, progress, reduceMotion]);

  const opacity = progress;
  const translate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [reduceMotion ? 0 : translateY, 0],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY: translate }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Subtle continuous breathing pulse — useful on hero CTAs and badges.
 */
export function PulseHalo({
  children,
  scaleTo = 1.04,
  duration = 1800,
  style,
}: {
  children: ReactNode;
  scaleTo?: number;
  duration?: number;
  style?: ViewStyle;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: scaleTo,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [duration, scale, scaleTo]);

  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

import { useEffect, useRef, type ReactNode } from "react";
import { Animated, type ViewStyle } from "react-native";

import { durations, useReduceMotion } from "@/lib/motion";

/**
 * Lightweight on-mount entry animation: fade + slide up.
 * Uses the built-in RN Animated API so it stays compatible with every native target.
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

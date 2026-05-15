import { createElement } from "react";
import { TextInput, View } from "react-native";
import type { ComponentType } from "react";

type EasingFn = (value: number) => number;

export const Easing = {
  ease: (value: number) => value,
  cubic: (value: number) => value * value * value,
  inOut: (fn: EasingFn) => fn,
  out: (fn: EasingFn) => fn,
};

export function useSharedValue<T>(initialValue: T) {
  return { value: initialValue };
}

export function useAnimatedStyle<T>(styleFactory: () => T): T {
  return styleFactory();
}

export function useAnimatedProps<T>(propsFactory: () => T): T {
  return propsFactory();
}

export function withTiming<T>(value: T, ..._args: unknown[]): T {
  return value;
}

export function withSpring<T>(value: T, ..._args: unknown[]): T {
  return value;
}

export function withRepeat<T>(value: T, ..._args: unknown[]): T {
  return value;
}

export function withSequence<T>(...values: T[]): T {
  return values[values.length - 1] as T;
}

export function withDelay<T>(_delayMs: number, value: T): T {
  return value;
}

export function interpolate(value: number, inputRange: number[], outputRange: number[]) {
  if (inputRange.length === 0 || outputRange.length === 0) return value;
  const startInput = inputRange[0] ?? 0;
  const endInput = inputRange[inputRange.length - 1] ?? startInput;
  const startOutput = outputRange[0] ?? 0;
  const endOutput = outputRange[outputRange.length - 1] ?? startOutput;
  if (endInput === startInput) return startOutput;
  const progress = Math.max(0, Math.min(1, (value - startInput) / (endInput - startInput)));
  return startOutput + progress * (endOutput - startOutput);
}

function createAnimatedComponent<T extends ComponentType<any>>(component: T): T & ComponentType<any> {
  function AnimatedComponent({ animatedProps, entering: _entering, ...props }: any) {
    const mergedProps = { ...animatedProps, ...props };
    if ("text" in mergedProps && !("value" in mergedProps)) {
      mergedProps.value = String(mergedProps.text ?? "");
    }
    delete mergedProps.text;
    return createElement(component, mergedProps);
  }

  return AnimatedComponent as T & ComponentType<any>;
}

function makeAnimationBuilder() {
  const builder = {
    delay: (..._args: unknown[]) => builder,
    duration: (..._args: unknown[]) => builder,
  };
  return builder;
}

export const FadeInDown = makeAnimationBuilder();

const Reanimated = {
  View: View as ComponentType<any>,
  TextInput: TextInput as ComponentType<any>,
  createAnimatedComponent,
};

export default Reanimated;

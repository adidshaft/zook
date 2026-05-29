import { TextInput } from "react-native";
import * as RealReanimated from "react-native-reanimated";

export const Easing = RealReanimated.Easing;
export const useSharedValue = RealReanimated.useSharedValue;
export const useAnimatedStyle = RealReanimated.useAnimatedStyle;
export const useAnimatedProps = RealReanimated.useAnimatedProps;
export const withTiming = RealReanimated.withTiming;
export const withSpring = RealReanimated.withSpring;
export const withRepeat = RealReanimated.withRepeat;
export const withSequence = RealReanimated.withSequence;
export const withDelay = RealReanimated.withDelay;
export const interpolate = RealReanimated.interpolate;
export const FadeInDown = RealReanimated.FadeInDown;

const Reanimated = {
  View: RealReanimated.default.View,
  TextInput: RealReanimated.default.createAnimatedComponent(TextInput),
  createAnimatedComponent: RealReanimated.default.createAnimatedComponent,
};

export default Reanimated;

import type { ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  type KeyboardAvoidingViewProps,
  type ScrollViewProps,
} from "react-native";

type KeyboardAwareScreenProps = Omit<KeyboardAvoidingViewProps, "children" | "behavior"> & {
  children: ReactNode;
  scrollViewProps?: ScrollViewProps;
};

export function KeyboardAwareScreen({
  children,
  scrollViewProps,
  ...rest
}: KeyboardAwareScreenProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      {...rest}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

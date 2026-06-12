import type { ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type KeyboardAvoidingViewProps,
  type ScrollViewProps,
} from "react-native";

type KeyboardAwareScreenProps = Omit<KeyboardAvoidingViewProps, "children" | "behavior"> & {
  children: ReactNode;
  scrollViewProps?: ScrollViewProps;
  noScroll?: boolean;
};

export function KeyboardAwareScreen({
  children,
  scrollViewProps,
  noScroll = false,
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
        {noScroll ? (
          <View style={{ flex: 1 }}>{children}</View>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            {...scrollViewProps}
            contentContainerStyle={[
              styles.scrollContent,
              scrollViewProps?.contentContainerStyle,
            ]}
          >
            {children}
          </ScrollView>
        )}
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
});

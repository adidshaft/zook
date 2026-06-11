import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { BlurView } from "expo-blur";
import {
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewProps,
  type DimensionValue,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/lib/theme";

export type BottomSheetBackdropProps = ViewProps & {
  appearsOnIndex?: number;
  disappearsOnIndex?: number;
  pressBehavior?: "none" | "close" | "collapse" | number | string;
};

export type BottomSheetModal = {
  present: () => void;
  dismiss: () => void;
};

type BottomSheetModalProps = {
  children: ReactNode;
  onDismiss?: () => void;
  backgroundStyle?: ViewStyle;
  handleIndicatorStyle?: ViewStyle;
  bottomInset?: number;
  enablePanDownToClose?: boolean;
  backdropComponent?: (props: BottomSheetBackdropProps) => ReactNode;
  keyboardBehavior?: "extend" | "fillParent" | "interactive";
  keyboardBlurBehavior?: "none" | "restore";
  maxDynamicContentSize?: number;
  snapPoints?: Array<number | string>;
};

export function BottomSheetBackdrop(props: BottomSheetBackdropProps) {
  return <View {...props} />;
}

export const BottomSheetView = View;
export const BottomSheetScrollView = ScrollView;

export const BottomSheetModal = forwardRef<BottomSheetModal, BottomSheetModalProps>(
  function ExpoSafeBottomSheetModal(
    {
      children,
      onDismiss,
      backgroundStyle,
      handleIndicatorStyle,
      maxDynamicContentSize,
      bottomInset = 0,
      enablePanDownToClose = false,
      backdropComponent,
      snapPoints,
    },
    ref,
  ) {
    const { palette, mode } = useTheme();
    const [visible, setVisible] = useState(false);
    const dismissNotifiedRef = useRef(false);
    const sheetHeight = resolveSnapPoint(snapPoints?.[0]);
    const safePaddingBottom = Math.max(bottomInset, 0);
    const isDark = mode === "dark";
    const sheetBackground =
      Platform.OS === "ios"
        ? "transparent"
        : palette.bg.elevated;
    const sheetScrim = palette.bg.overlay;
    const sheetOverlay =
      Platform.OS === "ios"
        ? isDark
          ? "rgba(18,20,19,0.58)"
          : "rgba(255,255,255,0.54)"
        : palette.bg.elevated;
    const sheetChrome =
      Platform.OS === "ios"
        ? {
            shadowColor: isDark ? palette.bg.sunken : palette.text.primary,
            shadowOpacity: isDark ? 0.18 : 0.08,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: -8 },
          }
        : {
            elevation: 1,
          };

    const notifyDismiss = useCallback(() => {
      if (dismissNotifiedRef.current) return;
      dismissNotifiedRef.current = true;
      onDismiss?.();
    }, [onDismiss]);

    const close = useCallback(() => {
      if (!visible) return;
      setVisible(false);
      notifyDismiss();
    }, [notifyDismiss, visible]);

    useImperativeHandle(ref, () => ({
      present: () => {
        dismissNotifiedRef.current = false;
        setVisible(true);
      },
      dismiss: close,
    }));

    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        enablePanDownToClose && Math.abs(gesture.dy) > 12 && gesture.dy > Math.abs(gesture.dx),
      onPanResponderRelease: (_, gesture) => {
        if (enablePanDownToClose && gesture.dy > 72) {
          close();
        }
      },
    });

    return (
      <Modal
        animationType="slide"
        transparent
        visible={visible}
        onRequestClose={close}
        onDismiss={notifyDismiss}
      >
        <View style={[styles.root, { backgroundColor: "transparent" }]}>
          {backdropComponent ? (
            backdropComponent({
              style: [
                styles.backdrop,
                { backgroundColor: sheetScrim },
              ],
              onTouchEnd: close,
            })
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close sheet"
              style={[
                styles.backdrop,
                { backgroundColor: sheetScrim },
              ]}
              onPress={close}
            />
          )}
          <View
            {...panResponder.panHandlers}
            style={[
              styles.sheet,
              {
                backgroundColor: sheetBackground,
                borderColor: palette.border.subtle,
                borderCurve: "continuous",
                borderWidth: Platform.OS === "ios" ? 1 : 0,
              },
              sheetChrome,
              Platform.OS === "android" ? styles.androidSheet : null,
              sheetHeight ? { height: sheetHeight } : null,
              maxDynamicContentSize ? { maxHeight: maxDynamicContentSize } : null,
              safePaddingBottom ? { paddingBottom: safePaddingBottom } : null,
              backgroundStyle,
            ]}
          >
            {Platform.OS === "ios" ? (
              <BlurView
                pointerEvents="none"
                intensity={isDark ? 34 : 38}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <View
              pointerEvents="none"
              style={[
                styles.sheetSurface,
                { backgroundColor: sheetOverlay },
              ]}
            />
            <View
              style={[
                styles.handle,
                { backgroundColor: palette.border.strong },
                handleIndicatorStyle,
              ]}
            />
            {children}
          </View>
        </View>
      </Modal>
    );
  },
);

function resolveSnapPoint(snapPoint?: number | string): DimensionValue | undefined {
  if (typeof snapPoint === "number") {
    return snapPoint;
  }
  if (typeof snapPoint === "string" && snapPoint.trim() === "CONTENT_HEIGHT") {
    return undefined;
  }
  if (typeof snapPoint === "string" && snapPoint.trim().endsWith("%")) {
    return snapPoint as DimensionValue;
  }
  return undefined;
}

export function createBottomSheetScrollProps(props: ScrollViewProps) {
  return props;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: "86%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomWidth: 0,
    paddingTop: 12,
    overflow: "hidden",
  },
  androidSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetSurface: {
    ...StyleSheet.absoluteFillObject,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
});

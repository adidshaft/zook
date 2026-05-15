import { forwardRef, useImperativeHandle, useState, type ReactNode } from "react";
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewProps,
  type DimensionValue,
  type ViewStyle,
} from "react-native";
import { colors } from "@/lib/theme";

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
    const [visible, setVisible] = useState(false);
    const sheetHeight = resolveSnapPoint(snapPoints?.[0]);

    function close() {
      setVisible(false);
      onDismiss?.();
    }

    useImperativeHandle(ref, () => ({
      present: () => setVisible(true),
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
        onDismiss={onDismiss}
      >
        <View style={styles.root}>
          {backdropComponent ? (
            backdropComponent({ style: styles.backdrop, onTouchEnd: close })
          ) : (
            <Pressable accessibilityRole="button" style={styles.backdrop} onPress={close} />
          )}
          <View
            {...panResponder.panHandlers}
            style={[
              styles.sheet,
              sheetHeight ? { height: sheetHeight } : null,
              maxDynamicContentSize ? { maxHeight: maxDynamicContentSize } : null,
              bottomInset ? { marginBottom: bottomInset } : null,
              backgroundStyle,
            ]}
          >
            <View style={[styles.handle, handleIndicatorStyle]} />
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
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  sheet: {
    maxHeight: "86%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.bgElevated,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 999,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});

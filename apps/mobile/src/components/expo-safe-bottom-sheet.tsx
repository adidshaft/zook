import { forwardRef, useImperativeHandle, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewProps,
  type ViewStyle,
} from "react-native";

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
  snapPoints?: Array<number | string>;
};

export function BottomSheetBackdrop(props: BottomSheetBackdropProps) {
  return <View {...props} />;
}

export const BottomSheetView = View;
export const BottomSheetScrollView = ScrollView;

export const BottomSheetModal = forwardRef<BottomSheetModal, BottomSheetModalProps>(
  function ExpoSafeBottomSheetModal(
    { children, onDismiss, backgroundStyle, handleIndicatorStyle },
    ref,
  ) {
    const [visible, setVisible] = useState(false);

    function close() {
      setVisible(false);
      onDismiss?.();
    }

    useImperativeHandle(ref, () => ({
      present: () => setVisible(true),
      dismiss: close,
    }));

    return (
      <Modal
        animationType="slide"
        transparent
        visible={visible}
        onRequestClose={close}
        onDismiss={onDismiss}
      >
        <View style={styles.root}>
          <Pressable accessibilityRole="button" style={styles.backdrop} onPress={close} />
          <View style={[styles.sheet, backgroundStyle]}>
            <View style={[styles.handle, handleIndicatorStyle]} />
            {children}
          </View>
        </View>
      </Modal>
    );
  },
);

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
    backgroundColor: "#111510",
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

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import {
  Dimensions,
  type ImageSourcePropType,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { normalizeWebUrl } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { spacing, typography } from "@/lib/theme";

const { width } = Dimensions.get("window");

/**
 * Fullscreen, swipeable gym photo viewer. Opens at `initialIndex`, pages
 * horizontally, shows an index counter and a close button.
 */
export function GalleryViewer({
  images,
  sourceForImage,
  initialIndex,
  onClose,
}: {
  images: string[];
  sourceForImage?: (image: string) => ImageSourcePropType | { uri: string } | null;
  initialIndex: number | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(initialIndex ?? 0);
  const visible = initialIndex != null;

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          contentOffset={{ x: (initialIndex ?? 0) * width, y: 0 }}
        >
          {images.map((uri, i) => (
            <View key={`${uri}-${i}`} style={[styles.page, { width }]}>
              <Image
                source={sourceForImage?.(uri) ?? { uri: normalizeWebUrl(uri) }}
                style={styles.image}
                contentFit="contain"
              />
            </View>
          ))}
        </ScrollView>

        <View style={[styles.counter, { top: insets.top + spacing.md }]}>
          <Text style={styles.counterText}>
            {index + 1} / {images.length}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("gallery.closePhotoViewer")}
          onPress={onClose}
          hitSlop={12}
          style={[styles.close, { top: insets.top + spacing.sm }]}
        >
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(6,9,8,0.98)", flex: 1, justifyContent: "center" },
  page: { alignItems: "center", justifyContent: "center" },
  image: { height: "80%", width: "100%" },
  counter: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    position: "absolute",
  },
  counterText: { ...typography.caption, color: "#fff" },
  close: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    padding: 8,
    position: "absolute",
    right: spacing.md,
  },
});

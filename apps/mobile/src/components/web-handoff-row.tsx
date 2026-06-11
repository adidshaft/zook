import * as Clipboard from "expo-clipboard";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { ListRow, PrimaryButton, SecondaryButton } from "@/components/primitives";
import { toWebUrl } from "@/lib/api";
import { spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

export function WebHandoffRow({
  path,
  title,
}: {
  path: string;
  title: string;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const url = useMemo(() => toWebUrl(path), [path]);
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  async function copyLink() {
    await Clipboard.setStringAsync(url);
    showToast({ tone: "success", haptic: "success", message: "Link copied." });
  }

  async function openLink() {
    await Linking.openURL(url);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, manage on web`}
        onPress={() => sheetRef.current?.present()}
      >
        <ListRow
          title={title}
          subtitle="zookfit.in dashboard"
          icon="globe-outline"
          trailing={<Ionicons name="chevron-up-outline" size={18} color={palette.text.tertiary} />}
        />
      </Pressable>
      <BottomSheetModal
        ref={sheetRef}
        backdropComponent={renderBackdrop}
        bottomInset={insets.bottom}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: palette.surface.default }}
        handleIndicatorStyle={{ backgroundColor: palette.border.strong }}
        snapPoints={["CONTENT_HEIGHT"]}
      >
        <BottomSheetView style={styles.sheet}>
          <View style={styles.sheetCopy}>
            <Text style={[styles.sheetTitle, { color: palette.text.primary }]}>{title}</Text>
            <Text selectable style={[styles.url, { color: palette.text.secondary }]}>
              {url}
            </Text>
          </View>
          <View style={styles.actions}>
            <SecondaryButton icon="copy-outline" onPress={() => void copyLink()} style={styles.action}>
              Copy link
            </SecondaryButton>
            <PrimaryButton icon="open-outline" onPress={() => void openLink()} style={styles.action}>
              Open
            </PrimaryButton>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetCopy: {
    gap: 6,
  },
  sheetTitle: {
    ...typography.headerTitle,
  },
  url: {
    ...typography.body,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});

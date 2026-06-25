import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetModal as BottomSheetModalHandle,
} from "@/components/expo-safe-bottom-sheet";
import { ZookButton } from "./buttons";
import { useT } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";

type ConfirmSheetConfig = {
  title: string;
  body?: string;
  destructiveLabel: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
};

export function useConfirmSheet() {
  const { palette } = useTheme();
  const t = useT();
  const sheetRef = useRef<BottomSheetModalHandle>(null);
  const [config, setConfig] = useState<ConfirmSheetConfig | null>(null);

  function dismiss() {
    sheetRef.current?.dismiss();
  }

  function confirm(nextConfig: ConfirmSheetConfig) {
    setConfig(nextConfig);
    requestAnimationFrame(() => sheetRef.current?.present());
  }

  async function runConfirm() {
    const current = config;
    dismiss();
    await current?.onConfirm();
  }

  const sheet = (
    <BottomSheetModal ref={sheetRef} snapPoints={["CONTENT_HEIGHT"]} enablePanDownToClose>
      <BottomSheetView style={styles.sheet}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: palette.text.primary }]}>{config?.title}</Text>
          {config?.body ? (
            <Text style={[styles.body, { color: palette.text.secondary }]}>{config.body}</Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          <ZookButton variant="destructive" onPress={() => void runConfirm()} fullWidth>
            {config?.destructiveLabel ?? t("common.confirm")}
          </ZookButton>
          <ZookButton variant="secondary" onPress={dismiss} fullWidth>
            {config?.cancelLabel ?? t("common.cancel")}
          </ZookButton>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );

  return { confirm, sheet };
}

const styles = StyleSheet.create({
  sheet: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  copy: {
    gap: spacing.sm,
  },
  title: {
    ...typography.headerTitle,
  },
  body: {
    ...typography.body,
  },
  actions: {
    gap: spacing.sm,
  },
});

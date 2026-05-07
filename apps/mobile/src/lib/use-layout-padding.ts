import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout, spacing } from "@/lib/theme";

export function useBottomScrollPadding(opts?: { hasStickyAction?: boolean }): number {
  const insets = useSafeAreaInsets();
  const navHeight = layout.bottomNavHeight;
  const sticky = opts?.hasStickyAction ? layout.stickyActionHeight : 0;
  return navHeight + sticky + Math.max(insets.bottom, 12) + spacing.md;
}

export function useStickyActionOffset(): number {
  return layout.bottomNavHeight + spacing.md;
}

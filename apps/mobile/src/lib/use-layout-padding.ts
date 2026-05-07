import { useContext } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNavVisibilityContext } from "@/components/primitives/bottom-nav-context";
import { layout, spacing } from "@/lib/theme";

export function useBottomScrollPadding(opts?: { hasStickyAction?: boolean }): number {
  const insets = useSafeAreaInsets();
  const { visible: bottomNavVisible } = useContext(BottomNavVisibilityContext);
  const navHeight = bottomNavVisible ? layout.bottomNavHeight : 0;
  const sticky = opts?.hasStickyAction ? layout.stickyActionHeight : 0;
  return navHeight + sticky + Math.max(insets.bottom, 12) + spacing.md;
}

export function useStickyActionOffset(): number {
  const { visible: bottomNavVisible } = useContext(BottomNavVisibilityContext);
  return (bottomNavVisible ? layout.bottomNavHeight : 0) + spacing.md;
}

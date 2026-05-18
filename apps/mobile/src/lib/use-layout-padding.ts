import { useContext } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNavVisibilityContext } from "@/components/primitives/bottom-nav-context";
import { layout, spacing } from "@/lib/theme";

export function useBottomScrollPadding(opts?: { hasStickyAction?: boolean }): number {
  const insets = useSafeAreaInsets();
  const { visible: bottomNavVisible } = useContext(BottomNavVisibilityContext);
  // The member bottom nav has a centered Scan-QR FAB that protrudes above
  // the nav shell. We need to reserve enough scroll padding so the last
  // card doesn't get clipped under the FAB. `bottomNavContentPadding`
  // accounts for shell + FAB protrusion; `bottomNavHeight` is just the
  // shell. Always reserve the larger of the two when the nav is visible.
  const navHeight = bottomNavVisible ? layout.bottomNavContentPadding : 0;
  const sticky = opts?.hasStickyAction ? layout.stickyActionHeight : 0;
  return navHeight + sticky + Math.max(insets.bottom, 12) + spacing.md;
}

export function useStickyActionOffset(): number {
  const insets = useSafeAreaInsets();
  const { visible: bottomNavVisible } = useContext(BottomNavVisibilityContext);
  if (!bottomNavVisible) {
    return spacing.md;
  }
  const bottomInset = Math.max(insets.bottom, 12);
  const floatingNavHeight = Math.max(layout.bottomNavHeight, 92);
  return bottomInset + floatingNavHeight + spacing.md;
}

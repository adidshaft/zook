import { StyleSheet } from "react-native";

import { layout, spacing, typography } from "@/lib/theme";

export const shopStyles = StyleSheet.create({
  scroller: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: layout.contentWidth + layout.screenPadding * 2,
    alignSelf: "center",
    paddingHorizontal: layout.screenPadding,
    paddingTop: 20,
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cartIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerChipStack: {
    alignSelf: "flex-start",
    gap: 6,
  },
  browserReturnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  browserReturnCopy: {
    flex: 1,
    minWidth: 190,
    gap: 4,
  },
  browserReturnTitle: {
    ...typography.cardTitle,
  },
  browserReturnBody: {
    ...typography.body,
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  cartBadgeText: {
    ...typography.navLabel,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 12,
  },
  productCard: {
    flex: 1,
    maxWidth: "48.5%",
    height: 206,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  categoryRail: {
    gap: 8,
    paddingRight: layout.screenPadding,
  },
  categoryChip: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryChipPressed: {
    opacity: 0.84,
  },
  categoryChipActive: {},
  categoryChipText: {
    ...typography.caption,
  },
  categoryChipTextActive: {},
  categoryCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  categoryCountActive: {},
  categoryCountText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    lineHeight: 12,
  },
  categoryCountTextActive: {},
  miniCart: {
    minHeight: 54,
    borderRadius: 999,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  miniCartText: {
    flexShrink: 1,
    minWidth: 0,
    ...typography.button,
  },
  floatingAction: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 35,
  },
  stack: {
    gap: 10,
  },
  stateCardContent: {
    padding: 0,
  },
  productSkeleton: {
    gap: spacing.sm,
    padding: 12,
  },
  skeletonFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cartLineTrailing: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  cartLinePrice: {
    ...typography.caption,
  },
  cartStepper: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  cartStepperButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cartStepperButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  cartStepperDisabled: {
    opacity: 0.35,
  },
  cartQuantity: {
    minWidth: 22,
    textAlign: "center",
    ...typography.caption,
  },
  cardBody: {
    ...typography.body,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalText: {
    ...typography.metric,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionHalf: {
    flex: 1,
    minWidth: 0,
  },
  checkoutContent: {
    gap: 10,
  },
  checkoutTotal: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 4,
  },
  pickupContent: {
    alignItems: "center",
    gap: 10,
  },
  pickupLabel: {
    ...typography.eyebrow,
  },
  pickupCode: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  pickupQrContent: {
    alignItems: "center",
    gap: spacing.md,
  },
  pickupQrTitle: {
    ...typography.cardTitle,
    textAlign: "center",
  },
  pickupQrCode: {
    ...typography.caption,
    fontVariant: ["tabular-nums"],
  },
});

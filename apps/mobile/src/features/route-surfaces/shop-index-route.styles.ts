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
    paddingTop: 8,
    gap: 7,
  },
  noScrollContent: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 8,
  },
  browseHeader: {
    gap: 6,
    marginBottom: 4,
    paddingTop: 18,
  },
  headerBranchSelector: {
    flex: 1,
    minWidth: 190,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
  serviceStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  pickupPill: {
    minHeight: 32,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pickupPillText: {
    ...typography.navLabel,
    fontFamily: "Inter_700Bold",
    flex: 1,
    minWidth: 0,
  },
  activeOrderBanner: {
    minHeight: 42,
    maxWidth: "54%",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  activeOrderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  activeOrderBannerPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  activeOrderTitle: {
    ...typography.navLabel,
    fontFamily: "Inter_700Bold",
    flex: 1,
    minWidth: 0,
  },
  activeOrderMeta: {
    ...typography.navLabel,
    flex: 1,
    minWidth: 0,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 6,
  },
  productCard: {
    flex: 1,
    maxWidth: "48.5%",
    height: 160,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryRail: {
    gap: 4,
    paddingRight: layout.screenPadding,
  },
  categoryScroller: {
    marginVertical: 2,
  },
  quickStatusRail: {
    flexDirection: "row",
    gap: 6,
  },
  quickStatusPill: {
    minHeight: 38,
    flex: 1,
    minWidth: 0,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickStatusPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  quickStatusCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  quickStatusValue: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  quickStatusLabel: {
    ...typography.navLabel,
  },
  categoryChip: {
    minHeight: 32,
    minWidth: 50,
    borderRadius: 999,
    borderWidth: 1,
    paddingLeft: 6,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  categoryIconBubble: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipPressed: {
    opacity: 0.84,
  },
  categoryChipActive: {},
  categoryChipText: {
    maxWidth: 88,
    ...typography.caption,
  },
  miniCart: {
    minHeight: 50,
    borderRadius: 999,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  miniCartReview: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    paddingLeft: 8,
    paddingRight: 10,
  },
  miniCartIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  miniCartCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  miniCartText: {
    flexShrink: 1,
    minWidth: 0,
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  miniCartMeta: {
    flexShrink: 1,
    minWidth: 0,
    ...typography.navLabel,
  },
  miniCartCta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    justifyContent: "center",
    maxWidth: "42%",
    minWidth: 96,
  },
  miniCartPayText: {
    ...typography.button,
    flexShrink: 1,
    minWidth: 0,
  },
  miniCartPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  miniCartDisabled: {
    opacity: 0.62,
  },
  floatingAction: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 35,
  },
  inlineShelfHeader: {
    minHeight: 26,
    paddingTop: 2,
    justifyContent: "center",
  },
  inlineShelfTitle: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
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
  paymentActionStack: {
    gap: spacing.sm,
  },
  paymentMethodContent: {
    gap: spacing.sm,
  },
  paymentMethodTitle: {
    ...typography.cardTitle,
  },
  deskFallbackRow: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  deskFallbackRowPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  deskFallbackIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  deskFallbackCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  deskFallbackTitle: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  deskFallbackBody: {
    ...typography.navLabel,
  },
  paymentDisclosureRow: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  paymentDisclosureText: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
    flex: 1,
    minWidth: 0,
  },
  deskPaymentContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: 10,
  },
  deskPaymentMark: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  checkoutTotal: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 4,
  },
  pickupContent: {
    gap: 10,
  },
  pickupCodeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  pickupCodeCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  pickupLabel: {
    ...typography.eyebrow,
  },
  pickupCode: {
    ...typography.screenTitle,
    fontVariant: ["tabular-nums"],
  },
  copyCodeButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  copyCodeButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  pickupQrContent: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  pickupQrHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  pickupQrTitle: {
    ...typography.bodyStrong,
  },
});

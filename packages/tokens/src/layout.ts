export const layout = {
  mobileWidth: 390,
  mobileHeight: 844,
  screenPadding: 20,
  screenPaddingCompact: 16,
  screenPaddingLargeText: 16,
  contentWidth: 370,
  topSectionGap: 24,
  cardGap: 12,
  cardPadding: 18,
  cardPaddingCompact: 14,
  cardPaddingLargeText: 16,
  formFieldGap: 12,
  sectionGap: 24,
  bottomNavHeight: 72,
  bottomNavContentPadding: 120,
  bottomNavHorizontalMargin: 18,
  stickyActionHeight: 108,
  minTapTarget: 44,
  operationalTapTarget: 48,
  demoStripHeight: 28,
};

export const density = {
  default: {
    screenPadding: layout.screenPadding,
    cardPadding: layout.cardPadding,
    gap: layout.cardGap,
    minTapTarget: layout.minTapTarget,
  },
  compactOperational: {
    screenPadding: layout.screenPaddingCompact,
    cardPadding: layout.cardPaddingCompact,
    gap: 10,
    minTapTarget: layout.operationalTapTarget,
  },
  largeText: {
    screenPadding: layout.screenPaddingLargeText,
    cardPadding: layout.cardPaddingLargeText,
    gap: 14,
    minTapTarget: layout.operationalTapTarget,
  },
} as const;

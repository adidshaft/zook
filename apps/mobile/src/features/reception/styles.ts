import { StyleSheet } from "react-native";

import { layout, spacing, typography } from "@/lib/theme";

export const receptionWorkspaceStyles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 16,
    paddingBottom: layout.bottomNavContentPadding + 80,
  },
  contentNoScroll: {
    flex: 1,
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 16,
    minHeight: 0,
  },
  animatedContentNoScroll: {
    flex: 1,
    minHeight: 0,
  },
  demoScreen: {
    paddingTop: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  deskHeader: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  gymSelector: {
    minHeight: 70,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: 17,
  },
  gymSelectorCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  gymSelectorText: {
    ...typography.sectionTitle,
  },
  headerMeta: {
    ...typography.caption,
  },
  memberContext: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  memberContextCopy: {
    flex: 1,
    gap: 3,
  },
  memberContextTitle: {
    ...typography.cardTitle,
  },
  memberContextBody: {
    ...typography.small,
  },
  clearMemberButton: {
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  clearMemberText: {
    ...typography.caption,
  },
  title: {
    ...typography.screenTitle,
    flexShrink: 1,
  },
  subtitle: {
    ...typography.small,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  metricThird: {
    minWidth: 104,
    flexGrow: 1,
  },
  metricHalf: {
    minWidth: 152,
    flexGrow: 1,
  },
  stack: {
    gap: spacing.md,
  },
  memberListSection: {
    flex: 1,
    minHeight: 0,
  },
  memberList: {
    flex: 1,
    minHeight: 0,
  },
  liveFeed: {
    gap: 8,
  },
  liveFeedItem: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  liveFeedCopy: {
    flex: 1,
    gap: 3,
  },
  queueCard: {
    gap: spacing.md,
  },
  queueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  queueCopy: {
    flex: 1,
    gap: 5,
  },
  queueTitle: {
    ...typography.headerTitle,
  },
  cardBody: {
    ...typography.body,
  },
  auditTrail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  auditText: {
    ...typography.small,
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  suggestionChipPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  suggestionText: {
    ...typography.caption,
  },
  suggestionTextSelected: {},
  formStack: {
    gap: spacing.md,
  },
  paymentModeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  paymentModeTile: {
    minWidth: 76,
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
  },
  paymentModeTilePressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  paymentModeText: {
    fontSize: 11,
    lineHeight: 14,
  },
  paymentModeTextActive: {
    fontFamily: "Inter_600SemiBold",
  },
  fieldGroupLabel: {
    ...typography.eyebrow,
  },
  itemGrid: {
    gap: 8,
  },
  itemPill: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemName: {
    ...typography.bodyStrong,
  },
  itemMeta: {
    marginTop: 3,
    ...typography.small,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionHalf: {
    flex: 1,
  },
  statusText: {
    ...typography.bodyStrong,
  },
  verificationResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  verificationPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  verificationText: {
    flex: 1,
    ...typography.bodyStrong,
  },
  verificationModalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  verificationModalContent: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    gap: spacing.md,
  },
  verificationModalPhoto: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.72)",
  },
  verificationModalPhotoFallback: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  verificationModalEyebrow: {
    ...typography.eyebrow,
    textAlign: "center",
  },
  verificationModalTitle: {
    ...typography.screenTitle,
    textAlign: "center",
  },
  verificationModalName: {
    ...typography.headerTitle,
    textAlign: "center",
  },
  verificationModalDetail: {
    ...typography.body,
    textAlign: "center",
  },
  verificationModalDismiss: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  verificationModalDismissPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  verificationModalDismissText: {
    ...typography.caption,
  },
  rowAmount: {
    ...typography.bodyStrong,
  },
  resultHint: {
    ...typography.small,
  },
  membersToolbar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  membersToolbarChip: {
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  membersToolbarChipPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  membersToolbarText: {
    ...typography.caption,
  },
  membersToolbarTextActive: {},
  paymentPersonRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
  },
  paymentPersonRowPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  paymentMemberCopy: {
    flex: 1,
    gap: 3,
  },
  paymentMemberName: {
    ...typography.bodyStrong,
  },
  paymentMemberMeta: {
    ...typography.small,
  },
  sheetBackground: {
    borderWidth: 1,
  },
  sheetHandle: {},
  decisionSheetContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  sheetTitleCopy: {
    flex: 1,
    gap: 5,
  },
  sheetEyebrow: {
    ...typography.eyebrow,
  },
  sheetTitle: {
    ...typography.headerTitle,
  },
  sheetCloseButton: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  sheetCloseButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  sheetCloseText: {
    ...typography.caption,
  },
});

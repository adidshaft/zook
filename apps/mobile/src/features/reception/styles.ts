import { StyleSheet } from "react-native";

import { layout, spacing, typography } from "@/lib/theme";

const workspaceBottomClearance = layout.bottomNavContentPadding + 128;

export const receptionWorkspaceStyles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: layout.screenContentTopPadding,
    gap: spacing.lg,
    paddingBottom: workspaceBottomClearance,
  },
  contentNoScroll: {
    flex: 1,
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: layout.screenContentTopPadding,
    gap: spacing.lg,
    minHeight: 0,
  },
  animatedContentNoScroll: {
    flex: 1,
    minHeight: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerContextCluster: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    minWidth: 0,
  },
  headerBranchSelector: {
    flex: 1,
    flexShrink: 1,
    minWidth: 190,
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
  verifyCodeCard: {
    gap: spacing.sm,
  },
  verifyActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  verifyPrimaryAction: {
    flex: 1,
  },
  verifyQrButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyQrButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
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
    gap: spacing.sm,
  },
  compactAlertRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  compactAlertCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  compactAlertTitle: {
    ...typography.bodyStrong,
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
    minWidth: 0,
    gap: 5,
  },
  orderMetaChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  orderMetaChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
    minHeight: 24,
    maxWidth: 128,
    paddingHorizontal: 7,
  },
  orderMetaText: {
    ...typography.caption,
    flexShrink: 1,
    minWidth: 0,
  },
  orderHeaderActions: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  orderStatusMark: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  pickupCompleteAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  pickupCompleteActionPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  pickupCompleteActionDisabled: {
    opacity: 0.5,
  },
  queueTitle: {
    ...typography.bodyStrong,
  },
  cardBody: {
    ...typography.small,
  },
  auditTrail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  auditText: {
    ...typography.small,
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
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
    minHeight: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  paymentModeTilePressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  paymentModeText: {
    ...typography.caption,
  },
  paymentModeTextActive: {
    fontFamily: "Inter_600SemiBold",
  },
  fieldGroupLabel: {
    ...typography.eyebrow,
  },
  paymentDetailsRow: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  paymentDetailsRowPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  paymentDetailsCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  paymentDetailsTitle: {
    ...typography.bodyStrong,
  },
  paymentDetailsMeta: {
    ...typography.small,
  },
  itemGrid: {
    gap: 6,
  },
  itemPill: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  itemName: {
    flex: 1,
    ...typography.bodyStrong,
  },
  itemMeta: {
    flexShrink: 0,
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
  paymentMemberActions: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  paymentHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  paymentDuePanel: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  paymentDueCopy: {
    flex: 1,
    gap: 3,
  },
  paymentDueAmount: {
    ...typography.metric,
  },
  paymentDueMember: {
    ...typography.caption,
    flexShrink: 1,
    maxWidth: "42%",
    textAlign: "right",
  },
  paymentChangeMemberAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  paymentChangeMemberActionPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  paymentContextRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
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

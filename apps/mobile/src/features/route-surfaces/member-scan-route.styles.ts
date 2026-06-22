import { StyleSheet } from "react-native";

import { layout, spacing, typography } from "@/lib/theme";

export const scanStyles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 20,
    paddingBottom: layout.bottomNavContentPadding,
    gap: 12,
  },
  validationContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: 12,
  },
  validationItem: {
    minHeight: 28,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  validationText: {
    ...typography.caption,
  },
  cameraCard: {
    minHeight: 430,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
  },
  camera: {
    flex: 1,
  },
  cameraFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  cameraFallbackTitle: {
    ...typography.cardTitle,
  },
  cameraFallbackText: {
    ...typography.small,
  },
  permissionButton: {
    minHeight: 44,
    marginTop: spacing.xs,
  },
  blockedPermissionContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md,
  },
  blockedPermissionCopy: {
    flex: 1,
    gap: 4,
    minWidth: 180,
  },
  permissionRecoveryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    width: "100%",
  },
  permissionRecoveryAction: {
    flex: 1,
    minWidth: 132,
  },
  errorContent: {
    gap: spacing.sm,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    ...typography.small,
  },
  retryButton: {
    minHeight: 40,
  },
  scannerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    minHeight: 34,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  cameraBadgeText: {
    ...typography.caption,
  },
  scanLineRail: {
    width: 248,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  scanLineCore: {
    width: "100%",
    height: 4,
    borderRadius: 999,
    opacity: 0.96,
  },
  helpContent: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  helpCopy: {
    flex: 1,
    gap: 3,
  },
  helpTitle: {
    ...typography.cardTitle,
  },
  helpBody: {
    ...typography.small,
  },
  manualCodeLink: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  linkPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  manualCodeLinkText: {
    ...typography.caption,
  },
  scanHint: {
    textAlign: "center",
    ...typography.small,
  },
  codeContent: {
    padding: 12,
    gap: spacing.sm,
  },
  codeHeader: {
    gap: 4,
  },
  codeTitle: {
    ...typography.cardTitle,
  },
  codeHint: {
    ...typography.small,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  codeInput: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    textAlign: "center",
    ...typography.bodyStrong,
  },
  codePrefixInput: {
    width: 74,
    letterSpacing: 1.4,
  },
  codeDigitsInput: {
    flex: 1,
    letterSpacing: 2,
  },
  codeDivider: {
    ...typography.cardTitle,
  },
  codeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  codeButtonDisabled: {
    opacity: 0.45,
  },
  checkingText: {
    ...typography.small,
  },
  checkingDot: {},
  backToScannerLink: {
    alignSelf: "center",
    minHeight: 44,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
  },
  devLink: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  devLinkText: {
    textDecorationLine: "underline",
    ...typography.caption,
  },
  codeValidationHint: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: 6,
    paddingLeft: 4,
  },
  checkInMomentBackdrop: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  checkInMomentContent: {
    alignItems: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    width: "100%",
  },
  checkInMomentTick: {
    alignItems: "center",
    borderRadius: 999,
    height: 104,
    justifyContent: "center",
    width: 104,
  },
  checkInMomentGym: {
    maxWidth: "86%",
    textAlign: "center",
    ...typography.headerTitle,
  },
  checkInMomentTitle: {
    textAlign: "center",
    ...typography.heroTitle,
  },
});

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/primitives";
import { formatLongDate } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";
import { isAutopayEnabled } from "./helpers";
import type { MembershipRecord } from "./types";

export function AutopayCard({
  autopayBusy,
  autopayStatus,
  onEnable,
  subscription,
  variant = "card",
}: {
  autopayBusy: boolean;
  autopayStatus: string;
  onEnable: (subscription: MembershipRecord) => void;
  subscription: MembershipRecord;
  variant?: "card" | "inline";
}) {
  const { palette } = useTheme();
  const { locale, t } = useI18n();
  const enabled = isAutopayEnabled(subscription.autopay);
  const disabled = autopayBusy || subscription.status !== "ACTIVE";
  const content = (
    <View
      style={[
        styles.autopayContent,
        variant === "inline"
          ? {
              backgroundColor: palette.bg.sunken,
              borderColor: palette.border.subtle,
            }
          : null,
        variant === "inline" ? styles.autopayInlineContent : null,
      ]}
    >
      <View style={styles.autopayHeader}>
        <View
          style={[
            styles.autopayMark,
            {
              backgroundColor: enabled ? palette.surface.accentSoft : palette.bg.sunken,
              borderColor: enabled ? palette.border.focus : palette.border.subtle,
            },
          ]}
        >
          <Ionicons name="repeat-outline" size={15} color={enabled ? palette.accent.base : palette.text.secondary} />
        </View>
        <View style={styles.autopayCopy}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.86}
            style={[styles.autopayTitle, { color: palette.text.primary }]}
          >
            {enabled ? t("member.membership.autopayEnabledTitle") : t("member.membership.autopayPromptTitle")}
          </Text>
          <Text
            numberOfLines={variant === "inline" ? 1 : 2}
            adjustsFontSizeToFit={variant === "inline"}
            minimumFontScale={0.86}
            style={[
              styles.autopayBody,
              variant === "inline" ? styles.autopayBodyInline : null,
              { color: palette.text.secondary },
            ]}
          >
            {enabled
              ? subscription.autopay?.nextChargeAt
                ? t("member.membership.nextRenewalDate", {
                    date: formatLongDate(subscription.autopay.nextChargeAt, undefined, locale),
                  })
                : t("member.membership.recurringRenewalEnabled")
              : t("member.membership.autopayPromptBody")}
          </Text>
          {autopayStatus ? (
            <Text style={[styles.autopayStatus, { color: palette.feedback.info }]}>
              {autopayStatus}
            </Text>
          ) : null}
        </View>
        {enabled ? (
          <View
            accessibilityLabel={t("member.membership.autopayEnabledTitle")}
            style={[
              styles.autopayStatePill,
              {
                backgroundColor: palette.surface.accentSoft,
                borderColor: palette.accent.soft,
              },
            ]}
          >
            <Ionicons name="checkmark-circle-outline" size={15} color={palette.accent.base} />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("member.membership.enableAutopay")}
            accessibilityState={{
              busy: autopayBusy,
              disabled,
            }}
            disabled={disabled}
            onPress={() => onEnable(subscription)}
            style={({ pressed }) => [
              styles.autopayActionButton,
              {
                backgroundColor: palette.accent.fill,
                borderColor: palette.accent.fill,
              },
              pressed ? styles.autopayActionButtonPressed : null,
              disabled ? styles.autopayActionButtonDisabled : null,
            ]}
          >
            {autopayBusy ? (
              <ActivityIndicator size="small" color={palette.text.onAccent} />
            ) : (
              <>
                <Ionicons name="flash-outline" size={16} color={palette.text.onAccent} />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                  style={[styles.autopayActionText, { color: palette.text.onAccent }]}
                >
                  {t("member.membership.autopaySetupAction")}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );

  if (variant === "inline") {
    return content;
  }

  return <Card variant="compact" contentStyle={styles.autopayCardContent}>{content}</Card>;
}

const styles = StyleSheet.create({
  autopayCardContent: {
    padding: 0,
  },
  autopayContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  autopayInlineContent: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  autopayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 42,
  },
  autopayMark: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  autopayCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  autopayTitle: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  autopayBody: {
    ...typography.caption,
    lineHeight: 14,
  },
  autopayBodyInline: {
    lineHeight: 13,
  },
  autopayStatus: {
    ...typography.small,
  },
  autopayActionButton: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
    height: 32,
    justifyContent: "center",
    minWidth: 86,
    maxWidth: 112,
    paddingHorizontal: 8,
  },
  autopayActionButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  autopayActionButtonDisabled: {
    opacity: 0.45,
  },
  autopayStatePill: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  autopayActionText: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
    flexShrink: 1,
  },
});

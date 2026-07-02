import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, IconBubble, SectionHeader, ZookButton } from "@/components/primitives";
import { useGymReviews, useSubmitReview, type GymReview } from "@/lib/domains/gym";
import { gymBrandColor } from "@/lib/gym-brand";
import { useFormatters } from "@/lib/formatting-i18n";
import { useT } from "@/lib/i18n";
import { radii, spacing, typography, useTheme } from "@/lib/theme";

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const { palette } = useTheme();
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= Math.round(value) ? "star" : "star-outline"}
          size={size}
          color={n <= Math.round(value) ? palette.accent.base : palette.text.tertiary}
        />
      ))}
    </View>
  );
}

function ReviewRow({ review }: { review: GymReview }) {
  const { palette } = useTheme();
  const { formatRelativeDate } = useFormatters();
  const brand = gymBrandColor(review.name);
  return (
    <Card variant="compact" contentStyle={styles.reviewRow}>
      <View style={styles.reviewHead}>
        <View style={[styles.avatar, { backgroundColor: brand.soft }]}>
          <Text style={[styles.avatarText, { color: brand.solid }]}>{brand.initial}</Text>
        </View>
        <View style={styles.reviewWho}>
          <Text style={[styles.reviewName, { color: palette.text.primary }]} numberOfLines={1}>{review.name}</Text>
          <Text style={[styles.reviewDate, { color: palette.text.secondary }]}>{formatRelativeDate(review.createdAt)}</Text>
        </View>
        <Stars value={review.rating} />
      </View>
      {review.body ? (
        <Text style={[styles.reviewBody, { color: palette.text.secondary }]}>{review.body}</Text>
      ) : null}
    </Card>
  );
}

export function GymReviews({ orgId }: { orgId?: string | null }) {
  const { palette } = useTheme();
  const t = useT();
  const reviewsQuery = useGymReviews(orgId);
  const submitReview = useSubmitReview(orgId);
  const [composing, setComposing] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");

  const data = reviewsQuery.data;
  if (!orgId || (!reviewsQuery.isLoading && !data)) return null;
  const summary = data?.summary;
  const reviews = data?.reviews ?? [];
  const canReview = Boolean(data?.canReview);
  const myReview = data?.myReview;

  function openCompose() {
    setRating(myReview?.rating ?? 5);
    setBody(myReview?.body ?? "");
    setComposing(true);
  }
  function submit() {
    submitReview.mutate(
      { rating, body: body.trim() },
      { onSuccess: () => setComposing(false) },
    );
  }

  return (
    <>
      <SectionHeader
        eyebrow={t("gymReviews.membersSay")}
        title={t("gymReviews.reviews")}
        action={
          canReview ? (
            <ZookButton size="sm" variant="secondary" icon="create-outline" onPress={openCompose}>
              {myReview ? t("gymReviews.edit") : t("gymReviews.write")}
            </ZookButton>
          ) : undefined
        }
      />

      <Card contentStyle={styles.summaryCard}>
        {summary && summary.count > 0 ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryScore}>
              <Text style={[styles.summaryAvg, { color: palette.text.primary }]}>{summary.average.toFixed(1)}</Text>
              <Stars value={summary.average} size={16} />
              <Text style={[styles.summaryCount, { color: palette.text.secondary }]}>
                {t("gymReviews.reviewsCount", { count: summary.count })}
              </Text>
            </View>
            <View style={styles.breakdown}>
              {[5, 4, 3, 2, 1].map((star) => {
                const n = summary.breakdown[String(star)] ?? 0;
                const pct = summary.count ? n / summary.count : 0;
                return (
                  <View key={star} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownStar, { color: palette.text.secondary }]}>{star}</Text>
                    <View style={[styles.breakdownTrack, { backgroundColor: palette.bg.sunken }]}>
                      <View style={[styles.breakdownFill, { width: `${pct * 100}%`, backgroundColor: palette.accent.base }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.emptyReviews}>
            <IconBubble icon="star-outline" tone="neutral" size={40} />
            <Text style={[styles.emptyTitle, { color: palette.text.primary }]}>{t("gymReviews.empty")}</Text>
            <Text style={[styles.emptyBody, { color: palette.text.secondary }]}>
              {canReview ? t("gymReviews.beFirst") : t("gymReviews.onlyMembers")}
            </Text>
          </View>
        )}
      </Card>

      <View style={styles.stack}>
        {reviews.map((review) => (
          <ReviewRow key={review.id} review={review} />
        ))}
      </View>

      <Modal visible={composing} transparent animationType="slide" onRequestClose={() => setComposing(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: palette.bg.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: palette.bg.elevated, borderColor: palette.border.default }]}>
            <Text style={[styles.modalTitle, { color: palette.text.primary }]}>
              {myReview ? t("gymReviews.editReview") : t("gymReviews.writeReview")}
            </Text>
            <View style={styles.starPicker}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={t("gymReviews.starsAccessibility", { count: n })}
                  onPress={() => setRating(n)}
                  hitSlop={6}
                >
                  <Ionicons name={n <= rating ? "star" : "star-outline"} size={34} color={n <= rating ? palette.accent.base : palette.text.tertiary} />
                </Pressable>
              ))}
            </View>
            <TextInput
              value={body}
              onChangeText={setBody}
              accessibilityLabel={t("gymReviews.sharePlaceholder")}
              placeholder={t("gymReviews.sharePlaceholder")}
              placeholderTextColor={palette.text.tertiary}
              multiline
              style={[styles.input, { backgroundColor: palette.bg.sunken, borderColor: palette.border.default, color: palette.text.primary }]}
            />
            <View style={styles.modalActions}>
              <ZookButton variant="secondary" onPress={() => setComposing(false)} style={styles.modalBtn}>
                {t("gymReviews.cancel")}
              </ZookButton>
              <ZookButton
                onPress={submit}
                busy={submitReview.isPending}
                busyLabel={t("gymReviews.posting")}
                icon="send-outline"
                style={styles.modalBtn}
              >
                {myReview ? t("gymReviews.update") : t("gymReviews.postReview")}
              </ZookButton>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  starsRow: { flexDirection: "row", gap: 2 },
  summaryCard: { gap: spacing.md },
  summaryRow: { flexDirection: "row", gap: spacing.lg },
  summaryScore: { alignItems: "center", gap: 4, minWidth: 96 },
  summaryAvg: { ...typography.display },
  summaryCount: { ...typography.small },
  breakdown: { flex: 1, gap: 6, justifyContent: "center" },
  breakdownRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  breakdownStar: { ...typography.small, width: 10, textAlign: "center" },
  breakdownTrack: { borderRadius: 999, flex: 1, height: 6, overflow: "hidden" },
  breakdownFill: { borderRadius: 999, height: 6 },
  emptyReviews: { alignItems: "center", gap: 6, paddingVertical: spacing.md },
  emptyTitle: { ...typography.cardTitle },
  emptyBody: { ...typography.small, maxWidth: 260, textAlign: "center" },
  stack: { gap: spacing.sm },
  reviewRow: { gap: spacing.sm },
  reviewHead: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  avatar: { alignItems: "center", borderRadius: 999, height: 36, justifyContent: "center", width: 36 },
  avatarText: { ...typography.cardTitle },
  reviewWho: { flex: 1, gap: 1, minWidth: 0 },
  reviewName: { ...typography.bodyStrong },
  reviewDate: { ...typography.small },
  reviewBody: { ...typography.body },
  modalBackdrop: { flex: 1, justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  modalTitle: { ...typography.cardTitle },
  starPicker: { alignSelf: "center", flexDirection: "row", gap: spacing.sm },
  input: { ...typography.body, borderRadius: radii.smallCard, borderWidth: 1, minHeight: 96, padding: spacing.md, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: spacing.sm },
  modalBtn: { flex: 1 },
});

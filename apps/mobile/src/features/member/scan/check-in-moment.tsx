import { useCallback, useEffect, useRef } from "react";
import { Animated as RNAnimated, Modal, Platform, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useT } from "@/lib/i18n";
import { maybeRequestReview } from "@/lib/review-prompt";
import { trackEvent } from "@/lib/analytics";
import { elevation, useTheme } from "@/lib/theme";
import { scanStyles as styles } from "@/features/route-surfaces/member-scan-route.styles";

const CHECK_IN_MOMENT_VISIBLE_MS = 1400;

export function CheckInMoment({
  visible,
  gymName,
  onDone,
}: {
  visible: boolean;
  gymName: string;
  onDone: () => void;
}) {
  const { palette } = useTheme();
  const t = useT();
  const scale = useRef(new RNAnimated.Value(0.82)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const finishMoment = useCallback(() => {
    void maybeRequestReview("checkin");
    void trackEvent("member_checked_in");
    onDone();
  }, [onDone]);

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.82);
      opacity.setValue(0);
      return;
    }
    RNAnimated.parallel([
      RNAnimated.spring(scale, {
        toValue: 1,
        damping: 14,
        stiffness: 180,
        useNativeDriver: true,
      }),
      RNAnimated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
    const timer = setTimeout(finishMoment, CHECK_IN_MOMENT_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [finishMoment, opacity, scale, visible]);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={finishMoment}>
      <View style={[styles.checkInMomentBackdrop, { backgroundColor: palette.bg.overlay }]}>
        <RNAnimated.View style={[styles.checkInMomentContent, { opacity, transform: [{ scale }] }]}>
          <View
            style={[
              styles.checkInMomentTick,
              { backgroundColor: palette.accent.base },
              Platform.OS === "android"
                ? elevation(6, palette.accent.base, {
                    elevation: 6,
                    shadowOpacity: 0.24,
                    shadowRadius: 24,
                    shadowOffset: { width: 0, height: 8 },
                  })
                : {
                    shadowColor: palette.accent.base,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.28,
                    shadowRadius: 24,
                  },
            ]}
          >
            <Ionicons name="checkmark" size={58} color={palette.text.onAccent} />
          </View>
          <Text style={[styles.checkInMomentGym, { color: palette.text.secondary }]} numberOfLines={1}>
            {gymName}
          </Text>
          <Text style={[styles.checkInMomentTitle, { color: palette.text.primary }]}>
            {t("member.scan.checkedIn")}
          </Text>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

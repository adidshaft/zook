import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text } from "react-native";

import { useAuth } from "@/lib/auth";
import { formatInitials } from "@/lib/formatting";
import { typography } from "@/lib/theme";
import { pressWithHaptics } from "./buttons";

const iconOnlyHitSlop = { top: 8, right: 8, bottom: 8, left: 8 };

export function ProfileShortcut({
  size = 44,
  accessibilityLabel = "Open profile",
}: {
  size?: number;
  accessibilityLabel?: string;
}) {
  const { session, status } = useAuth();
  const router = useRouter();

  if (status !== "authenticated") return null;

  const name = session?.user.name ?? "";
  const initials = formatInitials(name);
  const photoUrl = session?.user.profilePhotoUrl?.trim();
  const remotePhotoUrl = photoUrl && /^https?:\/\//.test(photoUrl) ? photoUrl : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => pressWithHaptics(() => router.push("/profile"))}
      hitSlop={iconOnlyHitSlop}
      style={({ pressed }) => [
        styles.profileShortcut,
        { width: size, height: size, borderRadius: size / 2 },
        pressed ? styles.pressed : null,
      ]}
    >
      {remotePhotoUrl ? (
        <Image
          source={{ uri: remotePhotoUrl }}
          placeholder="L6PZfMAR00yXQD%Mt7V@00_4g9-;"
          transition={250}
          style={styles.profileShortcutImage}
          contentFit="cover"
        />
      ) : (
        <Text style={styles.profileShortcutText}>{initials}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileShortcut: {
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.26)",
    backgroundColor: "rgba(185,244,85,0.12)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileShortcutImage: {
    width: "100%",
    height: "100%",
  },
  profileShortcutText: {
    color: "#B9F455",
    ...typography.button,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});

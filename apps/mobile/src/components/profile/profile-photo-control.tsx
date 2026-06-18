import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { toWebUrl } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/auth";
import {
  filesApi,
  memberApi,
  type FileUploadResponse,
  type ProfilePhotoSaveResponse,
} from "@/lib/domain-api";
import { typography, useTheme } from "@/lib/theme";

const maxProfilePhotoBytes = 5 * 1024 * 1024;

type ProfilePhotoSavedPayload = {
  profilePhotoAssetId?: string;
  profilePhotoUrl?: string | null;
  upload?: FileUploadResponse | null;
  profile?: ProfilePhotoSaveResponse | null;
  removed?: boolean;
};

type ProfilePhotoControlProps = {
  token?: string;
  orgId?: string;
  name?: string | null;
  profilePhotoUrl?: string | null;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  onSaved?: (payload: ProfilePhotoSavedPayload) => void | Promise<void>;
  onError?: (error: unknown) => void;
};

type PhotoAction = "camera" | "library" | "remove";

function initialsForName(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "ZK";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function normalizePhotoUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^(file|content|https?):\/\//i.test(trimmed)) return trimmed;
  return toWebUrl(trimmed);
}

function showPrimer(kind: "camera" | "library") {
  const message =
    kind === "camera"
      ? "Zook needs camera access so you can take a profile photo for check-ins and your member profile."
      : "Zook needs photo access so you can choose a profile photo for check-ins and your member profile.";

  return new Promise<boolean>((resolve) => {
    Alert.alert("Add profile photo", message, [
      { text: "Not now", style: "cancel", onPress: () => resolve(false) },
      { text: "Continue", onPress: () => resolve(true) },
    ]);
  });
}

function showSettingsPrompt(kind: "camera" | "library") {
  Alert.alert(
    "Permission needed",
    kind === "camera"
      ? "Camera access is off. Enable it in Settings to take a profile photo."
      : "Photo access is off. Enable it in Settings to choose a profile photo.",
  );
}

function pickAction(canRemove: boolean) {
  return new Promise<PhotoAction | null>((resolve) => {
    const actions: Array<{ label: string; value: PhotoAction }> = [
      { label: "Take photo", value: "camera" },
      { label: "Choose from library", value: "library" },
      ...(canRemove ? [{ label: "Remove", value: "remove" as const }] : []),
    ];

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...actions.map((action) => action.label), "Cancel"],
          cancelButtonIndex: actions.length,
          destructiveButtonIndex: canRemove ? actions.findIndex((action) => action.value === "remove") : undefined,
        },
        (selectedIndex) => resolve(actions[selectedIndex]?.value ?? null),
      );
      return;
    }

    Alert.alert("Profile photo", "Update your profile photo.", [
      ...actions.map((action) => ({
        text: action.label,
        style: action.value === "remove" ? ("destructive" as const) : ("default" as const),
        onPress: () => resolve(action.value),
      })),
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}

function fileNameForAsset(asset: ImagePicker.ImagePickerAsset) {
  return asset.fileName ?? `profile-photo-${Date.now()}.jpg`;
}

function mimeTypeForAsset(asset: ImagePicker.ImagePickerAsset) {
  return asset.mimeType ?? "image/jpeg";
}

function savedPhotoUrl(
  response: ProfilePhotoSaveResponse | null,
  upload: FileUploadResponse | null,
) {
  return (
    response?.user?.profilePhotoUrl ??
    response?.profile?.profilePhotoUrl ??
    response?.file?.url ??
    upload?.deliveryUrl ??
    upload?.file?.url ??
    null
  );
}

export function ProfilePhotoControl({
  token,
  orgId,
  name,
  profilePhotoUrl,
  size = 96,
  disabled = false,
  style,
  onSaved,
  onError,
}: ProfilePhotoControlProps) {
  const { palette } = useTheme();
  const [committedUrl, setCommittedUrl] = useState(profilePhotoUrl ?? null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const initials = useMemo(() => initialsForName(name), [name]);
  const visibleUri = normalizePhotoUrl(previewUri ?? committedUrl);
  const hasPhoto = Boolean(previewUri ?? committedUrl);

  useEffect(() => {
    if (!busy) {
      setCommittedUrl(profilePhotoUrl ?? null);
    }
  }, [busy, profilePhotoUrl]);

  async function requestPermission(kind: "camera" | "library") {
    const canContinue = await showPrimer(kind);
    if (!canContinue) return false;

    const permission =
      kind === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showSettingsPrompt(kind);
      return false;
    }
    return true;
  }

  async function choosePhoto(kind: "camera" | "library") {
    const allowed = await requestPermission(kind);
    if (!allowed) return null;

    const result =
      kind === "camera"
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.86,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            mediaTypes: ["images"],
            quality: 0.86,
          });

    if (result.canceled) return null;
    return result.assets[0] ?? null;
  }

  async function savePickedPhoto(kind: "camera" | "library") {
    if (!token) {
      throw new Error("Sign in again before updating your profile photo.");
    }

    const asset = await choosePhoto(kind);
    if (!asset) return;
    if (asset.fileSize && asset.fileSize > maxProfilePhotoBytes) {
      throw new Error("Choose a photo smaller than 5 MB.");
    }

    const previousUrl = committedUrl;
    setPreviewUri(asset.uri);
    setBusy(true);
    try {
      const upload = await filesApi.uploadProfilePhoto({
        token,
        ...(orgId ? { orgId } : {}),
        file: {
          uri: asset.uri,
          name: fileNameForAsset(asset),
          type: mimeTypeForAsset(asset),
        },
      });
      const profilePhotoAssetId = upload.file?.id;
      if (!profilePhotoAssetId) {
        throw new Error("Photo uploaded, but no file ID was returned.");
      }
      const profile = await memberApi.saveProfilePhotoAsset({
        token,
        ...(orgId ? { orgId } : {}),
        fileAssetId: profilePhotoAssetId,
      });
      const nextUrl = savedPhotoUrl(profile, upload);
      setCommittedUrl(nextUrl);
      setPreviewUri(null);
      await onSaved?.({ profilePhotoAssetId, profilePhotoUrl: nextUrl, upload, profile });
    } catch (error) {
      setCommittedUrl(previousUrl);
      setPreviewUri(null);
      onError?.(error);
      Alert.alert("Photo not saved", getApiErrorMessage(error) || "Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    if (!token) {
      throw new Error("Sign in again before updating your profile photo.");
    }

    const previousUrl = committedUrl;
    setCommittedUrl(null);
    setPreviewUri(null);
    setBusy(true);
    try {
      const profile = await memberApi.removeProfilePhoto({
        token,
        ...(orgId ? { orgId } : {}),
      });
      await onSaved?.({ profilePhotoUrl: null, profile, removed: true });
    } catch (error) {
      setCommittedUrl(previousUrl);
      onError?.(error);
      Alert.alert("Photo not removed", getApiErrorMessage(error) || "Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePress() {
    if (disabled || busy) return;
    const action = await pickAction(hasPhoto);
    try {
      if (action === "camera" || action === "library") {
        await savePickedPhoto(action);
      } else if (action === "remove") {
        await removePhoto();
      }
    } catch (error) {
      onError?.(error);
      Alert.alert("Profile photo", getApiErrorMessage(error) || "Try again in a moment.");
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Update profile photo"
      disabled={disabled || busy}
      onPress={() => void handlePress()}
      style={({ pressed }) => [
        styles.control,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.surface.raised,
          borderColor: palette.border.focus,
          opacity: disabled ? 0.54 : 1,
        },
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      {visibleUri ? (
        <Image source={{ uri: visibleUri }} style={styles.image} contentFit="cover" />
      ) : (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={[
            styles.initials,
            {
              color: palette.text.primary,
              fontSize: Math.max(18, size * 0.26),
            },
          ]}
        >
          {initials}
        </Text>
      )}
      <View
        style={[
          styles.badge,
          {
            backgroundColor: palette.accent.fill,
            borderColor: palette.bg.app,
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={palette.text.onAccent} size="small" />
        ) : (
          <Ionicons name="camera" size={16} color={palette.text.onAccent} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    borderWidth: 1,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
  initials: {
    ...typography.headerTitle,
  },
  badge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.82,
  },
});

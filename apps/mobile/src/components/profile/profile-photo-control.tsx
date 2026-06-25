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
import { normalizeWebUrl } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/auth";
import {
  filesApi,
  memberApi,
  type FileUploadResponse,
  type ProfilePhotoSaveResponse,
} from "@/lib/domain-api";
import { useT, type TranslationKey } from "@/lib/i18n";
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

type Translate = (key: TranslationKey) => string;

function showPrimer(kind: "camera" | "library", t: Translate) {
  const message =
    kind === "camera"
      ? t("member.profilePhoto.cameraPrimer")
      : t("member.profilePhoto.libraryPrimer");

  return new Promise<boolean>((resolve) => {
    Alert.alert(t("member.profilePhoto.addProfilePhoto"), message, [
      { text: t("member.profilePhoto.notNow"), style: "cancel", onPress: () => resolve(false) },
      { text: t("member.profilePhoto.continue"), onPress: () => resolve(true) },
    ]);
  });
}

function showSettingsPrompt(kind: "camera" | "library", t: Translate) {
  Alert.alert(
    t("member.profilePhoto.permissionNeeded"),
    kind === "camera"
      ? t("member.profilePhoto.cameraSettingsPrompt")
      : t("member.profilePhoto.librarySettingsPrompt"),
  );
}

function pickAction(canRemove: boolean, t: Translate) {
  return new Promise<PhotoAction | null>((resolve) => {
    const actions: Array<{ label: string; value: PhotoAction }> = [
      { label: t("member.profilePhoto.takePhoto"), value: "camera" },
      { label: t("member.profilePhoto.chooseFromLibrary"), value: "library" },
      ...(canRemove ? [{ label: t("member.profilePhoto.remove"), value: "remove" as const }] : []),
    ];
    const cancelLabel = t("common.cancel");

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...actions.map((action) => action.label), cancelLabel],
          cancelButtonIndex: actions.length,
          destructiveButtonIndex: canRemove ? actions.findIndex((action) => action.value === "remove") : undefined,
        },
        (selectedIndex) => resolve(actions[selectedIndex]?.value ?? null),
      );
      return;
    }

    Alert.alert(t("member.profilePhoto.profilePhoto"), t("member.profilePhoto.updateProfilePhoto"), [
      ...actions.map((action) => ({
        text: action.label,
        style: action.value === "remove" ? ("destructive" as const) : ("default" as const),
        onPress: () => resolve(action.value),
      })),
      { text: cancelLabel, style: "cancel", onPress: () => resolve(null) },
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
  const t = useT();
  const [committedUrl, setCommittedUrl] = useState(profilePhotoUrl ?? null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const initials = useMemo(() => initialsForName(name), [name]);
  const visibleUri = normalizeWebUrl(previewUri ?? committedUrl, { allowDeviceUri: true });
  const hasPhoto = Boolean(previewUri ?? committedUrl);

  useEffect(() => {
    if (!busy) {
      setCommittedUrl(profilePhotoUrl ?? null);
    }
  }, [busy, profilePhotoUrl]);

  async function requestPermission(kind: "camera" | "library") {
    const canContinue = await showPrimer(kind, t);
    if (!canContinue) return false;

    const permission =
      kind === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showSettingsPrompt(kind, t);
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
      throw new Error(t("member.profilePhoto.signInAgain"));
    }

    const asset = await choosePhoto(kind);
    if (!asset) return;
    if (asset.fileSize && asset.fileSize > maxProfilePhotoBytes) {
      throw new Error(t("member.profilePhoto.photoTooLarge"));
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
        throw new Error(t("member.profilePhoto.noFileId"));
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
      Alert.alert(t("member.profilePhoto.photoNotSaved"), getApiErrorMessage(error) || t("member.profilePhoto.tryAgain"));
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    if (!token) {
      throw new Error(t("member.profilePhoto.signInAgain"));
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
      Alert.alert(t("member.profilePhoto.photoNotRemoved"), getApiErrorMessage(error) || t("member.profilePhoto.tryAgain"));
    } finally {
      setBusy(false);
    }
  }

  async function handlePress() {
    if (disabled || busy) return;
    const action = await pickAction(hasPhoto, t);
    try {
      if (action === "camera" || action === "library") {
        await savePickedPhoto(action);
      } else if (action === "remove") {
        await removePhoto();
      }
    } catch (error) {
      onError?.(error);
      Alert.alert(t("member.profilePhoto.profilePhoto"), getApiErrorMessage(error) || t("member.profilePhoto.tryAgain"));
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("member.profilePhoto.updateProfilePhoto")}
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

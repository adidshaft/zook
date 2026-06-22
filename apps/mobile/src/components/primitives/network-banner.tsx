import { useEffect, useState } from "react";
import { LayoutAnimation, Platform, UIManager } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { OfflineBanner } from "./offline-banner";
import { useT } from "@/lib/i18n";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function NetworkBanner() {
  const t = useT();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const isOffline = state.isConnected === false || state.isInternetReachable === false;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setOffline(isOffline);
    });
  }, []);

  if (!offline) {
    return null;
  }

  return <OfflineBanner>{t("network.offline")}</OfflineBanner>;
}

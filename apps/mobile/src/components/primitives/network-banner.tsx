import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { OfflineBanner } from "./legacy";
import { useT } from "@/lib/i18n";

export function NetworkBanner() {
  const t = useT();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false || state.isInternetReachable === false);
    });
  }, []);

  if (!offline) {
    return null;
  }

  return <OfflineBanner>{t("network.offline")}</OfflineBanner>;
}

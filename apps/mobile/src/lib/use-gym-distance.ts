import * as Location from "expo-location";
import { useEffect, useState } from "react";

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Best-effort distance (km) from the user to a gym. Uses location only if the
 * user has ALREADY granted foreground permission — it never prompts from a
 * gym profile (that would be intrusive). Returns null when unavailable.
 */
export function useGymDistanceKm(lat?: number | null, lng?: number | null) {
  const [km, setKm] = useState<number | null>(null);
  useEffect(() => {
    if (lat == null || lng == null) {
      setKm(null);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (!perm.granted) return;
        const pos =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (!active || !pos) return;
        setKm(haversineKm(pos.coords.latitude, pos.coords.longitude, lat, lng));
      } catch {
        // best effort only
      }
    })();
    return () => {
      active = false;
    };
  }, [lat, lng]);
  return km;
}

export function formatDistanceKm(km: number | null) {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

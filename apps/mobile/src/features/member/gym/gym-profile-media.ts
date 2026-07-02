import type { ImageSourcePropType } from "react-native";

import aarogyaCoverSource from "../../../../../web/public/seed/gyms/aarogya-strength/cover.png";
import aarogyaGallery01Source from "../../../../../web/public/seed/gyms/aarogya-strength/gallery-01.png";
import aarogyaGallery02Source from "../../../../../web/public/seed/gyms/aarogya-strength/gallery-02.png";
import aarogyaGallery03Source from "../../../../../web/public/seed/gyms/aarogya-strength/gallery-03.png";
import aarogyaGallery04Source from "../../../../../web/public/seed/gyms/aarogya-strength/gallery-04.png";
import aarogyaGallery05Source from "../../../../../web/public/seed/gyms/aarogya-strength/gallery-05.png";
import yourFitnessCoverSource from "../../../../../web/public/seed/gyms/your-fitness/cover.png";
import yourFitnessGallery01Source from "../../../../../web/public/seed/gyms/your-fitness/gallery-01.png";
import yourFitnessGallery02Source from "../../../../../web/public/seed/gyms/your-fitness/gallery-02.png";
import yourFitnessGallery03Source from "../../../../../web/public/seed/gyms/your-fitness/gallery-03.png";
import yourFitnessGallery04Source from "../../../../../web/public/seed/gyms/your-fitness/gallery-04.png";
import yourFitnessGallery05Source from "../../../../../web/public/seed/gyms/your-fitness/gallery-05.png";

import { normalizeWebUrl } from "@/lib/api";

const SEEDED_GYM_IMAGE_SOURCES: Record<string, ImageSourcePropType> = {
  "/seed/gyms/aarogya-strength/cover.png": aarogyaCoverSource as ImageSourcePropType,
  "/seed/gyms/aarogya-strength/gallery-01.png": aarogyaGallery01Source as ImageSourcePropType,
  "/seed/gyms/aarogya-strength/gallery-02.png": aarogyaGallery02Source as ImageSourcePropType,
  "/seed/gyms/aarogya-strength/gallery-03.png": aarogyaGallery03Source as ImageSourcePropType,
  "/seed/gyms/aarogya-strength/gallery-04.png": aarogyaGallery04Source as ImageSourcePropType,
  "/seed/gyms/aarogya-strength/gallery-05.png": aarogyaGallery05Source as ImageSourcePropType,
  "/seed/gyms/your-fitness/cover.png": yourFitnessCoverSource as ImageSourcePropType,
  "/seed/gyms/your-fitness/gallery-01.png": yourFitnessGallery01Source as ImageSourcePropType,
  "/seed/gyms/your-fitness/gallery-02.png": yourFitnessGallery02Source as ImageSourcePropType,
  "/seed/gyms/your-fitness/gallery-03.png": yourFitnessGallery03Source as ImageSourcePropType,
  "/seed/gyms/your-fitness/gallery-04.png": yourFitnessGallery04Source as ImageSourcePropType,
  "/seed/gyms/your-fitness/gallery-05.png": yourFitnessGallery05Source as ImageSourcePropType,
};

export function seededGymMedia(username?: string | null) {
  if (username === "aarogya-strength" || username === "your-fitness") {
    const base = `/seed/gyms/${username}`;
    return {
      coverImageUrl: `${base}/cover.png`,
      logoUrl: `${base}/logo.svg`,
      gallery: [
        `${base}/gallery-01.png`,
        `${base}/gallery-02.png`,
        `${base}/gallery-03.png`,
        `${base}/gallery-04.png`,
        `${base}/gallery-05.png`,
      ],
    };
  }
  return { coverImageUrl: null, logoUrl: null, gallery: [] };
}

export function seededGymImageSource(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const matchedPath = Object.keys(SEEDED_GYM_IMAGE_SOURCES).find((path) => trimmed.endsWith(path));
  return matchedPath ? SEEDED_GYM_IMAGE_SOURCES[matchedPath] : null;
}

export function gymImageSource(value?: string | null) {
  const webUrl = normalizeWebUrl(value);
  return seededGymImageSource(value) ?? (webUrl ? { uri: webUrl } : null);
}

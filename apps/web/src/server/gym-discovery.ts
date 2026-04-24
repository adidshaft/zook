import type { MapProvider } from "@zook/core/providers";

export type DiscoveryGym = {
  id: string;
  name: string;
  username: string;
  city: string;
  state: string;
  visibility: string;
  joinMode: string;
  latitude?: number | null;
  longitude?: number | null;
};

export function buildGymDiscoveryResults(input: {
  gyms: DiscoveryGym[];
  query?: string;
  city?: string;
  near?: { latitude: number; longitude: number };
  mapProvider: MapProvider;
}) {
  const query = input.query?.trim().toLowerCase();
  const city = input.city?.trim().toLowerCase();

  return input.gyms
    .filter((gym) => gym.visibility === "PUBLIC")
    .filter((gym) =>
      query ? gym.name.toLowerCase().includes(query) || gym.username.toLowerCase().includes(query) : true
    )
    .filter((gym) => (city ? gym.city.toLowerCase().includes(city) : true))
    .map((gym) => {
      const distanceMeters =
        input.near && gym.latitude !== null && gym.latitude !== undefined && gym.longitude !== null && gym.longitude !== undefined
          ? input.mapProvider.calculateDistanceMeters(input.near, {
              latitude: Number(gym.latitude),
              longitude: Number(gym.longitude)
            })
          : undefined;

      return {
        ...gym,
        ...(distanceMeters !== undefined ? { distanceMeters } : {})
      };
    })
    .sort((left, right) => {
      if (left.distanceMeters !== undefined && right.distanceMeters !== undefined) {
        return left.distanceMeters - right.distanceMeters;
      }
      if (left.distanceMeters !== undefined) {
        return -1;
      }
      if (right.distanceMeters !== undefined) {
        return 1;
      }
      return left.name.localeCompare(right.name);
    });
}

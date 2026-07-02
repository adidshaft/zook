import type { MapProvider } from "@zook/core/providers";

export type DiscoveryGym = {
  id: string;
  name: string;
  username: string;
  address?: string | null;
  city: string;
  state: string;
  pincode?: string | null;
  visibility: string;
  joinMode: string;
  latitude?: number | null;
  longitude?: number | null;
  amenities?: string[];
  coverImageUrl?: string | null;
  logoUrl?: string | null;
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

  const matchesQuery = (gym: DiscoveryGym) => {
    if (!query) {
      return true;
    }
    return [gym.name, gym.username, gym.address, gym.city, gym.state, gym.pincode]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(query));
  };

  return input.gyms
    .filter((gym) => gym.visibility === "PUBLIC")
    .filter(matchesQuery)
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

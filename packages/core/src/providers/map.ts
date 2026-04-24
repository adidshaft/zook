import type { DiagnosticProvider, ProviderInstanceDiagnostics } from "../types";

export interface PlaceResult {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  googlePlaceId?: string;
  originalGoogleMapsUrl?: string;
  locationSource: "MOCK" | "MANUAL" | "GOOGLE_PLACE" | "GOOGLE_MAPS_LINK";
}

export interface LocationBias {
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface MapProvider extends DiagnosticProvider {
  resolveGoogleMapsLink(url: string): Promise<PlaceResult | null>;
  searchPlaces(query: string, locationBias?: string | LocationBias): Promise<PlaceResult[]>;
  geocodeAddress(input: { address: string; city: string; state: string; pincode: string }): Promise<PlaceResult>;
  reverseGeocode(input: { latitude: number; longitude: number }): Promise<PlaceResult>;
  calculateDistanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number;
}

const cityCoordinates: Record<string, { latitude: number; longitude: number; state: string; pincode: string }> = {
  pune: { latitude: 18.5362, longitude: 73.893, state: "Maharashtra", pincode: "411001" },
  bengaluru: { latitude: 12.9719, longitude: 77.6412, state: "Karnataka", pincode: "560038" },
  mumbai: { latitude: 19.076, longitude: 72.8777, state: "Maharashtra", pincode: "400001" },
  delhi: { latitude: 28.6139, longitude: 77.209, state: "Delhi", pincode: "110001" }
};
const defaultCoordinates = cityCoordinates.pune!;

function normalizeLocationBias(locationBias?: string | LocationBias) {
  if (!locationBias) {
    return {};
  }
  return typeof locationBias === "string" ? { city: locationBias } : locationBias;
}

function parseCoordinatesFromGoogleMapsLink(url: string) {
  const decoded = decodeURIComponent(url);
  const atMatch = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(decoded);
  if (atMatch) {
    return { latitude: Number(atMatch[1]), longitude: Number(atMatch[2]) };
  }
  const queryMatch = /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(decoded);
  if (queryMatch) {
    return { latitude: Number(queryMatch[1]), longitude: Number(queryMatch[2]) };
  }
  return null;
}

function haversineMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const latA = toRadians(a.latitude);
  const latB = toRadians(b.latitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(latA) * Math.cos(latB) * sinLng * sinLng;
  return Math.round(2 * earthRadiusMeters * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

export class MockMapProvider implements MapProvider {
  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "mock",
      mode: "mock",
      configured: true,
      metadata: {
        deterministicRegion: "india",
        cityFixtureCount: Object.keys(cityCoordinates).length
      }
    };
  }

  async resolveGoogleMapsLink(url: string): Promise<PlaceResult | null> {
    if (!/^https?:\/\/(maps\.app\.goo\.gl|www\.google\.com\/maps|goo\.gl\/maps)/.test(url)) {
      return null;
    }
    const coordinates = parseCoordinatesFromGoogleMapsLink(url);
    return {
      name: "Mock imported gym location",
      address: "Imported Google Maps location",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      latitude: coordinates?.latitude ?? 18.5362,
      longitude: coordinates?.longitude ?? 73.893,
      googlePlaceId: "mock-place-iron-house",
      originalGoogleMapsUrl: url,
      locationSource: "GOOGLE_MAPS_LINK"
    };
  }

  async searchPlaces(query: string, locationBias?: string | LocationBias): Promise<PlaceResult[]> {
    const { city = "Pune", latitude, longitude } = normalizeLocationBias(locationBias);
    const normalizedCity = city.toLowerCase();
    const coords = cityCoordinates[normalizedCity] ?? defaultCoordinates;
    return [
      {
        name: query || "Mock Gym",
        address: `Mock address in ${city}`,
        city,
        state: coords.state,
        pincode: coords.pincode,
        latitude: latitude ?? coords.latitude,
        longitude: longitude ?? coords.longitude,
        googlePlaceId: `mock-${normalizedCity}`,
        locationSource: "MOCK"
      }
    ];
  }

  async geocodeAddress(input: { address: string; city: string; state: string; pincode: string }): Promise<PlaceResult> {
    const coords = cityCoordinates[input.city.toLowerCase()] ?? defaultCoordinates;
    return {
      name: input.address,
      address: input.address,
      city: input.city,
      state: input.state || coords.state,
      pincode: input.pincode || coords.pincode,
      latitude: coords.latitude,
      longitude: coords.longitude,
      locationSource: "MOCK"
    };
  }

  async reverseGeocode(input: { latitude: number; longitude: number }): Promise<PlaceResult> {
    return {
      name: "Pinned location",
      address: "Manual map pin",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      latitude: input.latitude,
      longitude: input.longitude,
      locationSource: "MANUAL"
    };
  }

  calculateDistanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
    return haversineMeters(a, b);
  }
}

export class GoogleMapProvider implements MapProvider {
  constructor(private readonly apiKey: string) {}

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "google",
      mode: "live",
      configured: Boolean(this.apiKey),
      metadata: {
        supportsSearch: true,
        supportsReverseGeocode: true,
        supportsGoogleMapsLinks: true
      }
    };
  }

  async resolveGoogleMapsLink(url: string): Promise<PlaceResult | null> {
    if (!/^https?:\/\/(maps\.app\.goo\.gl|www\.google\.com\/maps|goo\.gl\/maps)/.test(url)) {
      return null;
    }
    const coordinates = parseCoordinatesFromGoogleMapsLink(url);
    if (!coordinates) {
      return null;
    }
    const result = await this.reverseGeocode(coordinates);
    return {
      ...result,
      originalGoogleMapsUrl: url,
      locationSource: "GOOGLE_MAPS_LINK"
    };
  }

  async searchPlaces(query: string, locationBias?: string | LocationBias): Promise<PlaceResult[]> {
    const { city } = normalizeLocationBias(locationBias);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        `${query}${city ? `, ${city}` : ""}`
      )}&key=${this.apiKey}`
    );
    if (!response.ok) {
      throw new Error(`Google Maps search failed with status ${response.status}`);
    }
    const payload = (await response.json()) as {
      results?: Array<{
        formatted_address?: string;
        address_components?: Array<{ long_name: string; types: string[] }>;
        geometry?: { location?: { lat: number; lng: number } };
        place_id?: string;
      }>;
    };
    return (payload.results ?? []).slice(0, 5).map((result) => this.toPlaceResult(result));
  }

  async geocodeAddress(input: { address: string; city: string; state: string; pincode: string }): Promise<PlaceResult> {
    const results = await this.searchPlaces(input.address, {
      city: `${input.city}, ${input.state}, ${input.pincode}`
    });
    if (!results.length) {
      throw new Error("Google Maps geocode returned no results");
    }
    return results[0]!;
  }

  async reverseGeocode(input: { latitude: number; longitude: number }): Promise<PlaceResult> {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${input.latitude},${input.longitude}&key=${this.apiKey}`
    );
    if (!response.ok) {
      throw new Error(`Google reverse geocode failed with status ${response.status}`);
    }
    const payload = (await response.json()) as {
      results?: Array<{
        formatted_address?: string;
        address_components?: Array<{ long_name: string; types: string[] }>;
        geometry?: { location?: { lat: number; lng: number } };
        place_id?: string;
      }>;
    };
    if (!payload.results?.length) {
      throw new Error("Google reverse geocode returned no results");
    }
    return this.toPlaceResult(payload.results[0]!);
  }

  private toPlaceResult(result: {
    formatted_address?: string;
    address_components?: Array<{ long_name: string; types: string[] }>;
    geometry?: { location?: { lat: number; lng: number } };
    place_id?: string;
  }): PlaceResult {
    const components = result.address_components ?? [];
    const city = components.find((component) => component.types.includes("locality"))?.long_name ?? "Unknown";
    const state =
      components.find((component) => component.types.includes("administrative_area_level_1"))?.long_name ?? "Unknown";
    const pincode = components.find((component) => component.types.includes("postal_code"))?.long_name ?? "";
    return {
      name: result.formatted_address ?? "Google place",
      address: result.formatted_address ?? "Google place",
      city,
      state,
      pincode,
      latitude: result.geometry?.location?.lat ?? 0,
      longitude: result.geometry?.location?.lng ?? 0,
      ...(result.place_id ? { googlePlaceId: result.place_id } : {}),
      locationSource: "GOOGLE_PLACE"
    };
  }

  calculateDistanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
    return haversineMeters(a, b);
  }
}

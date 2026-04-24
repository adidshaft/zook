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

export interface MapProvider {
  resolveGoogleMapsLink(url: string): Promise<PlaceResult | null>;
  searchPlaces(query: string, city?: string): Promise<PlaceResult[]>;
  geocodeAddress(input: { address: string; city: string; state: string; pincode: string }): Promise<PlaceResult>;
  reverseGeocode(input: { latitude: number; longitude: number }): Promise<PlaceResult>;
}

const cityCoordinates: Record<string, { latitude: number; longitude: number; state: string; pincode: string }> = {
  pune: { latitude: 18.5362, longitude: 73.893, state: "Maharashtra", pincode: "411001" },
  bengaluru: { latitude: 12.9719, longitude: 77.6412, state: "Karnataka", pincode: "560038" },
  mumbai: { latitude: 19.076, longitude: 72.8777, state: "Maharashtra", pincode: "400001" },
  delhi: { latitude: 28.6139, longitude: 77.209, state: "Delhi", pincode: "110001" }
};
const defaultCoordinates = cityCoordinates.pune!;

export class MockMapProvider implements MapProvider {
  async resolveGoogleMapsLink(url: string): Promise<PlaceResult | null> {
    if (!/^https?:\/\/(maps\.app\.goo\.gl|www\.google\.com\/maps|goo\.gl\/maps)/.test(url)) {
      return null;
    }
    return {
      name: "Mock imported gym location",
      address: "Imported Google Maps location",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      latitude: 18.5362,
      longitude: 73.893,
      googlePlaceId: "mock-place-iron-house",
      originalGoogleMapsUrl: url,
      locationSource: "GOOGLE_MAPS_LINK"
    };
  }

  async searchPlaces(query: string, city = "Pune"): Promise<PlaceResult[]> {
    const normalizedCity = city.toLowerCase();
    const coords = cityCoordinates[normalizedCity] ?? defaultCoordinates;
    return [
      {
        name: query || "Mock Gym",
        address: `Mock address in ${city}`,
        city,
        state: coords.state,
        pincode: coords.pincode,
        latitude: coords.latitude,
        longitude: coords.longitude,
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
}

export class GoogleMapProvider implements MapProvider {
  constructor(private readonly apiKey: string) {}

  async resolveGoogleMapsLink(url: string): Promise<PlaceResult | null> {
    if (!/^https?:\/\/(maps\.app\.goo\.gl|www\.google\.com\/maps|goo\.gl\/maps)/.test(url)) {
      return null;
    }
    return null;
  }

  async searchPlaces(query: string, city?: string): Promise<PlaceResult[]> {
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
    const results = await this.searchPlaces(input.address, `${input.city}, ${input.state}, ${input.pincode}`);
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
}

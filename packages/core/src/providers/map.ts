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

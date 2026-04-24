import { describe, expect, it } from "vitest";
import { MockMapProvider } from "../providers";

describe("map provider", () => {
  it("calculates distances in meters", () => {
    const provider = new MockMapProvider();
    const distance = provider.calculateDistanceMeters(
      { latitude: 18.5204, longitude: 73.8567 },
      { latitude: 18.5314, longitude: 73.8446 }
    );

    expect(distance).toBeGreaterThan(1000);
    expect(distance).toBeLessThan(3000);
  });

  it("rejects invalid google maps links", async () => {
    const provider = new MockMapProvider();
    await expect(provider.resolveGoogleMapsLink("https://example.com/not-a-map")).resolves.toBeNull();
  });

  it("extracts coordinates from google maps links when available", async () => {
    const provider = new MockMapProvider();
    const place = await provider.resolveGoogleMapsLink("https://www.google.com/maps/@18.5234,73.8567,15z");

    expect(place?.latitude).toBe(18.5234);
    expect(place?.longitude).toBe(73.8567);
    expect(place?.locationSource).toBe("GOOGLE_MAPS_LINK");
  });
});

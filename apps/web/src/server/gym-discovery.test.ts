import { describe, expect, it } from "vitest";
import { MockMapProvider } from "@zook/core/providers";
import { buildGymDiscoveryResults } from "./gym-discovery";

describe("gym discovery", () => {
  it("hides invite-only and hidden gyms from public search", () => {
    const results = buildGymDiscoveryResults({
      gyms: [
        {
          id: "org_public",
          name: "Aarogya Strength",
          username: "aarogya-strength",
          city: "Pune",
          state: "Maharashtra",
          visibility: "PUBLIC",
          joinMode: "OPEN_JOIN",
          latitude: 18.52,
          longitude: 73.85
        },
        {
          id: "org_invite",
          name: "Secret Lab",
          username: "secret-lab",
          city: "Pune",
          state: "Maharashtra",
          visibility: "INVITE_ONLY",
          joinMode: "INVITE_ONLY",
          latitude: 18.53,
          longitude: 73.86
        },
        {
          id: "org_hidden",
          name: "Hidden Floor",
          username: "hidden-floor",
          city: "Pune",
          state: "Maharashtra",
          visibility: "HIDDEN",
          joinMode: "OPEN_JOIN",
          latitude: 18.54,
          longitude: 73.87
        }
      ],
      mapProvider: new MockMapProvider()
    });

    expect(results.map((gym) => gym.id)).toEqual(["org_public"]);
  });

  it("sorts visible gyms by distance when nearby coordinates are present", () => {
    const results = buildGymDiscoveryResults({
      gyms: [
        {
          id: "far",
          name: "Far Gym",
          username: "far-gym",
          city: "Pune",
          state: "Maharashtra",
          visibility: "PUBLIC",
          joinMode: "OPEN_JOIN",
          latitude: 18.65,
          longitude: 73.95
        },
        {
          id: "near",
          name: "Near Gym",
          username: "near-gym",
          city: "Pune",
          state: "Maharashtra",
          visibility: "PUBLIC",
          joinMode: "OPEN_JOIN",
          latitude: 18.52,
          longitude: 73.85
        }
      ],
      near: { latitude: 18.521, longitude: 73.851 },
      mapProvider: new MockMapProvider()
    });

    expect(results[0]?.id).toBe("near");
    expect(results[0]?.distanceMeters).toBeLessThan(results[1]?.distanceMeters ?? Infinity);
  });

  it("matches search queries against city, address, state, and pincode", () => {
    const gyms = [
      {
        id: "pune",
        name: "Aarogya Strength",
        username: "aarogya-strength",
        address: "Koregaon Park Road",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
        visibility: "PUBLIC",
        joinMode: "OPEN_JOIN",
        latitude: 18.52,
        longitude: 73.85
      },
      {
        id: "kanpur",
        name: "Your Fitness",
        username: "your-fitness",
        address: "Civil Lines",
        city: "Kanpur",
        state: "Uttar Pradesh",
        pincode: "208001",
        visibility: "PUBLIC",
        joinMode: "OPEN_JOIN",
        latitude: 26.45,
        longitude: 80.33
      }
    ];

    expect(
      buildGymDiscoveryResults({ gyms, query: "Pune", mapProvider: new MockMapProvider() })
        .map((gym) => gym.id),
    ).toEqual(["pune"]);
    expect(
      buildGymDiscoveryResults({ gyms, query: "411001", mapProvider: new MockMapProvider() })
        .map((gym) => gym.id),
    ).toEqual(["pune"]);
    expect(
      buildGymDiscoveryResults({ gyms, query: "civil", mapProvider: new MockMapProvider() })
        .map((gym) => gym.id),
    ).toEqual(["kanpur"]);
  });
});

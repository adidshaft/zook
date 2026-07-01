import { describe, expect, it } from "vitest";

import { publicGymDisplayIdentity } from "./public-gym-profile";

describe("publicGymDisplayIdentity", () => {
  it("uses the gym name as title and branch locality as subtitle", () => {
    expect(
      publicGymDisplayIdentity({
        address: "Lane 7, Koregaon Park, Pune",
        branchName: "Aarogya Koregaon Park",
        city: "Pune",
        orgName: "Aarogya Strength Club",
        state: "Maharashtra",
      }),
    ).toEqual({
      title: "Aarogya Strength Club",
      subtitle: "Koregaon Park, Pune",
    });
  });

  it("dedupes repeated city/location parts", () => {
    expect(
      publicGymDisplayIdentity({
        address: "Pune, Maharashtra",
        branchName: "Pune",
        city: "Pune",
        orgName: "Zook Fitness",
        state: "Maharashtra",
      }),
    ).toEqual({ title: "Zook Fitness", subtitle: "Pune" });
  });
});

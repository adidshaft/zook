import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cachedJson: vi.fn(async (_key: string, _ttl: number, loader: () => Promise<unknown>) => loader()),
  organizationFindMany: vi.fn(),
}));

vi.mock("@zook/db", () => ({
  prisma: {
    organization: { findMany: mocks.organizationFindMany },
  },
}));

vi.mock("./server-cache", () => ({
  cachedJson: mocks.cachedJson,
}));

vi.mock("./rate-limit", () => ({
  assertRateLimit: vi.fn(),
}));

vi.mock("./api-router/core", () => ({
  computeDiscountPaise: vi.fn(),
  getMapProviderOrThrow: vi.fn(),
  pathMatches: (path: string[], pattern: Array<string | RegExp>) =>
    path.length === pattern.length &&
    pattern.every((segment, index) =>
      typeof segment === "string" ? path[index] === segment : segment.test(path[index] ?? ""),
    ),
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

function request(path: string) {
  return new NextRequest(`https://zook.test/api/${path}`, { method: "GET" });
}

describe("public organization cities", () => {
  it("returns app version gates from public env without requiring auth", async () => {
    vi.stubEnv("MINIMUM_APP_VERSION_IOS", "1.2.3");
    vi.stubEnv("MINIMUM_APP_VERSION_ANDROID", "2.0.0");
    vi.stubEnv("NEXT_PUBLIC_APP_STORE_URL", "https://apps.apple.com/app/zook");
    vi.stubEnv("NEXT_PUBLIC_PLAY_STORE_URL", "https://play.google.com/store/apps/details?id=com.zook.app");
    const { handlePublicOrganizations } = await import("./api-router/public-organizations");

    const response = await handlePublicOrganizations(request("public/app-config"), [
      "public",
      "app-config",
    ]);

    expect(response?.status).toBe(200);
    await expect(response?.json()).resolves.toEqual({
      ok: true,
      data: {
        minimumAppVersion: { ios: "1.2.3", android: "2.0.0" },
        storeUrls: {
          ios: "https://apps.apple.com/app/zook",
          android: "https://play.google.com/store/apps/details?id=com.zook.app",
        },
      },
    });
  });

  it("returns null app version gates when env is unset", async () => {
    vi.stubEnv("MINIMUM_APP_VERSION_IOS", "");
    vi.stubEnv("MINIMUM_APP_VERSION_ANDROID", "");
    vi.stubEnv("NEXT_PUBLIC_APP_STORE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PLAY_STORE_URL", "");
    const { handlePublicOrganizations } = await import("./api-router/public-organizations");

    const response = await handlePublicOrganizations(request("public/app-config"), [
      "public",
      "app-config",
    ]);

    expect(response?.status).toBe(200);
    await expect(response?.json()).resolves.toMatchObject({
      data: {
        minimumAppVersion: { ios: null, android: null },
        storeUrls: { ios: null, android: null },
      },
    });
  });

  it("returns cached distinct public cities for mobile suggestions", async () => {
    mocks.organizationFindMany.mockResolvedValueOnce([
      { city: "Kanpur" },
      { city: "Pune" },
      { city: " " },
    ]);
    const { handlePublicOrganizations } = await import("./api-router/public-organizations");

    const response = await handlePublicOrganizations(request("orgs/public/cities"), [
      "orgs",
      "public",
      "cities",
    ]);

    expect(response?.status).toBe(200);
    await expect(response?.json()).resolves.toEqual({
      ok: true,
      data: { cities: ["Kanpur", "Pune"] },
    });
    expect(mocks.cachedJson).toHaveBeenCalledWith(
      "public-org-cities",
      300,
      expect.any(Function),
    );
    expect(mocks.organizationFindMany).toHaveBeenCalledWith({
      where: { visibility: "PUBLIC", city: { not: "" } },
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
      take: 100,
    });
  });
});

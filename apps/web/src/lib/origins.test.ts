import { afterEach, describe, expect, it } from "vitest";
import { getOrigins, webHostFromHeader } from "./origins";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("origins", () => {
  it("uses local defaults outside production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    delete process.env.NEXT_PUBLIC_WEB_URL;
    delete process.env.NEXT_PUBLIC_DASHBOARD_URL;

    expect(getOrigins()).toEqual({
      public: "http://localhost:3000",
      dashboard: "http://dashboard.localhost:3000",
    });
  });

  it("uses production defaults when production env vars are absent", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_WEB_URL;
    delete process.env.NEXT_PUBLIC_DASHBOARD_URL;

    expect(getOrigins()).toEqual({
      public: "https://zookfit.in",
      dashboard: "https://dashboard.zookfit.in",
    });
  });

  it("normalizes configured origins", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    process.env.NEXT_PUBLIC_WEB_URL = "https://www.zookfit.in/some/path";
    process.env.NEXT_PUBLIC_DASHBOARD_URL = "https://dashboard.zookfit.in/dashboard";

    expect(getOrigins()).toEqual({
      public: "https://www.zookfit.in",
      dashboard: "https://dashboard.zookfit.in",
    });
  });

  it("classifies dashboard hosts from headers", () => {
    const origins = {
      public: "http://localhost:3000",
      dashboard: "http://dashboard.localhost:3000",
    };

    expect(webHostFromHeader("dashboard.localhost:3000", origins)).toBe("dashboard");
    expect(webHostFromHeader("dashboard.zookfit.in", origins)).toBe("dashboard");
    expect(webHostFromHeader("localhost:3000", origins)).toBe("public");
  });
});

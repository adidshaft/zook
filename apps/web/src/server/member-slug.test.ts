import { describe, expect, it } from "vitest";
import { generateMemberSlug, isReservedSlug, isValidSlugFormat } from "./member-slug";

describe("member slug helpers", () => {
  it("generates lowercase URL-safe slugs without confusing characters", () => {
    for (let i = 0; i < 100; i++) {
      const slug = generateMemberSlug();
      expect(slug).toHaveLength(8);
      expect(isValidSlugFormat(slug)).toBe(true);
      expect(/[ilou]/.test(slug)).toBe(false);
    }
  });

  it("validates slug format", () => {
    expect(isValidSlugFormat("abc1")).toBe(true);
    expect(isValidSlugFormat("abc123xyz789")).toBe(true);
    expect(isValidSlugFormat("abc")).toBe(false);
    expect(isValidSlugFormat("ABC123")).toBe(false);
    expect(isValidSlugFormat("abc-123")).toBe(false);
    expect(isValidSlugFormat("a".repeat(21))).toBe(false);
  });

  it("blocks reserved route slugs", () => {
    expect(isReservedSlug("dashboard")).toBe(true);
    expect(isReservedSlug("LOGIN")).toBe(true);
    expect(isReservedSlug("gyms")).toBe(true);
    expect(isReservedSlug("abc123xy")).toBe(false);
  });
});

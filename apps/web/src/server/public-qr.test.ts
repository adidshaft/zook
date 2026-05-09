import { describe, expect, it } from "vitest";
import { buildPublicQrData } from "./public-qr";

describe("public QR route targets", () => {
  it("encodes join, profile, and app targets explicitly", () => {
    expect(buildPublicQrData("https://zook.test", "aarogya-strength", "join")).toBe(
      "https://zook.test/join/aarogya-strength",
    );
    expect(buildPublicQrData("https://zook.test", "aarogya-strength", "app")).toBe(
      "zook://join/aarogya-strength",
    );
    expect(buildPublicQrData("https://zook.test", "aarogya-strength", null)).toBe(
      "https://zook.test/in/aarogya-strength?source=qr",
    );
  });
});

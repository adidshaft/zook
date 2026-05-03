import { describe, expect, it } from "vitest";
import { buildPublicQrData } from "./public-qr";

describe("public QR route targets", () => {
  it("encodes join, profile, and app targets explicitly", () => {
    expect(buildPublicQrData("https://zook.test", "iron-house", "join")).toBe(
      "https://zook.test/join/iron-house",
    );
    expect(buildPublicQrData("https://zook.test", "iron-house", "app")).toBe(
      "zook://join/iron-house",
    );
    expect(buildPublicQrData("https://zook.test", "iron-house", null)).toBe(
      "https://zook.test/in/iron-house?source=qr",
    );
  });
});

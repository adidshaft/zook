import { describe, expect, it } from "vitest";
import { ExpoPushProvider, MockPushProvider } from "../providers";

describe("push providers", () => {
  it("accepts a valid expo push token", async () => {
    const provider = new ExpoPushProvider({
      projectId: "expo-project-id",
      environment: "preview"
    });

    await expect(
      provider.validateToken({ token: "ExponentPushToken[valid-token]" })
    ).resolves.toMatchObject({ valid: true });
  });

  it("rejects malformed expo push tokens", async () => {
    const provider = new ExpoPushProvider({
      projectId: "expo-project-id",
      environment: "preview"
    });

    await expect(provider.validateToken({ token: "not-a-token" })).resolves.toMatchObject({
      valid: false
    });
  });

  it("records mock deliveries", async () => {
    const provider = new MockPushProvider();
    const result = await provider.sendPush({
      token: "mock-token",
      title: "Zook update",
      body: "Your order is ready."
    });

    expect(result.status).toBe("sent");
    expect(provider.deliveries).toHaveLength(1);
  });
});

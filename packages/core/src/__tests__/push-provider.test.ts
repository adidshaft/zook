import { afterEach, describe, expect, it, vi } from "vitest";
import { ExpoPushProvider, MockPushProvider } from "../providers";

describe("push providers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("chunks Expo pushes at the provider request limit", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const messages = JSON.parse(String(init?.body)) as unknown[];
      return new Response(
        JSON.stringify({
          data: messages.map((_, index) => ({ id: `receipt-${fetchMock.mock.calls.length}-${index}`, status: "ok" })),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new ExpoPushProvider({
      projectId: "expo-project-id",
      environment: "preview",
    });
    const result = await provider.sendBatch(
      Array.from({ length: 101 }, (_, index) => ({
        token: `ExponentPushToken[token-${index}]`,
        title: "Zook update",
        body: "Your order is ready.",
      })),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as unknown[];
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as unknown[];
    expect(firstBody).toHaveLength(100);
    expect(secondBody).toHaveLength(1);
    expect(result).toHaveLength(101);
    expect(result.every((entry) => entry.status === "sent")).toBe(true);
  });
});

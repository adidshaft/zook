import { afterEach, describe, expect, it, vi } from "vitest";

import { Msg91SmsProvider } from "../providers/sms";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MSG91 SMS provider", () => {
  it("sends the app-generated OTP through MSG91", async () => {
    const fetchCalls: Array<[string | URL, RequestInit | undefined]> = [];
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      fetchCalls.push([url, init]);
      return new Response("{}", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new Msg91SmsProvider({
      authKey: "auth-key",
      templateId: "template-id",
      senderId: "ZOOKFT",
      apiBaseUrl: "https://control.msg91.com/api/v5/otp",
      otpExpiryMinutes: 5,
    });

    await provider.sendOtp({
      phone: "+91 98765 43210",
      code: "123456",
      expiresAt: new Date("2026-05-09T12:00:00.000Z"),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchCalls[0];
    expect(call).toBeDefined();
    const [url, init] = call!;
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.searchParams.get("template_id")).toBe("template-id");
    expect(parsedUrl.searchParams.get("mobile")).toBe("919876543210");
    expect(parsedUrl.searchParams.get("otp")).toBe("123456");
    expect(parsedUrl.searchParams.get("otp_expiry")).toBe("5");
    expect(parsedUrl.searchParams.get("sender")).toBe("ZOOKFT");
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        "content-type": "application/json",
        authkey: "auth-key",
      },
    });
    expect(JSON.parse(String(init?.body))).toEqual({ otp: "123456" });
  });

  it("reports provider failures as send errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad", { status: 401 })));

    const provider = new Msg91SmsProvider({
      authKey: "auth-key",
      templateId: "template-id",
    });

    await expect(
      provider.sendOtp({
        phone: "9876543210",
        code: "123456",
        expiresAt: new Date(),
      }),
    ).rejects.toThrow("MSG91 OTP failed with 401");
  });
});

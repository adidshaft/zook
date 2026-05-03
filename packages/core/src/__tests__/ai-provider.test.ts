import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAIProvider } from "../providers/ai";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenAIProvider", () => {
  it("requests structured plan JSON and validates the response", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.text.format.type).toBe("json_schema");
      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            title: "Strength Base",
            type: "WORKOUT",
            days: [
              {
                name: "Day 1",
                exercises: [{ name: "Goblet squat", sets: "3", reps: "10" }]
              }
            ]
          })
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAIProvider("sk-test", "gpt-4.1-mini");
    const plan = await provider.generateStructuredPlan({ prompt: "Create a workout plan" });

    expect(plan).toMatchObject({
      title: "Strength Base",
      type: "WORKOUT",
      days: [{ name: "Day 1" }]
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer sk-test" })
      })
    );
  });

  it("generates images server-side instead of returning a prompt URL", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("gpt-image-1");
      expect(body.prompt).toBe("gym workout poster");
      return new Response(JSON.stringify({ data: [{ b64_json: "ZmFrZS1wbmc=" }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAIProvider("sk-test", "gpt-4.1-mini", "gpt-image-1");
    const image = await provider.generateImage({ prompt: "gym workout poster" });

    expect(image.imageUrl).toBe("data:image/png;base64,ZmFrZS1wbmc=");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/images/generations",
      expect.objectContaining({ method: "POST" })
    );
  });
});

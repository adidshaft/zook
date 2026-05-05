import { describe, expect, it } from "vitest";
import { parseApiResponse } from "../api";

describe("api response parsing", () => {
  it("explains non-json responses as API base URL setup issues", async () => {
    const response = new Response("<html>not the api</html>", {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });

    await expect(parseApiResponse(response)).rejects.toMatchObject({
      status: 404,
      code: "NON_JSON_RESPONSE",
      message: expect.stringContaining("/api base URL"),
    });
  });
});

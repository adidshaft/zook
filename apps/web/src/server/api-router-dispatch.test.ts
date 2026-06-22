import { describe, expect, it } from "vitest";
import {
  buildRouteHandlerDispatchMap,
  selectRouteHandlers,
  type RouteHandlerEntry,
} from "./api-router/dispatch";

describe("api route handler dispatch helpers", () => {
  const entries: RouteHandlerEntry<string>[] = [
    { handler: "health", firstSegments: ["health", "ready"] },
    { handler: "auth", firstSegments: ["auth"] },
    { handler: "me-data", firstSegments: ["me"] },
    { handler: "me-plans", firstSegments: ["me"] },
    { handler: "org-membership", firstSegments: ["orgs", "payments"] },
  ];
  const allHandlers = entries.map((entry) => entry.handler);
  const dispatchMap = buildRouteHandlerDispatchMap(entries);

  it("preserves handler order while grouping by first segment", () => {
    expect(dispatchMap.get("me")).toEqual(["me-data", "me-plans"]);
    expect(dispatchMap.get("orgs")).toEqual(["org-membership"]);
  });

  it("returns narrowed handlers for known route prefixes", () => {
    expect(selectRouteHandlers(["health"], allHandlers, dispatchMap)).toEqual(["health"]);
    expect(selectRouteHandlers(["auth", "request-otp"], allHandlers, dispatchMap)).toEqual([
      "auth",
    ]);
    expect(selectRouteHandlers(["me", "plans"], allHandlers, dispatchMap)).toEqual([
      "me-data",
      "me-plans",
    ]);
  });

  it("falls back to the full handler list for empty or unknown prefixes", () => {
    expect(selectRouteHandlers([], allHandlers, dispatchMap)).toEqual(allHandlers);
    expect(selectRouteHandlers(["unknown"], allHandlers, dispatchMap)).toEqual(allHandlers);
  });
});

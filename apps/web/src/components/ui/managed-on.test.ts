import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ManagedOn, managedOnLabel } from "./managed-on";

describe("ManagedOn", () => {
  it("maps surfaces to short labels", () => {
    expect(managedOnLabel("trainer-mobile")).toBe("Trainer app");
    expect(managedOnLabel("desk")).toBe("Managed at Desk");
  });

  it("renders short managed-on guidance", () => {
    const html = renderToStaticMarkup(
      createElement(ManagedOn, {
        surface: "member-mobile",
        children: "Members log workouts in the mobile app.",
      }),
    );

    expect(html).toContain("Member app");
    expect(html).toContain("Members log workouts");
  });
});

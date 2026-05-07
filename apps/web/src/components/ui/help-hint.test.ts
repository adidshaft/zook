import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HelpHint, helpHintLabel } from "./help-hint";

describe("HelpHint", () => {
  it("builds a clear accessible label", () => {
    expect(helpHintLabel("Payment mode")).toBe("Help: Payment mode");
  });

  it("renders a popover trigger, not a bare info badge", () => {
    const html = renderToStaticMarkup(
      createElement(HelpHint, {
        label: "Payment mode",
        children: "UPI settles outside Zook.",
      }),
    );

    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-label="Help: Payment mode"');
  });
});

import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getRadioCardNextIndex, RadioCardGroup } from "./radio-card-group";

describe("RadioCardGroup", () => {
  it("moves focus indexes with arrow keys and home/end", () => {
    expect(getRadioCardNextIndex(0, "ArrowRight", 3)).toBe(1);
    expect(getRadioCardNextIndex(0, "ArrowLeft", 3)).toBe(2);
    expect(getRadioCardNextIndex(1, "Home", 3)).toBe(0);
    expect(getRadioCardNextIndex(1, "End", 3)).toBe(2);
  });

  it("renders radiogroup and checked state semantics", () => {
    const html = renderToStaticMarkup(
      createElement(RadioCardGroup, {
        name: "shape",
        label: "Plan shape",
        value: "duration",
        onChange: vi.fn(),
        options: [
          { value: "hybrid", label: "Hybrid" },
          { value: "duration", label: "Duration" },
        ],
      }),
    );

    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('role="radio"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("Duration");
  });
});

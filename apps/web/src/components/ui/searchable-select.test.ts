import { describe, expect, it } from "vitest";
import {
  filterSearchableOptions,
  getSearchableSelectNextIndex,
  selectedOptionLabels,
} from "./searchable-select";

const options = [
  { value: "a", label: "Aundh", description: "Pune" },
  { value: "b", label: "Bandra", description: "Mumbai" },
  { value: "c", label: "Koregaon Park", description: "Pune" },
];

describe("SearchableSelect helpers", () => {
  it("filters by label and description", () => {
    expect(filterSearchableOptions(options, "pune").map((option) => option.value)).toEqual([
      "a",
      "c",
    ]);
  });

  it("moves active index with keyboard keys", () => {
    expect(getSearchableSelectNextIndex(0, "ArrowDown", 3)).toBe(1);
    expect(getSearchableSelectNextIndex(0, "ArrowUp", 3)).toBe(2);
    expect(getSearchableSelectNextIndex(1, "End", 3)).toBe(2);
  });

  it("returns selected labels in value order", () => {
    expect(selectedOptionLabels(options, ["c", "a"])).toEqual(["Koregaon Park", "Aundh"]);
  });
});

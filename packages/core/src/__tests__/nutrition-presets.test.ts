import { describe, expect, it } from "vitest";
import { indianMealPresets, rollUpMealMacros } from "../nutrition-presets";

describe("nutrition presets", () => {
  it("keeps fast Indian meal presets available for mobile logging", () => {
    expect(indianMealPresets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "roti", calories: 80, carbsG: 16, proteinG: 3 }),
      ]),
    );
  });

  it("rolls up meal log calories and macros", () => {
    expect(
      rollUpMealMacros([
        { calories: 80, proteinG: 3, carbsG: 16, fatsG: 1 },
        { calories: 130, proteinG: 8, carbsG: 18, fatsG: 3 },
      ]),
    ).toEqual({ calories: 210, proteinG: 11, carbsG: 34, fatsG: 4 });
  });
});

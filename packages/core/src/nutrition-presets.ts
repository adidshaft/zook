export type MealPreset = {
  id: string;
  label: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
};

export const indianMealPresets: MealPreset[] = [
  { id: "roti", label: "1 roti", calories: 80, proteinG: 3, carbsG: 16, fatsG: 1 },
  { id: "dal-katori", label: "1 katori dal", calories: 130, proteinG: 8, carbsG: 18, fatsG: 3 },
  { id: "rice-katori", label: "1 katori rice", calories: 170, proteinG: 3, carbsG: 37, fatsG: 0 },
  { id: "paneer-100g", label: "Paneer 100g", calories: 265, proteinG: 18, carbsG: 6, fatsG: 20 },
  { id: "egg", label: "1 boiled egg", calories: 70, proteinG: 6, carbsG: 1, fatsG: 5 },
];

export function rollUpMealMacros(
  meals: Array<{
    calories?: number | null;
    proteinG?: number | null;
    carbsG?: number | null;
    fatsG?: number | null;
  }>,
) {
  const initial = { calories: 0, proteinG: 0, carbsG: 0, fatsG: 0 };
  return meals.reduce<typeof initial>(
    (total, meal) => ({
      calories: total.calories + (meal.calories ?? 0),
      proteinG: total.proteinG + (meal.proteinG ?? 0),
      carbsG: total.carbsG + (meal.carbsG ?? 0),
      fatsG: total.fatsG + (meal.fatsG ?? 0),
    }),
    initial,
  );
}

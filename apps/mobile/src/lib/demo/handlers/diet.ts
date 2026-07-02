function nowIso() {
  return new Date().toISOString();
}

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
}

type DemoMealLog = {
  id: string;
  mealName: string;
  loggedAt: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatsG: number | null;
  notes: string | null;
};

const demoMealLogs: DemoMealLog[] = [
  {
    id: "meal-log-seed-breakfast",
    mealName: "Paneer bhurji + multigrain toast",
    loggedAt: new Date(new Date().setHours(8, 15, 0, 0)).toISOString(),
    calories: 420,
    proteinG: 28,
    carbsG: 38,
    fatsG: 16,
    notes: null,
  },
];

function demoDietPlan() {
  return {
    id: "diet-plan-aarav",
    title: "Muscle Gain · Vegetarian",
    calorieTarget: 2400,
    proteinG: 150,
    carbsG: 260,
    fatsG: 70,
    status: "ACTIVE",
    meals: [
      {
        id: "diet-meal-breakfast",
        name: "Breakfast",
        timeOfDay: "8:00 AM",
        items: ["Paneer bhurji", "Multigrain toast", "Black coffee"],
        calories: 420,
        proteinG: 28,
        carbsG: 38,
        fatsG: 16,
        order: 1,
      },
      {
        id: "diet-meal-midmorning",
        name: "Mid-morning",
        timeOfDay: "11:00 AM",
        items: ["Greek yogurt", "Almonds", "Apple"],
        calories: 240,
        proteinG: 18,
        carbsG: 22,
        fatsG: 10,
        order: 2,
      },
      {
        id: "diet-meal-lunch",
        name: "Lunch",
        timeOfDay: "1:30 PM",
        items: ["Rajma", "Brown rice", "Mixed salad", "Curd"],
        calories: 560,
        proteinG: 24,
        carbsG: 82,
        fatsG: 12,
        order: 3,
      },
      {
        id: "diet-meal-snack",
        name: "Pre-workout",
        timeOfDay: "5:00 PM",
        items: ["Whey protein shake", "Banana"],
        calories: 320,
        proteinG: 30,
        carbsG: 38,
        fatsG: 4,
        order: 4,
      },
      {
        id: "diet-meal-dinner",
        name: "Dinner",
        timeOfDay: "8:30 PM",
        items: ["Tofu stir-fry", "Two rotis", "Sauteed greens"],
        calories: 480,
        proteinG: 32,
        carbsG: 46,
        fatsG: 16,
        order: 5,
      },
    ],
  };
}

let demoOverrideDietPlan: ReturnType<typeof demoDietPlan> | null = null;

function demoCurrentDietPlan() {
  return demoOverrideDietPlan ?? demoDietPlan();
}

function demoCreateClientDietPlan(body: Record<string, unknown>) {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const rawMeals = Array.isArray(body.meals) ? body.meals : [];
  const meals = rawMeals.map((entry, index) => {
    const meal = (entry ?? {}) as Record<string, unknown>;
    return {
      id: `diet-meal-${Date.now()}-${index}`,
      name: String(meal.name ?? `Meal ${index + 1}`),
      timeOfDay: meal.timeOfDay ? String(meal.timeOfDay) : null,
      items: Array.isArray(meal.items) ? (meal.items as string[]) : [],
      calories: toNumber(meal.calories),
      proteinG: toNumber(meal.proteinG),
      carbsG: toNumber(meal.carbsG),
      fatsG: toNumber(meal.fatsG),
      order: index + 1,
    };
  });
  const plan = {
    id: `diet-plan-${Date.now()}`,
    title: String(body.title ?? "Coached diet plan").trim() || "Coached diet plan",
    calorieTarget: toNumber(body.calorieTarget) ?? 2000,
    proteinG: toNumber(body.proteinG) ?? 0,
    carbsG: toNumber(body.carbsG) ?? 0,
    fatsG: toNumber(body.fatsG) ?? 0,
    status: "ACTIVE",
    meals,
  };
  demoOverrideDietPlan = plan as ReturnType<typeof demoDietPlan>;
  return { plan };
}

function demoLogMeal(body: Record<string, unknown>) {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const log: DemoMealLog = {
    id: `meal-log-${Date.now()}`,
    mealName: String(body.mealName ?? "Meal").trim() || "Meal",
    loggedAt: nowIso(),
    calories: toNumber(body.calories),
    proteinG: toNumber(body.proteinG),
    carbsG: toNumber(body.carbsG),
    fatsG: toNumber(body.fatsG),
    notes: body.notes ? String(body.notes) : null,
  };
  demoMealLogs.unshift(log);
  return { log };
}

export function dietDemoResponse(pathname: string, method: string, init: { body?: unknown }) {
  if (pathname === "/me/diet/meal-logs" && method === "POST") {
    return demoLogMeal(demoBody(init));
  }

  if (pathname === "/me/diet") {
    return { plan: demoCurrentDietPlan(), logs: demoMealLogs };
  }

  const clientDietPlanMatch = pathname.match(
    /^\/orgs\/[^/]+\/trainers\/[^/]+\/clients\/([^/]+)\/diet-plans$/,
  );
  if (clientDietPlanMatch) {
    if (method === "POST") {
      return demoCreateClientDietPlan(demoBody(init));
    }
    return { plans: [demoCurrentDietPlan()] };
  }

  return undefined;
}

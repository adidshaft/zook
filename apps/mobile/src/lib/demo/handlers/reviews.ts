function nowIso() {
  return new Date().toISOString();
}

function hoursAgoIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
}

type DemoReview = {
  id: string;
  userId: string;
  name: string;
  rating: number;
  body: string;
  createdAt: string;
};

const demoReviews: DemoReview[] = [
  {
    id: "rev-1",
    userId: "user-riya",
    name: "Ira Shah",
    rating: 5,
    body: "Spotless equipment and the trainers actually correct your form. Best gym in Koregaon Park.",
    createdAt: hoursAgoIso(24 * 9),
  },
  {
    id: "rev-2",
    userId: "user-k1",
    name: "Rohan Mehta",
    rating: 4,
    body: "Great strength section and rarely crowded in the mornings. Wish they had a sauna.",
    createdAt: hoursAgoIso(24 * 21),
  },
  {
    id: "rev-3",
    userId: "user-k2",
    name: "Priya Nair",
    rating: 5,
    body: "The class schedule is fantastic and the app makes check-in effortless.",
    createdAt: hoursAgoIso(24 * 34),
  },
];

function demoReviewSummary() {
  const count = demoReviews.length;
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>;
  let total = 0;
  for (const review of demoReviews) {
    total += review.rating;
    breakdown[review.rating] = (breakdown[review.rating] ?? 0) + 1;
  }
  return {
    average: count ? Math.round((total / count) * 10) / 10 : 0,
    count,
    breakdown,
  };
}

function demoGymReviews() {
  const myReview = demoReviews.find((review) => review.userId === "user-aarav") ?? null;
  return {
    summary: demoReviewSummary(),
    reviews: [...demoReviews].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    canReview: !myReview,
    myReview,
  };
}

function demoSubmitReview(body: Record<string, unknown>) {
  const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
  const text = String(body.body ?? "").trim();
  const existing = demoReviews.find((review) => review.userId === "user-aarav");
  if (existing) {
    existing.rating = rating;
    existing.body = text;
    existing.createdAt = nowIso();
    return { review: existing };
  }
  const review: DemoReview = {
    id: `rev-${Date.now()}`,
    userId: "user-aarav",
    name: "Nisha Menon",
    rating,
    body: text,
    createdAt: nowIso(),
  };
  demoReviews.unshift(review);
  return { review };
}

export function reviewsDemoResponse(pathname: string, method: string, init: { body?: unknown }) {
  if (pathname.match(/^\/orgs\/[^/]+\/reviews$/)) {
    if (method === "POST") {
      return demoSubmitReview(demoBody(init));
    }
    return demoGymReviews();
  }

  return undefined;
}

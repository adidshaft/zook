export function aiDemoResponse(pathname: string) {
  if (pathname === "/ai/generate-plan") {
    return {
      response: {
        sections: [
          { title: "Workout A", body: "Coach-reviewed strength plan draft." },
          { title: "Recovery", body: "Keep effort moderate and review discomfort." },
        ],
      },
      createdPlan: { id: "offline-ai-plan", title: "Local workout draft" },
    };
  }

  if (pathname === "/ai/chat") {
    return {
      answer:
        "Local answer: keep the workout moderate today, hydrate, and ask your trainer to review any pain or fatigue before increasing load.",
      response:
        "Local answer: keep the workout moderate today, hydrate, and ask your trainer to review any pain or fatigue before increasing load.",
      usage: {
        provider: "offline-demo",
        requestType: "CHAT",
        quotaConsumed: 1,
      },
    };
  }

  return undefined;
}

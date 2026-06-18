"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "./dashboard-primitives";
import { ConfirmActionButton } from "./confirm-action-button";
import { GlassCard, Pill } from "./glass-card";
import { ZookButton } from "./zook-button";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { webApiFetch } from "@/lib/api-client";

type DietMeal = {
  id?: string;
  name: string;
  timeOfDay?: string | null;
  items: string[];
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatsG?: number | null;
  order: number;
};

type DietPlan = {
  id: string;
  title: string;
  status: string;
  calorieTarget?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatsG?: number | null;
  updatedAt: string | Date;
  meals: DietMeal[];
};

export function TrainerDietPlansPanel({
  orgId,
  trainerId,
  clientId,
}: {
  orgId: string;
  trainerId: string;
  clientId: string;
}) {
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const path = `/api/orgs/${orgId}/trainers/${trainerId}/clients/${clientId}/diet-plans`;

  const loadPlans = useCallback(async () => {
    try {
      setError("");
      const payload = await webApiFetch<{ plans: DietPlan[] }>(path);
      setPlans(payload.plans);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load diet plans.");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  function planPayload(existing?: DietPlan) {
    const title = window.prompt("Plan title", existing?.title ?? "Nutrition plan")?.trim();
    if (!title) return null;
    const mealName = window.prompt("First meal name", existing?.meals[0]?.name ?? "Breakfast")?.trim();
    if (!mealName) return null;
    const items = window
      .prompt("Meal items, comma separated", existing?.meals[0]?.items.join(", ") ?? "")
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!items?.length) return null;
    const status =
      window.prompt("Status: DRAFT, PUBLISHED, ARCHIVED", existing?.status ?? "DRAFT")?.trim().toUpperCase() ??
      "DRAFT";
    return {
      title,
      memberId: clientId,
      status: ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status) ? status : "DRAFT",
      meals: [
        {
          name: mealName,
          items,
          order: 0,
        },
      ],
    };
  }

  async function createPlan() {
    const body = planPayload();
    if (!body) return;
    await webApiFetch(path, { method: "POST", body });
    setNotice("Diet plan created");
    await loadPlans();
  }

  async function updatePlan(plan: DietPlan) {
    const body = planPayload(plan);
    if (!body) return;
    await webApiFetch(`${path}/${plan.id}`, { method: "PATCH", body });
    setNotice("Diet plan updated");
    await loadPlans();
  }

  async function deletePlan(plan: DietPlan) {
    try {
      setError("");
      await webApiFetch(`${path}/${plan.id}`, { method: "DELETE" });
      setNotice("Diet plan deleted");
      await loadPlans();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete diet plan.");
    }
  }

  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Trainer nutrition"
        title="Client diet plans"
        description="Create, review, publish, edit, and remove diet plans for this client."
        badge={notice ? <Pill tone="lime">{notice}</Pill> : <Pill tone="blue">Web dashboard</Pill>}
        action={
          <ZookButton size="sm" onClick={() => void createPlan()}>
            New diet plan
          </ZookButton>
        }
      />
      <div className="mt-5">
        {error ? (
          <p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        ) : loading ? (
          <p className="text-sm text-white/45">Loading diet plans...</p>
        ) : plans.length ? (
          <DataTable
            columns={[
              {
                id: "title",
                header: "Plan",
                render: (plan) => (
                  <div>
                    <p className="font-medium text-white">{plan.title}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {plan.meals.length} meal{plan.meals.length === 1 ? "" : "s"} · Updated{" "}
                      {formatDateTime(plan.updatedAt)}
                    </p>
                  </div>
                ),
              },
              {
                id: "status",
                header: "Status",
                render: (plan) => <StatusPill value={formatEnumLabel(plan.status)} />,
              },
              {
                id: "meals",
                header: "Meals",
                render: (plan) => plan.meals.map((meal) => meal.name).join(", ") || "None",
              },
              {
                id: "actions",
                header: "Actions",
                align: "right",
                render: (plan) => (
                  <div className="flex flex-wrap justify-end gap-2">
                    <ZookButton size="sm" tone="ghost" onClick={() => void updatePlan(plan)}>
                      Edit
                    </ZookButton>
                    <ConfirmActionButton
                      className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full bg-[var(--surface-danger-soft)] px-4 py-2 text-sm font-semibold text-[var(--feedback-danger)] disabled:cursor-not-allowed disabled:opacity-60"
                      title={`Delete ${plan.title}?`}
                      description="This removes the diet plan from the client record. Published members will no longer see it."
                      confirmLabel="Delete"
                      confirmTone="danger"
                      onConfirm={() => deletePlan(plan)}
                    >
                      Delete
                    </ConfirmActionButton>
                  </div>
                ),
              },
            ]}
            rows={plans}
            rowKey={(plan) => plan.id}
            empty="No diet plans yet."
          />
        ) : (
          <EmptyState
            title="No diet plans yet"
            description="Create a plan to make nutrition visible to this client."
          />
        )}
      </div>
    </GlassCard>
  );
}

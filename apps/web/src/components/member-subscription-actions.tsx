"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { webApiFetch } from "@/lib/api-client";
import { formatInr } from "@/lib/format";

type SwitchablePlan = {
  id: string;
  name: string;
  pricePaise: number;
};

type SubscriptionActionResponse = {
  ok?: boolean;
};

export function MemberSubscriptionActions({
  subscriptionId,
  status,
  availablePlans,
}: {
  subscriptionId: string;
  status: string;
  availablePlans: SwitchablePlan[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"switch" | "pause" | "resume" | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"neutral" | "success" | "danger">("neutral");
  const [switchPlanId, setSwitchPlanId] = useState("");
  const [pauseResumesAt, setPauseResumesAt] = useState("");
  const [pauseReason, setPauseReason] = useState("");

  const canPause = status === "ACTIVE";
  const canResume = status === "PAUSED";
  const switchablePlans = availablePlans.filter((plan) => plan.id);
  const nextPlan = switchablePlans.find((plan) => plan.id === switchPlanId) ?? null;
  const pauseActionLabel = pauseResumesAt ? `Pause until ${pauseResumesAt}` : "Pause membership";

  async function runAction(action: "switch" | "pause" | "resume") {
    if (action === "switch" && !switchPlanId) {
      setStatusTone("danger");
      setStatusMessage("Choose a plan before switching this membership.");
      return;
    }
    const pauseDateIso = pauseResumesAt
      ? new Date(`${pauseResumesAt}T12:00:00`).toISOString()
      : "";
    if (action === "pause" && !pauseDateIso) {
      setStatusTone("danger");
      setStatusMessage("Choose a resume date before pausing this membership.");
      return;
    }
    setBusy(action);
    setStatusMessage("");
    setStatusTone("neutral");
    try {
      await webApiFetch<SubscriptionActionResponse>(
        `/api/me/subscriptions/${subscriptionId}/${action}`,
        {
          method: "POST",
          body: {
            ...(action === "switch" ? { planId: switchPlanId } : {}),
            ...(action === "pause"
              ? { resumesAt: pauseDateIso, reason: pauseReason || undefined }
              : {}),
          },
          feedback: {
            success:
              action === "switch"
                ? "Membership plan switched."
                : action === "pause"
                  ? "Membership paused."
                  : "Membership resumed.",
            error: "Unable to update membership.",
          },
        },
      );
      setStatusTone("success");
      setStatusMessage(
        action === "switch"
          ? "Membership switched to the new plan."
          : action === "pause"
            ? `Membership paused until ${pauseResumesAt}.`
            : "Membership resumed.",
      );
      router.refresh();
    } catch (error) {
      setStatusTone("danger");
      setStatusMessage(error instanceof Error ? error.message : "Unable to update membership.");
    } finally {
      setBusy(null);
    }
  }

  if (!canPause && !canResume && switchablePlans.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-white/35">Manage membership</p>

      {switchablePlans.length > 0 ? (
        <label className="grid gap-1 text-xs text-white/55">
          Switch to plan
          <select
            value={switchPlanId}
            onChange={(event) => setSwitchPlanId(event.target.value)}
            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value="">Choose plan</option>
            {switchablePlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} · {formatInr(plan.pricePaise)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {canPause ? (
        <>
          <label className="grid gap-1 text-xs text-white/55">
            Resume date
            <input
              type="date"
              value={pauseResumesAt}
              min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
              onChange={(event) => setPauseResumesAt(event.target.value)}
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          <textarea
            value={pauseReason}
            onChange={(event) => setPauseReason(event.target.value)}
            maxLength={240}
            placeholder="Pause reason (optional)"
            className="zook-focus min-h-16 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35"
          />
          <p className="text-[11px] text-white/35">{pauseReason.length}/240</p>
        </>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {switchablePlans.length > 0 ? (
          <ConfirmActionButton
            title="Switch membership plan?"
            description={
              nextPlan
                ? `This changes your active membership immediately to ${nextPlan.name} (${formatInr(nextPlan.pricePaise)}).`
                : "Choose a plan before switching this membership."
            }
            confirmLabel="Switch plan"
            onConfirm={() => runAction("switch")}
            disabled={!switchPlanId || Boolean(busy)}
            className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full bg-lime-300 px-4 py-2 text-xs font-semibold text-black transition active:translate-y-px disabled:pointer-events-none disabled:opacity-45"
          >
            {busy === "switch" ? "Switching..." : "Switch plan"}
          </ConfirmActionButton>
        ) : null}
        {canPause ? (
          <ConfirmActionButton
            title="Pause membership?"
            description={
              pauseResumesAt
                ? `Pause this membership until ${pauseResumesAt}. Check-ins stay inactive until the selected resume date.`
                : "Choose a resume date before pausing this membership."
            }
            confirmLabel="Pause membership"
            onConfirm={() => runAction("pause")}
            disabled={Boolean(busy) || !pauseResumesAt}
            className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full border border-white/15 bg-transparent px-4 py-2 text-xs font-semibold text-white/72 transition active:translate-y-px hover:bg-white/8 hover:text-white disabled:pointer-events-none disabled:opacity-45"
          >
            {busy === "pause" ? "Pausing..." : pauseActionLabel}
          </ConfirmActionButton>
        ) : null}
        {canResume ? (
          <ConfirmActionButton
            title="Resume membership?"
            description="Resume this paused membership now and re-enable check-ins immediately."
            confirmLabel="Resume membership"
            onConfirm={() => runAction("resume")}
            disabled={Boolean(busy)}
            className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full border border-white/15 bg-transparent px-4 py-2 text-xs font-semibold text-white/72 transition active:translate-y-px hover:bg-white/8 hover:text-white disabled:pointer-events-none disabled:opacity-45"
          >
            {busy === "resume" ? "Resuming..." : "Resume membership"}
          </ConfirmActionButton>
        ) : null}
      </div>

      {statusMessage ? (
        <p
          className={`text-xs ${
            statusTone === "danger"
              ? "text-red-400"
              : statusTone === "success"
                ? "text-lime-300"
                : "text-white/45"
          }`}
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}

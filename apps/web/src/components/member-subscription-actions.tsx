"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { webApiFetch } from "@/lib/api-client";
import { formatInr } from "@/lib/format";
import type { PublicLocale } from "@/lib/public-i18n";

type SwitchablePlan = {
  id: string;
  name: string;
  pricePaise: number;
};

type SubscriptionActionResponse = {
  ok?: boolean;
};

const actionCopy = {
  en: {
    collapsedTitle: "Membership actions",
    collapsedResumeBody: "Resume this membership when you are ready.",
    collapsedManageBody: "Switch plan or pause membership when needed.",
    manage: "Manage",
    expandedTitle: "Manage membership",
    hide: "Hide",
    switchToPlan: "Switch to plan",
    choosePlan: "Choose plan",
    resumeDate: "Resume date",
    pauseReasonPlaceholder: "Pause reason (optional)",
    pauseUntil: (date: string) => `Pause until ${date}`,
    pauseMembership: "Pause membership",
    switchTitle: "Switch membership plan?",
    switchDescription: (name: string, price: string) =>
      `This changes your active membership immediately to ${name} (${price}).`,
    switchMissingDescription: "Choose a plan before switching this membership.",
    switchConfirm: "Switch plan",
    switchBusy: "Switching...",
    switchIdle: "Switch plan",
    pauseTitle: "Pause membership?",
    pauseDescription: (date: string) =>
      `Pause this membership until ${date}. Check-ins stay inactive until the selected resume date.`,
    pauseMissingDescription: "Choose a resume date before pausing this membership.",
    pauseConfirm: "Pause membership",
    pauseBusy: "Pausing...",
    resumeTitle: "Resume membership?",
    resumeDescription: "Resume this paused membership now and re-enable check-ins immediately.",
    resumeConfirm: "Resume membership",
    resumeBusy: "Resuming...",
    resumeIdle: "Resume membership",
    selectPlanError: "Choose a plan before switching this membership.",
    selectResumeError: "Choose a resume date before pausing this membership.",
    switchSuccessToast: "Membership plan switched.",
    pauseSuccessToast: "Membership paused.",
    resumeSuccessToast: "Membership resumed.",
    updateError: "Unable to update membership.",
    switchedStatus: "Membership switched to the new plan.",
    pausedStatus: (date: string) => `Membership paused until ${date}.`,
    resumedStatus: "Membership resumed.",
  },
  hi: {
    collapsedTitle: "सदस्यता एक्शन",
    collapsedResumeBody: "जब तैयार हों, इस सदस्यता को फिर से शुरू करें.",
    collapsedManageBody: "जरूरत पड़ने पर प्लान बदलें या सदस्यता पॉज़ करें.",
    manage: "मैनेज करें",
    expandedTitle: "सदस्यता मैनेज करें",
    hide: "छुपाएं",
    switchToPlan: "इस प्लान पर बदलें",
    choosePlan: "प्लान चुनें",
    resumeDate: "फिर शुरू होने की तारीख",
    pauseReasonPlaceholder: "पॉज़ करने का कारण (वैकल्पिक)",
    pauseUntil: (date: string) => `${date} तक पॉज़ करें`,
    pauseMembership: "सदस्यता पॉज़ करें",
    switchTitle: "सदस्यता प्लान बदलें?",
    switchDescription: (name: string, price: string) =>
      `आपकी सक्रिय सदस्यता तुरंत ${name} (${price}) पर बदल जाएगी.`,
    switchMissingDescription: "सदस्यता बदलने से पहले प्लान चुनें.",
    switchConfirm: "प्लान बदलें",
    switchBusy: "बदल रहा है...",
    switchIdle: "प्लान बदलें",
    pauseTitle: "सदस्यता पॉज़ करें?",
    pauseDescription: (date: string) =>
      `यह सदस्यता ${date} तक पॉज़ रहेगी. चुनी गई तारीख तक चेक-इन बंद रहेंगे.`,
    pauseMissingDescription: "सदस्यता पॉज़ करने से पहले तारीख चुनें.",
    pauseConfirm: "सदस्यता पॉज़ करें",
    pauseBusy: "पॉज़ हो रहा है...",
    resumeTitle: "सदस्यता फिर शुरू करें?",
    resumeDescription: "इस पॉज़ सदस्यता को अभी फिर शुरू करें और चेक-इन चालू करें.",
    resumeConfirm: "फिर शुरू करें",
    resumeBusy: "शुरू हो रहा है...",
    resumeIdle: "फिर शुरू करें",
    selectPlanError: "सदस्यता बदलने से पहले प्लान चुनें.",
    selectResumeError: "सदस्यता पॉज़ करने से पहले तारीख चुनें.",
    switchSuccessToast: "सदस्यता प्लान बदल गया.",
    pauseSuccessToast: "सदस्यता पॉज़ हो गई.",
    resumeSuccessToast: "सदस्यता फिर शुरू हो गई.",
    updateError: "सदस्यता अपडेट नहीं हो पाई.",
    switchedStatus: "सदस्यता नए प्लान पर बदल गई.",
    pausedStatus: (date: string) => `सदस्यता ${date} तक पॉज़ है.`,
    resumedStatus: "सदस्यता फिर शुरू हो गई.",
  },
} satisfies Record<PublicLocale, Record<string, string | ((...args: string[]) => string)>>;

export function MemberSubscriptionActions({
  subscriptionId,
  status,
  availablePlans,
  locale = "en",
}: {
  subscriptionId: string;
  status: string;
  availablePlans: SwitchablePlan[];
  locale?: PublicLocale;
}) {
  const router = useRouter();
  const t = actionCopy[locale];
  const [busy, setBusy] = useState<"switch" | "pause" | "resume" | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"neutral" | "success" | "danger">("neutral");
  const [switchPlanId, setSwitchPlanId] = useState("");
  const [pauseResumesAt, setPauseResumesAt] = useState("");
  const [pauseReason, setPauseReason] = useState("");
  const [showControls, setShowControls] = useState(false);

  const canPause = status === "ACTIVE";
  const canResume = status === "PAUSED";
  const switchablePlans = availablePlans.filter((plan) => plan.id);
  const nextPlan = switchablePlans.find((plan) => plan.id === switchPlanId) ?? null;
  const pauseActionLabel = pauseResumesAt ? t.pauseUntil(pauseResumesAt) : t.pauseMembership;

  async function runAction(action: "switch" | "pause" | "resume") {
    if (action === "switch" && !switchPlanId) {
      setStatusTone("danger");
      setStatusMessage(t.selectPlanError);
      return;
    }
    const pauseDateIso = pauseResumesAt
      ? new Date(`${pauseResumesAt}T12:00:00`).toISOString()
      : "";
    if (action === "pause" && !pauseDateIso) {
      setStatusTone("danger");
      setStatusMessage(t.selectResumeError);
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
                ? t.switchSuccessToast
                : action === "pause"
                  ? t.pauseSuccessToast
                  : t.resumeSuccessToast,
            error: t.updateError,
          },
        },
      );
      setStatusTone("success");
      setStatusMessage(
        action === "switch"
          ? t.switchedStatus
          : action === "pause"
            ? t.pausedStatus(pauseResumesAt)
            : t.resumedStatus,
      );
      router.refresh();
    } catch (error) {
      setStatusTone("danger");
      setStatusMessage(error instanceof Error ? error.message : t.updateError);
    } finally {
      setBusy(null);
    }
  }

  if (!canPause && !canResume && switchablePlans.length === 0) {
    return null;
  }

  if (!showControls && !statusMessage) {
    return (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-white">{t.collapsedTitle}</p>
          <p className="mt-1 text-xs text-white/42">
            {canResume ? t.collapsedResumeBody : t.collapsedManageBody}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowControls(true)}
          className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/72 transition hover:bg-white/8 hover:text-white"
        >
          {t.manage}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-white/35">{t.expandedTitle}</p>
        <button
          type="button"
          onClick={() => setShowControls(false)}
          className="zook-focus rounded-full px-3 py-1.5 text-xs font-semibold text-white/45 transition hover:bg-white/8 hover:text-white"
        >
          {t.hide}
        </button>
      </div>

      {switchablePlans.length > 0 ? (
        <label className="grid gap-1 text-xs text-white/55">
          {t.switchToPlan}
          <select
            value={switchPlanId}
            onChange={(event) => setSwitchPlanId(event.target.value)}
            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value="">{t.choosePlan}</option>
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
            {t.resumeDate}
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
            placeholder={t.pauseReasonPlaceholder}
            className="zook-focus min-h-16 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35"
          />
          <p className="text-[11px] text-white/35">{pauseReason.length}/240</p>
        </>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {switchablePlans.length > 0 ? (
          <ConfirmActionButton
            title={t.switchTitle}
            description={
              nextPlan
                ? t.switchDescription(nextPlan.name, formatInr(nextPlan.pricePaise))
                : t.switchMissingDescription
            }
            confirmLabel={t.switchConfirm}
            onConfirm={() => runAction("switch")}
            disabled={!switchPlanId || Boolean(busy)}
            className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full bg-lime-300 px-4 py-2 text-xs font-semibold text-black transition active:translate-y-px disabled:pointer-events-none disabled:opacity-45"
          >
            {busy === "switch" ? t.switchBusy : t.switchIdle}
          </ConfirmActionButton>
        ) : null}
        {canPause ? (
          <ConfirmActionButton
            title={t.pauseTitle}
            description={
              pauseResumesAt
                ? t.pauseDescription(pauseResumesAt)
                : t.pauseMissingDescription
            }
            confirmLabel={t.pauseConfirm}
            onConfirm={() => runAction("pause")}
            disabled={Boolean(busy) || !pauseResumesAt}
            className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full border border-white/15 bg-transparent px-4 py-2 text-xs font-semibold text-white/72 transition active:translate-y-px hover:bg-white/8 hover:text-white disabled:pointer-events-none disabled:opacity-45"
          >
            {busy === "pause" ? t.pauseBusy : pauseActionLabel}
          </ConfirmActionButton>
        ) : null}
        {canResume ? (
          <ConfirmActionButton
            title={t.resumeTitle}
            description={t.resumeDescription}
            confirmLabel={t.resumeConfirm}
            onConfirm={() => runAction("resume")}
            disabled={Boolean(busy)}
            className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full border border-white/15 bg-transparent px-4 py-2 text-xs font-semibold text-white/72 transition active:translate-y-px hover:bg-white/8 hover:text-white disabled:pointer-events-none disabled:opacity-45"
          >
            {busy === "resume" ? t.resumeBusy : t.resumeIdle}
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

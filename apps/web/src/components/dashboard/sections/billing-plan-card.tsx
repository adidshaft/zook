import { formatEnumLabel, formatInr, formatUsageLimit } from "@/lib/format";
import { GlassCard, Pill } from "../../glass-card";
import { useT } from "@/lib/use-t";
type BillingTier = "STARTER" | "GROWTH" | "PRO";
type BillingCycle = "MONTHLY" | "YEARLY";

export function BillingPlanCard({
  autopayReady,
  billingCycle,
  firstChargeLabel,
  mandateBusy,
  selectedPlanCycleLabel,
  selectedPlanMemberLimit,
  selectedPlanPrice,
  selectedTier,
  onBillingCycleChange,
  onSelectedTierChange,
  onSetupBillingMandate,
}: {
  autopayReady: boolean;
  billingCycle: BillingCycle;
  firstChargeLabel: string;
  mandateBusy: boolean;
  selectedPlanCycleLabel: string;
  selectedPlanMemberLimit: number | null;
  selectedPlanPrice: number;
  selectedTier: BillingTier;
  onBillingCycleChange: (cycle: BillingCycle) => void;
  onSelectedTierChange: (tier: BillingTier) => void;
  onSetupBillingMandate: () => void;
}) {
  const t = useT("billing");
  return (
    <GlassCard id="billing-autopay" className="xl:col-span-2">
      <div className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
        <div className="min-w-0">
          <Pill tone={autopayReady ? "lime" : "amber"}>
            {autopayReady ? t("autopayActive") : t("autopayNeeded")}
          </Pill>
          <h2 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
            {autopayReady ? t("billingPlanReady") : t("trialBillingTitle")}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
            {autopayReady
              ? t("mandateActiveDescription")
              : t("autopaySetupDescription")}
          </p>
          <div className="mt-4 grid gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                {t("firstCharge")}
              </p>
              <p className="mt-1 font-semibold text-[var(--text-primary)]">{firstChargeLabel}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                {t("selectedLimit")}
              </p>
              <p className="mt-1 font-semibold text-[var(--text-primary)]">
                {t("memberLimit", {
                  limit: formatUsageLimit(selectedPlanMemberLimit, { unlimitedLabel: t("unlimited") }),
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-sunken)] p-3">
          <div className="grid grid-cols-3 gap-1.5">
            {(["STARTER", "GROWTH", "PRO"] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => onSelectedTierChange(tier)}
                className={`zook-focus min-h-10 rounded-xl border px-2 text-xs font-semibold transition ${
                  selectedTier === tier
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                    : "border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]"
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {(["MONTHLY", "YEARLY"] as const).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => onBillingCycleChange(cycle)}
                className={`zook-focus min-h-10 rounded-xl border px-3 text-xs font-semibold transition ${
                  billingCycle === cycle
                    ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg)]"
                    : "border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]"
                }`}
              >
                {cycle === "MONTHLY" ? t("monthly") : t("yearly")}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3">
            <div>
              <p className="text-xs font-medium text-[var(--text-tertiary)]">{t("selectedPlan")}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                {formatEnumLabel(selectedTier)} &middot; {billingCycle === "YEARLY" ? t("yearly") : t("monthly")}
              </p>
            </div>
            <p className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              {formatInr(selectedPlanPrice)}
              <span className="ml-1 text-sm font-medium text-[var(--text-tertiary)]">
                {selectedPlanCycleLabel}
              </span>
            </p>
          </div>
          <button
            type="button"
            aria-label={autopayReady ? t("updateBillingPlan") : t("setUpAutopay")}
            disabled={mandateBusy}
            onClick={onSetupBillingMandate}
            className="zook-focus mt-3 min-h-12 w-full rounded-full bg-[var(--text-primary)] px-5 text-sm font-semibold text-[var(--bg)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
          >
            {mandateBusy ? t("openingAutopay") : autopayReady ? t("updatePlan") : t("setUpAutopay")}
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

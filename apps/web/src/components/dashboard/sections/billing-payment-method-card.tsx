import { formatDate, formatEnumLabel, formatInr } from "@/lib/format";
import { ConfirmActionButton } from "../../confirm-action-button";
import { GlassCard, Pill } from "../../glass-card";
import type { SubscriptionDetail } from "./billing-section-types";
import { useT } from "@/lib/use-t";

export function BillingPaymentMethodCard({
  mandateBusy,
  subscription,
  onCancelAtPeriodEnd,
}: {
  mandateBusy: boolean;
  subscription: SubscriptionDetail;
  onCancelAtPeriodEnd: () => void;
}) {
  const t = useT("billing");
  if (!subscription.mandate) {
    return null;
  }

  return (
    <GlassCard className="xl:col-span-2">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Pill
            tone={
              subscription.mandate.status === "ACTIVE"
                ? "lime"
                : subscription.mandate.status === "CANCELLED"
                  ? "amber"
                  : "neutral"
            }
          >
            {t("autopayStatus", { status: formatEnumLabel(subscription.mandate.status || "") })}
          </Pill>
          <h2 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
            {t("activeSubscription")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            {t("activeSubscriptionDescription", {
              tier: formatEnumLabel(subscription.subscription.tier),
              amount: formatInr(subscription.mandate.amountPaise),
              period: subscription.mandate.billingPeriod,
              provider: formatEnumLabel(subscription.mandate.provider || ""),
            })}
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                {t("nextCharge")}
              </dt>
              <dd className="font-medium text-[var(--text-primary)]">
                {subscription.mandate.nextChargeAt
                  ? formatDate(subscription.mandate.nextChargeAt)
                  : t("pendingActivation")}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                {t("cyclesPaid")}
              </dt>
              <dd className="font-medium text-[var(--text-primary)]">
                {subscription.mandate.paidCount} of {subscription.mandate.totalCount}
              </dd>
            </div>
          </dl>
        </div>
        {subscription.mandate.checkoutUrl &&
        subscription.mandate.status !== "ACTIVE" &&
        subscription.mandate.status !== "CANCELLED" ? (
          <a
            href={subscription.mandate.checkoutUrl}
            className="zook-focus rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--bg)]"
          >
                {t("completeBilling")}
          </a>
        ) : null}
        {subscription.subscription.status === "ACTIVE" &&
        !subscription.subscription.cancelAtPeriodEnd ? (
          <ConfirmActionButton
            type="button"
            disabled={mandateBusy}
            className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-sunken)] disabled:cursor-wait disabled:opacity-60"
            title={t("cancelAfterPeriodTitle")}
            description={t("cancelAfterPeriodDescription")}
            confirmLabel={t("cancelAfterPeriod")}
            confirmTone="danger"
            onConfirm={onCancelAtPeriodEnd}
          >
            {mandateBusy ? t("cancelling") : t("cancelAfterPeriod")}
          </ConfirmActionButton>
        ) : null}
      </div>
    </GlassCard>
  );
}

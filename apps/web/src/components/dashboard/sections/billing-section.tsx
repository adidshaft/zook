"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDate, formatEnumLabel, formatInr } from "@/lib/format";
import { webApiFetch } from "@/lib/api-client";
import { GlassCard } from "../../glass-card";
import { ZookButton } from "../../zook-button";
import type { OrganizationSnapshot, OrganizationSummary } from "@/components/dashboard/types";
import { BillingInvoiceList } from "./billing-invoice-list";
import { BillingPaymentMethodCard } from "./billing-payment-method-card";
import { BillingPlanCard } from "./billing-plan-card";
import { BillingProfileCard } from "./billing-profile-card";
import { BillingSetupCard } from "./billing-setup-card";
import { BillingUsageLimitsCard } from "./billing-usage-limits-card";
import type { BillingProfile, InvoiceRow, SubscriptionDetail } from "./billing-section-types";
import { useT } from "@/lib/use-t";

type BillingMandateResponse = {
  checkoutUrl?: string | null;
  subscription?: SubscriptionDetail["subscription"];
  mandate: {
    id: string;
    status: string;
    nextChargeAt?: string | Date | null;
  };
};

export function BillingSection({
  orgId,
  organization,
  summary,
}: {
  orgId: string;
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
}) {
  const t = useT("billing");
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [mandateBusy, setMandateBusy] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [status, setStatus] = useState("");
  const [selectedTier, setSelectedTier] = useState<"STARTER" | "GROWTH" | "PRO">("STARTER");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const billingProfileReady = Boolean(profile?.receiptReady);
  const invoiceProfileReady = Boolean(profile?.invoiceReady);
  const autopayReady = subscription?.mandate?.status === "ACTIVE";
  const missingReceiptFields = profile?.receiptMissing ?? [];
  const missingInvoiceFields = profile?.invoiceMissing ?? [];
  const nextInvoiceStepHref = !billingProfileReady
    ? "#billing-details"
    : !invoiceProfileReady
      ? "#billing-details"
      : !autopayReady
        ? "#billing-autopay"
        : "/dashboard/payments";
  const nextInvoiceStepLabel = !billingProfileReady
    ? t("completeReceiptDetails")
    : !invoiceProfileReady
      ? t("completeGstDetails")
      : !autopayReady
        ? t("setUpAutopay")
        : t("goToPayments");
  const setupSteps = [
    {
      label: t("billingProfile"),
      body: billingProfileReady
        ? t("billingProfileReadyBody")
        : t("billingProfileMissingBody"),
      ready: billingProfileReady,
      href: "#billing-details",
    },
    {
      label: t("gstInvoices"),
      body: invoiceProfileReady
        ? t("gstInvoicesReadyBody")
        : t("gstInvoicesMissingBody"),
      ready: invoiceProfileReady,
      href: "#billing-details",
    },
    {
      label: t("autopay"),
      body: autopayReady
        ? t("autopayReadyBody")
        : t("autopayMissingBody"),
      ready: autopayReady,
      href: "#billing-autopay",
    },
  ];
  const selectedPlanPrice =
    billingCycle === "YEARLY"
      ? (subscription?.pricing[selectedTier].yearly ?? 0)
      : (subscription?.pricing[selectedTier].monthly ?? 0);
  const selectedPlanMemberLimit = subscription?.pricing[selectedTier].memberLimit ?? null;
  const selectedPlanCycleLabel = billingCycle === "YEARLY" ? t("perYear") : t("perMonth");
  const firstChargeLabel = organization.trialEndAt ? formatDate(organization.trialEndAt) : t("afterTrial");

  useEffect(() => {
    const requestedTier = searchParams.get("tier")?.trim().toUpperCase();
    if (requestedTier === "STARTER" || requestedTier === "GROWTH" || requestedTier === "PRO") {
      setSelectedTier(requestedTier);
    }
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      webApiFetch<{ billingProfile: BillingProfile }>(`/api/orgs/${orgId}/billing-profile`),
      webApiFetch<{ invoices: InvoiceRow[] }>(`/api/orgs/${orgId}/invoices`),
      webApiFetch<SubscriptionDetail>(`/api/orgs/${orgId}/billing/subscription`),
    ])
      .then(([profilePayload, invoicePayload, subscriptionPayload]) => {
        if (!mounted) return;
        setProfile(profilePayload.billingProfile);
        setInvoices(invoicePayload.invoices);
        setSubscription(subscriptionPayload);
      })
      .catch((cause) => {
        if (!mounted) return;
        setStatus(cause instanceof Error ? cause.message : t("unableLoadBillingDetails"));
      });
    return () => {
      mounted = false;
    };
  }, [orgId, t]);

  async function copyReferralCode() {
    const code = subscription?.platformReferral?.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus(t("referralCodeCopied"));
      window.setTimeout(() => setCopyStatus(""), 4000);
    } catch {
      setCopyStatus(t("couldNotCopyReferral"));
    }
  }

  async function saveBillingProfile() {
    if (!profile) return;
    try {
      setBusy(true);
      setStatus("");
      const payload = await webApiFetch<{ billingProfile: BillingProfile }>(
        `/api/orgs/${orgId}/billing-profile`,
        {
          method: "PATCH",
          body: {
            legalName: profile.legalName,
            gstNumber: profile.gstNumber,
            contactEmail: profile.billingEmail || profile.contactEmail,
            contactPhone: profile.contactPhone,
            address: profile.address,
            city: profile.city,
            state: profile.state,
            pincode: profile.pincode,
          },
          feedback: { success: t("billingDetailsSavedShort") },
        },
      );
      setProfile(payload.billingProfile);
      setStatus(t("billingDetailsSaved"));
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : t("unableSaveBillingDetails"));
    } finally {
      setBusy(false);
    }
  }

  async function setupBillingMandate() {
    try {
      setMandateBusy(true);
      setStatus("");
      const payload = await webApiFetch<BillingMandateResponse>(
        `/api/orgs/${orgId}/saas-subscription/upgrade`,
        {
          method: "POST",
          body: { tier: selectedTier, billingCycle },
          feedback: { success: t("billingStarted") },
        },
      );
      if (payload.checkoutUrl) {
        window.location.assign(payload.checkoutUrl);
        return;
      }
      setStatus(t("billingMandateStatus", { status: formatEnumLabel(payload.mandate.status) }));
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : t("unableStartBilling"));
    } finally {
      setMandateBusy(false);
    }
  }

  async function cancelAtPeriodEnd() {
    try {
      setMandateBusy(true);
      setStatus("");
      const payload = await webApiFetch<SubscriptionDetail>(
        `/api/orgs/${orgId}/saas-subscription/cancel`,
        {
          method: "POST",
          body: {},
          feedback: { success: t("subscriptionCancelAfterPeriod") },
        },
      );
      setSubscription((current) => (current ? { ...current, ...payload } : payload));
      setStatus(t("subscriptionCancelAfterPeriod"));
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : t("unableCancelSubscription"));
    } finally {
      setMandateBusy(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
      <BillingSetupCard
        nextStepHref={nextInvoiceStepHref}
        nextStepLabel={nextInvoiceStepLabel}
        setupSteps={setupSteps}
        labels={{
          finishBillingSetup: t("finishBillingSetup"),
          finishBillingSetupDescription: t("finishBillingSetupDescription"),
          ready: t("ready"),
          setupReadyCount: (values) => t("setupReadyCount", values),
          stepNeededLabel: (values) => t("stepNeededLabel", values),
          stepReadyLabel: (values) => t("stepReadyLabel", values),
        }}
      />

      <GlassCard>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("billingSnapshot")}</h2>
          <span className="text-xs text-[var(--text-tertiary)]">
            {t("recordedRevenue", { amount: formatInr(summary.revenuePaise) })}
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2">
            <p className="truncate text-[11px] text-[var(--text-tertiary)]">
              {t("gymStatus")}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
              {formatEnumLabel(organization.status)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2">
            <p className="truncate text-[11px] text-[var(--text-tertiary)]">
              {t("trialEnds")}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
              {organization.trialEndAt ? formatDate(organization.trialEndAt) : t("active")}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2">
            <p className="truncate text-[11px] text-[var(--text-tertiary)]">
              {t("documentReadiness")}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
              {profile?.invoiceReady
                ? t("invoicesAvailable")
                : profile?.receiptReady
                  ? t("receiptsAvailable")
                  : t("addDetails")}
            </p>
          </div>
        </div>
      </GlassCard>
      <BillingProfileCard
        busy={busy}
        missingInvoiceFields={missingInvoiceFields}
        missingReceiptFields={missingReceiptFields}
        onSave={() => void saveBillingProfile()}
        profile={profile}
        setProfile={setProfile}
        status={status}
      />
      <BillingPlanCard
        autopayReady={autopayReady}
        billingCycle={billingCycle}
        firstChargeLabel={firstChargeLabel}
        mandateBusy={mandateBusy}
        selectedPlanCycleLabel={selectedPlanCycleLabel}
        selectedPlanMemberLimit={selectedPlanMemberLimit}
        selectedPlanPrice={selectedPlanPrice}
        selectedTier={selectedTier}
        onBillingCycleChange={setBillingCycle}
        onSelectedTierChange={setSelectedTier}
        onSetupBillingMandate={() => void setupBillingMandate()}
      />
      {subscription ? <BillingUsageLimitsCard subscription={subscription} /> : null}
      {subscription?.mandate ? (
        <BillingPaymentMethodCard
          mandateBusy={mandateBusy}
          subscription={subscription}
          onCancelAtPeriodEnd={() => void cancelAtPeriodEnd()}
        />
      ) : null}
      {subscription?.platformReferral ? (
        <GlassCard className="xl:col-span-2">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                {t("platformReferralCode")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                {t("platformReferralDescription")}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <code className="rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-2 font-mono text-base text-[var(--accent-strong)]">
                  {subscription.platformReferral.code}
                </code>
                <ZookButton
                  type="button"
                  tone="ghost"
                  size="sm"
                  onClick={() => void copyReferralCode()}
                >
                  {t("copyCode")}
                </ZookButton>
              </div>
              {copyStatus ? (
                <p className="mt-3 text-xs text-[var(--text-secondary)]">{copyStatus}</p>
              ) : null}
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2 text-sm md:min-w-[150px]">
              <p className="text-xs text-[var(--text-tertiary)]">
                {t("gymsReferred")}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--text-primary)]">
                {subscription.platformReferral.referredCount}
              </p>
            </div>
          </div>
        </GlassCard>
      ) : null}
      <BillingInvoiceList
        invoices={invoices}
        nextInvoiceStepHref={nextInvoiceStepHref}
        nextInvoiceStepLabel={nextInvoiceStepLabel}
      />
    </div>
  );
}

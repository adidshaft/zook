"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatDate, formatEnumLabel, formatInr, formatUsageLimit } from "@/lib/format";
import { webApiFetch } from "@/lib/api-client";
import { ConfirmActionButton } from "../../confirm-action-button";
import { GlassCard, Pill } from "../../glass-card";
import { ZookButton } from "../../zook-button";
import type {
  OrganizationSnapshot,
  OrganizationSummary,
} from "@/components/dashboard/types";

const copy = {
  billingEyebrow: "Billing",
  billingTitle: "Receipts and invoices",
  billingDescription: "Complete billing details before receipts and GST invoices are created.",
  trialBillingTitle: "Two-month free trial",
  trialBillingDescription:
    "Add a card now so the gym keeps running after the free trial. The first charge is scheduled after the trial end date.",
  gymStatus: "Gym status",
  trialEnds: "Trial ends",
  documentReadiness: "Document readiness",
  invoicesTitle: "Invoices",
  invoicesDescription: "Invoices will appear here after the first paid billing cycle.",
};

type BillingProfile = {
  legalName: string;
  gstNumber: string;
  billingEmail: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  receiptReady: boolean;
  invoiceReady: boolean;
  receiptMissing: string[];
  invoiceMissing: string[];
};

type InvoiceRow = {
  id: string;
  invoiceNumber?: string | null;
  invoiceNo?: string | null;
  issueDate?: string | Date | null;
  issuedAt?: string | Date | null;
  totalPaise: number;
  status: string;
  invoiceUrl?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
};

type BillingMandateResponse = {
  checkoutUrl?: string | null;
  subscription?: SubscriptionDetail["subscription"];
  mandate: {
    id: string;
    status: string;
    nextChargeAt?: string | Date | null;
  };
};

type SaasEntitlements = {
  memberLimit: number | null;
  branchLimit: number | null;
  staffLimit: number | null;
  trainerLimit: number | null;
  productLimit: number | null;
  notificationMonthlyLimit: number | null;
  aiTextMonthlyLimit: number;
  aiImageMonthlyLimit: number;
  reports: "basic" | "advanced" | "custom";
  referrals: "basic" | "advanced" | "custom";
  support: "standard" | "priority" | "premium";
  onboarding: "self_serve" | "assisted" | "white_glove";
  multiBranch: boolean;
  apiAccess: boolean;
};

type SaasUsage = {
  activeMemberCount: number;
  branchCount: number;
  staffCount: number;
  trainerCount: number;
  productCount: number;
  notificationMonthlyCount: number;
  aiTextMonthlyCount: number;
  aiImageMonthlyCount: number;
};

type SubscriptionDetail = {
  subscription: {
    orgStatus: string;
    trialStartAt: string | Date;
    trialEndAt: string | Date;
    status: string;
    tier: "FREE" | "STARTER" | "GROWTH" | "PRO";
    billingCycle: "MONTHLY" | "YEARLY";
    priceLockedPaise: number | null;
    billingEmail: string | null;
    nextBillingAt: string | Date | null;
    nextRenewalAt: string | Date | null;
    cancelledAt: string | Date | null;
    cancelAtPeriodEnd: boolean;
  };
  activeMemberCount: number;
  pricing: Record<
    "STARTER" | "GROWTH" | "PRO",
    {
      monthly: number;
      yearly: number;
      memberLimit: number | null;
      entitlements: SaasEntitlements;
    }
  >;
  entitlements: SaasEntitlements;
  usage: SaasUsage;
  mandate: {
    id: string;
    status: string;
    provider: string;
    providerMandateId: string | null;
    amountPaise: number;
    currency: string;
    billingPeriod: string;
    billingInterval: number;
    paidCount: number;
    totalCount: number;
    nextChargeAt: string | Date | null;
    currentEndAt: string | Date | null;
    authenticatedAt: string | Date | null;
    activatedAt: string | Date | null;
    cancelledAt: string | Date | null;
    checkoutUrl: string | null;
  } | null;
  platformReferral: {
    code: string;
    referredCount: number;
    recent: Array<{
      id: string;
      targetOrgId: string;
      status: string;
      createdAt: string | Date;
    }>;
  };
};

const billingProfileFields: Array<[string, keyof Pick<
  BillingProfile,
  "legalName" | "gstNumber" | "billingEmail" | "contactPhone" | "address" | "city" | "state" | "pincode"
>]> = [
  ["Legal business name", "legalName"],
  ["GST number", "gstNumber"],
  ["Billing email", "billingEmail"],
  ["Phone", "contactPhone"],
  ["Address", "address"],
  ["City", "city"],
  ["State", "state"],
  ["Pincode", "pincode"],
];

function usageLine(used: number, limit: number | null) {
  return `${formatEnumLabel(String(used))} / ${formatUsageLimit(limit)}`;
}

export function BillingSection({
  orgId,
  organization,
  summary,
}: {
  orgId: string;
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
}) {
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
        setStatus(cause instanceof Error ? cause.message : "Unable to load billing details.");
      });
    return () => {
      mounted = false;
    };
  }, [orgId]);

  async function copyReferralCode() {
    const code = subscription?.platformReferral?.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus("Referral code copied. Share it with another gym owner.");
      window.setTimeout(() => setCopyStatus(""), 4000);
    } catch {
      setCopyStatus("Could not copy. Select the code manually.");
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
          feedback: { success: "Billing details saved." },
        },
      );
      setProfile(payload.billingProfile);
      setStatus("Billing details saved. Receipts and tax invoices can now be generated.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Unable to save billing details.");
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
          feedback: { success: "Billing setup started." },
        },
      );
      if (payload.checkoutUrl) {
        window.location.assign(payload.checkoutUrl);
        return;
      }
      setStatus(`Billing mandate is ${formatEnumLabel(payload.mandate.status)}.`);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Unable to start billing setup.");
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
          feedback: { success: "Subscription will cancel at period end." },
        },
      );
      setSubscription((current) => (current ? { ...current, ...payload } : payload));
      setStatus("Subscription will cancel at the end of the current period.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Unable to cancel subscription.");
    } finally {
      setMandateBusy(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
      <GlassCard>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
          {copy.billingEyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{copy.billingTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{copy.billingDescription}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{copy.gymStatus}</p>
            <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
              {formatEnumLabel(organization.status)}
            </p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{copy.trialEnds}</p>
            <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
              {organization.trialEndAt ? formatDate(organization.trialEndAt) : "Active"}
            </p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              {copy.documentReadiness}
            </p>
            <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
              {profile?.invoiceReady
                ? "Invoices ready"
                : profile?.receiptReady
                  ? "Receipts ready"
                  : "Add details"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          Recorded revenue in the current view: {formatInr(summary.revenuePaise)}.
        </p>
      </GlassCard>
      <GlassCard>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Billing details</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Add these once so Zook can create proper receipts and GST invoices.
        </p>
        {profile ? (
          <div className="mt-5 grid gap-3">
            {billingProfileFields.map(([label, key]) => (
              <label key={key} className="grid gap-1 text-xs font-medium text-[var(--text-secondary)]">
                {label}
                <input
                  value={String(profile[key as keyof BillingProfile] ?? "")}
                  onChange={(event) =>
                    setProfile((current) =>
                      current ? { ...current, [key]: event.target.value } : current,
                    )
                  }
                  className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                />
              </label>
            ))}
            <ZookButton
              type="button"
              disabled={busy}
              state={busy ? "loading" : "idle"}
              onClick={() => void saveBillingProfile()}
            >
              {busy ? "Saving..." : "Save billing details"}
            </ZookButton>
            <div className="grid gap-2">
              <Pill tone={profile.receiptReady ? "blue" : "amber"}>
                {profile.receiptReady ? "Receipts enabled" : "Receipts need details"}
              </Pill>
              <Pill tone={profile.invoiceReady ? "blue" : "amber"}>
                {profile.invoiceReady ? "Invoices enabled" : "Invoices need GST details"}
              </Pill>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--text-tertiary)]">Loading billing fields...</p>
        )}
        {status ? <p className="mt-4 text-sm text-[var(--text-secondary)]">{status}</p> : null}
      </GlassCard>
      <GlassCard className="xl:col-span-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Pill>Free trial</Pill>
            <h2 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">{copy.trialBillingTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {copy.trialBillingDescription}
            </p>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              First charge date:{" "}
              <span className="font-medium text-[var(--text-primary)]">
                {organization.trialEndAt ? formatDate(organization.trialEndAt) : "After trial"}
              </span>
            </p>
          </div>
          <div className="grid gap-3 md:min-w-[360px]">
            <div className="grid grid-cols-3 gap-2">
              {(["STARTER", "GROWTH", "PRO"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSelectedTier(tier)}
                  className={`zook-focus rounded-lg border px-3 py-2 text-xs font-semibold ${
                    selectedTier === tier
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                      : "border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["MONTHLY", "YEARLY"] as const).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBillingCycle(cycle)}
                  className={`zook-focus rounded-lg border px-3 py-2 text-xs font-semibold ${
                    billingCycle === cycle
                      ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg)]"
                      : "border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]"
                  }`}
                >
                  {cycle === "MONTHLY" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {formatInr(
                billingCycle === "YEARLY"
                  ? (subscription?.pricing[selectedTier].yearly ?? 0)
                  : (subscription?.pricing[selectedTier].monthly ?? 0),
              )}{" "}
              / {billingCycle === "YEARLY" ? "year" : "month"}
            </p>
            <button
              type="button"
              disabled={mandateBusy}
              onClick={() => void setupBillingMandate()}
              className="zook-focus rounded-full bg-[var(--text-primary)] px-5 py-3 text-sm font-semibold text-[var(--bg)] disabled:cursor-wait disabled:opacity-60"
            >
              {mandateBusy ? "Opening..." : "Upgrade plan"}
            </button>
          </div>
        </div>
      </GlassCard>
      {subscription ? (
        <GlassCard className="xl:col-span-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Pill>{formatEnumLabel(subscription.subscription.tier)} limits</Pill>
              <h2 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">Plan packaging</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Zook plans are enforced by gym size, team size, branches, inventory, messaging, and
                AI quotas. Core operations stay available once billing is set up.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-2 lg:min-w-[560px]">
              {[
                ["Members", usageLine(subscription.usage.activeMemberCount, subscription.entitlements.memberLimit)],
                ["Branches", usageLine(subscription.usage.branchCount, subscription.entitlements.branchLimit)],
                ["Staff", usageLine(subscription.usage.staffCount, subscription.entitlements.staffLimit)],
                ["Trainers", usageLine(subscription.usage.trainerCount, subscription.entitlements.trainerLimit)],
                ["Products", usageLine(subscription.usage.productCount, subscription.entitlements.productLimit)],
                [
                  "Notifications/month",
                  usageLine(
                    subscription.usage.notificationMonthlyCount,
                    subscription.entitlements.notificationMonthlyLimit,
                  ),
                ],
                [
                  "AI text/month",
                  usageLine(subscription.usage.aiTextMonthlyCount, subscription.entitlements.aiTextMonthlyLimit),
                ],
                [
                  "AI images/month",
                  usageLine(subscription.usage.aiImageMonthlyCount, subscription.entitlements.aiImageMonthlyLimit),
                ],
                ["Reports", formatEnumLabel(subscription.entitlements.reports)],
                ["Support", formatEnumLabel(subscription.entitlements.support)],
                ["Referrals", formatEnumLabel(subscription.entitlements.referrals)],
                ["Onboarding", formatEnumLabel(subscription.entitlements.onboarding)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{label}</p>
                  <p className="mt-1 font-semibold text-[var(--text-primary)]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      ) : null}
      {subscription?.mandate ? (
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
                Autopay {formatEnumLabel(subscription.mandate.status || "")}
              </Pill>
              <h2 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">Active subscription</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                {formatEnumLabel(subscription.subscription.tier)} plan ·{" "}
                {formatInr(subscription.mandate.amountPaise)} per {subscription.mandate.billingPeriod}
                {" "}via {formatEnumLabel(subscription.mandate.provider || "")} mandate.
              </p>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Next charge</dt>
                  <dd className="font-medium text-[var(--text-primary)]">
                    {subscription.mandate.nextChargeAt
                      ? formatDate(subscription.mandate.nextChargeAt)
                      : "Pending activation"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Cycles paid</dt>
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
                Complete setup
              </a>
            ) : null}
            {subscription.subscription.status === "ACTIVE" &&
            !subscription.subscription.cancelAtPeriodEnd ? (
              <ConfirmActionButton
                type="button"
                disabled={mandateBusy}
                className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-sunken)] disabled:cursor-wait disabled:opacity-60"
                title="Cancel subscription at period end?"
                description="Your gym keeps access until the current paid period ends, then Zook will stop future subscription charges."
                confirmLabel="Cancel at period end"
                confirmTone="danger"
                onConfirm={() => cancelAtPeriodEnd()}
              >
                {mandateBusy ? "Cancelling..." : "Cancel at period end"}
              </ConfirmActionButton>
            ) : null}
          </div>
        </GlassCard>
      ) : null}
      {subscription?.platformReferral ? (
        <GlassCard className="xl:col-span-2">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Pill>Refer another gym</Pill>
              <h2 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">Your platform referral code</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Share this code with another gym owner. When they sign up using it, both gyms get
                an extended free trial.
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
                  Copy code
                </ZookButton>
              </div>
              {copyStatus ? <p className="mt-3 text-xs text-[var(--text-secondary)]">{copyStatus}</p> : null}
            </div>
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4 text-sm md:min-w-[180px]">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Gyms referred</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
                {subscription.platformReferral.referredCount}
              </p>
            </div>
          </div>
        </GlassCard>
      ) : null}
      <GlassCard className="xl:col-span-2">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">{copy.invoicesTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {invoices.length ? "Recent generated invoices." : copy.invoicesDescription}
        </p>
        <div className="mt-5 grid gap-2">
          {invoices.length ? (
            invoices.slice(0, 10).map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {invoice.invoiceNumber ?? invoice.invoiceNo ?? invoice.id}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    {invoice.user?.name ?? invoice.user?.email ?? "Member"} ·{" "}
                    {formatDate(invoice.issueDate ?? invoice.issuedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {formatInr(invoice.totalPaise)}
                  </span>
                  {invoice.invoiceUrl ? (
                    <a
                      href={invoice.invoiceUrl}
                      target="_blank"
                      className="zook-focus rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)]/80"
                    >
                      Open
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-tertiary)]">
              No invoices generated yet. Use Generate invoice from the Payments page after billing
              details are complete.
            </p>
          )}
          {invoices.length > 10 ? (
            <Link
              href="/dashboard/payments"
              className="mt-2 block text-right text-xs font-semibold text-[var(--accent-strong)] hover:underline"
            >
              {invoices.length - 10} more invoices →
            </Link>
          ) : null}
        </div>
      </GlassCard>
    </div>
  );
}

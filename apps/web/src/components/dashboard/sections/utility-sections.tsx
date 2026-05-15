"use client";

import { useEffect, useState } from "react";
import { formatDate, formatEnumLabel, formatInr } from "@/lib/format";
import { webApiFetch } from "@/lib/api-client";
import { GlassCard, Pill } from "../../glass-card";
import { HelpHint } from "../../ui";
import type {
  OrganizationSnapshot,
  OrganizationSummary,
  PaymentRow,
} from "../../dashboard-operational-model";

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
  refundsEyebrow: "Refunds",
  refundsTitle: "Refund tracker",
  refundsDescription:
    "Start refunds for recent successful payments and track payments already marked refunded.",
  refundUnavailable: "Refund workflow is ready for owner review once Razorpay refunds are enabled.",
  settingsEyebrow: "Settings",
  settingsTitle: "Gym controls",
  settingsDescription: "Keep attendance, messages, and integrations understandable for your team.",
  attendanceMode: "Attendance mode",
  notificationLimits: "Message limits",
  integrations: "Integrations",
  paymentProvider: "Payment partner",
  pushProvider: "Push alerts",
  configured: "Configured",
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
  mandate: {
    id: string;
    status: string;
    nextChargeAt?: string | Date | null;
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

export function BillingSection({
  orgId,
  organization,
  summary,
}: {
  orgId: string;
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
}) {
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [mandateBusy, setMandateBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([
      webApiFetch<{ billingProfile: BillingProfile }>(`/api/orgs/${orgId}/billing-profile`),
      webApiFetch<{ invoices: InvoiceRow[] }>(`/api/orgs/${orgId}/invoices`),
    ])
      .then(([profilePayload, invoicePayload]) => {
        if (!mounted) return;
        setProfile(profilePayload.billingProfile);
        setInvoices(invoicePayload.invoices);
      })
      .catch((cause) => {
        if (!mounted) return;
        setStatus(cause instanceof Error ? cause.message : "Unable to load billing details.");
      });
    return () => {
      mounted = false;
    };
  }, [orgId]);

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
        `/api/orgs/${orgId}/billing/mandate`,
        {
          method: "POST",
          body: {},
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

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
      <GlassCard>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
          {copy.billingEyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">{copy.billingTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-white/52">{copy.billingDescription}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/35">{copy.gymStatus}</p>
            <p className="mt-3 text-xl font-semibold text-white">
              {formatEnumLabel(organization.status)}
            </p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/35">{copy.trialEnds}</p>
            <p className="mt-3 text-xl font-semibold text-white">
              {organization.trialEndAt ? formatDate(organization.trialEndAt) : "Active"}
            </p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/35">
              {copy.documentReadiness}
            </p>
            <p className="mt-3 text-xl font-semibold text-white">
              {profile?.invoiceReady
                ? "Invoices ready"
                : profile?.receiptReady
                  ? "Receipts ready"
                  : "Add details"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-white/42">
          Recorded revenue in the current view: {formatInr(summary.revenuePaise)}.
        </p>
      </GlassCard>
      <GlassCard>
        <h2 className="text-xl font-semibold text-white">Billing details</h2>
        <p className="mt-2 text-sm leading-6 text-white/52">
          Add these once so Zook can create proper receipts and GST invoices.
        </p>
        {profile ? (
          <div className="mt-5 grid gap-3">
            {billingProfileFields.map(([label, key]) => (
              <label key={key} className="grid gap-1 text-xs font-medium text-white/50">
                {label}
                <input
                  value={String(profile[key as keyof BillingProfile] ?? "")}
                  onChange={(event) =>
                    setProfile((current) =>
                      current ? { ...current, [key]: event.target.value } : current,
                    )
                  }
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveBillingProfile()}
              className="zook-focus rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save billing details"}
            </button>
            <div className="grid gap-2">
              <Pill tone={profile.receiptReady ? "lime" : "amber"}>
                {profile.receiptReady ? "Receipts enabled" : "Receipts need details"}
              </Pill>
              <Pill tone={profile.invoiceReady ? "lime" : "amber"}>
                {profile.invoiceReady ? "Invoices enabled" : "Invoices need GST details"}
              </Pill>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/45">Loading billing fields...</p>
        )}
        {status ? <p className="mt-4 text-sm text-white/58">{status}</p> : null}
      </GlassCard>
      <GlassCard className="xl:col-span-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Pill tone="lime">Free trial</Pill>
            <h2 className="mt-3 text-xl font-semibold text-white">{copy.trialBillingTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">
              {copy.trialBillingDescription}
            </p>
            <p className="mt-3 text-sm text-white/62">
              First charge date:{" "}
              <span className="font-medium text-white">
                {organization.trialEndAt ? formatDate(organization.trialEndAt) : "After trial"}
              </span>
            </p>
          </div>
          <button
            type="button"
            disabled={mandateBusy}
            onClick={() => void setupBillingMandate()}
            className="zook-focus rounded-full bg-white px-5 py-3 text-sm font-semibold text-black disabled:cursor-wait disabled:opacity-60"
          >
            {mandateBusy ? "Opening..." : "Add card for month 3"}
          </button>
        </div>
      </GlassCard>
      <GlassCard className="xl:col-span-2">
        <h2 className="text-xl font-semibold text-white">{copy.invoicesTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-white/52">
          {invoices.length ? "Recent generated invoices." : copy.invoicesDescription}
        </p>
        <div className="mt-5 grid gap-2">
          {invoices.length ? (
            invoices.slice(0, 10).map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">
                    {invoice.invoiceNumber ?? invoice.invoiceNo ?? invoice.id}
                  </p>
                  <p className="mt-1 text-xs text-white/42">
                    {invoice.user?.name ?? invoice.user?.email ?? "Member"} ·{" "}
                    {formatDate(invoice.issueDate ?? invoice.issuedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">
                    {formatInr(invoice.totalPaise)}
                  </span>
                  {invoice.invoiceUrl ? (
                    <a
                      href={invoice.invoiceUrl}
                      target="_blank"
                      className="zook-focus rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/8"
                    >
                      Open
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50">
              No invoices generated yet. Use Generate invoice from the Payments page after billing
              details are complete.
            </p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function refundAmountFor(payment: PaymentRow) {
  return (
    payment.refundedAmountPaise ??
    payment.refunds
      ?.filter((refund) => !["FAILED", "CANCELLED"].includes(refund.status))
      .reduce((total, refund) => total + refund.amountPaise, 0) ??
    0
  );
}

function remainingRefundAmount(payment: PaymentRow) {
  return Math.max(payment.amountPaise - refundAmountFor(payment), 0);
}

export function RefundsSection({
  payments,
  onRefundSubmitted,
}: {
  payments: PaymentRow[];
  onRefundSubmitted?: () => void | Promise<void>;
}) {
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [refundDraft, setRefundDraft] = useState<{
    payment: PaymentRow;
    reason: string;
    amountRupees: string;
  } | null>(null);
  const refundable = payments
    .filter(
      (payment) =>
        ["SUCCEEDED", "PARTIALLY_REFUNDED"].includes(payment.status) &&
        remainingRefundAmount(payment) > 0,
    )
    .slice(0, 8);
  const trackedRefunds = payments.flatMap((payment) => {
    const refunds = payment.refunds ?? [];
    if (refunds.length) {
      return refunds.map((refund) => ({ payment, refund }));
    }
    if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(payment.status)) {
      return [
        {
          payment,
          refund: {
            id: `legacy-${payment.id}`,
            amountPaise: refundAmountFor(payment) || payment.amountPaise,
            status: payment.status,
            reason: "Recorded before refund tracker",
            createdAt: payment.createdAt,
            processedAt: payment.recordedAt ?? payment.createdAt,
          },
        },
      ];
    }
    return [];
  });

  async function refundPayment() {
    if (!refundDraft?.reason.trim()) return;
    const { payment, reason, amountRupees } = refundDraft;
    if (!payment.orgId) {
      setError("This payment is missing its organization link.");
      return;
    }
    const amountPaise = Math.round(Number(amountRupees || 0) * 100);
    const remainingPaise = remainingRefundAmount(payment);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0 || amountPaise > remainingPaise) {
      setError(`Enter an amount between ₹1 and ${formatInr(remainingPaise)}.`);
      return;
    }
    try {
      setBusyPaymentId(payment.id);
      setError("");
      await webApiFetch(`/api/orgs/${payment.orgId}/payments/${payment.id}/refund`, {
        method: "POST",
        body: { reason: reason.trim(), amountPaise },
        feedback: { success: "Refund submitted." },
      });
      setRefundDraft(null);
      await onRefundSubmitted?.();
      setStatus("Refund submitted and added to the tracker.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to refund payment.";
      setError(
        message.toLowerCase().includes("provider reference")
          ? "This payment cannot be refunded automatically because it was not collected through Razorpay."
          : message,
      );
    } finally {
      setBusyPaymentId(null);
    }
  }

  return (
    <GlassCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
            {copy.refundsEyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{copy.refundsTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-white/52">{copy.refundsDescription}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone="amber">{refundable.length} available</Pill>
          <Pill tone={trackedRefunds.length ? "blue" : "neutral"}>
            {trackedRefunds.length} tracked
          </Pill>
        </div>
      </div>
      {error ? (
        <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="mt-4 rounded-2xl border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">
          {status}
        </p>
      ) : null}
      {refundDraft ? (
        <form
          className="mt-4 rounded-[24px] border border-white/10 bg-black/25 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void refundPayment();
          }}
        >
          <p className="text-sm font-semibold text-white">
            Refund up to {formatInr(remainingRefundAmount(refundDraft.payment))} to{" "}
            {refundDraft.payment.user?.name ?? formatEnumLabel(refundDraft.payment.purpose)}
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-[160px_1fr]">
            <label className="grid gap-2 text-xs font-medium text-white/50">
              Amount in rupees
              <input
                value={refundDraft.amountRupees}
                onChange={(event) =>
                  setRefundDraft((current) =>
                    current ? { ...current, amountRupees: event.target.value } : current,
                  )
                }
                inputMode="decimal"
                className="zook-focus rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none"
              />
            </label>
            <label className="grid gap-2 text-xs font-medium text-white/50">
              Reason
              <textarea
                value={refundDraft.reason}
                onChange={(event) =>
                  setRefundDraft((current) =>
                    current ? { ...current, reason: event.target.value } : current,
                  )
                }
                rows={3}
                maxLength={240}
                className="zook-focus rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setRefundDraft(null)}
              className="zook-focus min-h-10 rounded-full border border-white/10 px-4 text-sm text-white/70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !refundDraft.reason.trim() ||
                !refundDraft.amountRupees.trim() ||
                busyPaymentId === refundDraft.payment.id
              }
              className="zook-focus min-h-10 rounded-full bg-lime-300 px-4 text-sm font-semibold text-black disabled:opacity-60"
            >
              {busyPaymentId === refundDraft.payment.id ? "Submitting..." : "Submit refund"}
            </button>
          </div>
        </form>
      ) : null}
      <div className="mt-5 grid gap-3">
        {refundable.map((payment) => (
          <div
            key={payment.id}
            className="flex flex-col justify-between gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center"
          >
            <div>
              <p className="font-medium text-white">
                {payment.user?.name ?? formatEnumLabel(payment.purpose)}
              </p>
              <p className="mt-1 text-xs text-white/42">
                {formatInr(remainingRefundAmount(payment))} refundable of{" "}
                {formatInr(payment.amountPaise)} · {formatEnumLabel(payment.mode)}
              </p>
            </div>
            <span className="inline-flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStatus("");
              setRefundDraft({
                payment,
                reason: "Owner requested refund",
                amountRupees: (remainingRefundAmount(payment) / 100).toFixed(2),
              });
            }}
                disabled={busyPaymentId === payment.id}
                className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-xs font-semibold text-black disabled:opacity-60"
              >
                {busyPaymentId === payment.id ? "Refunding..." : "Refund"}
              </button>
              <HelpHint label="Refund access" title="Refund access">
                Refunds are sent to the payment partner when a payment reference exists. Zook then
                marks the payment as refunded or partly refunded.
              </HelpHint>
            </span>
          </div>
        ))}
        {!refundable.length ? (
          <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50">
            No successful payments are available for refund in this branch or payment view.
          </p>
        ) : null}
      </div>
      {trackedRefunds.length ? (
        <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
          <p className="font-medium text-white">Tracked refunds</p>
          <div className="mt-3 grid gap-2">
            {trackedRefunds.slice(0, 12).map(({ payment, refund }) => (
              <div
                key={refund.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3"
              >
                <span className="min-w-0 text-sm text-white/72">
                  {payment.user?.name ?? formatEnumLabel(payment.purpose)}
                  <span className="mt-1 block truncate text-xs text-white/38">
                    {refund.reason || "Refund requested"} ·{" "}
                    {refund.processedAt ? formatDate(refund.processedAt) : formatDate(refund.createdAt)}
                  </span>
                </span>
                <span className="text-right text-xs text-white/42">
                  {formatInr(refund.amountPaise)} · {formatEnumLabel(refund.status)}
                  {refund.providerRefundId ? (
                    <span className="block text-white/32">Razorpay refund {refund.providerRefundId}</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </GlassCard>
  );
}

export function SettingsSection({ organization }: { organization: OrganizationSnapshot }) {
  const integrations = [
    [copy.paymentProvider, process.env.NEXT_PUBLIC_PAYMENT_PROVIDER_LABEL ?? copy.configured],
    [copy.pushProvider, copy.configured],
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <GlassCard>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
          {copy.settingsEyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">{copy.settingsTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-white/52">{copy.settingsDescription}</p>
      </GlassCard>
      <GlassCard>
        <h2 className="text-xl font-semibold text-white">{copy.attendanceMode}</h2>
        <Pill tone="lime">{formatEnumLabel(organization.attendanceMode)}</Pill>
      </GlassCard>
      <GlassCard>
        <h2 className="text-xl font-semibold text-white">{copy.notificationLimits}</h2>
        <p className="mt-2 text-sm text-white/52">
          2 announcements, 5 updates, and 50 total messages per day.
        </p>
      </GlassCard>
      <GlassCard className="xl:col-span-3">
        <h2 className="text-xl font-semibold text-white">{copy.integrations}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {integrations.map(([label, value]) => (
            <div key={label} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">{label}</p>
              <p className="mt-2 font-medium text-white">{value}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

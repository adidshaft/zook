"use client";

import { formatDate, formatEnumLabel, formatInr } from "@/lib/format";
import { GlassCard, Pill } from "../../glass-card";
import type {
  OrganizationSnapshot,
  OrganizationSummary,
  PaymentRow,
} from "../../dashboard-operational-model";

const copy = {
  billingEyebrow: "Billing",
  billingTitle: "Gym subscription",
  billingDescription: "Review your Zook plan, invoices, and GST-ready billing information.",
  currentPlan: "Current plan",
  trialEnds: "Trial ends",
  nextInvoice: "Next invoice",
  invoicesTitle: "Invoices",
  invoicesDescription: "Invoices will appear here after the first paid billing cycle.",
  refundsEyebrow: "Refunds",
  refundsTitle: "Refund requests",
  refundsDescription: "Owner-only review for recent successful payments that may need a refund.",
  refundUnavailable:
    "Refund workflow is ready for owner review once live provider refunds are enabled.",
  settingsEyebrow: "Settings",
  settingsTitle: "Gym controls",
  settingsDescription: "Keep attendance, messages, and integrations understandable for your team.",
  attendanceMode: "Attendance mode",
  notificationLimits: "Message limits",
  integrations: "Integrations",
  paymentProvider: "Payment provider",
  pushProvider: "Push alerts",
  configured: "Configured",
};

export function BillingSection({
  organization,
  summary,
}: {
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
}) {
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
            <p className="text-xs uppercase tracking-[0.18em] text-white/35">{copy.currentPlan}</p>
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
            <p className="text-xs uppercase tracking-[0.18em] text-white/35">{copy.nextInvoice}</p>
            <p className="mt-3 text-xl font-semibold text-white">
              {formatInr(summary.revenuePaise)}
            </p>
          </div>
        </div>
      </GlassCard>
      <GlassCard>
        <h2 className="text-xl font-semibold text-white">{copy.invoicesTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-white/52">{copy.invoicesDescription}</p>
      </GlassCard>
    </div>
  );
}

export function RefundsSection({ payments }: { payments: PaymentRow[] }) {
  const refundable = payments.filter((payment) => payment.status === "SUCCEEDED").slice(0, 8);
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
        <Pill tone="amber">{refundable.length} recent</Pill>
      </div>
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
                {formatInr(payment.amountPaise)} · {formatEnumLabel(payment.mode)}
              </p>
            </div>
            <Pill tone="blue">{copy.refundUnavailable}</Pill>
          </div>
        ))}
      </div>
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

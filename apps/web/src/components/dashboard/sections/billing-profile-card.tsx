"use client";

import type { Dispatch, SetStateAction } from "react";
import { formatEnumLabel } from "@/lib/format";
import { useT } from "@/lib/use-t";
import { GlassCard } from "../../glass-card";
import { ZookButton } from "../../zook-button";
import { CompactStatusMark } from "./billing-setup-card";
import type { BillingProfile } from "./billing-section-types";

const billingProfileFields: Array<
  [
    string,
    keyof Pick<
      BillingProfile,
      | "legalName"
      | "gstNumber"
      | "billingEmail"
      | "contactPhone"
      | "address"
      | "city"
      | "state"
      | "pincode"
    >,
  ]
> = [
  ["fieldLegalName", "legalName"],
  ["fieldGstNumber", "gstNumber"],
  ["fieldBillingEmail", "billingEmail"],
  ["fieldPhone", "contactPhone"],
  ["fieldAddress", "address"],
  ["fieldCity", "city"],
  ["fieldState", "state"],
  ["fieldPincode", "pincode"],
];

function missingFieldLabel(field: string) {
  return formatEnumLabel(field.replace(/([a-z])([A-Z])/g, "$1 $2"));
}

export function BillingProfileCard({
  busy,
  missingInvoiceFields,
  missingReceiptFields,
  onSave,
  profile,
  setProfile,
  status,
}: {
  busy: boolean;
  missingInvoiceFields: string[];
  missingReceiptFields: string[];
  onSave: () => void;
  profile: BillingProfile | null;
  setProfile: Dispatch<SetStateAction<BillingProfile | null>>;
  status: string;
}) {
  const t = useT("billing");

  return (
    <GlassCard id="billing-details">
      <h2 className="text-base font-semibold text-[var(--text-primary)]">
        {t("billingDetailsTitle")}
      </h2>
      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
        {t("billingDetailsDescription")}
      </p>
      {profile ? (
        <div className="mt-5 grid gap-3">
          {billingProfileFields.map(([labelKey, key]) => (
            <label
              key={key}
              className="grid gap-1 text-xs font-medium text-[var(--text-secondary)]"
            >
              {t(labelKey)}
              <input
                value={String(profile[key as keyof BillingProfile] ?? "")}
                onChange={(event) =>
                  setProfile((current) =>
                    current ? { ...current, [key]: event.target.value } : current,
                  )
                }
                className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
              />
            </label>
          ))}
          <ZookButton type="button" disabled={busy} state={busy ? "loading" : "idle"} onClick={onSave}>
            {busy ? t("saving") : t("saveBillingDetails")}
          </ZookButton>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
              <CompactStatusMark
                label={profile.receiptReady ? t("receiptsEnabled") : t("receiptsNeedDetails")}
                ready={profile.receiptReady}
              />
              {profile.receiptReady ? t("receiptsEnabled") : t("receiptsNeedDetails")}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
              <CompactStatusMark
                label={profile.invoiceReady ? t("invoicesEnabled") : t("invoicesNeedGstDetails")}
                ready={profile.invoiceReady}
              />
              {profile.invoiceReady ? t("invoicesEnabled") : t("invoicesNeedGstDetails")}
            </span>
          </div>
          {!profile.receiptReady || !profile.invoiceReady ? (
            <details className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--text-primary)]">
                {t("neededBeforeDocumentsReady")}
              </summary>
              <div className="mt-3 grid gap-3 text-xs leading-5 text-[var(--text-secondary)] sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{t("receipts")}</p>
                  <p className="mt-1">
                    {missingReceiptFields.length > 0
                      ? missingReceiptFields.map(missingFieldLabel).join(", ")
                      : t("readyForMemberReceipts")}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{t("gstInvoices")}</p>
                  <p className="mt-1">
                    {missingInvoiceFields.length > 0
                      ? missingInvoiceFields.map(missingFieldLabel).join(", ")
                      : t("readyForTaxInvoices")}
                  </p>
                </div>
              </div>
            </details>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--text-tertiary)]">{t("loadingBillingFields")}</p>
      )}
      {status ? <p className="mt-4 text-sm text-[var(--text-secondary)]">{status}</p> : null}
    </GlassCard>
  );
}

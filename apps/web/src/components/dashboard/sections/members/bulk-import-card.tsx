"use client";

import { useState } from "react";
import { SectionHeader } from "../../../dashboard-primitives";
import { GlassCard, Pill } from "../../../glass-card";
import { SearchableSelect } from "../../../ui";
import type { MembershipPlanRow } from "../../../dashboard-operational-model";
import { formatInr } from "@/lib/format";
import { webApiFetch } from "@/lib/api-client";

export function BulkImportCard({
  orgId,
  membershipPlans,
  onImportComplete,
}: {
  orgId: string;
  membershipPlans: MembershipPlanRow[];
  onImportComplete: () => void;
}) {
  const [csvText, setCsvText] = useState("");
  const [planId, setPlanId] = useState("");
  const [activateSub, setActivateSub] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [busy, setBusy] = useState(false);
  const [importResult, setImportResult] = useState<{
    summary: { total: number; created: number; existing: number; errors: number };
    results: Array<{ row: number; status: string; email?: string; error?: string }>;
  } | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        setCsvText(text);
        setImportResult(null);
      }
    };
    reader.readAsText(file);
  }

  async function runImport() {
    if (!csvText.trim()) return;
    setBusy(true);
    setImportResult(null);
    try {
      const result = await webApiFetch<{
        summary: { total: number; created: number; existing: number; errors: number };
        results: Array<{ row: number; status: string; email?: string; error?: string }>;
      }>(`/api/orgs/${orgId}/members/import`, {
        method: "POST",
        body: {
          csv: csvText,
          ...(planId ? { planId } : {}),
          activateSubscription: activateSub,
          sendWelcomeNotification: sendNotification,
        },
        feedback: {
          success: "Import completed.",
          error: "Import failed. Check the CSV format and try again.",
        },
      });
      setImportResult(result);
      onImportComplete();
    } catch {
      // Toast handled by webApiFetch.
    } finally {
      setBusy(false);
    }
  }

  const errorRows = importResult?.results.filter((row) => row.status === "error") ?? [];

  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Onboarding"
        title="Bulk member import"
        description="Upload a CSV file with member details to add them all at once. CSV must include 'name' and 'email' columns. Optional: 'phone'."
        badge={<Pill tone="blue">CSV</Pill>}
      />
      <div className="mt-5 grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="zook-focus flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/8">
            Choose CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
          {csvText ? (
            <span className="text-xs text-lime-300/80">
              {csvText.split(/\r?\n/).filter(Boolean).length - 1} data rows loaded
            </span>
          ) : null}
        </div>

        <textarea
          value={csvText}
          onChange={(event) => {
            setCsvText(event.target.value);
            setImportResult(null);
          }}
          rows={csvText ? 5 : 4}
          placeholder="name,email,phone&#10;Rahul Sharma,rahul@example.com,9876543210"
          className="zook-focus min-h-20 rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-3 font-mono text-xs text-white/80 placeholder:text-white/25"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <SearchableSelect
            label="Assign membership plan (optional)"
            placeholder="No plan"
            searchPlaceholder="Search plans"
            value={planId}
            onChange={setPlanId}
            options={[
              { value: "", label: "No plan - add as members only" },
              ...membershipPlans
                .filter((plan) => plan.active)
                .map((plan) => ({
                  value: plan.id,
                  label: plan.name,
                  description: `${formatInr(plan.pricePaise)}`,
                })),
            ]}
          />
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={activateSub}
                onChange={(event) => setActivateSub(event.target.checked)}
                disabled={!planId}
                className="h-4 w-4 rounded border-white/20 bg-black/40 accent-lime-300"
              />
              Activate subscription immediately
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(event) => setSendNotification(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/40 accent-lime-300"
              />
              Send welcome notification
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!csvText.trim() || busy}
            onClick={() => void runImport()}
            className="zook-focus rounded-full bg-lime-300 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-200 disabled:opacity-50"
          >
            {busy ? "Importing..." : "Import members"}
          </button>
          {importResult ? (
            <button
              type="button"
              onClick={() => {
                setCsvText("");
                setImportResult(null);
                setPlanId("");
                setActivateSub(false);
              }}
              className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
            >
              Reset
            </button>
          ) : null}
        </div>

        {importResult ? (
          <div className="rounded-[22px] border border-lime-200/15 bg-lime-200/8 p-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">Total</p>
                <p className="mt-1 text-lg font-bold text-white">{importResult.summary.total}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">Created</p>
                <p className="mt-1 text-lg font-bold text-lime-300">
                  {importResult.summary.created}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">Existing</p>
                <p className="mt-1 text-lg font-bold text-blue-300">
                  {importResult.summary.existing}
                </p>
              </div>
              {importResult.summary.errors > 0 ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">Errors</p>
                  <p className="mt-1 text-lg font-bold text-red-300">
                    {importResult.summary.errors}
                  </p>
                </div>
              ) : null}
            </div>
            {errorRows.length > 0 ? (
              <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-red-300/15 bg-red-300/8 p-3">
                <p className="mb-2 text-xs font-semibold text-red-200">Failed rows</p>
                {errorRows.map((row) => (
                  <p key={row.row} className="text-xs text-red-200/70">
                    Row {row.row}: {row.email ?? "-"} - {row.error}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}

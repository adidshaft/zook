"use client";

import { useState } from "react";
import { SectionHeader } from "../../dashboard-primitives";
import { GlassCard } from "../../glass-card";
import { SearchableSelect } from "../../ui";
import { ZookButton } from "../../zook-button";
import type { MembershipPlanRow } from "@/components/dashboard/types";
import { formatInr } from "@/lib/format";
import { webApiFetch } from "@/lib/api-client";
import { useT } from "@/lib/use-t";

const sampleCsv = "name,email,phone\nRahul Sharma,rahul@example.com,9876543210";

export function BulkImportCard({
  orgId,
  membershipPlans,
  onImportComplete,
}: {
  orgId: string;
  membershipPlans: MembershipPlanRow[];
  onImportComplete: () => void;
}) {
  const t = useT("members");
  const [csvText, setCsvText] = useState("");
  const [planId, setPlanId] = useState("");
  const [activateSub, setActivateSub] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
          success: t("importCompleted"),
          error: t("importFailed"),
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
  const activePlans = membershipPlans.filter((plan) => plan.active);

  return (
    <GlassCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader
          eyebrow={t("bulkImportEyebrow")}
          title={t("bulkImportTitle")}
          description={
            expanded
              ? t("bulkImportDescriptionOpen")
              : t("bulkImportDescriptionClosed")
          }
        />
        <ZookButton
          type="button"
          tone={expanded ? "ghost" : "secondary"}
          size="sm"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? t("hideImport") : t("importCsv")}
        </ZookButton>
      </div>
      {expanded ? (
        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm text-white/70 md:grid-cols-3">
            {[
              ["1", t("importStepColumns")],
              ["2", activePlans.length ? t("importStepPlanAvailable") : t("importStepPlanMissing")],
              ["3", sendNotification ? t("importStepNotificationsOn") : t("importStepNotificationsOff")],
            ].map(([step, label]) => (
              <div key={step} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                  {step}
                </span>
                <span className="leading-5">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="zook-focus flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/8">
              {t("chooseCsvFile")}
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            {csvText ? (
              <span className="text-xs text-white/55">
                {t("dataRows", { count: csvText.split(/\r?\n/).filter(Boolean).length - 1 })}
              </span>
            ) : null}
            <ZookButton
              type="button"
              tone="ghost"
              size="sm"
              onClick={() => {
                setCsvText(sampleCsv);
                setImportResult(null);
              }}
            >
              {t("useSampleFormat")}
            </ZookButton>
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
              label={t("assignPlanOptional")}
              placeholder={t("noPlan")}
              searchPlaceholder={t("searchPlans")}
              value={planId}
              onChange={setPlanId}
              options={[
                { value: "", label: t("noPlanMembersOnly") },
                ...activePlans.map((plan) => ({
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
                {t("activateSubscriptionImmediately")}
              </label>
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={sendNotification}
                  onChange={(event) => setSendNotification(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/40 accent-lime-300"
                />
                {t("sendWelcomeNotification")}
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ZookButton
              type="button"
              disabled={!csvText.trim() || busy}
              state={busy ? "loading" : "idle"}
              onClick={() => void runImport()}
            >
              {busy ? t("importing") : t("importMembers")}
            </ZookButton>
            {importResult ? (
              <ZookButton
                type="button"
                tone="ghost"
                onClick={() => {
                  setCsvText("");
                  setImportResult(null);
                  setPlanId("");
                  setActivateSub(false);
                }}
              >
                {t("reset")}
              </ZookButton>
            ) : null}
          </div>

          {importResult ? (
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">{t("total")}</p>
                  <p className="mt-1 text-lg font-bold text-white">{importResult.summary.total}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">{t("createdCount")}</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {importResult.summary.created}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">{t("existing")}</p>
                  <p className="mt-1 text-lg font-bold text-blue-300">
                    {importResult.summary.existing}
                  </p>
                </div>
                {importResult.summary.errors > 0 ? (
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">{t("errors")}</p>
                    <p className="mt-1 text-lg font-bold text-red-300">
                      {importResult.summary.errors}
                    </p>
                  </div>
                ) : null}
              </div>
              {errorRows.length > 0 ? (
                <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-red-300/15 bg-red-300/8 p-3">
                  <p className="mb-2 text-xs font-semibold text-red-200">{t("failedRows")}</p>
                  {errorRows.map((row) => (
                    <p key={row.row} className="text-xs text-red-200/70">
                      {t("rowError", { row: row.row, email: row.email ?? "-", error: row.error ?? "" })}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </GlassCard>
  );
}

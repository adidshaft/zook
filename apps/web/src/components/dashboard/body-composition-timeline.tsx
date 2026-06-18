"use client";

import { Camera } from "lucide-react";
import { EmptyState, SectionHeader, StatusPill } from "../dashboard-primitives";
import { Pill } from "../glass-card";
import { formatDate, formatEnumLabel } from "@/lib/format";
import type { BodyProgressEntryRow } from "@/components/dashboard/types";

function numericLabel(value: string | number | null | undefined, suffix: string) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return "--";
  }
  return `${numericValue.toLocaleString("en-IN", { maximumFractionDigits: 1 })}${suffix}`;
}

export function BodyCompositionTimeline({ entries }: { entries: BodyProgressEntryRow[] }) {
  const visibleEntries = entries.slice(0, 6);
  const entriesWithPhotos = visibleEntries.filter((entry) => entry.photoAssetId).length;

  return (
    <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--bg-sunken)]/40 p-4 lg:col-span-4">
      <SectionHeader
        eyebrow="Body composition"
        title="Photo timeline"
        description="Trainer-visible body progress entries from member tracking, including private progress photos when the member has attached them."
        badge={
          <Pill tone={entriesWithPhotos ? "lime" : "neutral"}>
            {entriesWithPhotos} photo{entriesWithPhotos === 1 ? "" : "s"}
          </Pill>
        }
      />
      {visibleEntries.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleEntries.map((entry, index) => (
            <article
              key={entry.id}
              className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--bg-sunken)]/30"
            >
              <div className="relative aspect-[4/3] bg-[var(--bg-sunken)]/20">
                {entry.photoAssetId ? (
                  <img
                    src={`/api/files/${entry.photoAssetId}/content`}
                    alt={`Body progress photo from ${formatDate(entry.measuredAt)}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--text-tertiary)]">
                    <Camera size={24} aria-hidden="true" />
                    <span className="text-sm">No photo attached</span>
                  </div>
                )}
                {index === 0 ? (
                  <div className="absolute left-3 top-3">
                    <StatusPill value="Latest" tone="lime" />
                  </div>
                ) : null}
              </div>
              <div className="grid gap-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(entry.measuredAt)}</p>
                  <Pill tone={entry.visibility === "PRIVATE" ? "amber" : "blue"}>
                    {entry.visibility ? formatEnumLabel(entry.visibility) : "Visible"}
                  </Pill>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2">
                    <dt className="text-[var(--text-tertiary)]">Weight</dt>
                    <dd className="mt-1 font-medium text-[var(--text-primary)]">
                      {numericLabel(entry.weightKg, " kg")}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2">
                    <dt className="text-[var(--text-tertiary)]">Body fat</dt>
                    <dd className="mt-1 font-medium text-[var(--text-primary)]">
                      {numericLabel(entry.bodyFatPercent, "%")}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2">
                    <dt className="text-[var(--text-tertiary)]">Waist</dt>
                    <dd className="mt-1 font-medium text-[var(--text-primary)]">
                      {numericLabel(entry.waistCm, " cm")}
                    </dd>
                  </div>
                </dl>
                {entry.notes ? (
                  <p className="text-xs leading-5 text-[var(--text-secondary)]">{entry.notes}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-5"
          title="No body composition entries yet"
          description="When members log trainer-visible body progress or attach progress photos, the timeline will appear here."
        />
      )}
    </div>
  );
}

"use client";

import { ErrorState } from "../dashboard-primitives";
import { formatEnumLabel } from "@/lib/format";

export function ErrorNotice({ message }: { message: string }) {
  return <ErrorState compact title="Unable to load this section" description={message} />;
}

export function CsvExportButton({ href, label = "Export CSV" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      download
      className="zook-focus inline-flex min-h-11 items-center rounded-full border border-white/12 bg-white/6 px-4 text-sm font-semibold text-white/78 hover:border-lime-300/35 hover:text-lime-100"
    >
      {label}
    </a>
  );
}

export function LoadMoreButton({
  hasMore,
  loading,
  onLoadMore,
  count,
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  count: number;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white/45">
      <span>Showing {count} rows</span>
      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className="zook-focus min-h-11 rounded-full border border-white/10 px-4 text-sm font-semibold text-white/70 hover:border-lime-300/35 hover:text-lime-100 disabled:opacity-50"
        >
          {loading ? "Fetching more" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}

export function formatAiResponseSummary(summary?: string | null) {
  const trimmed = summary?.trim();
  if (!trimmed) {
    return "No response summary";
  }

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        title?: unknown;
        type?: unknown;
        days?: unknown;
      };
      const parts = [
        typeof parsed.title === "string" ? parsed.title : null,
        typeof parsed.type === "string" ? formatEnumLabel(parsed.type) : null,
        Array.isArray(parsed.days) ? `${parsed.days.length} day plan` : null,
      ].filter(Boolean);

      if (parts.length) {
        return parts.join(" - ");
      }
    } catch {
      // Fall through to a plain truncated summary when older rows contain partial JSON.
    }
  }

  const normalized = trimmed.replaceAll('\\"', '"');
  const titleMatch = normalized.match(/"title"\s*:\s*"([^"]+)"/);
  const typeMatch = normalized.match(/"type"\s*:\s*"([^"]+)"/);
  const dayCount = (normalized.match(/"name"\s*:\s*"Day \d+"/g) ?? []).length;
  const structuredParts = [
    titleMatch?.[1],
    typeMatch?.[1] ? formatEnumLabel(typeMatch[1]) : null,
    dayCount > 0 ? `${dayCount} day plan` : null,
  ].filter(Boolean);
  if (structuredParts.length) {
    return structuredParts.join(" - ");
  }

  return trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
}

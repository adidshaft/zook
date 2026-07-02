"use client";

import { ErrorState } from "../dashboard-primitives";
import { ZookButton } from "../zook-button";
import { formatEnumLabel } from "@/lib/format";
import { useT } from "@/lib/use-t";

export function ErrorNotice({ message }: { message: string }) {
  const t = useT("sharedControls");
  return <ErrorState compact title={t("unableLoadSection")} description={message} />;
}

export function CsvExportButton({ href, label }: { href: string; label?: string }) {
  const t = useT("sharedControls");
  return (
    <a
      href={href}
      download
      className="zook-focus inline-flex min-h-11 items-center rounded-full border border-white/12 bg-white/6 px-4 text-sm font-semibold text-white/78 hover:border-lime-300/35 hover:text-lime-100"
    >
      {label ?? t("exportCsv")}
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
  const t = useT("sharedControls");
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white/45">
      <span>{t("showingRows", { count })}</span>
      {hasMore ? (
        <ZookButton
          type="button"
          tone="ghost"
          onClick={onLoadMore}
          disabled={loading}
          state={loading ? "loading" : "idle"}
        >
          {loading ? t("fetchingMore") : t("loadMore")}
        </ZookButton>
      ) : null}
    </div>
  );
}

export function formatAiResponseSummary(
  summary: string | null | undefined,
  labels: {
    noResponseSummary: string;
    dayPlan: (count: number) => string;
  },
) {
  const trimmed = summary?.trim();
  if (!trimmed) {
    return labels.noResponseSummary;
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
        Array.isArray(parsed.days) ? labels.dayPlan(parsed.days.length) : null,
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
    dayCount > 0 ? labels.dayPlan(dayCount) : null,
  ].filter(Boolean);
  if (structuredParts.length) {
    return structuredParts.join(" - ");
  }

  return trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import type { PublicGym } from "./types";

type Review = { id: string; userId: string; name: string; rating: number; body: string; createdAt: string };
type ReviewData = {
  summary: { average: number; count: number; breakdown: Record<string, number> };
  reviews: Review[];
  canReview: boolean;
  myReview: Review | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5 text-[var(--accent-strong)]">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={15} fill={star <= Math.round(rating) ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

export function ReviewsSection({ org }: { org: PublicGym }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/orgs/${org.id}/reviews`, { credentials: "same-origin" });
    const payload = (await response.json()) as { ok: boolean; data?: ReviewData };
    if (payload.ok && payload.data) {
      setData(payload.data);
      setRating(payload.data.myReview?.rating ?? 5);
      setBody(payload.data.myReview?.body ?? "");
    }
  }, [org.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitReview() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/orgs/${org.id}/reviews`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating, body }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message ?? "Could not post your review.");
      }
      setNotice("Thanks for your review.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not post your review.");
    } finally {
      setBusy(false);
    }
  }

  const summary = data?.summary;
  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <GlassCard>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Reviews</h2>
        {summary && summary.count > 0 ? (
          <div className="mt-5">
            <p className="text-5xl font-semibold text-[var(--text-primary)]">{summary.average.toFixed(1)}</p>
            <div className="mt-2"><Stars rating={summary.average} /></div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{summary.count} member reviews</p>
            <div className="mt-5 grid gap-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = summary.breakdown[String(star)] ?? 0;
                const pct = summary.count ? (count / summary.count) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="w-4">{star}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-sunken)]">
                      <span className="block h-full rounded-full bg-[var(--accent-fill)]" style={{ width: `${pct}%` }} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--text-tertiary)]">No member reviews yet.</p>
        )}
      </GlassCard>

      <div className="grid gap-4">
        {data?.canReview ? (
          <GlassCard>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{data.myReview ? "Edit your review" : "Write a review"}</h3>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRating(star)} className="text-[var(--accent-strong)]">
                  <Star size={22} fill={star <= rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1200}
              className="mt-4 min-h-28 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
              placeholder="Share what members should know..."
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              {notice ? <p className="text-xs text-[var(--text-secondary)]">{notice}</p> : <span />}
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitReview()}
                className="rounded-full bg-[var(--accent-fill)] px-4 py-2 text-xs font-semibold text-[var(--text-on-accent)] disabled:opacity-60"
              >
                {busy ? "Posting..." : data.myReview ? "Update" : "Post review"}
              </button>
            </div>
          </GlassCard>
        ) : null}
        {(data?.reviews ?? []).map((review) => (
          <GlassCard key={review.id}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">{review.name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{new Date(review.createdAt).toLocaleDateString("en-IN")}</p>
              </div>
              <Stars rating={review.rating} />
            </div>
            {review.body ? <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{review.body}</p> : null}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

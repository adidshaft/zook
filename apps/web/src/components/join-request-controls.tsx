"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { ZookButton } from "@/components/zook-button";

type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  error?: { message?: string } | string;
};

export function JoinRequestButton({
  orgId,
  planId,
  referralCode,
  loginPath,
  labels,
}: {
  orgId: string;
  planId?: string;
  referralCode?: string | null | undefined;
  loginPath: string;
  labels: {
    submit: string;
    submitting: string;
    success: string;
    defaultError: string;
  };
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitRequest() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/orgs/${orgId}/join-requests`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-zook-intent": "mutate" },
        body: JSON.stringify({
          ...(planId ? { planId } : {}),
          ...(referralCode ? { referralCode } : {}),
        }),
      });
      if (response.status === 401) {
        window.location.assign(loginPath);
        return;
      }
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;
      if (!response.ok || payload?.ok === false) {
        const errorMessage =
          typeof payload?.error === "string"
            ? payload.error
            : payload?.error?.message ?? labels.defaultError;
        throw new Error(errorMessage);
      }
      setMessage(labels.success);
      toast.success(labels.success);
    } catch (cause) {
      const errorMessage = cause instanceof Error ? cause.message : labels.defaultError;
      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 grid gap-3">
      <ZookButton
        type="button"
        fullWidth
        onClick={() => void submitRequest()}
        disabled={busy}
        state={busy ? "loading" : "idle"}
      >
        {busy ? labels.submitting : labels.submit}
      </ZookButton>
      {message ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-[18px] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/70"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function InviteCodeForm({
  actionPath,
  planHandle,
  locale,
  labels,
}: {
  actionPath: string;
  planHandle?: string;
  locale: "en" | "hi";
  labels: {
    label: string;
    placeholder: string;
    submit: string;
  };
}) {
  const [code, setCode] = useState("");

  function redeemInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      return;
    }
    const query = new URLSearchParams();
    if (planHandle) {
      query.set("plan", planHandle);
    }
    query.set("ref", normalized);
    if (locale === "hi") {
      query.set("lang", "hi");
    }
    window.location.assign(`${actionPath}?${query.toString()}`);
  }

  return (
    <form className="mt-6 grid gap-3" onSubmit={redeemInvite}>
      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
        {labels.label}
      </label>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={labels.placeholder}
          className="zook-focus min-h-12 rounded-full border border-white/10 bg-black/30 px-4 text-sm text-white placeholder:text-white/35"
        />
        <ZookButton type="submit">{labels.submit}</ZookButton>
      </div>
    </form>
  );
}

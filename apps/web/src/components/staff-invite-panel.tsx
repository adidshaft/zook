"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { ApiError } from "@zook/core";
import { webApiFetch } from "@/lib/api-client";
import { formatDate, formatEnumLabel } from "@/lib/format";
import { GlassCard, Pill } from "./glass-card";
import { ZookButton, ZookButtonLink } from "./zook-button";

type StaffInvitePayload = {
  invite: {
    email: string;
    role: string;
    acceptedAt?: string | null;
    expiresAt: string;
  };
  organization: {
    name: string;
    city?: string | null;
    state?: string | null;
  } | null;
};

export function StaffInvitePanel({ token }: { token: string }) {
  const [payload, setPayload] = useState<StaffInvitePayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading invitation...");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let active = true;
    webApiFetch<StaffInvitePayload>(`/api/staff-invitations/${token}`)
      .then((data) => {
        if (!active) return;
        setPayload(data);
        setAccepted(Boolean(data.invite.acceptedAt));
        setMessage(
          data.invite.acceptedAt
            ? "This invitation has already been accepted."
            : "Sign in with the invited email, then accept the role.",
        );
      })
      .catch((error) => {
        if (!active) return;
        setMessage(error instanceof ApiError ? error.message : "Invitation could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function acceptInvite() {
    setBusy(true);
    setMessage("");
    try {
      await webApiFetch(`/api/staff-invitations/${token}/accept`, { method: "POST", body: {} });
      setAccepted(true);
      setMessage("Invite accepted. Your dashboard access is ready.");
    } catch (error) {
      const text = error instanceof ApiError ? error.message : "Unable to accept invite.";
      setMessage(text);
    } finally {
      setBusy(false);
    }
  }

  const loginHref = payload
    ? `/login?email=${encodeURIComponent(payload.invite.email)}&redirect=${encodeURIComponent(
        `/staff/invite/${token}`,
      )}`
    : `/login?redirect=${encodeURIComponent(`/staff/invite/${token}`)}`;

  return (
    <GlassCard variant="strong">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-black">
        {accepted ? <CheckCircle2 size={22} /> : <Mail size={22} />}
      </div>
      <Pill tone={accepted ? "lime" : "amber"}>{accepted ? "Accepted" : "Staff invite"}</Pill>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white">
        {payload?.organization?.name ?? "Zook"} invited you.
      </h1>
      <p className="mt-4 text-sm leading-6 text-white/58">{message}</p>

      {payload ? (
        <div className="mt-6 grid gap-3 rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs uppercase tracking-[0.18em] text-white/35">Email</span>
            <span className="truncate text-sm font-medium text-white">{payload.invite.email}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs uppercase tracking-[0.18em] text-white/35">Role</span>
            <span className="text-sm font-medium text-white">
              {formatEnumLabel(payload.invite.role)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs uppercase tracking-[0.18em] text-white/35">Expires</span>
            <span className="text-sm font-medium text-white">
              {formatDate(payload.invite.expiresAt)}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <ZookButtonLink href={loginHref} tone="ghost" fullWidth>
          Sign in
        </ZookButtonLink>
        <ZookButton
          type="button"
          fullWidth
          disabled={busy || accepted || !payload}
          state={busy ? "loading" : accepted ? "success" : "idle"}
          onClick={() => void acceptInvite()}
          trailingIcon={<ArrowRight size={17} />}
        >
          {busy ? "Accepting..." : accepted ? "Accepted" : "Accept invite"}
        </ZookButton>
      </div>
    </GlassCard>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Mail, Phone, ShieldCheck } from "lucide-react";
import { webApiFetch } from "@/lib/api-client";
import { sanitizeOtpValue } from "@/lib/otp";
import { GlassCard, Pill } from "./glass-card";
import { ZookButton } from "./zook-button";

type ContactKind = "email" | "phone";

type ContactState = {
  email: string;
  phone: string;
};

type ContactOtpPayload = {
  challengeId: string;
  expiresAt: string;
  devOtp?: string;
};

type ContactVerifyPayload = {
  user?: {
    email?: string | null;
    phone?: string | null;
  };
};

function normalizePhonePreview(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function contactCopy(kind: ContactKind) {
  return kind === "email"
    ? {
        icon: Mail,
        label: "Email",
        placeholder: "you@example.com",
        inputMode: "email" as const,
        autocomplete: "email",
        empty: "Add an email for account recovery and receipts.",
      }
    : {
        icon: Phone,
        label: "Phone",
        placeholder: "+91 98765 43210",
        inputMode: "tel" as const,
        autocomplete: "tel",
        empty: "Add a mobile number for OTP sign-in and gym alerts.",
      };
}

export function MemberContactCompletionPanel({
  email,
  phone,
}: {
  email?: string | null | undefined;
  phone?: string | null | undefined;
}) {
  const [contacts, setContacts] = useState<ContactState>({
    email: email ?? "",
    phone: phone ?? "",
  });
  const [activeKind, setActiveKind] = useState<ContactKind>(() => (!email ? "email" : "phone"));
  const [draft, setDraft] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<ContactOtpPayload | null>(null);
  const [pending, setPending] = useState<"request" | "verify" | null>(null);
  const [message, setMessage] = useState("");

  const copy = contactCopy(activeKind);
  const Icon = copy.icon;
  const completedCount = [contacts.email, contacts.phone].filter(Boolean).length;
  const completionTone = completedCount === 2 ? "lime" : completedCount === 1 ? "amber" : "neutral";
  const activeValue = contacts[activeKind];
  const canRequest = Boolean(draft.trim()) && pending !== "request";
  const canVerify = Boolean(challenge && code.trim().length === 6) && pending !== "verify";

  const statusText = useMemo(() => {
    if (completedCount === 2) return "Both contact methods are ready.";
    if (completedCount === 1) return "One contact method is ready.";
    return "Add a contact method to complete sign-in recovery.";
  }, [completedCount]);

  function chooseKind(kind: ContactKind) {
    setActiveKind(kind);
    setDraft("");
    setCode("");
    setChallenge(null);
    setMessage("");
  }

  async function requestCode() {
    setPending("request");
    setMessage("");
    try {
      const payload = await webApiFetch<ContactOtpPayload>("/api/me/contact/request-otp", {
        method: "POST",
        body: { identifier: draft.trim() },
        feedback: {
          success: "Code sent.",
          error: "Could not send the code.",
        },
      });
      setChallenge(payload);
      setMessage("Enter the 6-digit code to verify this contact.");
      if (payload.devOtp) {
        setCode(payload.devOtp);
      }
    } finally {
      setPending(null);
    }
  }

  async function verifyCode() {
    setPending("verify");
    setMessage("");
    try {
      const payload = await webApiFetch<ContactVerifyPayload>("/api/me/contact/verify-otp", {
        method: "POST",
        body: { identifier: draft.trim(), code: code.trim() },
        feedback: {
          success: "Contact verified.",
          error: "Could not verify the code.",
        },
      });
      setContacts((current) => ({
        email: payload.user?.email ?? current.email,
        phone: payload.user?.phone ?? current.phone,
      }));
      setChallenge(null);
      setCode("");
      setDraft("");
      setMessage(`${copy.label} verified.`);
    } finally {
      setPending(null);
    }
  }

  return (
    <GlassCard className="p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={completionTone}>{completedCount}/2 contacts</Pill>
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Account contact</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{statusText}</p>
        </div>
        <ShieldCheck
          className={
            completedCount === 2
              ? "text-lime-200"
              : completedCount === 1
                ? "text-amber-200"
                : "text-white/35"
          }
          size={24}
          aria-hidden="true"
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => chooseKind("email")}
          className="zook-focus rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/8"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Mail size={17} aria-hidden="true" />
            Email
          </div>
          <p className="mt-2 text-sm text-white/55">{contacts.email || "Not added"}</p>
        </button>
        <button
          type="button"
          onClick={() => chooseKind("phone")}
          className="zook-focus rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/8"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Phone size={17} aria-hidden="true" />
            Phone
          </div>
          <p className="mt-2 text-sm text-white/55">
            {contacts.phone ? normalizePhonePreview(contacts.phone) : "Not added"}
          </p>
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Icon size={17} aria-hidden="true" />
          {activeValue ? `Change ${copy.label.toLowerCase()}` : copy.empty}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="grid gap-2 text-sm text-white/55">
            {copy.label}
            <input
              type={activeKind === "email" ? "email" : "tel"}
              inputMode={copy.inputMode}
              autoComplete={copy.autocomplete}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setChallenge(null);
                setCode("");
                setMessage("");
              }}
              placeholder={copy.placeholder}
              className="zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none placeholder:text-white/30"
            />
          </label>
          <ZookButton
            type="button"
            tone="secondary"
            state={pending === "request" ? "loading" : "idle"}
            disabled={!canRequest}
            className="self-end"
            onClick={() => void requestCode()}
          >
            Send code
          </ZookButton>
        </div>

        {challenge ? (
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="grid gap-2 text-sm text-white/55">
              Verification code
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(sanitizeOtpValue(event.target.value))}
                placeholder="000000"
                className="zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none placeholder:text-white/30"
              />
            </label>
            <ZookButton
              type="button"
              state={pending === "verify" ? "loading" : "idle"}
              disabled={!canVerify}
              className="self-end"
              onClick={() => void verifyCode()}
            >
              Verify
            </ZookButton>
          </div>
        ) : null}

        {message ? <p className="mt-3 text-sm text-lime-100/80">{message}</p> : null}
      </div>
    </GlassCard>
  );
}

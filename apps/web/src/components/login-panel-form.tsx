"use client";

import type { RefObject } from "react";

type LoginMethod = "phone" | "email";

export function LoginIdentifierFields({
  disabled,
  email,
  emailRef,
  labels,
  loginMethod,
  phone,
  phoneRef,
  setEmail,
  setLoginMethod,
  setMessage,
  setPhone,
}: {
  disabled: boolean;
  email: string;
  emailRef: RefObject<HTMLInputElement | null>;
  labels: {
    emailAddress: string;
    emailHint: string;
    mobileHint: string;
    mobileNumber: string;
    signInDefault: string;
  };
  loginMethod: LoginMethod;
  phone: string;
  phoneRef: RefObject<HTMLInputElement | null>;
  setEmail: (value: string) => void;
  setLoginMethod: (method: LoginMethod) => void;
  setMessage: (value: string) => void;
  setPhone: (value: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-1">
        {(["phone", "email"] as const).map((method) => {
          const active = method === loginMethod;
          return (
            <button
              key={method}
              type="button"
              data-testid={`login-method-${method}`}
              aria-pressed={active}
              className={`zook-focus rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-[var(--accent-fill)] text-[var(--text-on-accent)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              disabled={disabled}
              onClick={() => {
                setLoginMethod(method);
                setMessage(labels.signInDefault);
              }}
            >
              {method === "phone" ? labels.mobileNumber : labels.emailAddress}
            </button>
          );
        })}
      </div>
      <div className="grid gap-2">
        {loginMethod === "email" ? (
          <input
            id="login-email"
            data-testid="login-email"
            aria-label={labels.emailAddress}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            ref={emailRef}
            required
            disabled={disabled}
            onChange={(event) => setEmail(event.target.value)}
            className="zook-focus min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
        ) : (
          <input
            id="login-phone"
            data-testid="login-phone"
            aria-label={labels.mobileNumber}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={phone}
            ref={phoneRef}
            required
            disabled={disabled}
            onChange={(event) => setPhone(event.target.value)}
            className="zook-focus min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
        )}
        <p className="text-xs leading-5 text-[var(--text-tertiary)]">
          {loginMethod === "email" ? labels.emailHint : labels.mobileHint}
        </p>
      </div>
    </>
  );
}

export function LoginOtpFields({
  code,
  handleOtpChange,
  identifier,
  labels,
  otpRef,
}: {
  code: string;
  handleOtpChange: (value: string) => void;
  identifier: string;
  labels: {
    otp: string;
    otpHint: string;
    otpPlaceholder: string;
  };
  otpRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <>
      <label htmlFor="login-otp" className="text-xs font-medium uppercase text-[var(--text-secondary)]">
        {labels.otp}
      </label>
      <input
        id="login-otp"
        data-testid="login-otp"
        ref={otpRef}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-describedby="login-status login-otp-helper"
        aria-required="true"
        placeholder={labels.otpPlaceholder}
        value={code}
        onChange={(event) => handleOtpChange(event.target.value)}
        maxLength={6}
        required
        className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
      />
      <p id="login-otp-helper" className="text-xs leading-5 text-[var(--text-secondary)]">
        {labels.otpHint.replace("{identifier}", identifier)}
      </p>
    </>
  );
}

export function LoginResendCooldown({
  cooldownSeconds,
  label,
  totalSeconds,
}: {
  cooldownSeconds: number;
  label: string;
  totalSeconds: number;
}) {
  if (cooldownSeconds <= 0) {
    return null;
  }

  return (
    <div className="grid gap-2" aria-live="polite">
      <p className="text-xs leading-5 text-[var(--text-secondary)]">{label}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]">
        <div
          className="h-full rounded-full bg-[var(--accent-fill)] transition-all"
          style={{
            width: `${((totalSeconds - cooldownSeconds) / totalSeconds) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

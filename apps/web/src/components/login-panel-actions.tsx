"use client";

import { motion, type Variants } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ZookButton } from "./zook-button";

type LoginPanelActionLabels = {
  moreSignInOptions: string;
  resendUnavailable: string;
  resendOtp: string;
  changeSignIn: string;
};

export function MoreSignInOptions({
  itemVariants,
  hydrated,
  submitting,
  ssoSubmitting,
  labels,
  onApple,
  onGoogle,
}: {
  itemVariants: Variants;
  hydrated: boolean;
  submitting: boolean;
  ssoSubmitting: "google" | "apple" | null;
  labels: Pick<LoginPanelActionLabels, "moreSignInOptions">;
  onApple: () => void;
  onGoogle: () => void;
}) {
  return (
    <motion.div variants={itemVariants} className="mt-3 grid gap-3">
      <details className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2">
        <summary className="zook-focus flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl text-xs font-semibold text-[var(--text-secondary)]">
          <span>{labels.moreSignInOptions}</span>
          <ChevronDown
            size={14}
            aria-hidden="true"
            className="text-[var(--text-tertiary)] transition group-open:rotate-180"
          />
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <ZookButton
            type="button"
            data-testid="login-apple"
            tone="secondary"
            fullWidth
            onClick={onApple}
            disabled={!hydrated || submitting || ssoSubmitting !== null}
            state={ssoSubmitting === "apple" ? "loading" : "idle"}
          >
            Apple
          </ZookButton>
          <ZookButton
            type="button"
            data-testid="login-google"
            tone="secondary"
            fullWidth
            onClick={onGoogle}
            disabled={!hydrated || submitting || ssoSubmitting !== null}
            state={ssoSubmitting === "google" ? "loading" : "idle"}
          >
            Google
          </ZookButton>
        </div>
      </details>
    </motion.div>
  );
}

export function OtpActionButtons({
  itemVariants,
  submitting,
  resendCooldown,
  labels,
  onResend,
  onChangeSignIn,
}: {
  itemVariants: Variants;
  submitting: boolean;
  resendCooldown: number;
  labels: Pick<LoginPanelActionLabels, "resendUnavailable" | "resendOtp" | "changeSignIn">;
  onResend: () => void;
  onChangeSignIn: () => void;
}) {
  return (
    <motion.div variants={itemVariants} className="mt-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <ZookButton
          type="button"
          onClick={onResend}
          disabled={submitting || resendCooldown > 0}
          fullWidth
          size="md"
          tone="secondary"
        >
          {resendCooldown > 0 ? labels.resendUnavailable : labels.resendOtp}
        </ZookButton>
        <ZookButton
          type="button"
          tone="ghost"
          fullWidth
          onClick={onChangeSignIn}
          disabled={submitting}
        >
          {labels.changeSignIn}
        </ZookButton>
      </div>
    </motion.div>
  );
}

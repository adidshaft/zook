"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ZookButton } from "./zook-button";

type LoginStage = "identifier" | "otp";

export function LoginStatusMessage({
  itemVariants,
  message,
  show,
}: {
  itemVariants: Variants;
  message: string;
  show: boolean;
}) {
  if (!show) {
    return null;
  }

  return (
    <motion.p
      variants={itemVariants}
      id="login-status"
      className="mb-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2 text-sm leading-5 text-[var(--text-secondary)]"
      role="alert"
      aria-live="polite"
    >
      {message}
    </motion.p>
  );
}

export function LoginSubmitButton({
  code,
  hydrated,
  labels,
  ssoSubmitting,
  stage,
  submitting,
}: {
  code: string;
  hydrated: boolean;
  labels: {
    sendOtp: string;
    sendingOtp: string;
    verifying: string;
    verifyContinue: string;
  };
  ssoSubmitting: "google" | "apple" | null;
  stage: LoginStage;
  submitting: "request" | "verify" | null;
}) {
  return (
    <ZookButton
      type="submit"
      data-testid={stage === "identifier" ? "login-send-code" : "login-verify-code"}
      className="mt-2"
      disabled={
        !hydrated ||
        submitting !== null ||
        ssoSubmitting !== null ||
        (stage === "otp" && !code.trim())
      }
      fullWidth
      state={submitting === null ? "idle" : "loading"}
      trailingIcon={<ArrowRight size={18} />}
    >
      {submitting === "request"
        ? labels.sendingOtp
        : submitting === "verify"
          ? labels.verifying
          : stage === "identifier"
            ? labels.sendOtp
            : labels.verifyContinue}
    </ZookButton>
  );
}

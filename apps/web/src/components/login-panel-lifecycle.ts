import { useEffect, type RefObject } from "react";

export function useLoginPanelLifecycle({
  emailRef,
  loginMethod,
  otpRef,
  phoneRef,
  resendCooldown,
  setHydrated,
  setResendCooldown,
  stage,
}: {
  emailRef: RefObject<HTMLInputElement | null>;
  loginMethod: "phone" | "email";
  otpRef: RefObject<HTMLInputElement | null>;
  phoneRef: RefObject<HTMLInputElement | null>;
  resendCooldown: number;
  setHydrated: (hydrated: boolean) => void;
  setResendCooldown: (update: (current: number) => number) => void;
  stage: "identifier" | "otp";
}) {
  useEffect(() => {
    setHydrated(true);
  }, [setHydrated]);

  useEffect(() => {
    if (stage === "identifier") {
      const timer = window.setTimeout(() => {
        if (loginMethod === "email") {
          emailRef.current?.focus();
        } else {
          phoneRef.current?.focus();
        }
      }, 80);
      return () => window.clearTimeout(timer);
    }
    if (stage === "otp") {
      otpRef.current?.focus();
    }
    return undefined;
  }, [emailRef, loginMethod, otpRef, phoneRef, stage]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown, setResendCooldown]);
}

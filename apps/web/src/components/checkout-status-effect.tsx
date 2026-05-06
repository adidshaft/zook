"use client";

import { useEffect } from "react";

export function CheckoutStatusEffect({
  status,
  redirectPath,
}: {
  status: string;
  redirectPath: string;
}) {
  useEffect(() => {
    if (status !== "SUCCEEDED") {
      return;
    }
    const timer = window.setTimeout(() => {
      window.location.assign(redirectPath);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [redirectPath, status]);

  return null;
}

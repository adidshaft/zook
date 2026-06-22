import type { Metadata } from "next";
import { CheckInLanding } from "@/components/check-in-landing";

export const metadata: Metadata = {
  title: "Check in · Zook",
  description: "Open the Zook app to check in at your gym.",
  robots: { index: false, follow: false },
};

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = params[key];
      if (typeof value === "string" && value) return value;
      if (Array.isArray(value) && value[0]) return value[0];
    }
    return "";
  };
  const qrPayload = pick("qrPayload", "payload", "p");
  const checkInCode = pick("checkInCode", "code", "c");

  return <CheckInLanding qrPayload={qrPayload} checkInCode={checkInCode} />;
}

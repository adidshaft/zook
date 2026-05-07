import { getAppEnv, isMockPaymentCompletionAllowed } from "@zook/core";
import { Prisma, prisma } from "@zook/db";
import { notFound } from "next/navigation";
import { CheckoutPanel } from "@/components/checkout-panel";
import { ZookLogo } from "@/components/zook-logo";

function getMetadataString(metadata: unknown, key: string) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function getMetadataObject(metadata: unknown) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
    return {};
  }
  return metadata as Record<string, unknown>;
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function safePaymentReturnUrl(value?: string) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "zook:" ||
      parsed.hostname !== "payments" ||
      parsed.pathname !== "/return" ||
      !parsed.searchParams.get("session")
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function planValidityLabel(plan: { durationDays: number | null; visitLimit: number | null }) {
  const parts = [
    plan.durationDays ? `${plan.durationDays} days` : null,
    plan.visitLimit
      ? `${plan.visitLimit} visit${plan.visitLimit === 1 ? "" : "s"}`
      : "Unlimited visits",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Gym-defined validity";
}

export default async function MockCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ return_url?: string | string[] }>;
}) {
  if (getAppEnv() === "production") {
    notFound();
  }
  const { sessionId } = await params;
  const resolvedSearchParams = await searchParams;
  let session = null;
  try {
    session = await prisma.paymentSession.findUnique({ where: { id: sessionId } });
  } catch {
    // Payment records may be unavailable during local samples.
  }
  const canRenderLocalDemo = sessionId === "demo" && getAppEnv() !== "production";
  if (!session && (isMockPaymentCompletionAllowed() || canRenderLocalDemo)) {
    session = { id: "demo", amountPaise: 224900, purpose: "MEMBERSHIP", status: "CREATED" };
  }
  const requestedReturnUrl = safePaymentReturnUrl(firstParam(resolvedSearchParams.return_url));
  if (session && "metadata" in session && requestedReturnUrl) {
    const metadata = getMetadataObject(session.metadata);
    if (metadata.return_url !== requestedReturnUrl) {
      session = await prisma.paymentSession.update({
        where: { id: session.id },
        data: {
          metadata: {
            ...metadata,
            return_url: requestedReturnUrl,
          } as Prisma.InputJsonValue,
        },
      });
    }
  }
  const sessionMetadata = session && "metadata" in session ? session.metadata : null;
  const metadataReturnUrl = safePaymentReturnUrl(
    getMetadataString(sessionMetadata, "return_url") ?? undefined,
  );
  const returnUrl = requestedReturnUrl ?? metadataReturnUrl;
  const subscriptionId = getMetadataString(sessionMetadata, "subscriptionId");
  const subscription = subscriptionId
    ? await prisma.memberSubscription.findUnique({
        where: { id: subscriptionId },
        select: { planId: true },
      })
    : null;
  const plan = subscription
    ? await prisma.membershipPlan.findUnique({
        where: { id: subscription.planId },
        select: { name: true, durationDays: true, visitLimit: true },
      })
    : null;
  const sessionSummary = session
    ? {
        id: session.id,
        amountPaise: session.amountPaise,
        purpose: session.purpose,
        status: session.status,
        planName: plan?.name ?? (session.id === "demo" ? "Sample membership" : null),
        validityLabel: plan ? planValidityLabel(plan) : null,
        activationLabel: "Confirmation required",
      }
    : null;

  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <div className="fixed inset-x-0 top-0 z-20 border-b border-amber-300/30 bg-amber-300 px-4 py-3 text-center text-sm font-semibold text-black shadow-lg shadow-amber-950/20">
        TEST MODE - No real payment. Click any outcome to simulate.
      </div>
      <div className="absolute left-5 top-5">
        <ZookLogo />
      </div>
      <CheckoutPanel session={sessionSummary} {...(returnUrl ? { returnUrl } : {})} />
    </main>
  );
}

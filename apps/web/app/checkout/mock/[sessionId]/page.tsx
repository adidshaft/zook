import { isMockPaymentCompletionAllowed } from "@zook/core";
import { prisma } from "@zook/db";
import { CheckoutPanel } from "@/components/checkout-panel";
import { ZookLogo } from "@/components/zook-logo";

function getMetadataString(metadata: unknown, key: string) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
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
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  let session = null;
  try {
    session = await prisma.paymentSession.findUnique({ where: { id: sessionId } });
  } catch {
    // Database is optional in local mock checkout.
  }
  if (!session && sessionId === "demo" && isMockPaymentCompletionAllowed()) {
    session = { id: "demo", amountPaise: 224900, purpose: "MEMBERSHIP", status: "CREATED" };
  }
  const sessionMetadata = session && "metadata" in session ? session.metadata : null;
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
        planName: plan?.name ?? (session.id === "demo" ? "Demo membership" : null),
        validityLabel: plan ? planValidityLabel(plan) : null,
        activationLabel: "server/mock confirmation only",
      }
    : null;

  return (
    <main className="grid min-h-screen place-items-center px-5 py-8">
      <div className="absolute left-5 top-5">
        <ZookLogo />
      </div>
      <CheckoutPanel session={sessionSummary} />
    </main>
  );
}

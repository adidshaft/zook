import { isMockPaymentCompletionAllowed } from "@zook/core";
import { prisma } from "@zook/db";
import { CheckoutPanel } from "@/components/checkout-panel";
import { ZookLogo } from "@/components/zook-logo";

export default async function MockCheckoutPage({
  params
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
  return (
    <main className="grid min-h-screen place-items-center px-5 py-8">
      <div className="absolute left-5 top-5">
        <ZookLogo />
      </div>
      <CheckoutPanel session={session} />
    </main>
  );
}

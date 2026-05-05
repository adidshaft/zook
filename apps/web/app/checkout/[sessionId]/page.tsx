import Link from "next/link";
import { prisma } from "@zook/db";
import { RazorpayCheckoutPanel } from "@/components/razorpay-checkout-panel";
import { ZookLogo } from "@/components/zook-logo";
import { formatInr, formatEnumLabel, formatDateTime } from "@/lib/format";

function readCheckoutData(metadata: unknown) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
    return null;
  }
  const providerCheckoutData = (metadata as Record<string, unknown>).providerCheckoutData;
  if (
    !providerCheckoutData ||
    Array.isArray(providerCheckoutData) ||
    typeof providerCheckoutData !== "object"
  ) {
    return null;
  }
  return providerCheckoutData as Record<string, unknown>;
}

function paymentPartnerLabel(provider: string) {
  return provider.toLowerCase() === "mock" ? "Zook payments" : formatEnumLabel(provider);
}

export default async function HostedCheckoutPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await prisma.paymentSession.findUnique({ where: { id: sessionId } });
  const checkoutData = session ? readCheckoutData(session.metadata) : null;

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-8">
        <div className="absolute left-5 top-5">
          <ZookLogo />
        </div>
        <div className="glass-panel w-full max-w-xl rounded-[28px] p-8">
          <p className="text-sm text-white/45">Payment link</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">This payment link is no longer active</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Please return to Zook and start checkout again.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-8">
      <div className="absolute left-5 top-5">
        <ZookLogo />
      </div>
      <div className="glass-panel w-full max-w-2xl rounded-[28px] p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-white/45">Secure payment</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              {formatInr(session.amountPaise)}
            </h1>
          </div>
          <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/75">
            {formatEnumLabel(session.status)}
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-white/60">
          Complete payment here. Your membership or order updates automatically after confirmation.
        </p>

        <div className="mt-6 grid gap-4 rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm text-white/70 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">For</p>
            <p className="mt-2 font-medium text-white">{formatEnumLabel(session.purpose)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Payment partner</p>
            <p className="mt-2 font-medium text-white">{paymentPartnerLabel(session.provider)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Status</p>
            <p className="mt-2 font-medium text-white">{formatEnumLabel(session.status)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Valid until</p>
            <p className="mt-2 font-medium text-white">{formatDateTime(session.expiresAt)}</p>
          </div>
        </div>

        {checkoutData ? (
          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">What happens next</p>
            <div className="mt-3 grid gap-3 text-sm text-white/70 md:grid-cols-3">
              {["Pay securely", "Zook confirms it", "Access updates"].map((step) => (
                <div key={step} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white">
                  {step}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {checkoutData?.provider === "razorpay" ? (
          <RazorpayCheckoutPanel
            checkoutData={checkoutData}
            sessionId={session.id}
            description={`${formatEnumLabel(session.purpose)} payment`}
          />
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/checkout/${session.id}`}
            className="zook-focus inline-flex items-center justify-center rounded-full bg-lime-300 px-5 py-3 font-semibold text-black"
          >
            Refresh status
          </Link>
          <Link
            href="/login"
            className="zook-focus inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm text-white/70 transition hover:bg-white/8"
          >
            Return to Zook
          </Link>
        </div>
      </div>
    </main>
  );
}

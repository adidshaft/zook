import Link from "next/link";
import { prisma } from "@zook/db";
import { ZookLogo } from "@/components/zook-logo";
import { formatInr, formatEnumLabel } from "@/lib/format";

function readCheckoutData(metadata: unknown) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
    return null;
  }
  const providerCheckoutData = (metadata as Record<string, unknown>).providerCheckoutData;
  if (!providerCheckoutData || Array.isArray(providerCheckoutData) || typeof providerCheckoutData !== "object") {
    return null;
  }
  return providerCheckoutData as Record<string, unknown>;
}

export default async function HostedCheckoutPage({
  params
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
          <p className="text-sm text-white/45">Checkout handoff</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Payment session not found</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            The session may have expired or the link is no longer valid.
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
            <p className="text-sm text-white/45">Hosted checkout handoff</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{formatInr(session.amountPaise)}</h1>
          </div>
          <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/75">
            {formatEnumLabel(session.provider)} · {formatEnumLabel(session.status)}
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-white/60">
          Memberships, shop orders, and billing only activate after the backend verifies the provider outcome. Redirects
          alone are never trusted.
        </p>

        <div className="mt-6 grid gap-4 rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm text-white/70 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Session</p>
            <p className="mt-2 break-all font-medium text-white">{session.id}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Provider reference</p>
            <p className="mt-2 break-all font-medium text-white">{session.providerRef ?? "Pending assignment"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Purpose</p>
            <p className="mt-2 font-medium text-white">{formatEnumLabel(session.purpose)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Expires</p>
            <p className="mt-2 font-medium text-white">{session.expiresAt.toISOString()}</p>
          </div>
        </div>

        {checkoutData ? (
          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Provider handoff</p>
            <div className="mt-3 grid gap-3 text-sm text-white/70 md:grid-cols-2">
              {Object.entries(checkoutData).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/35">{formatEnumLabel(key)}</p>
                  <p className="mt-1 break-all text-white">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
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

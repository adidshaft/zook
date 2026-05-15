import Link from "next/link";
import { Prisma, prisma } from "@zook/db";
import { CheckoutStatusEffect } from "@/components/checkout-status-effect";
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

function readMetadataObject(metadata: unknown) {
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

function paymentPartnerLabel(provider: string) {
  return provider.toLowerCase() === "mock" ? "Zook payments" : formatEnumLabel(provider);
}

export default async function HostedCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ return_url?: string | string[] }>;
}) {
  const { sessionId } = await params;
  const resolvedSearchParams = await searchParams;
  let session = await prisma.paymentSession.findUnique({ where: { id: sessionId } });
  const requestedReturnUrl = safePaymentReturnUrl(firstParam(resolvedSearchParams.return_url));
  if (session && requestedReturnUrl) {
    const metadata = readMetadataObject(session.metadata);
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
  const metadataReturnUrl = safePaymentReturnUrl(
    typeof readMetadataObject(session?.metadata).return_url === "string"
      ? (readMetadataObject(session?.metadata).return_url as string)
      : undefined,
  );
  const returnUrl = requestedReturnUrl ?? metadataReturnUrl;
  const checkoutData = session ? readCheckoutData(session.metadata) : null;
  const expiresAtMs = session ? new Date(session.expiresAt).getTime() : NaN;
  const expiresInMs = Number.isFinite(expiresAtMs) ? expiresAtMs - Date.now() : 0;
  const showExpiryWarning = expiresInMs > 0 && expiresInMs < 5 * 60 * 1000;
  const expiryMinutes = Math.max(0, Math.floor(expiresInMs / 60_000));
  const expirySeconds = Math.max(0, Math.floor((expiresInMs % 60_000) / 1000));

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-8">
        <div className="absolute left-5 top-5">
          <ZookLogo />
        </div>
        <div className="glass-panel w-full max-w-xl rounded-[28px] p-8">
          <p className="text-sm text-white/45">Payment link</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            This payment link is no longer active
          </h1>
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
        <CheckoutStatusEffect
          status={session.status}
          redirectPath={returnUrl ?? (session.purpose === "MEMBERSHIP" ? "/dashboard" : "/login")}
        />
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
        <p className="mt-2 text-sm font-medium text-lime-100">
          Secured by{" "}
          {session.provider.toLowerCase() === "razorpay"
            ? "Razorpay"
            : paymentPartnerLabel(session.provider)}
        </p>
        {showExpiryWarning ? (
          <div className="mt-5 rounded-[22px] border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
            This payment link expires in {expiryMinutes}m{" "}
            {expirySeconds.toString().padStart(2, "0")}s.
          </div>
        ) : null}
        {session.status === "SUCCEEDED" ? (
          <div className="mt-5 rounded-[22px] border border-lime-300/25 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">
            Payment confirmed. Redirecting you back to Zook in 3 seconds.
          </div>
        ) : null}

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
                <div
                  key={step}
                  className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white"
                >
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
            {...(returnUrl ? { returnUrl } : {})}
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
            href={returnUrl ?? "/login"}
            className="zook-focus inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm text-white/70 transition hover:bg-white/8"
          >
            Return to Zook
          </Link>
          <Link
            href={session.purpose === "MEMBERSHIP" ? "/me" : (returnUrl ?? "/me")}
            className="zook-focus inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm text-white/70 transition hover:bg-white/8"
          >
            {session.purpose === "MEMBERSHIP" ? "View subscription" : "Back to order"}
          </Link>
        </div>
      </div>
    </main>
  );
}

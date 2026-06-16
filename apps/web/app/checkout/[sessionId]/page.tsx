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
  const retryHref = returnUrl ?? "/login";
  const sessionStatus = session?.status ?? "MISSING";
  const isExpired = !Number.isFinite(expiresAtMs) || expiresInMs <= 0;
  const showRecoveryState =
    Boolean(session) &&
    (isExpired ||
      sessionStatus === "FAILED" ||
      sessionStatus === "CANCELLED" ||
      sessionStatus === "EXPIRED");
  const recoveryMessage = isExpired
    ? "This payment link has expired. Return to Zook and start a fresh checkout before trying again."
    : sessionStatus === "FAILED"
      ? "This payment attempt failed, so the membership was not activated. Start a fresh checkout from Zook to try again."
      : sessionStatus === "CANCELLED"
        ? "This payment session was cancelled before confirmation. Start a fresh checkout from Zook when you are ready."
        : sessionStatus === "EXPIRED"
          ? "This payment session expired before confirmation. Start a fresh checkout from Zook to continue."
          : "";

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-8">
        <div className="absolute left-5 top-5">
          <ZookLogo />
        </div>
        <div className="glass-panel w-full max-w-xl rounded-[28px] p-8">
          <p className="text-sm text-[var(--text-tertiary)]">Payment link</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
            This payment link is no longer active
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Please return to Zook and start checkout again.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="zook-focus inline-flex items-center justify-center rounded-full bg-[var(--accent-fill)] px-5 py-3 font-semibold text-[var(--text-on-accent)] transition hover:opacity-90"
            >
              Open Zook sign-in
            </Link>
            <Link
              href="/"
              className="zook-focus inline-flex items-center justify-center rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
            >
              Back to home
            </Link>
          </div>
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
            <p className="text-sm text-[var(--text-tertiary)]">Secure payment</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
              {formatInr(session.amountPaise)}
            </h1>
          </div>
          <div className="rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-1 text-xs text-[var(--text-secondary)]">
            {formatEnumLabel(session.status)}
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">
          Review your membership and continue through the hosted payment handoff. Your membership
          activates only after backend payment confirmation.
        </p>
        <p className="mt-2 text-sm font-medium text-[var(--accent-strong)]">
          Secured by{" "}
          {session.provider.toLowerCase() === "razorpay"
            ? "Razorpay"
            : paymentPartnerLabel(session.provider)}
        </p>
        {showExpiryWarning ? (
          <div className="mt-5 rounded-[22px] border border-[var(--feedback-warning)] bg-[var(--surface-warning-soft)] px-4 py-3 text-sm text-[var(--text-primary)]">
            This payment link expires in {expiryMinutes}m{" "}
            {expirySeconds.toString().padStart(2, "0")}s.
          </div>
        ) : null}
        {session.status === "SUCCEEDED" ? (
          <div className="mt-5 rounded-[22px] border border-[var(--feedback-success)] bg-[var(--surface-success-soft)] px-4 py-3 text-sm text-[var(--text-primary)]">
            Payment confirmed. Redirecting you back to Zook in 3 seconds.
          </div>
        ) : null}
        {showRecoveryState ? (
          <div className="mt-5 rounded-[22px] border border-[var(--feedback-danger)] bg-[var(--surface-danger-soft)] px-4 py-4 text-sm text-[var(--text-primary)]">
            <p className="font-semibold text-[var(--text-primary)]">Checkout needs to be restarted</p>
            <p className="mt-2 leading-6 text-[var(--text-secondary)]">{recoveryMessage}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={retryHref}
                className="zook-focus inline-flex items-center justify-center rounded-full bg-[var(--accent-fill)] px-5 py-3 font-semibold text-[var(--text-on-accent)] transition hover:opacity-90"
              >
                Return to Zook to retry
              </Link>
              <Link
                href={`/checkout/${session.id}`}
                className="zook-focus inline-flex items-center justify-center rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
              >
                Refresh status
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)] p-5 text-sm text-[var(--text-secondary)] md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">For</p>
            <p className="mt-2 font-medium text-[var(--text-primary)]">{formatEnumLabel(session.purpose)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Payment partner</p>
            <p className="mt-2 font-medium text-[var(--text-primary)]">{paymentPartnerLabel(session.provider)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Status</p>
            <p className="mt-2 font-medium text-[var(--text-primary)]">{formatEnumLabel(session.status)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Valid until</p>
            <p className="mt-2 font-medium text-[var(--text-primary)]">{formatDateTime(session.expiresAt)}</p>
          </div>
        </div>

        {checkoutData ? (
          <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[var(--bg-sunken)] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">What happens next</p>
            <div className="mt-3 grid gap-3 text-sm text-[var(--text-secondary)] md:grid-cols-3">
              {[
                "Secure hosted checkout",
                "Backend confirms payment",
                "Membership activates automatically",
              ].map((step, index) => (
                <div
                  key={step}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-[var(--text-primary)]"
                >
                  <span className="mr-2 text-[var(--accent-strong)]">{index + 1}.</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {checkoutData?.provider === "razorpay" && !showRecoveryState ? (
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
            className="zook-focus inline-flex items-center justify-center rounded-full bg-[var(--accent-fill)] px-5 py-3 font-semibold text-[var(--text-on-accent)] transition hover:opacity-90"
          >
            Refresh status
          </Link>
          <Link
            href={returnUrl ?? "/login"}
            className="zook-focus inline-flex items-center justify-center rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
          >
            Return to Zook
          </Link>
          <Link
            href={session.purpose === "MEMBERSHIP" ? "/me" : (returnUrl ?? "/me")}
            className="zook-focus inline-flex items-center justify-center rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
          >
            {session.purpose === "MEMBERSHIP" ? "View subscription" : "Back to order"}
          </Link>
        </div>
      </div>
    </main>
  );
}

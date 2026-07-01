import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Prisma, prisma } from "@zook/db";
import { CheckoutStatusEffect } from "@/components/checkout-status-effect";
import { HostedCheckoutExpiryNotice } from "@/components/hosted-checkout-expiry-notice";
import { RazorpayCheckoutPanel } from "@/components/razorpay-checkout-panel";
import { ZookLogo } from "@/components/zook-logo";
import { formatInr, formatEnumLabel, formatDateTime } from "@/lib/format";
import { localizedPath, resolvePublicLocale } from "@/lib/public-i18n";
import { publicSocialImage } from "@/lib/public-metadata";

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

function readStringMetadata(metadata: unknown, key: string) {
  const value = readMetadataObject(metadata)[key];
  return typeof value === "string" ? value : null;
}

export const metadata: Metadata = {
  title: "Checkout | Zook",
  description: "Complete your secure Zook payment checkout.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Checkout | Zook",
    description: "Complete your secure Zook payment checkout.",
    type: "website",
    images: [{ url: publicSocialImage(), alt: "Checkout | Zook" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Checkout | Zook",
    description: "Complete your secure Zook payment checkout.",
    images: [publicSocialImage()],
  },
};

type CheckoutCopy = {
  securePayment: string;
  forPrefix: string;
  atPrefix: string;
  securedBy: string;
  paymentUnavailable: string;
  linkDetails: string;
  linkDetailsSummary: string;
  sessionId: string;
  validUntil: string;
  nextTitle: string;
  nextSteps: string[];
  nextAutopaySteps: string[];
  paymentConfirmed: string;
  restartTitle: string;
  retry: string;
  refreshStatus: string;
  returnToZook: string;
  razorpay: {
    title: string;
    ready: string;
    recurringReady: string;
    amountDue: string;
    paySecurely: string;
    authorizeAutopay: string;
    tryAgain: string;
    incomplete: string;
    preparing: string;
    redirecting: string;
    submitted: string;
    recurringSubmitted: string;
    dismissed: string;
    loadFailed: string;
  };
  expiry: {
    expiredTitle: string;
    expiredBody: string;
    refreshStatus: string;
    returnToZook: string;
    expiresIn: (timeLeft: string) => string;
  };
  recovery: {
    expired: string;
    failed: string;
    cancelled: string;
    sessionExpired: string;
  };
};

const checkoutCopy = {
  en: {
    securePayment: "Secure payment",
    forPrefix: "for",
    atPrefix: "at",
    securedBy: "Secured by",
    paymentUnavailable:
      "Payment handoff is not available for this link. Return to Zook and start checkout again.",
    linkDetails: "Link details",
    linkDetailsSummary: "Session and expiry",
    sessionId: "Session ID",
    validUntil: "Valid until",
    nextTitle: "What happens next",
    nextSteps: [
      "Complete hosted checkout",
      "Zook confirms payment",
      "Membership activates automatically",
    ],
    nextAutopaySteps: [
      "Enable autopay once",
      "Zook saves the mandate",
      "Future renewals run automatically",
    ],
    paymentConfirmed: "Payment confirmed. Redirecting you back to Zook in 3 seconds.",
    restartTitle: "Checkout needs to be restarted",
    retry: "Return to Zook to retry",
    refreshStatus: "Refresh status",
    returnToZook: "Return to Zook",
    razorpay: {
      title: "Secure checkout",
      ready: "Ready for secure payment.",
      recurringReady: "Ready to enable autopay.",
      amountDue: "Amount due",
      paySecurely: "Pay securely",
      authorizeAutopay: "Enable autopay",
      tryAgain: "Try checkout again",
      incomplete: "Payment details are incomplete. Please start again from Zook.",
      preparing: "Preparing secure payment...",
      redirecting: "Redirecting to Razorpay...",
      submitted: "Payment submitted. Waiting for confirmation.",
      recurringSubmitted: "Autopay setup submitted. Waiting for confirmation.",
      dismissed:
        "Razorpay was closed before confirmation. Retry checkout here or return to Zook to start a new payment link.",
      loadFailed: "Unable to load the payment window. Check the network and retry.",
    },
    expiry: {
      expiredTitle: "This payment link has expired.",
      expiredBody: "Refresh the session status, or return to Zook to start checkout again.",
      refreshStatus: "Refresh status",
      returnToZook: "Return to Zook",
      expiresIn: (timeLeft: string) => `This payment link expires in ${timeLeft}.`,
    },
    recovery: {
      expired:
        "This payment link has expired. Return to Zook and start a new checkout before trying again.",
      failed:
        "This payment attempt failed, so the membership was not activated. Start a new checkout from Zook to try again.",
      cancelled:
        "This payment session was cancelled before confirmation. Start a new checkout from Zook to continue.",
      sessionExpired:
        "This payment session expired before confirmation. Start a new checkout from Zook to continue.",
    },
  },
  hi: {
    securePayment: "सुरक्षित भुगतान",
    forPrefix: "के लिए",
    atPrefix: "जिम",
    securedBy: "सुरक्षित पार्टनर",
    paymentUnavailable:
      "इस लिंक से भुगतान शुरू नहीं हो पा रहा है. Zook पर वापस जाकर भुगतान फिर से शुरू करें.",
    linkDetails: "भुगतान लिंक",
    linkDetailsSummary: "सेशन और समाप्ति समय",
    sessionId: "सेशन ID",
    validUntil: "मान्य समय",
    nextTitle: "आगे क्या होगा",
    nextSteps: [
      "सुरक्षित चेकआउट पूरा करें",
      "Zook भुगतान की पुष्टि करेगा",
      "सदस्यता अपने-आप सक्रिय होगी",
    ],
    nextAutopaySteps: [
      "एक बार ऑटो-पे चालू करें",
      "Zook mandate सेव करेगा",
      "आगे renewals अपने-आप होंगे",
    ],
    paymentConfirmed: "भुगतान पुष्टि हो गया. 3 सेकंड में Zook पर वापस भेज रहे हैं.",
    restartTitle: "भुगतान फिर से शुरू करना होगा",
    retry: "फिर कोशिश करने के लिए Zook पर वापस जाएं",
    refreshStatus: "स्थिति रीफ्रेश करें",
    returnToZook: "Zook पर वापस जाएं",
    razorpay: {
      title: "सुरक्षित भुगतान",
      ready: "सुरक्षित भुगतान के लिए तैयार.",
      recurringReady: "ऑटो-पे चालू करने के लिए तैयार.",
      amountDue: "देय राशि",
      paySecurely: "सुरक्षित भुगतान करें",
      authorizeAutopay: "ऑटो-पे चालू करें",
      tryAgain: "फिर कोशिश करें",
      incomplete: "भुगतान विवरण अधूरा है. Zook से फिर शुरू करें.",
      preparing: "सुरक्षित भुगतान तैयार हो रहा है...",
      redirecting: "Razorpay पर भेज रहे हैं...",
      submitted: "भुगतान भेज दिया गया है. पुष्टि का इंतज़ार है.",
      recurringSubmitted: "ऑटो-पे सेटअप भेज दिया गया है. पुष्टि का इंतज़ार है.",
      dismissed:
        "पुष्टि से पहले Razorpay बंद हो गया. यहां फिर कोशिश करें या Zook से नया भुगतान लिंक शुरू करें.",
      loadFailed: "भुगतान विंडो लोड नहीं हो पाई. नेटवर्क जांचकर फिर कोशिश करें.",
    },
    expiry: {
      expiredTitle: "यह भुगतान लिंक समाप्त हो गया है.",
      expiredBody: "स्थिति रीफ्रेश करें, या Zook पर वापस जाकर भुगतान फिर से शुरू करें.",
      refreshStatus: "स्थिति रीफ्रेश करें",
      returnToZook: "Zook पर वापस जाएं",
      expiresIn: (timeLeft: string) => `यह भुगतान लिंक ${timeLeft} में समाप्त होगा.`,
    },
    recovery: {
      expired:
        "यह भुगतान लिंक समाप्त हो गया है. फिर कोशिश करने से पहले Zook पर वापस जाकर नया चेकआउट शुरू करें.",
      failed:
        "यह भुगतान सफल नहीं हुआ, इसलिए सदस्यता सक्रिय नहीं हुई. फिर कोशिश करने के लिए Zook से नया चेकआउट शुरू करें.",
      cancelled:
        "भुगतान पुष्टि से पहले यह सेशन रद्द हो गया. जारी रखने के लिए Zook से नया चेकआउट शुरू करें.",
      sessionExpired:
        "भुगतान पुष्टि से पहले यह सेशन समाप्त हो गया. जारी रखने के लिए Zook से नया चेकआउट शुरू करें.",
    },
  },
} satisfies Record<ReturnType<typeof resolvePublicLocale>, CheckoutCopy>;

export default async function HostedCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ return_url?: string | string[]; lang?: string | string[] }>;
}) {
  const { sessionId } = await params;
  const resolvedSearchParams = await searchParams;
  const locale = resolvePublicLocale(resolvedSearchParams);
  const isHindi = locale === "hi";
  const copy = checkoutCopy[locale];
  const missingCopy = isHindi
    ? {
        eyebrow: "भुगतान लिंक",
        title: "यह भुगतान लिंक अब सक्रिय नहीं है",
        body: "Zook पर वापस जाएं और चेकआउट फिर से शुरू करें.",
        signIn: "Zook लॉगिन खोलें",
        home: "होम पर वापस जाएं",
      }
    : {
        eyebrow: "Payment link",
        title: "This payment link is no longer active",
        body: "Please return to Zook and start checkout again.",
        signIn: "Open Zook sign-in",
        home: "Back to home",
      };
  let session = null;
  try {
    session = await prisma.paymentSession.findUnique({ where: { id: sessionId } });
  } catch {
    // Render the recovery state when payment storage is unavailable.
  }
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
  const isAutopayCheckout = Boolean(
    checkoutData &&
      typeof checkoutData.subscriptionId === "string" &&
      checkoutData.subscriptionId.trim(),
  );
  const nextSteps = isAutopayCheckout ? copy.nextAutopaySteps : copy.nextSteps;
  const metadataPlanId = readStringMetadata(session?.metadata, "planId");
  const metadataSubscriptionId = readStringMetadata(session?.metadata, "subscriptionId");
  const metadataPlanName = readStringMetadata(session?.metadata, "planName");
  const metadataTier = readStringMetadata(session?.metadata, "tier");
  const metadataBillingCycle = readStringMetadata(session?.metadata, "billingCycle");
  const [organization, planFromMetadata, subscriptionFromMetadata] = await Promise.all([
    session?.orgId
      ? prisma.organization.findUnique({
          where: { id: session.orgId },
          select: { name: true },
        })
      : Promise.resolve(null),
    metadataPlanId
      ? prisma.membershipPlan.findUnique({
          where: { id: metadataPlanId },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    metadataSubscriptionId
      ? prisma.memberSubscription.findUnique({
          where: { id: metadataSubscriptionId },
          select: { planId: true },
        })
      : Promise.resolve(null),
  ]);
  const planFromSubscription =
    !planFromMetadata && subscriptionFromMetadata?.planId
      ? await prisma.membershipPlan.findUnique({
          where: { id: subscriptionFromMetadata.planId },
          select: { name: true },
        })
      : null;
  const checkoutPlanName =
    planFromMetadata?.name ??
    planFromSubscription?.name ??
    metadataPlanName ??
    (session?.purpose === "SAAS_BILLING" && metadataTier && metadataBillingCycle
      ? `Zook ${metadataTier.toLowerCase()} ${metadataBillingCycle.toLowerCase()}`
      : null);
  const checkoutOrgName = organization?.name ?? null;
  const expiresAtMs = session ? new Date(session.expiresAt).getTime() : NaN;
  const expiresInMs = Number.isFinite(expiresAtMs) ? expiresAtMs - Date.now() : 0;
  const retryHref = returnUrl ?? "/login";
  const sessionStatus = session?.status ?? "MISSING";
  const isExpired = !Number.isFinite(expiresAtMs) || expiresInMs <= 0;
  const showRecoveryState =
    Boolean(session) &&
    (isExpired ||
      sessionStatus === "FAILED" ||
      sessionStatus === "CANCELLED" ||
      sessionStatus === "EXPIRED");
  const recovery = copy.recovery;
  const recoveryMessage = isExpired
    ? recovery.expired
    : sessionStatus === "FAILED"
      ? recovery.failed
      : sessionStatus === "CANCELLED"
        ? recovery.cancelled
        : sessionStatus === "EXPIRED"
          ? recovery.sessionExpired
          : "";

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-start gap-5 px-5 pb-8 pt-[clamp(2rem,12vh,8rem)]">
        <div className="w-full max-w-xl">
          <ZookLogo />
        </div>
        <div className="glass-panel w-full max-w-xl rounded-[28px] p-8">
          <p className="text-sm text-[var(--text-tertiary)]">{missingCopy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
            {missingCopy.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            {missingCopy.body}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={localizedPath("/login", locale)}
              className="zook-focus inline-flex items-center justify-center rounded-full bg-[var(--accent-fill)] px-5 py-3 font-semibold text-[var(--text-on-accent)] transition hover:opacity-90"
            >
              {missingCopy.signIn}
            </Link>
            <Link
              href={localizedPath("/", locale)}
              className="zook-focus inline-flex items-center justify-center rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
            >
              {missingCopy.home}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start gap-4 px-4 pb-8 pt-[clamp(1.25rem,8vh,5rem)] sm:px-5">
      <div className="w-full max-w-xl">
        <ZookLogo />
      </div>
      <div className="glass-panel w-full max-w-xl rounded-[28px] p-4 md:p-6">
        <CheckoutStatusEffect
          status={session.status}
          redirectPath={returnUrl ?? (session.purpose === "MEMBERSHIP" ? "/dashboard" : "/login")}
        />
        <div className="rounded-[24px] border border-[var(--border-focus)]/30 bg-[var(--bg-sunken)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                {copy.securePayment}
              </p>
              <h1 className="metric mt-2 text-5xl font-semibold tracking-tight text-[var(--accent-strong)]">
                {formatInr(session.amountPaise)}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {checkoutPlanName
                  ? `${copy.forPrefix} ${checkoutPlanName}`
                  : `${copy.forPrefix} ${formatEnumLabel(session.purpose)}`}
                {checkoutOrgName ? ` ${copy.atPrefix} ${checkoutOrgName}` : ""}.
              </p>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
              {formatEnumLabel(session.status)}
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-[var(--text-tertiary)]">
            {copy.securedBy}{" "}
            {session.provider.toLowerCase() === "razorpay"
              ? "Razorpay"
              : paymentPartnerLabel(session.provider)}
          </p>
        </div>

        {!showRecoveryState ? (
          <HostedCheckoutExpiryNotice
            expiresAt={session.expiresAt}
            retryHref={retryHref}
            labels={copy.expiry}
          />
        ) : null}
        {checkoutData?.provider === "razorpay" && !showRecoveryState ? (
          <RazorpayCheckoutPanel
            checkoutData={checkoutData}
            sessionId={session.id}
            description={
              isAutopayCheckout
                ? `${formatEnumLabel(session.purpose)} autopay authorization`
                : `${formatEnumLabel(session.purpose)} payment`
            }
            labels={copy.razorpay}
            {...(returnUrl ? { returnUrl } : {})}
          />
        ) : null}
        {!checkoutData && !showRecoveryState ? (
          <div className="mt-5 rounded-[22px] border border-[var(--border)] bg-[var(--surface-warning-soft)] px-4 py-3 text-sm text-[var(--text-primary)]">
            {copy.paymentUnavailable}
          </div>
        ) : null}

        <details className="group mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3">
          <summary className="zook-focus flex cursor-pointer list-none items-center gap-2 rounded-2xl text-sm font-semibold text-[var(--text-primary)]">
            <span className="min-w-0 flex-1 truncate">{copy.linkDetails}</span>
            <span className="max-w-[10rem] truncate text-xs font-medium text-[var(--text-tertiary)]">
              {copy.linkDetailsSummary}
            </span>
            <ChevronDown
              size={15}
              aria-hidden="true"
              className="shrink-0 text-[var(--text-secondary)] transition group-open:rotate-180"
            />
          </summary>
          <div className="mt-4 grid gap-4 text-sm text-[var(--text-secondary)] md:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-[var(--text-tertiary)]">
                {copy.sessionId}
              </p>
              <p className="mt-1 break-all font-medium text-[var(--text-primary)]">
                {session.id}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--text-tertiary)]">
                {copy.validUntil}
              </p>
              <p className="mt-1 font-medium text-[var(--text-primary)]">{formatDateTime(session.expiresAt)}</p>
            </div>
          </div>
          {checkoutData ? (
            <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                {copy.nextTitle}
              </p>
              <div className="mt-3 grid gap-2 text-sm text-[var(--text-secondary)]">
              {nextSteps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2 text-[var(--text-primary)]"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-accent-soft)] text-xs font-semibold text-[var(--accent-strong)]">
                    {index + 1}
                  </span>
                  {step}
                </div>
              ))}
              </div>
            </div>
          ) : null}
          {!showRecoveryState ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--border-subtle)] pt-4">
              <Link
                href={returnUrl ?? "/login"}
                className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--border)] px-4 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
              >
                {copy.returnToZook}
              </Link>
              <Link
                href={`/checkout/${session.id}`}
                className="zook-focus text-xs font-medium text-[var(--text-tertiary)] underline-offset-4 transition hover:text-[var(--text-primary)] hover:underline"
              >
                {copy.refreshStatus}
              </Link>
            </div>
          ) : null}
        </details>

        {session.status === "SUCCEEDED" ? (
          <div className="mt-5 rounded-[22px] border border-[var(--feedback-success)] bg-[var(--surface-success-soft)] px-4 py-3 text-sm text-[var(--text-primary)]">
            {copy.paymentConfirmed}
          </div>
        ) : null}
        {showRecoveryState ? (
          <div className="mt-5 rounded-[22px] border border-[var(--feedback-danger)] bg-[var(--surface-danger-soft)] px-4 py-4 text-sm text-[var(--text-primary)]">
            <p className="font-semibold text-[var(--text-primary)]">
              {copy.restartTitle}
            </p>
            <p className="mt-2 leading-6 text-[var(--text-secondary)]">{recoveryMessage}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={retryHref}
                className="zook-focus inline-flex items-center justify-center rounded-full bg-[var(--accent-fill)] px-5 py-3 font-semibold text-[var(--text-on-accent)] transition hover:opacity-90"
              >
                {copy.retry}
              </Link>
              <Link
                href={`/checkout/${session.id}`}
                className="zook-focus inline-flex items-center justify-center rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
              >
                {copy.refreshStatus}
              </Link>
            </div>
          </div>
        ) : null}

      </div>
    </main>
  );
}

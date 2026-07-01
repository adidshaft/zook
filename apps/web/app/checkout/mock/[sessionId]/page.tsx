import { getAppEnv, isMockPaymentCompletionAllowed } from "@zook/core";
import { Prisma, prisma } from "@zook/db";
import { notFound } from "next/navigation";
import { CheckoutPanel } from "@/components/checkout-panel";
import { ZookLogo } from "@/components/zook-logo";
import { resolvePublicLocale } from "@/lib/public-i18n";
import { planValiditySummaryLabel } from "@/lib/public-plan-labels";

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

function demoAmountPaise(value?: string | string[]) {
  const raw = firstParam(value);
  if (!raw) return 224900;
  const amount = Number(raw);
  if (!Number.isInteger(amount) || amount < 0 || amount > 10_00_000_00) {
    return 224900;
  }
  return amount;
}

export default async function MockCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ amount?: string | string[]; return_url?: string | string[] }>;
}) {
  if (getAppEnv() === "production") {
    notFound();
  }
  const { sessionId } = await params;
  const resolvedSearchParams = await searchParams;
  const locale = resolvePublicLocale(resolvedSearchParams);
  const copy =
    locale === "hi"
      ? {
          testMembership: "टेस्ट सदस्यता",
          confirmationRequired: "पुष्टि आवश्यक",
          paymentConfirmation: "भुगतान पुष्टि",
          testMode: "टेस्ट मोड · असली भुगतान नहीं",
          initialMessage: "इस टेस्ट भुगतान का परिणाम चुनें.",
          confirmedMessage: "भुगतान पुष्टि हो गया. सदस्यता अब Zook में अपडेट होगी.",
          autopayNextTitle: "पेमेंट के बाद: ऑटो-पे",
          autopayNextBody:
            "Zook में सदस्यता खुलने के बाद एक टैप से ऑटो-पे चालू कर सकते हैं. इसे बाद में बंद भी किया जा सकता है.",
          pendingMessage: "भुगतान लंबित है. पुष्टि तक सदस्यता सक्रिय नहीं होगी.",
          failedMessage: "भुगतान असफल रहा. सदस्यता सक्रिय नहीं हुई.",
          testStateUpdated: "टेस्ट भुगतान स्थिति अपडेट हुई.",
          confirmPayment: "भुगतान पुष्टि करें",
          confirmPaymentAmount: "{amount} भुगतान पुष्टि करें",
          otherOutcomes: "अन्य टेस्ट परिणाम",
          markPending: "लंबित करें",
          markFailed: "असफल करें",
          openInZook: "Zook ऐप खोलें",
          sessionNotFound: "भुगतान सेशन नहीं मिला.",
          statusCreated: "बना हुआ",
          statusPaid: "भुगतान हुआ",
          statusPending: "लंबित",
          statusFailed: "असफल",
        }
      : {
          testMembership: "Test membership",
          confirmationRequired: "Confirmation required",
          paymentConfirmation: "Payment confirmation",
          testMode: "Test mode · no real payment",
          initialMessage: "Choose an outcome to simulate this payment session.",
          confirmedMessage: "Payment confirmed. Membership will update in Zook.",
          autopayNextTitle: "After payment: autopay",
          autopayNextBody:
            "After Zook opens your membership, you can set up autopay in one tap from your membership page and cancel it later.",
          pendingMessage: "Payment is pending. Membership stays inactive until confirmation.",
          failedMessage: "Payment failed. Membership was not activated.",
          testStateUpdated: "Test payment state updated.",
          confirmPayment: "Confirm payment",
          confirmPaymentAmount: "Confirm {amount} payment",
          otherOutcomes: "Other test outcomes",
          markPending: "Mark pending",
          markFailed: "Mark failed",
          openInZook: "Open in Zook app",
          sessionNotFound: "Payment session not found.",
          statusCreated: "Created",
          statusPaid: "Paid",
          statusPending: "Pending",
          statusFailed: "Failed",
        };
  let session = null;
  try {
    session = await prisma.paymentSession.findUnique({ where: { id: sessionId } });
  } catch {
    // Payment records may be unavailable during local test runs.
  }
  const canRenderLocalDemo = sessionId === "demo" && getAppEnv() !== "production";
  if (!session && (isMockPaymentCompletionAllowed() || canRenderLocalDemo)) {
    session = {
      id: "demo",
      amountPaise: demoAmountPaise(resolvedSearchParams.amount),
      purpose: "MEMBERSHIP",
      status: "CREATED",
    };
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
        planName: plan?.name ?? (session.id === "demo" ? copy.testMembership : null),
        validityLabel: plan ? planValiditySummaryLabel(plan, locale) : null,
        activationLabel: copy.confirmationRequired,
      }
    : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-start gap-5 px-5 pb-8 pt-[clamp(2rem,12vh,8rem)]">
      <div className="w-full max-w-xl">
        <ZookLogo />
      </div>
      <CheckoutPanel
        session={sessionSummary}
        labels={{
          paymentConfirmation: copy.paymentConfirmation,
          confirmationRequired: copy.confirmationRequired,
          testMode: copy.testMode,
          initialMessage: copy.initialMessage,
          confirmedMessage: copy.confirmedMessage,
          pendingMessage: copy.pendingMessage,
          failedMessage: copy.failedMessage,
          testStateUpdated: copy.testStateUpdated,
          confirmPayment: copy.confirmPayment,
          confirmPaymentAmount: copy.confirmPaymentAmount,
          otherOutcomes: copy.otherOutcomes,
          markPending: copy.markPending,
          markFailed: copy.markFailed,
          openInZook: copy.openInZook,
          sessionNotFound: copy.sessionNotFound,
          statusCreated: copy.statusCreated,
          statusPaid: copy.statusPaid,
          statusPending: copy.statusPending,
          statusFailed: copy.statusFailed,
          autopayNextTitle: copy.autopayNextTitle,
          autopayNextBody: copy.autopayNextBody,
        }}
        {...(returnUrl ? { returnUrl } : {})}
      />
    </main>
  );
}

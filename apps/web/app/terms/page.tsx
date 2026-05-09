import { PublicNav } from "@/components/public-nav";
import { GlassCard } from "@/components/glass-card";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";

const termsCopy = {
  en: {
    eyebrow: "Terms",
    title: "Zook terms of service",
    updated: "Last updated May 2026",
    intro:
      "These terms explain the rules for using Zook, operated by Kyoka Suigetsu LLP in India, as a gym owner, staff member, trainer, or member.",
    sections: [
      [
        "What Zook provides",
        "Zook is gym management software for public gym profiles, membership purchase flows, attendance, staff operations, trainer workflows, shop orders, notifications, receipts, invoices, and support records.",
      ],
      [
        "Gym responsibility",
        "Gyms are responsible for their public profile, branches, plans, trainer content, pricing, taxes, local compliance, membership approvals, attendance decisions, refunds, and the accuracy of information they publish.",
      ],
      [
        "Member access",
        "Memberships, approvals, renewals, pauses, entry rules, trainer access, shop pickup, and refunds are controlled by the gym. Zook provides the software record and workflow.",
      ],
      [
        "Payments",
        "Payment availability depends on the configured provider. Amounts are shown before payment, and successful payments may activate eligible memberships automatically. Payments may open Razorpay or another secure provider in the browser.",
      ],
      [
        "Refunds and cancellations",
        "Gym membership refunds and cancellations are controlled by the gym unless Zook is explicitly shown as the merchant of record. Duplicate, failed, or accidental platform charges can be reviewed by writing to support@zookfit.in with the payment reference.",
      ],
      [
        "Acceptable use",
        "Do not misuse Zook, bypass access controls, share another person's entry code, upload harmful content, impersonate others, or use demo data as a substitute for real member consent.",
      ],
      [
        "Support",
        "For account, billing, or operational support, write to support@zookfit.in with your gym name and the phone or email on your account.",
      ],
    ],
  },
  hi: {
    eyebrow: "शर्तें",
    title: "Zook सेवा शर्तें",
    updated: "आखिरी अपडेट मई 2026",
    intro:
      "ये शर्तें बताती हैं कि भारत में Kyoka Suigetsu LLP द्वारा चलाए जाने वाले Zook को जिम मालिक, स्टाफ, ट्रेनर या सदस्य के रूप में इस्तेमाल करने के नियम क्या हैं.",
    sections: [
      [
        "Zook क्या देता है",
        "Zook public gym profile, membership purchase flow, attendance, staff operations, trainer workflow, shop orders, notifications, receipts, invoices और support records के लिए gym management software है.",
      ],
      [
        "जिम की जिम्मेदारी",
        "जिम अपने public profile, branches, plans, trainer content, pricing, taxes, local compliance, membership approvals, attendance decisions, refunds और प्रकाशित जानकारी की सटीकता के लिए जिम्मेदार हैं.",
      ],
      [
        "सदस्य पहुंच",
        "Membership, approvals, renewals, pauses, entry rules, trainer access, shop pickup और refunds जिम नियंत्रित करता है. Zook software record और workflow देता है.",
      ],
      [
        "भुगतान",
        "भुगतान उपलब्धता configured provider पर निर्भर करती है. राशि भुगतान से पहले दिखती है और successful payment योग्य membership को automatically active कर सकता है. भुगतान browser में Razorpay या किसी secure provider पर खुल सकता है.",
      ],
      [
        "रिफंड और cancellation",
        "Gym membership refunds और cancellations जिम नियंत्रित करता है जब तक Zook को साफ तौर पर merchant of record न दिखाया जाए. Duplicate, failed या accidental platform charges के लिए payment reference के साथ support@zookfit.in पर लिखें.",
      ],
      [
        "स्वीकार्य उपयोग",
        "Zook का दुरुपयोग, access controls bypass, किसी और का entry code share, harmful content upload, impersonation, या demo data को वास्तविक member consent के स्थान पर इस्तेमाल न करें.",
      ],
      [
        "सहायता",
        "Account, billing या operational support के लिए support@zookfit.in पर जिम नाम और account का phone या email लिखें.",
      ],
    ],
  },
};

export default async function TermsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePublicLocale((await searchParams) ?? {});
  const nextLocale = alternatePublicLocale(locale);
  const copy = termsCopy[locale];
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);

  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-screen px-5 py-5">
      <div className="mx-auto max-w-4xl">
        <PublicNav
          loginHref={localizedPath("/login", locale)}
          loginLabel={t("login")}
          languageHref={localizedPath("/terms", nextLocale)}
          languageLabel={t("languageSwitch")}
          backHref={localizedPath("/", locale)}
          backLabel={t("home")}
        />
        <GlassCard variant="strong" className="mt-4 p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-lime-200/70">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-white/38">
            {copy.updated}
          </p>
          <p className="mt-5 text-base leading-7 text-white/62">{copy.intro}</p>
          <div className="mt-8 grid gap-4">
            {copy.sections.map(([title, body]) => (
              <section key={title} className="rounded-[22px] border border-white/10 bg-black/20 p-5">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/58">{body}</p>
              </section>
            ))}
          </div>
        </GlassCard>
      </div>
    </main>
  );
}

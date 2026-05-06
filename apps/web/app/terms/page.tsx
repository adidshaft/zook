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
    intro:
      "These terms explain the rules for using Zook as a gym owner, staff member, trainer, or member.",
    sections: [
      [
        "Gym responsibility",
        "Gyms are responsible for their public profile, plans, trainer content, pricing, refunds, attendance decisions, and any local compliance obligations.",
      ],
      [
        "Member access",
        "Memberships, approvals, renewals, pauses, and refunds are controlled by the gym. Zook provides the software record and payment workflow.",
      ],
      [
        "Payments",
        "Payment availability depends on the configured provider. Amounts are shown before payment, and successful payments activate eligible memberships automatically.",
      ],
      [
        "Acceptable use",
        "Do not misuse Zook, bypass access controls, upload harmful content, or use demo data as a substitute for real member consent.",
      ],
    ],
  },
  hi: {
    eyebrow: "शर्तें",
    title: "Zook सेवा शर्तें",
    intro:
      "ये शर्तें बताती हैं कि जिम मालिक, स्टाफ, ट्रेनर या सदस्य के रूप में Zook इस्तेमाल करने के नियम क्या हैं.",
    sections: [
      [
        "जिम की जिम्मेदारी",
        "जिम अपने सार्वजनिक प्रोफाइल, प्लान, ट्रेनर सामग्री, कीमत, रिफंड, उपस्थिति फैसलों और स्थानीय अनुपालन के लिए जिम्मेदार हैं.",
      ],
      [
        "सदस्य पहुंच",
        "सदस्यता, स्वीकृति, नवीनीकरण, रोक और रिफंड जिम नियंत्रित करता है. Zook सॉफ्टवेयर रिकॉर्ड और भुगतान वर्कफ्लो देता है.",
      ],
      [
        "भुगतान",
        "भुगतान उपलब्धता कॉन्फ़िगर किए गए प्रदाता पर निर्भर करती है. राशि भुगतान से पहले दिखती है और सफल भुगतान योग्य सदस्यता सक्रिय करता है.",
      ],
      [
        "स्वीकार्य उपयोग",
        "Zook का दुरुपयोग, एक्सेस नियंत्रण bypass, हानिकारक सामग्री अपलोड, या demo data को वास्तविक सदस्य सहमति के स्थान पर इस्तेमाल न करें.",
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

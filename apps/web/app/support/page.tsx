import { GlassCard } from "@/components/glass-card";
import { AccountAwareNav } from "@/components/public/nav/account-aware-nav";
import { PublicNav } from "@/components/public/nav/public-nav";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";

const supportCopy = {
  en: {
    eyebrow: "Support",
    title: "Zook support",
    emailCta: "Email support",
    quickTitle: "Send these details",
    quickItems: ["Gym name", "Registered phone/email", "Branch if relevant", "Payment or order reference"],
    intro:
      "For account, billing, gym setup, membership, attendance, payment, refund, privacy, or app support, write to support@zookfit.in.",
    sections: [
      [
        "What to include",
        "Share your gym name, your registered phone or email, the branch if relevant, and any payment or order reference. This helps us find the right record quickly.",
      ],
      [
        "Gym memberships and refunds",
        "Gym membership access, pauses, cancellations, and refunds are usually controlled by the gym. Zook can help route the request and review duplicate, failed, or accidental platform charges.",
      ],
      [
        "Privacy requests",
        "Members can request data export or deletion from the app, or by emailing support@zookfit.in with the phone or email on the account.",
      ],
    ],
  },
  hi: {
    eyebrow: "सहायता",
    title: "Zook सहायता",
    emailCta: "सहायता ईमेल करें",
    quickTitle: "ये जानकारी भेजें",
    quickItems: ["जिम का नाम", "रजिस्टर्ड फोन/ईमेल", "जरूरत हो तो ब्रांच", "भुगतान या ऑर्डर रेफरेंस"],
    intro:
      "अकाउंट, बिलिंग, जिम सेटअप, सदस्यता, अटेंडेंस, भुगतान, रिफंड, गोपनीयता या ऐप सहायता के लिए support@zookfit.in पर लिखें.",
    sections: [
      [
        "क्या लिखें",
        "जिम का नाम, रजिस्टर्ड फोन या ईमेल, जरूरत हो तो ब्रांच, और भुगतान या ऑर्डर रेफरेंस भेजें. इससे सही रिकॉर्ड जल्दी मिल जाता है.",
      ],
      [
        "सदस्यता और रिफंड",
        "जिम सदस्यता का एक्सेस, रोकना, रद्द करना और रिफंड आमतौर पर जिम नियंत्रित करता है. Zook अनुरोध सही जगह भेजने और डुप्लिकेट, असफल या गलती से लगे प्लेटफॉर्म चार्ज की समीक्षा में मदद कर सकता है.",
      ],
      [
        "गोपनीयता अनुरोध",
        "सदस्य ऐप से डेटा एक्सपोर्ट या डिलीशन अनुरोध कर सकते हैं, या अकाउंट के फोन/ईमेल के साथ support@zookfit.in पर लिख सकते हैं.",
      ],
    ],
  },
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePublicLocale((await searchParams) ?? {});
  const nextLocale = alternatePublicLocale(locale);
  const copy = supportCopy[locale];
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);

  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-screen px-5 py-5">
      <div className="mx-auto max-w-4xl">
        <PublicNav
          locale={locale}
          languageHref={localizedPath("/support", nextLocale)}
          languageLabel={t("languageSwitch")}
          backHref={localizedPath("/", locale)}
          backLabel={t("home")}
        >
          <AccountAwareNav locale={locale} />
        </PublicNav>
        <GlassCard variant="strong" className="mt-4 p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-lime-200/70">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            {copy.title}
          </h1>
          <div className="mt-5 grid gap-5 md:grid-cols-[1fr_0.82fr] md:items-start">
            <div>
              <p className="text-base leading-7 text-white/62">{copy.intro}</p>
              <a
                href="mailto:support@zookfit.in"
                className="mt-6 inline-flex rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-lime-200"
              >
                {copy.emailCta}
              </a>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-white">{copy.quickTitle}</p>
              <ul className="mt-3 grid gap-2">
                {copy.quickItems.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-white/62">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
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

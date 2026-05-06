import { PublicNav } from "@/components/public-nav";
import { GlassCard } from "@/components/glass-card";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";

const privacyCopy = {
  en: {
    eyebrow: "Privacy",
    title: "Zook privacy policy",
    intro:
      "Zook stores gym, membership, attendance, payment, trainer, and support records so gyms can run daily operations and members can use the app.",
    sections: [
      [
        "What we collect",
        "Account details, phone or email, gym membership data, check-ins, plan progress, shop orders, support requests, and basic device or security metadata.",
      ],
      [
        "How we use it",
        "We use this information to authenticate users, activate memberships, process payments, show trainer plans, prevent abuse, and keep operational records accurate.",
      ],
      [
        "Your controls",
        "Members can request export or deletion from the app. Gyms remain responsible for records they are required to keep for billing, tax, safety, or dispute resolution.",
      ],
      [
        "Contact",
        "For privacy questions, write to privacy@zook.app. Include the gym name and the phone or email on your account so we can locate the right records.",
      ],
    ],
  },
  hi: {
    eyebrow: "गोपनीयता",
    title: "Zook गोपनीयता नीति",
    intro:
      "Zook जिम, सदस्यता, उपस्थिति, भुगतान, ट्रेनर और सहायता रिकॉर्ड रखता है ताकि जिम रोज़ाना संचालन चला सकें और सदस्य ऐप इस्तेमाल कर सकें.",
    sections: [
      [
        "हम क्या रखते हैं",
        "खाता विवरण, फोन या ईमेल, जिम सदस्यता डेटा, चेक-इन, प्लान प्रगति, शॉप ऑर्डर, सहायता अनुरोध और बेसिक डिवाइस या सुरक्षा मेटाडेटा.",
      ],
      [
        "हम इसका उपयोग कैसे करते हैं",
        "इस जानकारी से हम लॉगिन, सदस्यता सक्रियण, भुगतान, ट्रेनर प्लान, दुरुपयोग रोकथाम और संचालन रिकॉर्ड को सही रखते हैं.",
      ],
      [
        "आपके नियंत्रण",
        "सदस्य ऐप से डेटा एक्सपोर्ट या डिलीशन का अनुरोध कर सकते हैं. बिलिंग, टैक्स, सुरक्षा या विवाद के लिए जरूरी रिकॉर्ड जिम की जिम्मेदारी रहते हैं.",
      ],
      [
        "संपर्क",
        "गोपनीयता सवालों के लिए privacy@zook.app पर लिखें. जिम नाम और खाते का फोन या ईमेल शामिल करें ताकि हम सही रिकॉर्ड ढूंढ सकें.",
      ],
    ],
  },
};

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePublicLocale((await searchParams) ?? {});
  const nextLocale = alternatePublicLocale(locale);
  const copy = privacyCopy[locale];
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);

  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-screen px-5 py-5">
      <div className="mx-auto max-w-4xl">
        <PublicNav
          loginHref={localizedPath("/login", locale)}
          loginLabel={t("login")}
          languageHref={localizedPath("/privacy", nextLocale)}
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

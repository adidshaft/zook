import { AccountAwarePublicNav } from "@/components/account-aware-public-nav";
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
    updated: "Last updated May 2026",
    intro:
      "Zook is operated by Kyoka Suigetsu LLP in India. Zook stores gym, membership, attendance, payment, trainer, notification, and support records so gyms can run daily operations and members can use the app.",
    sections: [
      [
        "What we collect",
        "We collect account details such as name, phone number, email address, profile photo, gym membership data, attendance check-ins, trainer plans, workout or progress updates, shop orders, payment status, receipt records, support requests, and basic device or security metadata.",
      ],
      [
        "Phone, email, and sign-in",
        "Zook can use phone or email one-time codes to sign users in, protect accounts, confirm contact changes, prevent abuse, and keep login records accurate.",
      ],
      [
        "Attendance and gym operations",
        "Members may scan gym QR codes or use entry codes. Zook records check-in time, gym, branch, membership status, and review information needed by reception, trainers, admins, and owners.",
      ],
      [
        "Payments and receipts",
        "Payments may be handled through Razorpay or another configured provider. Zook stores payment status, checkout references, receipts, invoices, refunds, and reconciliation records, but does not store full card, UPI, or banking credentials.",
      ],
      [
        "Photos, uploads, and support",
        "Users and gyms may upload profile photos, gym photos, product photos, payment proof, and support details. These files are used for identity checks, gym profiles, shop management, billing support, and safety review.",
      ],
      [
        "Notifications",
        "Zook may send in-app, push, email, or SMS notifications for login, memberships, attendance, training plans, payments, shop orders, reminders, referrals, and gym updates.",
      ],
      [
        "Data use",
        "We do not sell personal data, and we do not use it for third-party advertising or cross-app tracking. We may use operational and aggregated data to keep Zook reliable, understand product usage, improve gym and member features, and plan future fitness-related services. If a future service needs a new category of sensitive data or a new purpose, we will update this policy and ask for consent where required.",
      ],
      [
        "How we protect it",
        "We use access controls, audit logs, rate limits, provider diagnostics, secure cookies or device storage, and encrypted network connections. Staff access is role-based and gym-scoped.",
      ],
      [
        "Your controls",
        "Members can request export or deletion from the app. Gyms remain responsible for records they are required to keep for billing, tax, safety, legal compliance, or dispute resolution.",
      ],
      [
        "Contact",
        "For privacy questions, write to support@zookfit.in. Include the gym name and the phone or email on your account so we can locate the right records.",
      ],
    ],
  },
  hi: {
    eyebrow: "गोपनीयता",
    title: "Zook गोपनीयता नीति",
    updated: "आखिरी अपडेट मई 2026",
    intro:
      "Zook को भारत में Kyoka Suigetsu LLP चलाता है. Zook जिम, सदस्यता, उपस्थिति, भुगतान, ट्रेनर, नोटिफिकेशन और सहायता रिकॉर्ड रखता है ताकि जिम रोज़ाना संचालन चला सकें और सदस्य ऐप इस्तेमाल कर सकें.",
    sections: [
      [
        "हम क्या रखते हैं",
        "हम नाम, फोन नंबर, ईमेल, प्रोफाइल फोटो, जिम सदस्यता डेटा, चेक-इन, ट्रेनर प्लान, वर्कआउट या प्रगति अपडेट, शॉप ऑर्डर, भुगतान स्थिति, रसीद, सहायता अनुरोध और बेसिक डिवाइस या सुरक्षा मेटाडेटा रखते हैं.",
      ],
      [
        "फोन, ईमेल और साइन-इन",
        "Zook फोन या ईमेल वन-टाइम कोड से लॉगिन, खाता सुरक्षा, संपर्क बदलाव, दुरुपयोग रोकथाम और लॉगिन रिकॉर्ड को संभाल सकता है.",
      ],
      [
        "उपस्थिति और जिम संचालन",
        "सदस्य जिम QR कोड स्कैन कर सकते हैं या एंट्री कोड इस्तेमाल कर सकते हैं. Zook चेक-इन समय, जिम, ब्रांच, सदस्यता स्थिति और रिसेप्शन/ट्रेनर/एडमिन/ओनर के लिए जरूरी समीक्षा जानकारी रखता है.",
      ],
      [
        "भुगतान और रसीद",
        "भुगतान Razorpay या किसी कॉन्फ़िगर किए गए प्रदाता से हो सकता है. Zook भुगतान स्थिति, checkout reference, रसीद, invoice, refund और reconciliation records रखता है, लेकिन पूरा card, UPI या बैंक credential नहीं रखता.",
      ],
      [
        "फोटो, अपलोड और सहायता",
        "यूज़र और जिम प्रोफाइल फोटो, जिम फोटो, प्रोडक्ट फोटो, भुगतान प्रमाण और सहायता विवरण अपलोड कर सकते हैं. इन्हें पहचान जांच, जिम प्रोफाइल, शॉप मैनेजमेंट, बिलिंग सहायता और सुरक्षा समीक्षा के लिए उपयोग किया जाता है.",
      ],
      [
        "नोटिफिकेशन",
        "Zook login, membership, attendance, training plan, payment, shop order, reminder, referral और gym updates के लिए in-app, push, email या SMS notification भेज सकता है.",
      ],
      [
        "डेटा का उपयोग",
        "हम व्यक्तिगत डेटा बेचते नहीं हैं, और इसे third-party advertising या cross-app tracking के लिए इस्तेमाल नहीं करते. Zook को भरोसेमंद रखने, product usage समझने, gym और member features सुधारने, और future fitness-related services plan करने के लिए operational और aggregated data इस्तेमाल हो सकता है. अगर future service में sensitive data की नई category या नया purpose चाहिए, तो हम policy update करेंगे और जहां जरूरी हो consent लेंगे.",
      ],
      [
        "हम इसे कैसे सुरक्षित रखते हैं",
        "हम access controls, audit logs, rate limits, provider diagnostics, secure cookies या device storage और encrypted network connections इस्तेमाल करते हैं. Staff access role-based और gym-scoped है.",
      ],
      [
        "आपके नियंत्रण",
        "सदस्य ऐप से डेटा एक्सपोर्ट या डिलीशन का अनुरोध कर सकते हैं. बिलिंग, टैक्स, सुरक्षा, कानूनी अनुपालन या विवाद के लिए जरूरी रिकॉर्ड जिम की जिम्मेदारी रहते हैं.",
      ],
      [
        "संपर्क",
        "गोपनीयता सवालों के लिए support@zookfit.in पर लिखें. जिम नाम और खाते का फोन या ईमेल शामिल करें ताकि हम सही रिकॉर्ड ढूंढ सकें.",
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
        <AccountAwarePublicNav
          locale={locale}
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

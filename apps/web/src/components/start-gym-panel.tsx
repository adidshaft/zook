"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { GlassCard } from "./glass-card";
import { ZookButton } from "./zook-button";
import { gymTypes } from "./gym-profile-fields";
import {
  StartGymAccessStep,
  StartGymDetailsStep,
  StartGymHero,
  StartGymLocationStep,
  StartGymStepNav,
  setupSteps,
  type StartGymPanelCopy,
} from "./start-gym-panel-sections";
import { webApiFetch } from "@/lib/api-client";
import {
  formatIndiaPhoneInput,
  isValidGstin,
  normalizeGstinInput,
  normalizeIndiaPhoneDigits,
} from "@/lib/format";

type StartGymLocale = "en" | "hi";

const startGymCopy = {
  en: {
    title: "Start your gym on Zook.",
    subtitle: "Create the gym profile and primary branch first. Payment setup happens after this step.",
    selectedPlan: (tier: "STARTER" | "GROWTH" | "PRO") => `${tier} selected after trial`,
    setupHint: "No payment is collected on this screen.",
    bullets: [
      "Create gym and public link",
      "Add the primary branch",
      "Review billing after setup",
    ],
    steps: {
      gym: "Gym",
      location: "Location",
      access: "Access",
    },
    fields: {
      gymName: "Gym name",
      gymNamePlaceholder: "Your gym name",
      publicUsername: "Public username",
      publicUsernamePlaceholder: "your-gym",
      gymType: "Gym type",
      contactEmail: "Contact email",
      contactEmailPlaceholder: "your@email.com",
      contactPhone: "Contact phone",
      contactPhonePlaceholder: "+91 9876543210",
      gstNumber: "GST number",
      gstPlaceholder: "22AAAAA0000A1Z5",
      gstHelper: "Add your GST number for official invoicing. Leave blank if not registered.",
      address: "Address",
      addressPlaceholder: "Street, area, landmark",
      mapsLink: "Google Maps link (optional)",
      mapsPlaceholder: "https://maps.google.com/?q=...",
      openMaps: "Open Maps",
      mapsHelper: "Open Maps, pick the exact branch, then paste its share link here.",
      city: "City",
      cityPlaceholder: "City",
      state: "State",
      selectState: "Select state",
      pincode: "Pincode",
      pincodePlaceholder: "6-digit pincode",
      joinMode: "Join mode",
      visibility: "Visibility",
      openJoin: "Open join",
      approvalRequired: "Approval required",
      public: "Public",
      inviteOnly: "Invite only",
      hidden: "Hidden",
      amenities: "Amenities",
      equipment: "Equipment",
      customEquipment: "Custom equipment",
      customEquipmentPlaceholder: "e.g. Squat rack, Kettlebells, Battle ropes",
      selected: "selected",
    },
    errors: {
      invalidGst: "GST number must be a valid 15-character GSTIN.",
      missingGym:
        "Add gym name, public username, 10-digit phone, and contact email to continue.",
      missingLocation:
        "Add address, city, state, and a 6-digit pincode so members can find the gym.",
      missingCreate:
        "Add gym name, public username, 10-digit phone, address, city, state, and a 6-digit pincode before creating the gym.",
      createFailed: "Unable to create gym.",
    },
    profileTitle: "Public profile details",
    profileBody: "Amenities and equipment can wait.",
    taxTitle: "Tax details",
    taxBody: "GST can be added now or later from billing.",
    addDetails: "Add details",
    back: "Back",
    continue: "Continue",
    createGym: "Create gym",
    creatingGym: "Creating gym...",
  },
  hi: {
    title: "Zook पर अपना जिम शुरू करें.",
    subtitle: "पहले जिम प्रोफाइल और मुख्य ब्रांच बनाएं. भुगतान सेटअप इसके बाद होगा.",
    selectedPlan: (tier: "STARTER" | "GROWTH" | "PRO") => `${tier} ट्रायल के बाद चुना हुआ`,
    setupHint: "इस स्क्रीन पर भुगतान नहीं लिया जाएगा.",
    bullets: [
      "जिम और पब्लिक लिंक बनाएं",
      "मुख्य ब्रांच जोड़ें",
      "सेटअप के बाद बिलिंग देखें",
    ],
    steps: {
      gym: "जिम",
      location: "लोकेशन",
      access: "एक्सेस",
    },
    fields: {
      gymName: "जिम का नाम",
      gymNamePlaceholder: "अपने जिम का नाम",
      publicUsername: "पब्लिक लिंक नाम",
      publicUsernamePlaceholder: "your-gym",
      gymType: "जिम प्रकार",
      contactEmail: "संपर्क ईमेल",
      contactEmailPlaceholder: "owner@example.com",
      contactPhone: "संपर्क फोन",
      contactPhonePlaceholder: "+91 9876543210",
      gstNumber: "GST नंबर",
      gstPlaceholder: "22AAAAA0000A1Z5",
      gstHelper: "आधिकारिक इनवॉइस के लिए GST जोड़ें. रजिस्टर्ड नहीं हैं तो खाली छोड़ सकते हैं.",
      address: "पता",
      addressPlaceholder: "सड़क, एरिया, लैंडमार्क",
      mapsLink: "Google Maps लिंक (वैकल्पिक)",
      mapsPlaceholder: "https://maps.google.com/?q=...",
      openMaps: "Maps खोलें",
      mapsHelper: "Maps खोलकर exact branch चुनें, फिर उसका share link यहां paste करें.",
      city: "शहर",
      cityPlaceholder: "शहर",
      state: "राज्य",
      selectState: "राज्य चुनें",
      pincode: "पिनकोड",
      pincodePlaceholder: "6 अंकों का पिनकोड",
      joinMode: "मेंबर जॉइन मोड",
      visibility: "दिखाई देना",
      openJoin: "सीधे जॉइन",
      approvalRequired: "अनुमति के बाद",
      public: "पब्लिक",
      inviteOnly: "सिर्फ आमंत्रण",
      hidden: "छिपा हुआ",
      amenities: "सुविधाएं",
      equipment: "उपकरण",
      customEquipment: "कस्टम उपकरण",
      customEquipmentPlaceholder: "जैसे Squat rack, Kettlebells, Battle ropes",
      selected: "चुने गए",
    },
    errors: {
      invalidGst: "GST नंबर मान्य 15 अक्षर का GSTIN होना चाहिए.",
      missingGym: "आगे बढ़ने के लिए जिम नाम, पब्लिक यूज़रनेम, 10 अंकों का फोन और संपर्क ईमेल जोड़ें.",
      missingLocation: "मेंबर को जिम ढूंढने के लिए पता, शहर, राज्य और 6 अंकों का पिनकोड जोड़ें.",
      missingCreate:
        "जिम बनाने से पहले जिम नाम, पब्लिक यूज़रनेम, 10 अंकों का फोन, पता, शहर, राज्य और 6 अंकों का पिनकोड जोड़ें.",
      createFailed: "जिम बनाया नहीं जा सका.",
    },
    profileTitle: "पब्लिक प्रोफाइल विवरण",
    profileBody: "सुविधाएं और उपकरण बाद में भी जोड़े जा सकते हैं.",
    taxTitle: "टैक्स विवरण",
    taxBody: "GST अभी या बाद में बिलिंग से जोड़ा जा सकता है.",
    addDetails: "विवरण जोड़ें",
    back: "वापस",
    continue: "आगे बढ़ें",
    createGym: "जिम बनाएं",
    creatingGym: "जिम बन रहा है...",
  },
} satisfies Record<StartGymLocale, StartGymPanelCopy & {
  selectedPlan: (tier: "STARTER" | "GROWTH" | "PRO") => string;
  errors: {
    invalidGst: string;
    missingGym: string;
    missingLocation: string;
    missingCreate: string;
    createFailed: string;
  };
  back: string;
  continue: string;
  createGym: string;
  creatingGym: string;
}>;

type CreateOrgResponse = {
  org: {
    id: string;
    username: string;
  };
};

function slugFromName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function safeOwnerEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.endsWith(".local") || normalized === "platform@zook.local") {
    return "";
  }
  return value;
}

export function StartGymPanel({
  ownerEmail,
  initialTier = "STARTER",
  locale = "en",
}: {
  ownerEmail: string;
  initialTier?: "STARTER" | "GROWTH" | "PRO";
  locale?: StartGymLocale;
}) {
  const copy = startGymCopy[locale];
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [gymType, setGymType] = useState(gymTypes[0] ?? "Strength gym");
  const [contactPhone, setContactPhone] = useState("+91 ");
  const [contactEmail, setContactEmail] = useState(safeOwnerEmail(ownerEmail));
  const [gstNumber, setGstNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [customEquipmentText, setCustomEquipmentText] = useState("");
  const [joinMode, setJoinMode] = useState<"OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY">(
    "OPEN_JOIN",
  );
  const [visibility, setVisibility] = useState<"PUBLIC" | "INVITE_ONLY" | "HIDDEN">("PUBLIC");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showProfileDetails, setShowProfileDetails] = useState(false);

  const gymStepComplete = Boolean(
    name.trim() &&
      username.trim() &&
      normalizeIndiaPhoneDigits(contactPhone).length === 10 &&
      contactEmail.trim() &&
      (!gstNumber.trim() || isValidGstin(normalizeGstinInput(gstNumber))),
  );
  const locationStepComplete = Boolean(
    address.trim() && city.trim() && state.trim() && /^\d{6}$/.test(pincode),
  );
  const canContinue = step === 0 ? gymStepComplete : step === 1 ? locationStepComplete : true;
  const mapsSearchQuery = [address, city, state, pincode, name].filter(Boolean).join(", ");
  const mapsSearchHref = mapsSearchQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsSearchQuery)}`
    : null;

  function canOpenStep(nextStep: number) {
    if (nextStep <= step) return true;
    if (nextStep === 1) return gymStepComplete;
    if (nextStep === 2) return gymStepComplete && locationStepComplete;
    return false;
  }

  function openStep(nextStep: number) {
    if (canOpenStep(nextStep)) {
      setMessage("");
      setStep(nextStep);
      return;
    }
    setMessage(!gymStepComplete ? copy.errors.missingGym : copy.errors.missingLocation);
  }

  function toggleAmenity(option: string) {
    setAmenities((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  }

  function toggleEquipment(option: string) {
    setEquipment((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  }

  async function createGym() {
    const normalizedGstNumber = normalizeGstinInput(gstNumber);
    if (normalizedGstNumber && !isValidGstin(normalizedGstNumber)) {
      setMessage(copy.errors.invalidGst);
      return;
    }
    if (
      !name.trim() ||
      !username.trim() ||
      normalizeIndiaPhoneDigits(contactPhone).length !== 10 ||
      !address.trim() ||
      !city.trim() ||
      !state.trim() ||
      !/^\d{6}$/.test(pincode)
    ) {
      setMessage(copy.errors.missingCreate);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const parsedCustomEquipment = customEquipmentText
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length >= 2 && item.length <= 80);
      const finalEquipment = Array.from(new Set([...equipment, ...parsedCustomEquipment]));

      const payload = await webApiFetch<CreateOrgResponse>("/api/orgs", {
        method: "POST",
        body: {
          name,
          username,
          contactPhone: formatIndiaPhoneInput(contactPhone).replace(/\s/g, ""),
          contactEmail,
          gstNumber: normalizedGstNumber || undefined,
          address,
          city,
          state,
          pincode,
          originalGoogleMapsUrl: googleMapsUrl.trim() || undefined,
          amenities: Array.from(new Set([gymType, ...amenities])),
          equipment: finalEquipment,
          joinMode,
          visibility,
        },
      });
      const billingParams = new URLSearchParams({
        created: payload.org.id,
        setup: "billing",
        tier: initialTier.toLowerCase(),
      });
      window.location.href = `/dashboard/billing?${billingParams.toString()}`;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.errors.createFailed);
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    if (!canContinue) {
      const normalizedGstNumber = normalizeGstinInput(gstNumber);
      setMessage(
        step === 0
          ? normalizedGstNumber && !isValidGstin(normalizedGstNumber)
            ? copy.errors.invalidGst
            : copy.errors.missingGym
          : copy.errors.missingLocation,
      );
      return;
    }
    setMessage("");
    setStep((current) => Math.min(current + 1, setupSteps.length - 1));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
      <StartGymHero copy={copy} initialTier={initialTier} />

      <GlassCard>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (step === setupSteps.length - 1) {
              void createGym();
            } else {
              goNext();
            }
          }}
        >
          <StartGymStepNav
            copy={copy}
            step={step}
            canOpenStep={canOpenStep}
            openStep={openStep}
          />

          {step === 0 ? (
            <StartGymDetailsStep
              contactEmail={contactEmail}
              contactPhone={contactPhone}
              copy={copy}
              gstNumber={gstNumber}
              gymType={gymType}
              name={name}
              setContactEmail={setContactEmail}
              setContactPhone={setContactPhone}
              setGstNumber={setGstNumber}
              setGymType={setGymType}
              setName={setName}
              setUsername={setUsername}
              slugFromName={slugFromName}
              username={username}
            />
          ) : null}

          {step === 1 ? (
            <StartGymLocationStep
              address={address}
              city={city}
              copy={copy}
              googleMapsUrl={googleMapsUrl}
              mapsSearchHref={mapsSearchHref}
              pincode={pincode}
              setAddress={setAddress}
              setCity={setCity}
              setGoogleMapsUrl={setGoogleMapsUrl}
              setPincode={setPincode}
              setState={setState}
              state={state}
            />
          ) : null}

          {step === 2 ? (
            <StartGymAccessStep
              amenities={amenities}
              copy={copy}
              customEquipmentText={customEquipmentText}
              equipment={equipment}
              joinMode={joinMode}
              setCustomEquipmentText={setCustomEquipmentText}
              setJoinMode={setJoinMode}
              setShowProfileDetails={setShowProfileDetails}
              setVisibility={setVisibility}
              showProfileDetails={showProfileDetails}
              toggleAmenity={toggleAmenity}
              toggleEquipment={toggleEquipment}
              visibility={visibility}
            />
          ) : null}

          {message ? (
            <p
              className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100"
              role="alert"
              aria-live="polite"
            >
              {message}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {step > 0 ? (
              <ZookButton
                type="button"
                tone="ghost"
                fullWidth
                onClick={() => setStep((current) => Math.max(current - 1, 0))}
                className="sm:flex-1"
              >
                {copy.back}
              </ZookButton>
            ) : null}
            <ZookButton
              type="submit"
              fullWidth
              disabled={busy}
              state={busy ? "loading" : "idle"}
              trailingIcon={<ArrowRight size={18} />}
              className="sm:flex-[2]"
            >
              {step === setupSteps.length - 1
                ? busy
                  ? copy.creatingGym
                  : copy.createGym
                : copy.continue}
            </ZookButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

"use client";

import { useState } from "react";
import { normalizeUsernameInput } from "@zook/core/services/organization-service";
import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
import { GlassCard, Pill } from "./glass-card";
import { ZookButton } from "./zook-button";
import { equipmentOptions, gymTypes } from "./gym-profile-fields";
import { webApiFetch } from "@/lib/api-client";
import {
  formatIndiaPhoneInput,
  isValidGstin,
  normalizeGstinInput,
  normalizeIndiaPhoneDigits,
  normalizeIndianPincodeInput,
} from "@/lib/format";

const amenityOptions = [
  "Certified trainers",
  "QR entry",
  "Personal training",
  "Group classes",
  "Locker room",
  "Showers",
  "Nutrition bar",
  "Parking",
  "UPI payments",
  "Body composition",
];

const setupSteps = [
  { id: 0, key: "gym" },
  { id: 1, key: "location" },
  { id: 2, key: "access" },
] as const;

const labelClass = "text-xs font-medium text-white/50";
const inputClass =
  "zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

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
} satisfies Record<StartGymLocale, {
  title: string;
  subtitle: string;
  selectedPlan: (tier: "STARTER" | "GROWTH" | "PRO") => string;
  setupHint: string;
  bullets: string[];
  steps: Record<(typeof setupSteps)[number]["key"], string>;
  fields: {
    gymName: string;
    gymNamePlaceholder: string;
    publicUsername: string;
    publicUsernamePlaceholder: string;
    gymType: string;
    contactEmail: string;
    contactEmailPlaceholder: string;
    contactPhone: string;
    contactPhonePlaceholder: string;
    gstNumber: string;
    gstPlaceholder: string;
    gstHelper: string;
    address: string;
    addressPlaceholder: string;
    mapsLink: string;
    mapsPlaceholder: string;
    openMaps: string;
    mapsHelper: string;
    city: string;
    cityPlaceholder: string;
    state: string;
    selectState: string;
    pincode: string;
    pincodePlaceholder: string;
    joinMode: string;
    visibility: string;
    public: string;
    inviteOnly: string;
    hidden: string;
    openJoin: string;
    approvalRequired: string;
    amenities: string;
    equipment: string;
    customEquipment: string;
    customEquipmentPlaceholder: string;
    selected: string;
  };
  errors: {
    invalidGst: string;
    missingGym: string;
    missingLocation: string;
    missingCreate: string;
    createFailed: string;
  };
  profileTitle: string;
  profileBody: string;
  taxTitle: string;
  taxBody: string;
  addDetails: string;
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
      <GlassCard variant="strong">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
          {copy.subtitle}
        </p>
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>{copy.selectedPlan(initialTier)}</Pill>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {copy.setupHint}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {copy.bullets.map((item) => (
              <span
                key={item}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
              >
                <CheckCircle2 size={13} aria-hidden="true" className="shrink-0 text-[var(--accent-strong)]" />
                <span className="truncate">{item}</span>
              </span>
            ))}
          </div>
        </div>
      </GlassCard>

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
          <div className="mb-5 flex rounded-2xl border border-white/10 bg-black/20 p-1">
            {setupSteps.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={step === item.id ? "step" : undefined}
                aria-disabled={!canOpenStep(item.id)}
                onClick={() => openStep(item.id)}
                className={`min-w-0 flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  step === item.id
                    ? "bg-white/10 text-white"
                    : item.id < step
                      ? "text-white/70"
                      : canOpenStep(item.id)
                        ? "text-white/45 hover:text-white/70"
                        : "cursor-not-allowed text-white/25"
                }`}
              >
                {item.id + 1}. {copy.steps[item.key]}
              </button>
            ))}
          </div>

          {step === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 md:col-span-2">
                <span className={labelClass}>{copy.fields.gymName}</span>
                <input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!username || username === slugFromName(name)) {
                      setUsername(slugFromName(event.target.value));
                    }
                  }}
                  placeholder={copy.fields.gymNamePlaceholder}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-2">
                <span className={labelClass}>{copy.fields.publicUsername}</span>
                <input
                  value={username}
                  onChange={(event) =>
                    setUsername(normalizeUsernameInput(event.target.value))
                  }
                  placeholder={copy.fields.publicUsernamePlaceholder}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-2">
                <span className={labelClass}>{copy.fields.gymType}</span>
                <select
                  value={gymType}
                  onChange={(event) => setGymType(event.target.value)}
                  className={inputClass}
                >
                  {gymTypes.map((type) => (
                    <option key={type} value={type} className="bg-black">
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className={labelClass}>{copy.fields.contactEmail}</span>
                <input
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder={copy.fields.contactEmailPlaceholder}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-2">
                <span className={labelClass}>{copy.fields.contactPhone}</span>
                <input
                  value={contactPhone}
                  onChange={(event) => setContactPhone(formatIndiaPhoneInput(event.target.value))}
                  onFocus={() => {
                    if (!contactPhone.trim()) setContactPhone("+91 ");
                  }}
                  placeholder={copy.fields.contactPhonePlaceholder}
                  inputMode="tel"
                  className={inputClass}
                />
              </label>
              <details
                open={Boolean(gstNumber)}
                className="rounded-2xl border border-white/10 bg-black/18 px-3 py-2 md:col-span-2"
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-white">
                  {copy.taxTitle}
                  <span className="ml-2 text-xs font-normal text-white/45">{copy.taxBody}</span>
                </summary>
                <label className="mt-3 grid gap-2">
                  <span className={labelClass}>{copy.fields.gstNumber}</span>
                  <input
                    value={gstNumber}
                    onChange={(event) =>
                      setGstNumber(normalizeGstinInput(event.target.value))
                    }
                    placeholder={copy.fields.gstPlaceholder}
                    aria-describedby="gst-helper"
                    className={inputClass}
                  />
                  <span id="gst-helper" className="text-xs leading-5 text-white/42">
                    {copy.fields.gstHelper}
                  </span>
                </label>
              </details>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 md:col-span-2">
                <span className={labelClass}>{copy.fields.address}</span>
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder={copy.fields.addressPlaceholder}
                  className={inputClass}
                />
              </label>
              <div className="grid gap-2 md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={labelClass}>{copy.fields.mapsLink}</span>
                  {mapsSearchHref ? (
                    <a
                      href={mapsSearchHref}
                      target="_blank"
                      rel="noreferrer"
                      className="zook-focus inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                    >
                      <ExternalLink size={13} aria-hidden="true" />
                      {copy.fields.openMaps}
                    </a>
                  ) : null}
                </div>
                <input
                  value={googleMapsUrl}
                  onChange={(event) => setGoogleMapsUrl(event.target.value)}
                  placeholder={copy.fields.mapsPlaceholder}
                  className={inputClass}
                />
                <p className="text-xs leading-5 text-white/42">{copy.fields.mapsHelper}</p>
              </div>
              <label className="grid gap-2">
                <span className={labelClass}>{copy.fields.city}</span>
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder={copy.fields.cityPlaceholder}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-2">
                <span className={labelClass}>{copy.fields.state}</span>
                <select
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  className="zook-focus w-full min-w-0 appearance-none truncate rounded-2xl border border-white/10 bg-black/25 px-4 py-3 pr-10 text-sm text-white outline-none"
                >
                  <option value="" disabled className="bg-black">
                    {copy.fields.selectState}
                  </option>
                  {INDIAN_STATES.map((stateName) => (
                    <option key={stateName} value={stateName} className="bg-black">
                      {stateName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className={labelClass}>{copy.fields.pincode}</span>
                <input
                  value={pincode}
                  onChange={(event) =>
                    setPincode(normalizeIndianPincodeInput(event.target.value))
                  }
                  placeholder={copy.fields.pincodePlaceholder}
                  className={inputClass}
                />
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className={labelClass}>{copy.fields.joinMode}</span>
                  <select
                    value={joinMode}
                    onChange={(event) => setJoinMode(event.target.value as typeof joinMode)}
                    className={inputClass}
                  >
                    <option className="bg-black" value="OPEN_JOIN">
                      {copy.fields.openJoin}
                    </option>
                    <option className="bg-black" value="APPROVAL_REQUIRED">
                      {copy.fields.approvalRequired}
                    </option>
                    <option className="bg-black" value="INVITE_ONLY">
                      {copy.fields.inviteOnly}
                    </option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className={labelClass}>{copy.fields.visibility}</span>
                  <select
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value as typeof visibility)}
                    className={inputClass}
                  >
                    <option className="bg-black" value="PUBLIC">
                      {copy.fields.public}
                    </option>
                    <option className="bg-black" value="INVITE_ONLY">
                      {copy.fields.inviteOnly}
                    </option>
                    <option className="bg-black" value="HIDDEN">
                      {copy.fields.hidden}
                    </option>
                  </select>
                </label>
              </div>
              {showProfileDetails || amenities.length || equipment.length || customEquipmentText ? (
                <details open className="mt-5 rounded-2xl border border-white/10 bg-black/18 p-4">
                  <summary className="cursor-pointer list-none text-sm font-medium text-white">
                    {copy.profileTitle}
                    <span className="ml-2 text-xs font-normal text-white/45">
                      {amenities.length + equipment.length} {copy.fields.selected}
                    </span>
                  </summary>
                  <div className="mt-4">
                    <p className={labelClass}>{copy.fields.amenities}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {amenityOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleAmenity(option)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                            amenities.includes(option)
                              ? "border-white/20 bg-white/8 text-white"
                              : "border-white/10 bg-white/5 text-white/50"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className={labelClass}>{copy.fields.equipment}</p>
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="flex flex-wrap gap-2">
                        {equipmentOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => toggleEquipment(option)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              equipment.includes(option)
                                ? "border-white/20 bg-white/8 text-white"
                                : "border-white/10 bg-white/5 text-white/50 hover:bg-white/8"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <label className="mt-4 grid gap-2">
                    <span className={labelClass}>{copy.fields.customEquipment}</span>
                    <textarea
                      value={customEquipmentText}
                      onChange={(event) => setCustomEquipmentText(event.target.value)}
                      placeholder={copy.fields.customEquipmentPlaceholder}
                      rows={2}
                      className="zook-focus resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                    />
                  </label>
                </details>
              ) : (
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/18 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{copy.profileTitle}</p>
                      <p className="mt-1 text-xs leading-5 text-white/45">{copy.profileBody}</p>
                    </div>
                    <ZookButton
                      type="button"
                      tone="ghost"
                      size="sm"
                      onClick={() => setShowProfileDetails(true)}
                    >
                      {copy.addDetails}
                    </ZookButton>
                  </div>
                </div>
              )}
            </>
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

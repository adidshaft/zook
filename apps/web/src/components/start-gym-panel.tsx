"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { GlassCard, Pill } from "./glass-card";
import { ZookButton } from "./zook-button";
import { equipmentOptions, gymTypes } from "./gym-profile-fields";
import { webApiFetch } from "@/lib/api-client";
import { formatIndiaPhoneInput, joinModeLabel } from "@/lib/format";

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
  { id: 0, label: "Gym" },
  { id: 1, label: "Location" },
  { id: 2, label: "Access" },
];

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

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

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

function normalizeIndiaPhone(value: string) {
  let clean = value;
  if (clean.startsWith("+91")) {
    clean = clean.slice(3);
  }
  const digits = clean.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function StartGymPanel({
  ownerEmail,
  initialTier = "STARTER",
}: {
  ownerEmail: string;
  initialTier?: "STARTER" | "GROWTH" | "PRO";
}) {
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

  const canContinue =
    step === 0
      ? Boolean(
          name.trim() &&
          username.trim() &&
          normalizeIndiaPhone(contactPhone).length === 10 &&
          contactEmail.trim() &&
          (!gstNumber.trim() || GSTIN_PATTERN.test(gstNumber.trim().toUpperCase())),
        )
      : step === 1
        ? Boolean(address.trim() && city.trim() && state.trim() && /^\d{6}$/.test(pincode))
        : true;

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
    const normalizedGstNumber = gstNumber.trim().toUpperCase();
    if (normalizedGstNumber && !GSTIN_PATTERN.test(normalizedGstNumber)) {
      setMessage("GST number must be a valid 15-character GSTIN.");
      return;
    }
    if (
      !name.trim() ||
      !username.trim() ||
      normalizeIndiaPhone(contactPhone).length !== 10 ||
      !address.trim() ||
      !city.trim() ||
      !state.trim() ||
      !/^\d{6}$/.test(pincode)
    ) {
      setMessage(
        "Add gym name, public username, 10-digit phone, address, city, state, and a 6-digit pincode before creating the gym.",
      );
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
      setMessage(error instanceof Error ? error.message : "Unable to create gym.");
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    if (!canContinue) {
      setMessage(
        step === 0
          ? gstNumber.trim() && !GSTIN_PATTERN.test(gstNumber.trim().toUpperCase())
            ? "GST number must be a valid 15-character GSTIN."
            : "Add gym name, public username, 10-digit phone, and contact email to continue."
          : "Add address, city, state, and a 6-digit pincode so members can find the gym.",
      );
      return;
    }
    setMessage("");
    setStep((current) => Math.min(current + 1, setupSteps.length - 1));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <GlassCard variant="strong">
        <Pill tone="lime">Owner setup</Pill>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--text-primary)] md:text-6xl">
          Start your gym on Zook.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Create the gym, main branch, owner access, two-month trial, and public profile from the
          web. Mobile stays focused on daily execution.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Pill tone="blue">{initialTier} plan selected</Pill>
          <Pill tone="neutral">Billing setup opens next</Pill>
        </div>
        <div className="mt-8 grid gap-3">
          {[
            "Creates the organization and default branch",
            "Assigns you as owner",
            "Starts a two-month free trial before billing begins",
            "Publishes a public username for profile links",
            "Opens billing setup next so you can add the card for month 3",
          ].map((item, index) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/60 px-4 py-3 shadow-sm"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border-focus)] bg-[var(--surface-accent-soft)] text-xs font-semibold text-[var(--accent-strong)] shadow-sm">
                {index + 1}
              </span>
              <p className="text-sm text-[var(--text-primary)]">{item}</p>
            </div>
          ))}
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
          <div className="mb-6 grid grid-cols-3 gap-2">
            {setupSteps.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(item.id)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                  step === item.id
                    ? "border-lime-300/45 bg-lime-300/15 text-lime-100"
                    : item.id < step
                      ? "border-white/15 bg-white/8 text-white/70"
                      : "border-white/10 bg-black/20 text-white/35"
                }`}
              >
                {item.id + 1}. {item.label}
              </button>
            ))}
          </div>

          {step === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Gym name
                </span>
                <input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!username || username === slugFromName(name)) {
                      setUsername(slugFromName(event.target.value));
                    }
                  }}
                  placeholder="Your gym name"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Public username
                </span>
                <input
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                  placeholder="your-gym"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Gym type
                </span>
                <select
                  value={gymType}
                  onChange={(event) => setGymType(event.target.value)}
                  className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                >
                  {gymTypes.map((type) => (
                    <option key={type} value={type} className="bg-black">
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Contact email
                </span>
                <input
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder="your@email.com"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Contact phone
                </span>
                <input
                  value={contactPhone}
                  onChange={(event) => setContactPhone(formatIndiaPhoneInput(event.target.value))}
                  onFocus={() => {
                    if (!contactPhone.trim()) setContactPhone("+91 ");
                  }}
                  placeholder="+91 9876543210"
                  inputMode="tel"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  GST number
                </span>
                <input
                  value={gstNumber}
                  onChange={(event) =>
                    setGstNumber(
                      event.target.value
                        .toUpperCase()
                        .replace(/[^0-9A-Z]/g, "")
                        .slice(0, 15),
                    )
                  }
                  placeholder="22AAAAA0000A1Z5"
                  aria-describedby="gst-helper"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                />
                <span id="gst-helper" className="text-xs leading-5 text-white/42">
                  Add your GST number for official invoicing. Leave blank if not registered.
                </span>
              </label>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Address
                </span>
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Street, area, landmark"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Google Maps Link (Optional)
                </span>
                <input
                  value={googleMapsUrl}
                  onChange={(event) => setGoogleMapsUrl(event.target.value)}
                  placeholder="https://maps.google.com/?q=..."
                  className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  City
                </span>
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="City"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  State
                </span>
                <select
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  className="zook-focus w-full min-w-0 appearance-none truncate rounded-2xl border border-white/10 bg-black/25 px-4 py-3 pr-10 text-sm text-white outline-none"
                >
                  <option value="" disabled className="bg-black">
                    Select state
                  </option>
                  {INDIAN_STATES.map((stateName) => (
                    <option key={stateName} value={stateName} className="bg-black">
                      {stateName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Pincode
                </span>
                <input
                  value={pincode}
                  onChange={(event) =>
                    setPincode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                  }
                  placeholder="6-digit pincode"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                    Join mode
                  </span>
                  <select
                    value={joinMode}
                    onChange={(event) => setJoinMode(event.target.value as typeof joinMode)}
                    className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option className="bg-black" value="OPEN_JOIN">
                      {joinModeLabel("OPEN_JOIN")}
                    </option>
                    <option className="bg-black" value="APPROVAL_REQUIRED">
                      {joinModeLabel("APPROVAL_REQUIRED")}
                    </option>
                    <option className="bg-black" value="INVITE_ONLY">
                      {joinModeLabel("INVITE_ONLY")}
                    </option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                    Visibility
                  </span>
                  <select
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value as typeof visibility)}
                    className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option className="bg-black" value="PUBLIC">
                      Public
                    </option>
                    <option className="bg-black" value="INVITE_ONLY">
                      Invite only
                    </option>
                    <option className="bg-black" value="HIDDEN">
                      Hidden
                    </option>
                  </select>
                </label>
              </div>
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Amenities
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {amenityOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleAmenity(option)}
                      className={`rounded-full border px-3 py-2 text-xs font-medium ${
                        amenities.includes(option)
                          ? "border-lime-300/45 bg-lime-300/15 text-lime-100"
                          : "border-white/10 bg-white/5 text-white/50"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Equipment
                </p>
                <p className="mt-2 text-xs leading-5 text-white/42">
                  Select what members should see on the public gym profile. You can refine this
                  later from Gym profile.
                </p>
                <div className="mt-3 max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="flex flex-wrap gap-2">
                    {equipmentOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleEquipment(option)}
                        className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                          equipment.includes(option)
                            ? "border-lime-300/45 bg-lime-300/15 text-lime-100"
                            : "border-white/10 bg-white/5 text-white/50 hover:bg-white/8"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <label className="mt-5 grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Or enter custom equipment (comma-separated)
                </span>
                <textarea
                  value={customEquipmentText}
                  onChange={(event) => setCustomEquipmentText(event.target.value)}
                  placeholder="e.g. Squat rack, Kettlebells, Battle ropes"
                  rows={2}
                  className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none resize-none"
                />
              </label>
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
                Back
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
                  ? "Creating gym..."
                  : "Create gym and add billing"
                : "Continue"}
            </ZookButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

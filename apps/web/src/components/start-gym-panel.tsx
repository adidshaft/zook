"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { GlassCard, Pill } from "./glass-card";
import { webApiFetch } from "@/lib/api-client";
import { joinModeLabel } from "@/lib/format";

const gymTypes = [
  "Strength gym",
  "Premium fitness club",
  "Cross-training box",
  "Yoga and wellness studio",
  "Personal training studio",
];

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

export function StartGymPanel({ ownerEmail }: { ownerEmail: string }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [gymType, setGymType] = useState(gymTypes[0] ?? "Strength gym");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState(ownerEmail);
  const [gstNumber, setGstNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState(INDIAN_STATES[0] ?? "Maharashtra");
  const [pincode, setPincode] = useState("");
  const [joinMode, setJoinMode] = useState<"OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY">(
    "OPEN_JOIN",
  );
  const [visibility, setVisibility] = useState<"PUBLIC" | "INVITE_ONLY" | "HIDDEN">("PUBLIC");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const canContinue =
    step === 0
      ? Boolean(
          name.trim() &&
          username.trim() &&
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

  async function createGym() {
    const normalizedGstNumber = gstNumber.trim().toUpperCase();
    if (normalizedGstNumber && !GSTIN_PATTERN.test(normalizedGstNumber)) {
      setMessage("GST number must be a valid 15-character GSTIN.");
      return;
    }
    if (
      !name.trim() ||
      !username.trim() ||
      !address.trim() ||
      !city.trim() ||
      !state.trim() ||
      !/^\d{6}$/.test(pincode)
    ) {
      setMessage(
        "Add gym name, public username, address, city, state, and a 6-digit pincode before creating the gym.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const payload = await webApiFetch<CreateOrgResponse>("/api/orgs", {
        method: "POST",
        body: {
          name,
          username,
          contactPhone,
          contactEmail,
          gstNumber: normalizedGstNumber || undefined,
          address,
          city,
          state,
          pincode,
          amenities: Array.from(new Set([gymType, ...amenities])),
          joinMode,
          visibility,
        },
      });
      window.location.href = `/dashboard/public-profile?created=${payload.org.id}`;
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
            : "Add gym name, public username, and contact email to continue."
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
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
          Start your gym on Zook.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-white/58">
          Create the organization, main branch, owner role, trial workspace, and gym profile page
          shell from the web. Mobile stays focused on daily execution.
        </p>
        <div className="mt-8 grid gap-3">
          {[
            "Creates the organization and default branch",
            "Assigns you as owner",
            "Publishes a public username for /in links",
            "Unlocks the gym profile page editor and join QR",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <CheckCircle2 size={18} className="text-lime-200" />
              <p className="text-sm text-white/70">{item}</p>
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
                  placeholder="owner@example.com"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Contact phone
                </span>
                <input
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  placeholder="+91"
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
                  className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                >
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
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(current - 1, 0))}
                className="zook-focus inline-flex flex-1 items-center justify-center rounded-full border border-white/10 px-5 py-3 font-semibold text-white/70"
              >
                Back
              </button>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="zook-focus inline-flex flex-[2] items-center justify-center gap-2 rounded-full bg-lime-300 px-5 py-3 font-semibold text-black disabled:opacity-60"
            >
              {step === setupSteps.length - 1
                ? busy
                  ? "Creating gym..."
                  : "Create gym"
                : "Continue"}
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

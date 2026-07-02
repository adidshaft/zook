"use client";

import { normalizeUsernameInput } from "@zook/core/services/organization-service";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { GlassCard, Pill } from "./glass-card";
import { ZookButton } from "./zook-button";
import { equipmentOptions, gymTypes } from "./gym-profile-fields";
import {
  formatIndiaPhoneInput,
  normalizeGstinInput,
  normalizeIndianPincodeInput,
} from "@/lib/format";

export const setupSteps = [
  { id: 0, key: "gym" },
  { id: 1, key: "location" },
  { id: 2, key: "access" },
] as const;

type SetupStepKey = (typeof setupSteps)[number]["key"];
type StartGymTier = "STARTER" | "GROWTH" | "PRO";
type JoinMode = "OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY";
type Visibility = "PUBLIC" | "INVITE_ONLY" | "HIDDEN";

export type StartGymPanelCopy = {
  title: string;
  subtitle: string;
  selectedPlan: (tier: StartGymTier) => string;
  setupHint: string;
  bullets: string[];
  steps: Record<SetupStepKey, string>;
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
  profileTitle: string;
  profileBody: string;
  taxTitle: string;
  taxBody: string;
  addDetails: string;
};

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

export function StartGymHero({
  copy,
  initialTier,
}: {
  copy: StartGymPanelCopy;
  initialTier: StartGymTier;
}) {
  return (
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
              <CheckCircle2
                size={13}
                aria-hidden="true"
                className="shrink-0 text-[var(--accent-strong)]"
              />
              <span className="truncate">{item}</span>
            </span>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

export function StartGymStepNav({
  copy,
  step,
  canOpenStep,
  openStep,
}: {
  copy: StartGymPanelCopy;
  step: number;
  canOpenStep: (nextStep: number) => boolean;
  openStep: (nextStep: number) => void;
}) {
  return (
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
  );
}

export function StartGymDetailsStep({
  contactEmail,
  contactPhone,
  copy,
  gstNumber,
  gymType,
  name,
  setContactEmail,
  setContactPhone,
  setGstNumber,
  setGymType,
  setName,
  setUsername,
  username,
  slugFromName,
}: {
  contactEmail: string;
  contactPhone: string;
  copy: StartGymPanelCopy;
  gstNumber: string;
  gymType: string;
  name: string;
  setContactEmail: (value: string) => void;
  setContactPhone: (value: string) => void;
  setGstNumber: (value: string) => void;
  setGymType: (value: string) => void;
  setName: (value: string) => void;
  setUsername: (value: string) => void;
  username: string;
  slugFromName: (value: string) => string;
}) {
  return (
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
          onChange={(event) => setUsername(normalizeUsernameInput(event.target.value))}
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
            onChange={(event) => setGstNumber(normalizeGstinInput(event.target.value))}
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
  );
}

export function StartGymLocationStep({
  address,
  city,
  copy,
  googleMapsUrl,
  mapsSearchHref,
  pincode,
  setAddress,
  setCity,
  setGoogleMapsUrl,
  setPincode,
  setState,
  state,
}: {
  address: string;
  city: string;
  copy: StartGymPanelCopy;
  googleMapsUrl: string;
  mapsSearchHref: string | null;
  pincode: string;
  setAddress: (value: string) => void;
  setCity: (value: string) => void;
  setGoogleMapsUrl: (value: string) => void;
  setPincode: (value: string) => void;
  setState: (value: string) => void;
  state: string;
}) {
  return (
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
          onChange={(event) => setPincode(normalizeIndianPincodeInput(event.target.value))}
          placeholder={copy.fields.pincodePlaceholder}
          className={inputClass}
        />
      </label>
    </div>
  );
}

export function StartGymAccessStep({
  amenities,
  copy,
  customEquipmentText,
  equipment,
  joinMode,
  setCustomEquipmentText,
  setJoinMode,
  setShowProfileDetails,
  setVisibility,
  showProfileDetails,
  toggleAmenity,
  toggleEquipment,
  visibility,
}: {
  amenities: string[];
  copy: StartGymPanelCopy;
  customEquipmentText: string;
  equipment: string[];
  joinMode: JoinMode;
  setCustomEquipmentText: (value: string) => void;
  setJoinMode: (value: JoinMode) => void;
  setShowProfileDetails: (value: boolean) => void;
  setVisibility: (value: Visibility) => void;
  showProfileDetails: boolean;
  toggleAmenity: (option: string) => void;
  toggleEquipment: (option: string) => void;
  visibility: Visibility;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className={labelClass}>{copy.fields.joinMode}</span>
          <select
            value={joinMode}
            onChange={(event) => setJoinMode(event.target.value as JoinMode)}
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
            onChange={(event) => setVisibility(event.target.value as Visibility)}
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
  );
}

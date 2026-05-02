"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { GlassCard, Pill } from "./glass-card";
import { webApiFetch } from "@/lib/api-client";

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
  const [name, setName] = useState("Iron Fitness Sim");
  const [username, setUsername] = useState("irnfitnesssim");
  const [gymType, setGymType] = useState(gymTypes[0] ?? "Strength gym");
  const [contactPhone, setContactPhone] = useState("+91 90000 00000");
  const [contactEmail, setContactEmail] = useState(ownerEmail);
  const [address, setAddress] = useState("Main road, Pune");
  const [city, setCity] = useState("Pune");
  const [state, setState] = useState("Maharashtra");
  const [pincode, setPincode] = useState("411001");
  const [joinMode, setJoinMode] = useState<"OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY">(
    "OPEN_JOIN",
  );
  const [visibility, setVisibility] = useState<"PUBLIC" | "INVITE_ONLY" | "HIDDEN">("PUBLIC");
  const [amenities, setAmenities] = useState<string[]>([
    "Certified trainers",
    "QR entry",
    "Personal training",
  ]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function toggleAmenity(option: string) {
    setAmenities((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  }

  async function createGym() {
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

  return (
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <GlassCard variant="strong">
        <Pill tone="lime">Owner setup</Pill>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
          Start your gym on Zook.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-white/58">
          Create the organization, default branch, owner role, trial workspace, and public profile
          shell from the web. Mobile stays focused on daily execution.
        </p>
        <div className="mt-8 grid gap-3">
          {[
            "Creates the organization and default branch",
            "Assigns you as owner",
            "Publishes a public username for /in links",
            "Unlocks the Public Profile editor and join QR",
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
              className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <label className="grid gap-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
              Address
            </span>
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
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
              className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
              State
            </span>
            <input
              value={state}
              onChange={(event) => setState(event.target.value)}
              className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
            />
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
              className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
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
                Open join
              </option>
              <option className="bg-black" value="APPROVAL_REQUIRED">
                Approval required
              </option>
              <option className="bg-black" value="INVITE_ONLY">
                Invite only
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

        {message ? (
          <p className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
            {message}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void createGym()}
          disabled={busy}
          className="zook-focus mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime-300 px-5 py-3 font-semibold text-black disabled:opacity-60"
        >
          {busy ? "Creating gym..." : "Create gym"}
          <ArrowRight size={18} />
        </button>
      </GlassCard>
    </div>
  );
}

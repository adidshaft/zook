"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, QrCode, Save } from "lucide-react";
import {
  DataTable,
  EmptyState,
  ReadoutGrid,
  SectionHeader,
  StatusPill,
} from "./dashboard-primitives";
import { GlassCard, Pill } from "./glass-card";
import { webApiFetch } from "@/lib/api-client";
import { formatDateTime, formatEnumLabel } from "@/lib/format";

type OrgProfilePayload = {
  org: {
    id: string;
    name: string;
    username: string;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    address: string;
    city: string;
    state: string;
    pincode: string;
    amenities?: string[] | null;
    visibility: "PUBLIC" | "INVITE_ONLY" | "HIDDEN";
    joinMode: "OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY";
    updatedAt?: string;
    tagline?: string | null;
    gallery?: string[];
    facilities?: string[];
    gymType?: string | null;
    openingHoursSummary?: string | null;
    appStoreUrl?: string | null;
    playStoreUrl?: string | null;
  };
  branches: Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    isDefault: boolean;
    active: boolean;
  }>;
  links: {
    publicProfile: string;
    join: string;
    appDeepLink: string;
    qr: string;
  };
};

type ProfileForm = {
  name: string;
  username: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  visibility: "PUBLIC" | "INVITE_ONLY" | "HIDDEN";
  joinMode: "OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY";
  gymType: string;
  tagline: string;
  openingHoursSummary: string;
  logoUrl: string;
  coverImageUrl: string;
  appStoreUrl: string;
  playStoreUrl: string;
  amenitiesText: string;
  facilitiesText: string;
  galleryText: string;
};

const gymTypes = [
  "Strength gym",
  "Premium fitness club",
  "Cross-training box",
  "Yoga and wellness studio",
  "Personal training studio",
  "Sports performance center",
];

const facilityOptions = [
  "Strength floor",
  "Cardio zone",
  "Group classes",
  "Personal training",
  "Locker room",
  "Showers",
  "Nutrition bar",
  "Parking",
  "Steam room",
  "Physio room",
  "Women-only hours",
  "Open gym",
];

const amenityOptions = [
  "Air conditioning",
  "Certified trainers",
  "QR entry",
  "Desk pickup",
  "UPI payments",
  "Body composition",
  "Diet plans",
  "Flexible plans",
];

function listToText(value?: string[] | null) {
  return (value ?? []).join(", ");
}

function textToList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formFromPayload(payload: OrgProfilePayload): ProfileForm {
  const org = payload.org;
  return {
    name: org.name,
    username: org.username,
    contactPhone: org.contactPhone ?? "",
    contactEmail: org.contactEmail ?? "",
    address: org.address,
    city: org.city,
    state: org.state,
    pincode: org.pincode,
    visibility: org.visibility,
    joinMode: org.joinMode,
    gymType: org.gymType ?? "",
    tagline: org.tagline ?? "",
    openingHoursSummary: org.openingHoursSummary ?? "",
    logoUrl: org.logoUrl ?? "",
    coverImageUrl: org.coverImageUrl ?? "",
    appStoreUrl: org.appStoreUrl ?? "",
    playStoreUrl: org.playStoreUrl ?? "",
    amenitiesText: listToText(org.amenities),
    facilitiesText: listToText(org.facilities),
    galleryText: (org.gallery ?? []).join("\n"),
  };
}

function appOrigin() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.origin;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-black text-white">
            {formatEnumLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="zook-focus resize-y rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25"
      />
    </label>
  );
}

function ChipPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = new Set(textToList(value));

  function toggle(option: string) {
    const next = new Set(selected);
    if (next.has(option)) {
      next.delete(option);
    } else {
      next.add(option);
    }
    onChange(Array.from(next).join(", "));
  }

  return (
    <div className="grid gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
              selected.has(option)
                ? "border-lime-300/45 bg-lime-300/15 text-lime-100"
                : "border-white/10 bg-white/5 text-white/50 hover:bg-white/8"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GymProfileSetupPanel({ orgId }: { orgId: string }) {
  const [payload, setPayload] = useState<OrgProfilePayload | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let mounted = true;
    webApiFetch<OrgProfilePayload>(`/api/orgs/${orgId}/profile`)
      .then((nextPayload) => {
        if (!mounted) return;
        setPayload(nextPayload);
        setForm(formFromPayload(nextPayload));
      })
      .catch((error) => {
        if (!mounted) return;
        setStatus(error instanceof Error ? error.message : "Unable to load gym profile.");
      });
    return () => {
      mounted = false;
    };
  }, [orgId]);

  const origin = appOrigin();
  const publicUrl = payload ? `${origin}${payload.links.publicProfile}` : "";
  const joinUrl = payload ? `${origin}${payload.links.join}` : "";
  const qrUrl = payload ? `${payload.links.qr}&download=0` : "";
  const qrDownloadUrl = payload ? `${payload.links.qr}&download=1` : "";
  const previewGallery = useMemo(() => textToList(form?.galleryText ?? ""), [form?.galleryText]);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function saveProfile() {
    if (!form) return;
    setBusy(true);
    setStatus("");
    try {
      const nextPayload = await webApiFetch<OrgProfilePayload>(`/api/orgs/${orgId}/profile`, {
        method: "PATCH",
        body: {
          name: form.name,
          username: form.username,
          contactPhone: form.contactPhone,
          contactEmail: form.contactEmail,
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          visibility: form.visibility,
          joinMode: form.joinMode,
          gymType: form.gymType,
          tagline: form.tagline,
          openingHoursSummary: form.openingHoursSummary,
          logoUrl: form.logoUrl,
          coverImageUrl: form.coverImageUrl,
          appStoreUrl: form.appStoreUrl,
          playStoreUrl: form.playStoreUrl,
          amenities: textToList(form.amenitiesText),
          facilities: textToList(form.facilitiesText),
          gallery: textToList(form.galleryText),
        },
      });
      setPayload(nextPayload);
      setForm((current) =>
        current ? { ...current, username: nextPayload.org.username } : formFromPayload(nextPayload),
      );
      setStatus("Gym profile saved. Public pages and join QR now use these details.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save gym profile.");
    } finally {
      setBusy(false);
    }
  }

  if (!form || !payload) {
    return (
      <GlassCard>
        <EmptyState
          title="Loading gym setup"
          description={status || "Pulling organization profile, public links, and QR setup."}
        />
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-4">
      <GlassCard variant="strong">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <SectionHeader
            eyebrow="Web-only setup"
            title="Gym profile and join links"
            description="Owners set up the public gym profile here. The member app stays light: members can find the gym, scan the join QR, or open the public link."
            badge={
              <Pill tone={form.visibility === "PUBLIC" ? "lime" : "amber"}>
                {formatEnumLabel(form.visibility)}
              </Pill>
            }
          />
          <div className="flex flex-wrap gap-2">
            <a
              href={publicUrl}
              target="_blank"
              className="zook-focus inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/72 hover:bg-white/8"
            >
              <ExternalLink size={16} />
              Public page
            </a>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(joinUrl)}
              className="zook-focus inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/72 hover:bg-white/8"
            >
              <Copy size={16} />
              Copy join link
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveProfile()}
              className="zook-focus inline-flex items-center gap-2 rounded-full bg-lime-300 px-5 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              <Save size={16} />
              {busy ? "Saving..." : "Save profile"}
            </button>
          </div>
        </div>
        {status ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65">
            {status}
          </p>
        ) : null}
      </GlassCard>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Identity"
            title="Public gym details"
            description="These details render on the public gym page, mobile gym profile, and join flow."
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Gym name" value={form.name} onChange={(value) => update("name", value)} />
            <Field
              label="Public username"
              value={form.username}
              onChange={(value) =>
                update("username", value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              placeholder="irnfitnesssim"
            />
            <Field
              label="Contact email"
              value={form.contactEmail}
              onChange={(value) => update("contactEmail", value)}
              type="email"
            />
            <Field
              label="Contact phone"
              value={form.contactPhone}
              onChange={(value) => update("contactPhone", value)}
            />
            <SelectField
              label="Gym type"
              value={(form.gymType || gymTypes[0]) as string}
              options={gymTypes}
              onChange={(value) => update("gymType", value)}
            />
            <SelectField
              label="Join mode"
              value={form.joinMode}
              options={["OPEN_JOIN", "APPROVAL_REQUIRED", "INVITE_ONLY"]}
              onChange={(value) => update("joinMode", value)}
            />
            <SelectField
              label="Visibility"
              value={form.visibility}
              options={["PUBLIC", "INVITE_ONLY", "HIDDEN"]}
              onChange={(value) => update("visibility", value)}
            />
            <Field
              label="Opening hours"
              value={form.openingHoursSummary}
              onChange={(value) => update("openingHoursSummary", value)}
              placeholder="Mon-Sat, 6 AM - 10 PM"
            />
          </div>
          <div className="mt-4 grid gap-4">
            <TextAreaField
              label="Public tagline"
              value={form.tagline}
              onChange={(value) => update("tagline", value)}
              placeholder="Strength training, coaching, and recovery in Pune."
            />
            <ChipPicker
              label="Facilities"
              options={facilityOptions}
              value={form.facilitiesText}
              onChange={(value) => update("facilitiesText", value)}
            />
            <ChipPicker
              label="Amenities"
              options={amenityOptions}
              value={form.amenitiesText}
              onChange={(value) => update("amenitiesText", value)}
            />
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Join QR"
            title="Download app and join"
            description="Print this QR at reception, on posters, or on Instagram. It opens the gym public page, where members can join or open the app."
            badge={<Pill tone="lime">/{form.username}</Pill>}
          />
          <div className="mt-5 grid gap-4 md:grid-cols-[190px_1fr] xl:grid-cols-1">
            <div className="rounded-[28px] border border-white/10 bg-white p-4">
              <img
                src={qrUrl}
                alt={`Join ${form.name} on Zook`}
                className="aspect-square w-full rounded-[18px]"
              />
            </div>
            <ReadoutGrid
              columns={1}
              items={[
                { label: "Public link", value: publicUrl, meta: "Shareable web profile" },
                { label: "Join link", value: joinUrl, meta: "Checkout and approval entry point" },
                {
                  label: "App deep link",
                  value: payload.links.appDeepLink,
                  meta: "Used once native apps are installed",
                },
              ]}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={qrDownloadUrl}
              className="zook-focus inline-flex items-center gap-2 rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
            >
              <QrCode size={17} />
              Download QR
            </a>
            <a
              href={joinUrl}
              target="_blank"
              className="zook-focus inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm text-white/70 hover:bg-white/8"
            >
              Test join page
            </a>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Location"
            title="Address and branch"
            description="The default branch follows this address for MVP setup. Advanced multi-branch editing can live here later."
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field
              label="Address"
              value={form.address}
              onChange={(value) => update("address", value)}
            />
            <Field label="City" value={form.city} onChange={(value) => update("city", value)} />
            <Field label="State" value={form.state} onChange={(value) => update("state", value)} />
            <Field
              label="Pincode"
              value={form.pincode}
              onChange={(value) => update("pincode", value.replace(/[^0-9]/g, "").slice(0, 6))}
            />
          </div>
          <DataTable
            className="mt-5"
            columns={[
              { id: "branch", header: "Branch", render: (branch) => branch.name },
              {
                id: "address",
                header: "Address",
                render: (branch) => `${branch.address}, ${branch.city}`,
              },
              {
                id: "status",
                header: "Status",
                render: (branch) => (
                  <StatusPill
                    value={branch.isDefault ? "Default" : branch.active ? "Active" : "Inactive"}
                    tone={branch.isDefault ? "lime" : "neutral"}
                  />
                ),
              },
            ]}
            rows={payload.branches}
            rowKey={(branch) => branch.id}
            empty="No branches yet."
          />
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Photos"
            title="Images and gallery"
            description="Provider-backed logo, cover, and gallery assets are supported; URL fields remain for migration and local setup."
          />
          <div className="mt-5 grid gap-4">
            <Field
              label="Logo URL"
              value={form.logoUrl}
              onChange={(value) => update("logoUrl", value)}
              placeholder="https://..."
            />
            <Field
              label="Cover photo URL"
              value={form.coverImageUrl}
              onChange={(value) => update("coverImageUrl", value)}
              placeholder="https://..."
            />
            <TextAreaField
              label="Gallery photo URLs"
              value={form.galleryText}
              onChange={(value) => update("galleryText", value)}
              rows={5}
              placeholder="One image URL per line"
            />
            <div className="grid gap-3 md:grid-cols-3">
              {previewGallery.slice(0, 6).map((imageUrl) => (
                <img
                  key={imageUrl}
                  src={imageUrl}
                  alt=""
                  className="aspect-[4/3] rounded-2xl border border-white/10 object-cover"
                />
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <SectionHeader
          eyebrow="App store handoff"
          title="Download links"
          description="When App Store and Play Store URLs are ready, add them here. Public gym pages will show install buttons without changing the mobile app."
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field
            label="App Store URL"
            value={form.appStoreUrl}
            onChange={(value) => update("appStoreUrl", value)}
            placeholder="https://apps.apple.com/..."
          />
          <Field
            label="Play Store URL"
            value={form.playStoreUrl}
            onChange={(value) => update("playStoreUrl", value)}
            placeholder="https://play.google.com/store/apps/..."
          />
        </div>
        <p className="mt-4 text-xs text-white/35">
          Last updated:{" "}
          {payload.org.updatedAt ? formatDateTime(payload.org.updatedAt) : "Not available"}
        </p>
      </GlassCard>
    </div>
  );
}

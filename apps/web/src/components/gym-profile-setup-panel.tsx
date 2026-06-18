"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeUsernameInput } from "@zook/core/services";
import { Copy, ExternalLink, QrCode, Save, Info, MapPin, Tags, Image } from "lucide-react";
import {
  DataTable,
  EmptyState,
  ReadoutGrid,
  SectionHeader,
  StatusPill,
} from "./dashboard-primitives";
import { GlassCard, Pill } from "./glass-card";
import { ImageAssetUpload } from "./image-asset-upload";
import { ZookButton } from "./zook-button";
import { webApiFetch } from "@/lib/api-client";
import { formatEnumLabel, formatIndiaPhoneInput } from "@/lib/format";
import {
  amenityOptions,
  ChipPicker,
  equipmentOptions,
  facilityOptions,
  Field,
  gymTypes,
  listToText,
  SelectField,
  TextAreaField,
  textToList,
} from "./gym-profile-fields";

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
    equipment?: string[];
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
  equipmentText: string;
  galleryText: string;
};

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
    equipmentText: listToText(org.equipment),
    galleryText: (org.gallery ?? []).join("\n"),
  };
}

function appOrigin() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.origin;
}

export function GymProfileSetupPanel({ orgId }: { orgId: string }) {
  const [payload, setPayload] = useState<OrgProfilePayload | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"basic" | "location" | "features" | "media" | "qr">("basic");

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
  const savedForm = useMemo(() => (payload ? formFromPayload(payload) : null), [payload]);
  const hasUnsavedChanges = Boolean(
    form && savedForm && JSON.stringify(form) !== JSON.stringify(savedForm),
  );

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

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
          equipment: textToList(form.equipmentText),
          gallery: textToList(form.galleryText).slice(0, 15),
        },
      });
      setPayload(nextPayload);
      setForm(formFromPayload(nextPayload));
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

  const tabItems = [
    { id: "basic" as const, label: "Basic Details", icon: Info },
    { id: "location" as const, label: "Address & Branches", icon: MapPin },
    { id: "features" as const, label: "Facilities & Tags", icon: Tags },
    { id: "media" as const, label: "Photos & Logo", icon: Image },
    { id: "qr" as const, label: "QR & Public Links", icon: QrCode },
  ];

  return (
    <div className="grid gap-4">
      <GlassCard variant="strong">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <SectionHeader
            eyebrow="Web-only setup"
            title="Gym profile and membership links"
            description="Owners set up the public gym profile here. Members can find the gym, open the profile link, or use the membership link when they are ready to buy a plan."
            badge={
              <div className="flex flex-wrap gap-2">
                <Pill tone={form.visibility === "PUBLIC" ? "lime" : "amber"}>
                  {formatEnumLabel(form.visibility)}
                </Pill>
                {hasUnsavedChanges ? <Pill tone="amber">Unsaved changes</Pill> : null}
              </div>
            }
          />
          <div className="flex flex-wrap gap-2">
            <a
              href={publicUrl}
              target="_blank"
              className="zook-focus inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] transition-all duration-200"
            >
              <ExternalLink size={16} />
              Public page
            </a>
            <ZookButton
              type="button"
              tone="ghost"
              size="sm"
              onClick={() => void navigator.clipboard.writeText(joinUrl)}
              leadingIcon={<Copy size={16} />}
            >
              Copy membership link
            </ZookButton>
            <ZookButton
              type="button"
              size="sm"
              disabled={busy}
              state={busy ? "loading" : "idle"}
              onClick={() => void saveProfile()}
              leadingIcon={<Save size={16} />}
            >
              {busy ? "Saving..." : "Save profile"}
            </ZookButton>
          </div>
        </div>
        {status ? (
          <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            {status}
          </p>
        ) : null}
      </GlassCard>

      <div className="flex justify-start overflow-x-auto no-scrollbar rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-1.5 backdrop-blur-xl">
        <div className="flex gap-1.5 w-full">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-semibold tracking-wide transition-all duration-300 transform active:scale-95 ${
                  isActive
                    ? "bg-gradient-to-r from-[var(--accent-soft)]/25 to-[var(--accent-soft)]/45 text-[var(--accent-strong)] border border-[var(--accent-strong)]/30 shadow-[0_4px_12px_-3px_color-mix(in_srgb,var(--accent-strong)_20%,transparent)]"
                    : "text-[var(--text-secondary)] border border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-sunken)]/60 hover:scale-[1.02]"
                }`}
              >
                <Icon size={14} className={`shrink-0 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative min-h-[400px]">
        {activeTab === "basic" && (
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
                onChange={(value) => update("username", normalizeUsernameInput(value))}
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
                onChange={(value) => update("contactPhone", formatIndiaPhoneInput(value))}
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
          </GlassCard>
        )}

        {activeTab === "location" && (
          <GlassCard>
            <SectionHeader
              eyebrow="Location"
              title="Address and main branch"
              description="The main branch follows this address for MVP setup. Advanced multi-branch editing can live here later."
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
                      value={branch.isDefault ? "Main branch" : branch.active ? "Active" : "Inactive"}
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
        )}

        {activeTab === "features" && (
          <GlassCard>
            <SectionHeader
              eyebrow="Features"
              title="Aesthetics and amenities"
              description="These options display on your profile so members know what your gym offers."
            />
            <div className="mt-5 grid gap-4">
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
              <ChipPicker
                label="Equipment members can see"
                options={equipmentOptions}
                value={form.equipmentText}
                onChange={(value) => update("equipmentText", value)}
              />
            </div>
          </GlassCard>
        )}

        {activeTab === "media" && (
          <GlassCard>
            <SectionHeader
              eyebrow="Photos"
              title="Images and gallery"
              description="Add the logo, cover photo, and gallery images members will see."
            />
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <ImageAssetUpload
                  orgId={orgId}
                  category="org_logo"
                  label="Logo"
                  helper="Square, 512 x 512 recommended"
                  valueUrl={form.logoUrl}
                  aspectClassName="aspect-square"
                  onUploaded={(asset) => update("logoUrl", asset.url)}
                />
                <ImageAssetUpload
                  orgId={orgId}
                  category="org_cover"
                  label="Cover photo"
                  helper="Wide, 1600 x 900 recommended"
                  valueUrl={form.coverImageUrl}
                  onUploaded={(asset) => update("coverImageUrl", asset.url)}
                />
              </div>
              <ImageAssetUpload
                orgId={orgId}
                category="org_gallery"
                label="Add gallery photo"
                helper={`${Math.min(previewGallery.length, 15)}/15 added`}
                onUploaded={(asset) => {
                  const nextGallery = [...textToList(form.galleryText), asset.url].slice(0, 15);
                  update("galleryText", nextGallery.join("\n"));
                }}
              />
              <TextAreaField
                label="Gallery photos"
                value={form.galleryText}
                onChange={(value) => update("galleryText", textToList(value).slice(0, 15).join("\n"))}
                rows={5}
                placeholder="Uploaded photos appear here. You can also paste one image link per line."
              />
              <p className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)]/60 px-4 py-3 text-xs leading-5 text-[var(--text-tertiary)]">
                Google Maps photo sync is not connected yet. Upload the best 15 photos here for now.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {previewGallery.slice(0, 15).map((imageUrl, index) => (
                  <img
                    key={imageUrl}
                    src={imageUrl}
                    alt={`${form.name} gallery photo ${index + 1}`}
                    className="aspect-[4/3] rounded-2xl border border-[var(--border)] object-cover bg-[var(--bg-sunken)] transition-all hover:scale-105"
                  />
                ))}
              </div>
            </div>
          </GlassCard>
        )}

        {activeTab === "qr" && (
          <GlassCard>
            <SectionHeader
              eyebrow="Join QR"
              title="Gym profile QR"
              description="Print this QR at reception, on posters, or on Instagram. It opens the public gym profile first; members can continue to membership purchase from there."
              badge={<Pill tone="lime">/{form.username}</Pill>}
            />
            <div className="mt-5 grid gap-5 md:grid-cols-[200px_1fr]">
              <div className="rounded-[28px] border border-[var(--border)] bg-white p-4 max-w-[200px] mx-auto md:mx-0">
                <img
                  src={qrUrl}
                  alt={`Join ${form.name} on Zook`}
                  className="aspect-square w-full rounded-[18px]"
                />
              </div>
              <div className="flex flex-col justify-between gap-4">
                <ReadoutGrid
                  columns={1}
                  items={[
                    {
                      label: "Gym profile link",
                      value: publicUrl,
                      meta: "Share this when people should see the gym first",
                    },
                    {
                      label: "Membership link",
                      value: joinUrl,
                      meta: "Use this only when people should choose a plan",
                    },
                  ]}
                />
                <div className="flex flex-wrap gap-2 mt-4">
                  <a
                    href={qrDownloadUrl}
                    className="zook-focus inline-flex items-center gap-2 rounded-full bg-[var(--accent-fill)] hover:bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-[var(--text-on-accent)] transition-all duration-200"
                  >
                    <QrCode size={17} />
                    Download QR
                  </a>
                  <a
                    href={joinUrl}
                    target="_blank"
                    className="zook-focus inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] transition-all duration-200"
                  >
                    Test membership page
                  </a>
                </div>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

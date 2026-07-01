"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeUsernameInput } from "@zook/core/services/organization-service";
import { Copy, ExternalLink, QrCode, Save, Info, Tags, Image, Building2, Trash2 } from "lucide-react";
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
import { formatIndiaPhoneInput, normalizeIndianPincodeInput } from "@/lib/format";
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

function visibilityLabel(value: string) {
  if (value === "PUBLIC") return "Public";
  if (value === "INVITE_ONLY") return "Invite only";
  if (value === "HIDDEN") return "Hidden";
  return "Profile";
}

function joinModeLabel(value: string) {
  if (value === "OPEN_JOIN") return "Open join";
  if (value === "APPROVAL_REQUIRED") return "Approval required";
  if (value === "INVITE_ONLY") return "Invite only";
  return "Join mode";
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
          title="Loading gym profile"
          description={status || "Pulling gym profile, public links, and QR details."}
        />
      </GlassCard>
    );
  }

  const tabItems = [
    { id: "basic" as const, label: "Basic Details", icon: Info },
    { id: "location" as const, label: "Address & Branches", icon: Building2 },
    { id: "features" as const, label: "Facilities & Tags", icon: Tags },
    { id: "media" as const, label: "Photos & Logo", icon: Image },
    { id: "qr" as const, label: "QR & Public Links", icon: QrCode },
  ];

  return (
    <div className="grid gap-4">
      <GlassCard variant="strong">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <SectionHeader
            eyebrow="Web profile"
            title="Gym profile and membership links"
            badge={
              <div className="flex flex-wrap gap-2">
                <Pill tone={form.visibility === "PUBLIC" ? "blue" : "amber"}>
                  {visibilityLabel(form.visibility)}
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
                optionLabel={joinModeLabel}
                onChange={(value) => update("joinMode", value)}
              />
              <SelectField
                label="Visibility"
                value={form.visibility}
                options={["PUBLIC", "INVITE_ONLY", "HIDDEN"]}
                optionLabel={visibilityLabel}
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
              description="The main branch follows this address. Multi-branch editing stays in branch settings."
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
                onChange={(value) => update("pincode", normalizeIndianPincodeInput(value))}
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
                      tone={branch.isDefault ? "blue" : "neutral"}
                    />
                  ),
                },
              ]}
              rows={payload.branches}
              rowKey={(branch) => branch.id}
              empty="No branches."
            />
          </GlassCard>
        )}

        {activeTab === "features" && (
          <GlassCard>
            <SectionHeader
              eyebrow="Features"
              title="Aesthetics and amenities"
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
              title="Branding and gallery"
              description="Logo appears in gym selectors and profile cards. Cover and gallery photos make the public profile feel like the actual gym."
            />
            <div className="mt-5 grid gap-5">
              <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-sunken)]">
                <div className="relative min-h-[240px] p-5 sm:p-6">
                  {form.coverImageUrl ? (
                    <img
                      src={form.coverImageUrl}
                      alt={`${form.name} cover preview`}
                      className="absolute inset-0 h-full w-full object-cover opacity-45"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--accent)_24%,transparent),transparent_34%),linear-gradient(135deg,var(--surface),var(--bg-sunken))]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg)]/80 via-[var(--bg)]/48 to-[var(--bg-sunken)]/80" />
                  <div className="relative flex min-h-[190px] flex-col justify-end gap-4">
                    <div className="flex items-end gap-3">
                      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                        {form.logoUrl ? (
                          <img
                            src={form.logoUrl}
                            alt={`${form.name} logo preview`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-black text-[var(--accent-strong)]">
                            {form.name.trim().slice(0, 2).toUpperCase() || "ZG"}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                          Public preview
                        </p>
                        <h3 className="mt-1 max-w-xl truncate text-2xl font-semibold text-[var(--text-primary)]">
                          {form.name || "Gym name"}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {[form.address.split(",")[0], form.city].filter(Boolean).join(", ") ||
                            "Locality, City"}
                        </p>
                      </div>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                      {form.tagline || "Add a short, sharp line that helps members understand your gym."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ImageAssetUpload
                  orgId={orgId}
                  category="org_logo"
                  label="Logo"
                  helper="Square, 512 x 512 recommended"
                  valueUrl={form.logoUrl}
                  aspectClassName="aspect-square"
                  onUploaded={(asset) => update("logoUrl", asset.url)}
                  onClear={() => update("logoUrl", "")}
                />
                <ImageAssetUpload
                  orgId={orgId}
                  category="org_cover"
                  label="Cover photo"
                  helper="Wide, 1600 x 900 recommended"
                  valueUrl={form.coverImageUrl}
                  onUploaded={(asset) => update("coverImageUrl", asset.url)}
                  onClear={() => update("coverImageUrl", "")}
                />
              </div>

              <div className="grid gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface)]/70 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Gallery photos</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">
                      {Math.min(previewGallery.length, 15)}/15 added. Keep the strongest, clearest gym photos first.
                    </p>
                  </div>
                  <div className="w-full sm:w-80">
                    <ImageAssetUpload
                      orgId={orgId}
                      category="org_gallery"
                      label="Add photo"
                      helper="4:3 works best"
                      onUploaded={(asset) => {
                        const nextGallery = [...textToList(form.galleryText), asset.url].slice(0, 15);
                        update("galleryText", nextGallery.join("\n"));
                      }}
                    />
                  </div>
                </div>

                {previewGallery.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {previewGallery.slice(0, 15).map((imageUrl, index) => (
                      <div key={`${imageUrl}-${index}`} className="group relative">
                        <img
                          src={imageUrl}
                          alt={`${form.name} gallery photo ${index + 1}`}
                          className="aspect-[4/3] w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] object-cover transition-all group-hover:scale-[1.02]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const nextGallery = previewGallery.filter((_, itemIndex) => itemIndex !== index);
                            update("galleryText", nextGallery.join("\n"));
                          }}
                          className="zook-focus absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)]/90 text-[var(--text-primary)] opacity-100 shadow-sm transition hover:bg-[var(--bg-elevated)] sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label={`Remove gallery photo ${index + 1}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">
                    Add a few real gym photos so members can judge the space before they pay.
                  </div>
                )}

                <details className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-[var(--text-secondary)]">
                    Edit gallery URLs
                  </summary>
                  <div className="mt-3">
                    <TextAreaField
                      label="Gallery photo links"
                      value={form.galleryText}
                      onChange={(value) => update("galleryText", textToList(value).slice(0, 15).join("\n"))}
                      rows={5}
                      placeholder="Paste one image link per line."
                    />
                  </div>
                </details>
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
              badge={<Pill>/{form.username}</Pill>}
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
                      meta: "Share when people should choose a plan",
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

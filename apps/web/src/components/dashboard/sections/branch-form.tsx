"use client";

import type { Dispatch, SetStateAction } from "react";
import { CheckCircle2, ExternalLink, Link2, LocateFixed, MapPinned } from "lucide-react";
import { TextInput, SelectInput } from "../../dashboard-primitives";
import { ZookButton } from "../../zook-button";
import { HelpHint, RadioCardGroup } from "../../ui";
import { BranchHoursEditor } from "./branch-hours-editor";
import { indianStates } from "./branch-states";
import type { StaffAssignmentRow, StaffUserRow } from "@/components/dashboard/types";
import type { BranchFormState } from "./branches-section";
import { Pill } from "../../glass-card";
import { useT } from "@/lib/use-t";

function coordinatesFromGoogleMapsUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    decoded = trimmed;
  }
  const atMatch = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(decoded);
  const queryMatch = /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(decoded);
  const match = atMatch ?? queryMatch;
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude: latitude.toFixed(6), longitude: longitude.toFixed(6) };
}

export function BranchForm({
  mode = "create",
  variant = "full",
  form,
  setForm,
  onSubmit,
  onCancel,
  formBusy,
  staffAssignments = [],
  staffUsersById = new Map(),
}: {
  mode?: "create" | "edit";
  variant?: "full" | "compact";
  form: BranchFormState;
  setForm: Dispatch<SetStateAction<BranchFormState>>;
  onSubmit: () => Promise<void> | void;
  onCancel?: () => void;
  formBusy: boolean;
  staffAssignments?: StaffAssignmentRow[];
  staffUsersById?: Map<string, StaffUserRow>;
}) {
  const t = useT("branchManagement");
  function useCurrentLocation() {
    navigator.geolocation?.getCurrentPosition((position) => {
      setForm((current) => ({
        ...current,
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6),
        locationSource: "MANUAL",
      }));
    });
  }

  function updateGoogleMapsUrl(value: string) {
    const coordinates = coordinatesFromGoogleMapsUrl(value);
    setForm((current) => ({
      ...current,
      googleMapsUrl: value,
      ...(coordinates
        ? {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            locationSource: "GOOGLE_MAPS_LINK" as const,
          }
        : {}),
    }));
  }

  const isStepLayout = variant === "full" && mode === "create";
  const hasMapsLink = Boolean(form.googleMapsUrl?.trim());
  const hasPrecisePin = Boolean(form.latitude && form.longitude);
  const mapSourceLabel =
    hasMapsLink
      ? t("mapsLinkCaptured")
      : hasPrecisePin
        ? t("pinSaved")
        : t("addressFallback");
  const googleMapsSearch = [form.name, form.address, form.city, form.state, form.pincode]
    .filter(Boolean)
    .join(", ");
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    googleMapsSearch || "gym",
  )}`;

  return (
    <div className="grid gap-4">
      {isStepLayout && <Pill className="w-fit">{t("branchDetails")}</Pill>}

      <div className="grid gap-3 md:grid-cols-2">
        <TextInput
          label={t("branchName")}
          value={form.name ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          placeholder={t("branchNamePlaceholder")}
          required
        />
        <TextInput
          label={t("fullAddress")}
          value={form.address ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, address: event.target.value }))
          }
          placeholder={t("fullAddressPlaceholder")}
          required
        />
        <TextInput
          label={t("city")}
          value={form.city ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, city: event.target.value }))
          }
          placeholder={t("cityPlaceholder")}
          required
        />
        <SelectInput
          label={t("state")}
          value={form.state ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, state: event.target.value }))
          }
          required
        >
          <option value="">{t("selectState")}</option>
          {indianStates.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </SelectInput>
        <TextInput
          label={t("pincode")}
          value={form.pincode ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, pincode: event.target.value }))
          }
          placeholder={t("pincodePlaceholder")}
          inputMode="numeric"
          required
        />
      </div>

      {variant === "full" && (
        <div className="grid gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--accent)_32%,transparent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <MapPinned aria-hidden size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {t("mapTitle")}
              </span>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text-tertiary)]">
                {t("mapBody")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                {hasMapsLink || hasPrecisePin ? <CheckCircle2 aria-hidden size={13} /> : <Link2 aria-hidden size={13} />}
                {mapSourceLabel}
              </span>
              <a
                href={googleMapsSearchUrl}
                target="_blank"
                rel="noreferrer"
                className="zook-focus inline-flex min-h-9 w-fit items-center justify-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[var(--accent-soft)] px-4 py-2 text-xs font-semibold text-[var(--accent-strong)] transition duration-200 hover:border-[var(--accent)] active:translate-y-px"
              >
                <ExternalLink aria-hidden size={14} />
                {t("openInGoogleMaps")}
              </a>
            </div>
          </div>
          <div className="grid gap-2">
            <TextInput
              label={t("pasteGoogleMapsLink")}
              value={form.googleMapsUrl ?? ""}
              onChange={(event) => updateGoogleMapsUrl(event.target.value)}
              placeholder={t("googleMapsPlaceholder")}
            />
            <details>
              <summary className="zook-focus inline-flex min-h-7 cursor-pointer list-none items-center rounded-full text-[11px] font-semibold text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]">
                {t("googleMapsDesktopHintTitle")}
              </summary>
              <p className="mt-1 text-[11px] leading-4 text-[var(--text-tertiary)]">
                {t("googleMapsDesktopHint")}
              </p>
            </details>
          </div>
          <div className="flex flex-wrap gap-2">
            <ZookButton
              type="button"
              tone="ghost"
              size="sm"
              onClick={useCurrentLocation}
              className="w-fit"
            >
              <LocateFixed aria-hidden size={14} />
              {t("useCurrentLocation")}
            </ZookButton>
          </div>
          {form.latitude && form.longitude ? (
            <iframe
              title={t("branchMapPin")}
              src={`https://maps.google.com/maps?q=${form.latitude},${form.longitude}&z=15&output=embed`}
              className="h-40 w-full rounded-2xl border border-[var(--border)]"
            />
          ) : hasMapsLink ? (
            <p className="rounded-2xl border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-semibold leading-5 text-[var(--accent-strong)]">
              {t("mapsLinkPublishHint")}
            </p>
          ) : (
            <p className="text-xs text-[var(--text-tertiary)]">
              {t("mapFallbackHint")}
            </p>
          )}
          <details className="group">
            <summary className="zook-focus inline-flex cursor-pointer list-none rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]">
              {t("advancedCoordinates")}
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <TextInput
                label={t("latitude")}
                value={form.latitude ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    latitude: event.target.value,
                    locationSource: "MANUAL",
                    googleMapsUrl: "",
                  }))
                }
                placeholder="e.g. 28.6139"
                inputMode="decimal"
              />
              <TextInput
                label={t("longitude")}
                value={form.longitude ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    longitude: event.target.value,
                    locationSource: "MANUAL",
                    googleMapsUrl: "",
                  }))
                }
                placeholder="e.g. 77.2090"
                inputMode="decimal"
              />
            </div>
          </details>
        </div>
      )}

      <details className="group rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
        <summary className="zook-focus flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl text-sm font-semibold text-[var(--text-primary)]">
          <span>{t("opsContactTitle")}</span>
          <span className="text-xs font-medium text-[var(--text-tertiary)] group-open:hidden">
            {t("show")}
          </span>
          <span className="hidden text-xs font-medium text-[var(--text-tertiary)] group-open:inline">
            {t("hide")}
          </span>
        </summary>
        <p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">
          {t("opsContactBody")}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <SelectInput
            label={t("branchManager")}
            value={form.managerId ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, managerId: event.target.value }))
            }
          >
            <option value="">{t("noManager")}</option>
            {staffAssignments
              .filter((assignment) => assignment.role === "OWNER" || assignment.role === "ADMIN")
              .map((assignment) => (
                <option key={assignment.userId} value={assignment.userId}>
                  {staffUsersById.get(assignment.userId)?.name ??
                    staffUsersById.get(assignment.userId)?.email ??
                    t("teamMember")}
                </option>
              ))}
          </SelectInput>
          <TextInput
            label={t("branchPhone")}
            value={form.contactPhone ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, contactPhone: event.target.value }))
            }
            placeholder={t("phonePlaceholder")}
          />
          <TextInput
            label={t("branchEmail")}
            value={form.contactEmail ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, contactEmail: event.target.value }))
            }
            placeholder={t("branchEmailPlaceholder")}
            type="email"
          />
          <TextInput
            label={t("whatsappNumber")}
            value={form.whatsappNumber ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, whatsappNumber: event.target.value }))
            }
            placeholder={t("phonePlaceholder")}
          />
          <TextInput
            label={t("amenities")}
            value={form.amenitiesText ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, amenitiesText: event.target.value }))
            }
            placeholder={t("amenitiesPlaceholder")}
          />
        </div>
      </details>

      {variant === "full" && (
        <>
          {isStepLayout && <Pill className="w-fit mt-2">{t("membershipAccess")}</Pill>}
          <div className="grid gap-2">
            <span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              {t("plansProducts")}
              <HelpHint label={t("plansProducts")} title={t("plansProducts")}>
                {t("plansProductsHelp")}
              </HelpHint>
            </span>
            <RadioCardGroup
              name={`${mode}-branch-commerce-setup`}
              label={t("plansProducts")}
              value={form.commerceSetup ?? "SHARED"}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  commerceSetup: value as "SHARED" | "CUSTOM",
                }))
              }
              options={[
                {
                  value: "SHARED",
                  label: t("sharedCatalogLabel"),
                  description: t("sharedCatalogDescription"),
                },
                {
                  value: "CUSTOM",
                  label: t("customCatalogLabel"),
                  description: t("customCatalogDescription"),
                },
              ]}
            />
          </div>
        </>
      )}

      {isStepLayout && <Pill className="w-fit mt-2">{t("workingHours")}</Pill>}
      <BranchHoursEditor
        value={form.hoursText}
        onChange={(hoursText) => setForm((current) => ({ ...current, hoursText }))}
        compact={variant === "compact"}
      />

      <div className="flex flex-wrap gap-2 mt-4">
        <ZookButton
          type="button"
          onClick={onSubmit}
          disabled={formBusy}
          state={formBusy ? "loading" : "idle"}
          className={mode === "create" && variant === "full" ? "w-full" : "w-fit"}
        >
          {mode === "create" ? t("saveCreate") : t("saveEdit")}
        </ZookButton>
        {onCancel && (
          <ZookButton type="button" tone="ghost" size="sm" onClick={onCancel}>
            {t("cancel")}
          </ZookButton>
        )}
      </div>
    </div>
  );
}

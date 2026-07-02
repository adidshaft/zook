"use client";

import { useState } from "react";
import { ChevronDown, Navigation } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { publicT, type PublicLocale } from "@/lib/public-i18n";
import type { PublicGym, PublicGymProfileData } from "./types";

function distanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const radiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function compactAddressParts(...parts: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return parts
    .flatMap((part) => part?.split(",") ?? [])
    .map((part) => part.trim())
    .filter((part) => {
      const key = part.toLowerCase();
      if (!part || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
}

function compactAddressPartsExcluding(
  excludedParts: Array<string | null | undefined>,
  ...parts: Array<string | null | undefined>
) {
  const excluded = new Set(
    excludedParts
      .flatMap((part) => part?.split(",") ?? [])
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
  return compactAddressParts(
    ...parts.map((part) => {
      if (!part) return part;
      return part
        .split(",")
        .map((segment) => segment.trim())
        .filter((segment) => !excluded.has(segment.toLowerCase()))
        .join(", ");
    }),
  );
}

function branchDisplayName(orgName: string, branch: PublicGymProfileData["branches"][number]) {
  const raw = branch.name?.trim();
  if (!raw) {
    return branch.city?.trim() || "Main";
  }

  const compact = orgName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((label, word) => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return label.replace(new RegExp(`^${escaped}[\\s·,-]+`, "i"), "").trim();
    }, raw);

  return compact || raw;
}

export function LocationCard({
  org,
  branches = [],
  locale,
}: {
  org: PublicGym;
  branches?: PublicGymProfileData["branches"];
  locale: PublicLocale;
}) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const [distance, setDistance] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(
    (branches.find((branch) => branch.isDefault) ?? branches[0])?.id ?? null,
  );
  const selectedBranch =
    branches.find((branch) => branch.id === selectedBranchId) ??
    branches.find((branch) => branch.isDefault) ??
    branches[0] ??
    null;
  const selectedLatitude = selectedBranch?.latitude ?? org.latitude;
  const selectedLongitude = selectedBranch?.longitude ?? org.longitude;
  const hasBranchChoices = branches.length > 1;
  const alternateBranches = selectedBranch
    ? branches.filter((branch) => branch.id !== selectedBranch.id)
    : branches;
  const locationTitle = selectedBranch ? branchDisplayName(org.name, selectedBranch) : t("gettingThere");
  const selectedAddress = selectedBranch
    ? compactAddressPartsExcluding(
        [locationTitle, selectedBranch.name],
        selectedBranch.address,
        selectedBranch.city,
        selectedBranch.state,
      )
    : compactAddressParts(org.address, org.city, org.state);
  const query =
    selectedLatitude != null && selectedLongitude != null
      ? `${selectedLatitude},${selectedLongitude}`
      : selectedAddress;
  const directionsUrl =
    selectedBranch?.googleMapsUrl ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const hasCoordinates = typeof selectedLatitude === "number" && typeof selectedLongitude === "number";
  const distanceLabel =
    distance === null
      ? null
      : `${distance < 10 ? distance.toFixed(1) : Math.round(distance)} km ${t("distanceAway")}`;

  function requestDistance() {
    if (!hasCoordinates || !navigator.geolocation) {
      setStatus(t("distanceUnavailable"));
      return;
    }
    setStatus(t("distanceChecking"));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDistance(
          distanceKm(
            { latitude: position.coords.latitude, longitude: position.coords.longitude },
            { latitude: selectedLatitude!, longitude: selectedLongitude! },
          ),
        );
        setStatus(null);
      },
      () => setStatus(t("locationPermissionDenied")),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8000 },
    );
  }

  function selectBranch(branchId: string) {
    setSelectedBranchId(branchId);
    setDistance(null);
    setStatus(null);
    setMapExpanded(false);
  }

  return (
    <GlassCard className="scroll-mt-24">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            {t("location")}
          </p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight text-[var(--text-primary)]">
            {locationTitle}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {selectedAddress}
          </p>
          {distanceLabel ? (
            <p className="mt-2 text-sm font-semibold text-[var(--accent-strong)]">
              {distanceLabel}
            </p>
          ) : null}
          {status ? <p className="mt-2 text-xs text-[var(--text-tertiary)]">{status}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-focus)] bg-[var(--surface-accent-soft)] px-4 text-xs font-semibold text-[var(--accent-strong)]"
          >
            <Navigation size={14} /> {t("getDirections")}
          </a>
        </div>
      </div>
      {hasBranchChoices && alternateBranches.length ? (
        <div
          aria-label={locale === "hi" ? "ब्रांच चुनें" : "Choose branch"}
          className="mt-4 flex gap-2 overflow-x-auto pb-1"
        >
          {alternateBranches.map((branch) => {
            const hasMapLocation =
              Boolean(branch.googleMapsUrl) ||
              (typeof branch.latitude === "number" && typeof branch.longitude === "number");
            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => selectBranch(branch.id)}
                className="zook-focus inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 text-left text-xs font-bold text-[var(--text-secondary)] transition hover:border-[var(--border)] hover:text-[var(--text-primary)]"
              >
                {hasMapLocation ? <Navigation size={13} aria-hidden /> : null}
                {branchDisplayName(org.name, branch)}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="mt-4">
        <button
          type="button"
          aria-expanded={mapExpanded}
          aria-controls="gym-location-map-preview"
          onClick={() => setMapExpanded((expanded) => !expanded)}
          className="zook-focus inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border)] hover:text-[var(--text-primary)]"
        >
          {t("mapPreview")}
          <ChevronDown
            aria-hidden
            size={14}
            className={`transition-transform duration-200 ${mapExpanded ? "rotate-180" : ""}`}
          />
        </button>
        {mapExpanded ? (
          <div
            id="gym-location-map-preview"
            className="mt-3 grid gap-3 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={requestDistance}
                className="min-h-10 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border)] hover:text-[var(--text-primary)]"
              >
                {t("showDistance")}
              </button>
            </div>
            <div className="aspect-[16/6] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)]">
              <iframe
                title={`${selectedBranch?.name ?? org.name} map preview`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
                className="h-full w-full border-0 grayscale-[20%]"
                loading="lazy"
              />
            </div>
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}

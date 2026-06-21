"use client";

import { useMemo, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import type { PublicGym } from "./types";

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

export function LocationCard({ org }: { org: PublicGym }) {
  const [distance, setDistance] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const query = org.latitude && org.longitude ? `${org.latitude},${org.longitude}` : `${org.address}, ${org.city}, ${org.state}`;
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const hasCoordinates = typeof org.latitude === "number" && typeof org.longitude === "number";
  const distanceLabel = useMemo(
    () => (distance === null ? null : distance < 10 ? `${distance.toFixed(1)} km away` : `${Math.round(distance)} km away`),
    [distance],
  );

  function requestDistance() {
    if (!hasCoordinates || !navigator.geolocation) {
      setStatus("Distance is unavailable for this gym.");
      return;
    }
    setStatus("Checking distance...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDistance(
          distanceKm(
            { latitude: position.coords.latitude, longitude: position.coords.longitude },
            { latitude: org.latitude!, longitude: org.longitude! },
          ),
        );
        setStatus(null);
      },
      () => setStatus("Location permission was not granted."),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8000 },
    );
  }

  return (
    <GlassCard>
      <div className="flex items-start gap-3">
        <span className="rounded-2xl border border-[var(--border-focus)] bg-[var(--surface-accent-soft)] p-3 text-[var(--accent-strong)]">
          <MapPin size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Location</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {org.address}, {org.city}, {org.state}
          </p>
          {distanceLabel ? <p className="mt-2 text-sm font-semibold text-[var(--accent-strong)]">{distanceLabel}</p> : null}
          {status ? <p className="mt-2 text-xs text-[var(--text-tertiary)]">{status}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-focus)] bg-[var(--surface-accent-soft)] px-4 py-2 text-xs font-semibold text-[var(--accent-strong)]"
            >
              <Navigation size={14} /> Get directions
            </a>
            <button
              type="button"
              onClick={requestDistance}
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]"
            >
              Show distance
            </button>
          </div>
        </div>
      </div>
      <div className="mt-5 aspect-[16/7] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)]">
        <iframe
          title={`${org.name} map preview`}
          src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
          className="h-full w-full border-0 grayscale-[20%]"
          loading="lazy"
        />
      </div>
    </GlassCard>
  );
}

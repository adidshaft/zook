"use client";

import {
  BadgeCheck,
  Ban,
  Car,
  CreditCard,
  Dumbbell,
  HeartPulse,
  Lock,
  QrCode,
  ShowerHead,
  Snowflake,
  Store,
  Users,
  Utensils,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { resolveAmenities } from "@/lib/amenity-catalog";
import type { PublicGym } from "./types";

const ICONS = {
  strength: Dumbbell,
  cardio: HeartPulse,
  trainers: Dumbbell,
  classes: Users,
  locker: Lock,
  showers: ShowerHead,
  ac: Snowflake,
  parking: Car,
  shop: Store,
  diet: Utensils,
  qr: QrCode,
  upi: CreditCard,
} as const;

export function AmenityGrid({ org }: { org: PublicGym }) {
  const { available, missing } = resolveAmenities([
    ...org.amenities,
    ...org.equipment,
    ...org.facilities,
    org.gymType,
  ]);
  return (
    <GlassCard>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What's inside</h2>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">A quick look at common gym amenities.</p>
        </div>
        <span className="text-xs font-semibold text-[var(--accent-strong)]">{available.length} available</span>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[...available, ...missing].map((item) => {
          const Icon = ICONS[item.key as keyof typeof ICONS] ?? Dumbbell;
          const has = available.some((availableItem) => availableItem.key === item.key);
          return (
            <div
              key={item.key}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm ${
                has
                  ? "border-[var(--border-focus)] bg-[var(--surface-accent-soft)] text-[var(--text-primary)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-sunken)] text-[var(--text-tertiary)]"
              }`}
            >
              <Icon size={17} />
              <span className="flex-1 font-medium">{item.label}</span>
              {has ? <BadgeCheck size={16} /> : <Ban size={15} />}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

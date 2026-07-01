import Image from "next/image";
import { Pill } from "@/components/glass-card";
import {
  joinModeLabelForLocale,
  joinModeTone,
  publicT,
  type PublicLocale,
} from "@/lib/public-i18n";
import { publicGymDisplayIdentity } from "@/lib/public-gym-profile";
import type { PublicGym, PublicGymPlan } from "./types";
import type { PublicGymProfileData } from "@/server/public-gym-read-models";

function localizedGymTagline(
  tagline: string | null | undefined,
  fallback: string,
  locale: PublicLocale,
  t: (key: Parameters<typeof publicT>[1]) => string,
) {
  if (locale === "hi" && tagline?.toLowerCase().includes("strength, pt, and recovery operations")) {
    return t("gymTaglineDemo");
  }
  return tagline || fallback;
}

export function GymHero({
  org,
  plans: _plans,
  branches,
  locale,
}: {
  org: PublicGym;
  plans: PublicGymPlan[];
  branches: PublicGymProfileData["branches"];
  locale: PublicLocale;
}) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const coverAlt = locale === "hi" ? `${org.name} जिम की तस्वीर` : `${org.name} gym interior`;
  const logoAlt = locale === "hi" ? `${org.name} लोगो` : `${org.name} logo`;
  const defaultBranch = branches.find((branch) => branch.isDefault) ?? branches[0] ?? null;
  const identity = publicGymDisplayIdentity({
    address: defaultBranch?.address ?? org.address ?? null,
    branchName: defaultBranch?.name ?? null,
    city: defaultBranch?.city ?? org.city ?? null,
    orgName: org.name,
    state: defaultBranch?.state ?? org.state ?? null,
  });
  const hasCover = Boolean(org.coverImageUrl);
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-[var(--border)] p-5 shadow-[0_24px_80px_color-mix(in_srgb,var(--accent)_12%,transparent)] md:p-8 ${
        hasCover ? "min-h-[280px] bg-black sm:min-h-[360px] lg:min-h-[420px]" : "glass-panel"
      }`}
    >
      {org.coverImageUrl ? (
        <Image
          src={org.coverImageUrl}
          alt={coverAlt}
          fill
          sizes="(min-width: 1024px) calc(100vw - 430px), 100vw"
          className="object-cover"
          priority={false}
          unoptimized
        />
      ) : null}
      <div
        className={
          hasCover
            ? "absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.58)_44%,rgba(0,0,0,0.16)_82%),linear-gradient(180deg,rgba(0,0,0,0.2),rgba(0,0,0,0.52))]"
            : "absolute inset-0 bg-gradient-to-br from-[color-mix(in_srgb,var(--bg)_74%,transparent)] via-[color-mix(in_srgb,var(--surface)_54%,transparent)] to-[color-mix(in_srgb,var(--bg-sunken)_78%,transparent)] dark:from-black/68 dark:via-black/46 dark:to-black/72"
        }
      />
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          {org.logoUrl ? (
            <Image
              src={org.logoUrl}
              alt={logoAlt}
              width={56}
              height={56}
              sizes="56px"
              className={`h-14 w-14 rounded-2xl object-cover shadow-sm ${
                hasCover
                  ? "border border-white/24 bg-black/25 shadow-black/20"
                  : "border border-[var(--border)] bg-[var(--surface)]"
              }`}
              unoptimized
            />
          ) : (
            <div
              aria-label={logoAlt}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-base font-black shadow-sm ${
                hasCover
                  ? "border border-white/24 bg-black/35 text-white"
                  : "border border-[var(--border)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]"
              }`}
            >
              {org.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Pill
              tone={joinModeTone(org.joinMode)}
              className={
                hasCover
                  ? "!border-white/24 !bg-black/45 !text-white shadow-sm backdrop-blur-md"
                  : undefined
              }
            >
              {joinModeLabelForLocale(org.joinMode, locale)}
            </Pill>
          </div>
        </div>
        <h1
          className={`mt-5 max-w-4xl text-4xl font-semibold tracking-tight md:text-5xl ${
            hasCover ? "!text-white" : "text-[var(--text-primary)]"
          }`}
        >
          {identity.title}
        </h1>
        {identity.subtitle ? (
          <p
            className={`mt-2 max-w-2xl text-sm font-semibold leading-6 ${
              hasCover ? "text-white/82" : "text-[var(--text-secondary)]"
            }`}
          >
            {identity.subtitle}
          </p>
        ) : null}
        <p
          className={`mt-5 max-w-2xl text-base font-medium leading-7 ${
            hasCover ? "text-white/88 drop-shadow-sm" : "text-[var(--text-secondary)]"
          }`}
        >
          {localizedGymTagline(org.tagline, t("gymTaglineFallback"), locale, t)}
        </p>
      </div>
    </div>
  );
}

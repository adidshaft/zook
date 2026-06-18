import Image from "next/image";
import { GlassCard, Pill } from "@/components/glass-card";
import { trainerProfileDetails } from "@/lib/public-gym-profile";
import { publicT, type PublicLocale } from "@/lib/public-i18n";
import { ReferralCard } from "./share-install";
import type { PublicGym, PublicGymTrainer } from "./types";

export function GymTrainers({
  org,
  trainers,
  locale,
}: {
  org: PublicGym;
  trainers: PublicGymTrainer[];
  locale: PublicLocale;
}) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <GlassCard>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{t("visibleTrainers")}</h2>
        <div className="mt-5 grid gap-3">
          {trainers.length ? (
            trainers.map((trainer) => <TrainerRow key={trainer.userId} trainer={trainer} locale={locale} />)
          ) : (
            <p className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4 text-sm leading-6 text-[var(--text-tertiary)]">
              {t("trainersPending")}
            </p>
          )}
        </div>
      </GlassCard>
      <ReferralCard org={org} locale={locale} />
    </section>
  );
}

function TrainerRow({
  trainer,
  locale,
}: {
  trainer: PublicGymTrainer;
  locale: PublicLocale;
}) {
  const profileDetails = trainerProfileDetails(trainer.specialties);
  const photoAlt = locale === "hi" ? `${trainer.name} की profile photo` : `${trainer.name} profile photo`;
  return (
    <div className="flex items-start gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
      {trainer.profilePhotoUrl ? (
        <Image
          src={trainer.profilePhotoUrl}
          alt={photoAlt}
          width={44}
          height={44}
          sizes="44px"
          className="h-11 w-11 rounded-2xl border border-[var(--border)] object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-accent-soft)] text-sm font-semibold text-[var(--accent-strong)]">
          {trainer.name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0">
        <p className="font-medium text-[var(--text-primary)]">{trainer.name}</p>
        {trainer.bio ? (
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">{trainer.bio}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {profileDetails.specialties.slice(0, 3).map((specialty) => (
            <Pill key={specialty}>{specialty}</Pill>
          ))}
          {profileDetails.certifications.slice(0, 2).map((certification) => (
            <Pill key={certification} tone="amber">
              {certification}
            </Pill>
          ))}
        </div>
      </div>
    </div>
  );
}

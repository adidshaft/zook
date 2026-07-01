import Image from "next/image";
import { AvatarInitials } from "@/components/dashboard-primitives";
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
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">{t("visibleTrainers")}</h2>
        <div className="mt-4 grid gap-2">
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
    <div className="flex items-start gap-3 rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3">
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
        <AvatarInitials
          name={trainer.name}
          className="h-11 w-11 rounded-2xl bg-[var(--surface-accent-soft)] text-sm text-[var(--accent-strong)]"
        />
      )}
      <div className="min-w-0">
        <p className="font-medium text-[var(--text-primary)]">{trainer.name}</p>
        {trainer.bio ? (
          <p className="mt-1 line-clamp-2 text-sm text-[var(--text-tertiary)]">{trainer.bio}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {profileDetails.specialties.slice(0, 3).map((specialty) => (
            <Pill key={specialty}>{specialty}</Pill>
          ))}
          {profileDetails.certifications.slice(0, 2).map((certification) => (
            <Pill key={certification}>{certification}</Pill>
          ))}
        </div>
      </div>
    </div>
  );
}

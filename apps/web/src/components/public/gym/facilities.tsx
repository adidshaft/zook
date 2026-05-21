import Image from "next/image";
import { GlassCard, Pill } from "@/components/glass-card";
import { publicT, type PublicLocale } from "@/lib/public-i18n";
import type { PublicGym } from "./types";

export function GymFacilities({ org, locale }: { org: PublicGym; locale: PublicLocale }) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const facilities = org.facilities.length ? org.facilities : org.amenities;
  const gallery = org.gallery.length
    ? org.gallery
    : [org.coverImageUrl].filter((imageUrl): imageUrl is string => Boolean(imageUrl));
  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <TagCard title={t("facilities")} empty={t("facilitiesPending")} items={facilities} tone="blue" />
        <TagCard title={t("equipment")} empty={t("equipmentPending")} items={org.equipment} tone="lime" />
      </section>
      {gallery.length ? (
        <section className="grid gap-4 md:grid-cols-3">
          {gallery.slice(0, 6).map((imageUrl) => (
            <Image
              key={imageUrl}
              src={imageUrl}
              alt={`${org.name} facility photo`}
              width={640}
              height={480}
              sizes="(min-width: 768px) 33vw, 100vw"
              className="aspect-[4/3] rounded-[28px] border border-white/10 object-cover"
              unoptimized
            />
          ))}
        </section>
      ) : null}
    </>
  );
}

function TagCard({
  title,
  empty,
  items,
  tone,
}: {
  title: string;
  empty: string;
  items: string[];
  tone: "blue" | "lime";
}) {
  return (
    <GlassCard>
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-5 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <Pill key={item} tone={tone} className="border-white/15 bg-white/10 text-white/80">
              {item}
            </Pill>
          ))
        ) : (
          <p className="text-sm text-white/50">{empty}</p>
        )}
      </div>
    </GlassCard>
  );
}

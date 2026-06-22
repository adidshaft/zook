import Image from "next/image";
import { GlassCard, Pill } from "@/components/glass-card";
import { publicT, type PublicLocale } from "@/lib/public-i18n";
import type { PublicGym } from "./types";
import { AmenityGrid } from "./amenity-grid";
import { LocationCard } from "./location-card";

export function GymFacilities({ org, locale }: { org: PublicGym; locale: PublicLocale }) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const gallery = org.gallery.length
    ? org.gallery
    : [org.coverImageUrl].filter((imageUrl): imageUrl is string => Boolean(imageUrl));
  const galleryAlt = (index: number) =>
    locale === "hi"
      ? `${org.name} गैलरी तस्वीर ${index + 1}`
      : `${org.name} gallery photo ${index + 1}`;
  return (
    <div className="space-y-6">
      <AmenityGrid org={org} />
      <LocationCard org={org} />
      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <TagCard title={t("facilities")} empty={t("facilitiesPending")} items={org.facilities} />
        <TagCard title={t("equipment")} empty={t("equipmentPending")} items={org.equipment} />
      </section>
      
      {gallery.length ? (
        <GlassCard>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{t("galleryTitle")}</h2>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">{t("galleryCopy")}</p>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 mt-6">
            {gallery.slice(0, 15).map((imageUrl, index) => (
              <div 
                key={imageUrl} 
                className="group relative aspect-[4/3] overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] shadow-sm transition-all duration-300 hover:scale-[1.04] hover:shadow-md hover:border-[var(--accent-strong)]/30 cursor-pointer"
              >
                <Image
                  src={imageUrl}
                  alt={galleryAlt(index)}
                  fill
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
            ))}
          </section>
        </GlassCard>
      ) : null}
    </div>
  );
}

function TagCard({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: string[];
}) {
  return (
    <GlassCard>
      <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{title}</h2>
      <div className="mt-5 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <Pill key={item} className="transition-transform duration-200 hover:scale-105">
              {item}
            </Pill>
          ))
        ) : (
          <p className="text-sm text-[var(--text-tertiary)]">{empty}</p>
        )}
      </div>
    </GlassCard>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Dumbbell, Share2, Users } from "lucide-react";
import { publicT, type PublicLocale } from "@/lib/public-i18n";
import type { PublicGym, PublicGymPlan, PublicGymTrainer } from "./types";
import { GymPlansGrid } from "./plans-grid";
import { MemberJourney } from "./member-journey";
import { GymFacilities } from "./facilities";
import { ShareInstall } from "./share-install";
import { GymTrainers } from "./trainers";

type TabId = "plans" | "trainers" | "facilities" | "app";

export function GymProfileTabs({
  org,
  plans,
  trainers,
  locale,
  initialTab = "plans",
}: {
  org: PublicGym;
  plans: PublicGymPlan[];
  trainers: PublicGymTrainer[];
  locale: PublicLocale;
  initialTab?: TabId;
}) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);

  const tabs = [
    {
      id: "plans" as TabId,
      label: t("plansTab"),
      icon: Dumbbell,
      content: (
        <div className="grid gap-6">
          <GymPlansGrid org={org} plans={plans} locale={locale} />
          <MemberJourney locale={locale} />
        </div>
      ),
    },
    {
      id: "trainers" as TabId,
      label: t("trainersTab"),
      count: trainers.length,
      icon: Users,
      content: <GymTrainers org={org} trainers={trainers} locale={locale} />,
    },
    {
      id: "facilities" as TabId,
      label: t("facilitiesTab"),
      count: org.facilities.length + org.equipment.length,
      icon: Building2,
      content: <GymFacilities org={org} locale={locale} />,
    },
    {
      id: "app" as TabId,
      label: t("appTab"),
      icon: Share2,
      content: <ShareInstall org={org} locale={locale} />,
    },
  ];

  return (
    <div id="plans" className="grid scroll-mt-24 gap-4">
      <div
        role="tablist"
        aria-label={locale === "hi" ? "जिम प्रोफाइल सेक्शन" : "Gym profile sections"}
        className="sticky top-20 z-20 flex justify-start overflow-x-auto no-scrollbar rounded-full border border-[var(--border)] bg-[var(--surface)]/90 p-1.5 backdrop-blur-xl md:justify-center"
      >
        <div className="flex min-w-max snap-x snap-mandatory gap-0.5 pr-2 sm:gap-1 sm:pr-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`gym-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`gym-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex min-h-9 snap-start items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold tracking-wide transition-all duration-300 sm:min-h-10 sm:gap-2 sm:px-4 ${
                  isActive
                    ? "text-[var(--accent-strong)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sunken)]/50"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="active-profile-tab"
                    className="absolute inset-0 rounded-full bg-[var(--surface-accent-soft)] border border-[var(--border-focus)]/30"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={13} className="relative z-10 shrink-0 sm:size-3.5" />
                <span className="relative z-10 whitespace-nowrap">
                  {tab.label}
                </span>
                {"count" in tab && tab.count > 0 ? (
                  <span
                    aria-label={
                      locale === "hi" ? `${tab.count} उपलब्ध` : `${tab.count} available`
                    }
                    className={`relative z-10 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold sm:h-5 sm:min-w-5 sm:px-1.5 sm:text-[10px] ${
                      isActive
                        ? "bg-[var(--accent-fill)] text-[var(--text-on-accent)]"
                        : "bg-[var(--bg-sunken)] text-[var(--text-tertiary)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative min-h-[300px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            role="tabpanel"
            id={`gym-panel-${activeTab}`}
            aria-labelledby={`gym-tab-${activeTab}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tabs.find((t) => t.id === activeTab)?.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

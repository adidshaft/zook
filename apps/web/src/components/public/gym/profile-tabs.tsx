"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Users, Smartphone, Dumbbell } from "lucide-react";
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
}: {
  org: PublicGym;
  plans: PublicGymPlan[];
  trainers: PublicGymTrainer[];
  locale: PublicLocale;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("plans");
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);

  const tabs = [
    {
      id: "plans" as TabId,
      label: t("viewPlans"),
      icon: Dumbbell,
      content: (
        <div className="grid gap-6">
          <GymPlansGrid org={org} plans={plans} locale={locale} />
          <MemberJourney plans={plans} locale={locale} />
        </div>
      ),
    },
    {
      id: "trainers" as TabId,
      label: t("visibleTrainers"),
      icon: Users,
      content: <GymTrainers org={org} trainers={trainers} locale={locale} />,
    },
    {
      id: "facilities" as TabId,
      label: t("facilities"),
      icon: Building2,
      content: <GymFacilities org={org} locale={locale} />,
    },
    {
      id: "app" as TabId,
      label: t("shareOrInstall"),
      icon: Smartphone,
      content: <ShareInstall org={org} locale={locale} />,
    },
  ];

  return (
    <div className="grid gap-6">
      {/* Sticky Tab Bar */}
      <div className="sticky top-20 z-20 flex justify-start overflow-x-auto no-scrollbar rounded-full border border-[var(--border)] bg-[var(--surface)]/90 p-1.5 backdrop-blur-xl md:justify-center">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-300 ${
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
                <Icon size={14} className="relative z-10 shrink-0" />
                <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="relative min-h-[300px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
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

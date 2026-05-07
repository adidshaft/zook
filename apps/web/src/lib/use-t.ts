"use client";

import { useTranslations } from "next-intl";

export function useT(namespace?: string) {
  return useTranslations(namespace);
}

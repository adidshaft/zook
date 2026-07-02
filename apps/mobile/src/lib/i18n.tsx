import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { enTranslations } from "./i18n/en";
import { hiTranslations } from "./i18n/hi";
import { getStoredValue, setStoredValue } from "./storage";

const LOCALE_STORAGE_KEY = "zook_mobile_locale";
const SESSION_STORAGE_KEY = "zook_session";
const localeListeners = new Set<(preference: LocalePreference) => void>();
let runtimePreference: LocalePreference = "system";

export type AppLocale = "en" | "hi";
export type LocalePreference = "system" | AppLocale;

export type TranslationKey = Extract<keyof typeof enTranslations, string>;

type TranslationValues = Record<string, string | number>;

const translations = {
  en: enTranslations,
  hi: hiTranslations,
} satisfies Record<AppLocale, Record<TranslationKey, string>>;

type I18nContextValue = {
  locale: AppLocale;
  preference: LocalePreference;
  setLocalePreference: (preference: LocalePreference) => Promise<void>;
  t: (key: TranslationKey, values?: TranslationValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function systemLocale(): AppLocale {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    return locale.startsWith("hi") ? "hi" : "en";
  } catch {
    return "en";
  }
}

function localeForPreference(preference: LocalePreference): AppLocale {
  return preference === "system" ? systemLocale() : preference;
}

function normalizePreference(value?: string | null): LocalePreference {
  return value === "hi" || value === "en" || value === "system" ? value : "system";
}

async function patchProfileLocale(preference: LocalePreference) {
  if (preference === "system") {
    return;
  }
  const token = await getStoredValue(SESSION_STORAGE_KEY);
  if (!token) {
    return;
  }
  const { mobileApiFetch } = await import("./api");
  await mobileApiFetch("/me/profile", {
    method: "PATCH",
    token,
    body: { preferredLocale: preference },
  });
}

export async function applySessionLocalePreference(value?: string | null) {
  const nextPreference = normalizePreference(value);
  runtimePreference = nextPreference;
  if (nextPreference === "system") {
    return;
  }
  await setStoredValue(LOCALE_STORAGE_KEY, nextPreference);
  localeListeners.forEach((listener) => listener(nextPreference));
}

function interpolate(template: string, values?: TranslationValues) {
  if (!values) {
    return template;
  }
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(new RegExp(`{{${key}}}`, "g"), String(value)),
    template,
  );
}

export function translate(key: TranslationKey, values?: TranslationValues) {
  const locale = localeForPreference(runtimePreference);
  return interpolate(translations[locale][key] ?? translations.en[key] ?? key, values);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<LocalePreference>("system");
  const [hydrated, setHydrated] = useState(false);
  const locale = localeForPreference(preference);

  useEffect(() => {
    let cancelled = false;
    const syncFromSession = (nextPreference: LocalePreference) => {
      if (!cancelled) {
        setPreference(nextPreference);
      }
    };
    localeListeners.add(syncFromSession);
    void getStoredValue(LOCALE_STORAGE_KEY)
      .then((storedPreference) => {
        if (!cancelled) {
          const nextPreference = normalizePreference(storedPreference);
          runtimePreference = nextPreference;
          setPreference(nextPreference);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
      localeListeners.delete(syncFromSession);
    };
  }, []);

  const setLocalePreference = useCallback(async (nextPreference: LocalePreference) => {
    runtimePreference = nextPreference;
    setPreference(nextPreference);
    await setStoredValue(LOCALE_STORAGE_KEY, nextPreference);
    void patchProfileLocale(nextPreference);
  }, []);

  const t = useCallback(
    (key: TranslationKey, values?: TranslationValues) =>
      interpolate(translations[locale][key] ?? translations.en[key] ?? key, values),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      preference: hydrated ? preference : "system",
      setLocalePreference,
      t,
    }),
    [hydrated, locale, preference, setLocalePreference, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context) {
    return context;
  }
  return {
    locale: "en" as const,
    preference: "system" as const,
    setLocalePreference: async () => undefined,
    t: (key: TranslationKey, values?: TranslationValues) =>
      interpolate(translations.en[key] ?? key, values),
  };
}

export function useT() {
  return useI18n().t;
}

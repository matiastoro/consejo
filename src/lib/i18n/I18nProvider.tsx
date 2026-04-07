"use client";

import {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import en from "./translations/en.json";
import es from "./translations/es.json";

type Locale = "en" | "es";

interface Translations {
  [key: string]: any;
}

const translations: Record<Locale, Translations> = { en, es };

interface I18nContextType {
  locale: Locale;
  t: (key: string) => string;
  toggleLocale: () => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("es");

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale;
    if (saved && (saved === "en" || saved === "es")) {
      setLocale(saved);
    }
  }, []);

  const t = (key: string): string => {
    const keys = key.split(".");
    let value: any = translations[locale];
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    return typeof value === "string" ? value : key;
  };

  const toggleLocale = () => {
    setLocale((prev) => {
      const newLocale = prev === "en" ? "es" : "en";
      localStorage.setItem("locale", newLocale);
      return newLocale;
    });
  };

  return (
    <I18nContext.Provider value={{ locale, t, toggleLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

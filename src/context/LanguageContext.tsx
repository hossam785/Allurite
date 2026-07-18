"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ar } from "@/lib/translations/ar";
import { en } from "@/lib/translations/en";

type Language = "ar" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ar");

  // Load language preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("preferred_language") as Language;
    if (saved === "ar" || saved === "en") {
      setLanguageState(saved);
    } else {
      localStorage.setItem("preferred_language", "ar");
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("preferred_language", lang);
  };

  // Toggle html dir and lang attributes client-side dynamically
  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = (path: string): string => {
    const dict = language === "ar" ? ar : en;
    const parts = path.split(".");
    let current: any = dict;

    for (const part of parts) {
      if (current === undefined || current === null) return path;
      current = current[part];
    }

    return current || path;
  };

  const isRtl = language === "ar";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

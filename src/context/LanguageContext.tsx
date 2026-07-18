"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ar } from "@/lib/translations/ar";

type Language = "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: any) => void;
  t: (path: string) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language: Language = "ar";

  useEffect(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
  }, []);

  const setLanguage = (lang: any) => {
    // Force Arabic, ignore switcher inputs
  };

  const t = (path: string): string => {
    const dict = ar;
    const parts = path.split(".");
    let current: any = dict;

    for (const part of parts) {
      if (current === undefined || current === null) return path;
      current = current[part];
    }

    return current || path;
  };

  const isRtl = true;

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

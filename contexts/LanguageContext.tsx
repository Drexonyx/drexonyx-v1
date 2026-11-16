"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "ar";

interface LanguageContextValue {
  lang: Lang;
  toggleLang: () => void;
  isAr: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  toggleLang: () => {},
  isAr: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("drex-lang") as Lang | null;
      if (stored === "ar" || stored === "en") setLang(stored);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem("drex-lang", lang);
    } catch {}
  }, [lang]);

  const toggleLang = () => setLang((l) => (l === "en" ? "ar" : "en"));

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, isAr: lang === "ar" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

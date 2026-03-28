"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const LanguageContext = createContext();

export function LanguageProvider({ children, initialLang = "ar" }) {
  const [lang, setLang] = useState(initialLang); // Use server-side initial language

  useEffect(() => {
    // Sync with localStorage on client load
    const saved = localStorage.getItem("lang");
    if (saved && saved !== lang) {
      setLang(saved);
    }
  }, [lang]);

  const router = useRouter();

  const switchLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    // Set cookie for SSR
    document.cookie = `lang=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}`;
    
    // Update HTML attributes immediately
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    
    // Refresh to update server components
    router.refresh();
  };

  const isRTL = lang === "ar";

  return (
    <LanguageContext.Provider value={{ lang, setLang: switchLanguage, isRTL }}>
      <div dir={isRTL ? "rtl" : "ltr"} className={isRTL ? "font-arabic" : "font-sans"}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { normalizeAppLang } from "@/lib/i18n-lang";

const LanguageContext = createContext();

export function LanguageProvider({ children, initialLang = "ar", branding }) {
  const [lang, setLang] = useState(() => normalizeAppLang(initialLang));

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang");
      if (!saved) return;
      const next = normalizeAppLang(saved);
      setLang((prev) => (next !== prev ? next : prev));
      if (next !== saved) {
        localStorage.setItem("lang", next);
        document.cookie = `lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
      }
    } catch {
      /* ignore */
    }
  }, []);

  const router = useRouter();

  const switchLanguage = (newLang) => {
    const next = normalizeAppLang(newLang);
    setLang(next);
    localStorage.setItem("lang", next);
    document.cookie = `lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;

    document.documentElement.lang = next;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";

    router.refresh();
  };

  const isRTL = lang === "ar";
  const brandNameAr = branding?.nameAr || "أعمال عصام الدين نصر للأدوات الكهربائية";
  const brandNameEn = branding?.nameEn || "Essam El-Din Nasr Electrical Tools";
  const brandTaglineAr = branding?.taglineAr || "الأدوات الكهربائية + حلول الطاقة الشمسية";
  const brandTaglineEn = branding?.taglineEn || "Electrical Tools + Solar Solutions";

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang: switchLanguage,
        isRTL,
        brandName: isRTL ? brandNameAr : brandNameEn,
        brandTagline: isRTL ? brandTaglineAr : brandTaglineEn,
      }}
    >
      <div dir={isRTL ? "rtl" : "ltr"} className={isRTL ? "font-arabic" : "font-sans"}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

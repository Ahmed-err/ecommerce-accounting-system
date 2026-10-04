"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeAppLang } from "@/lib/i18n-lang";

const LanguageContext = createContext();

export function LanguageProvider({ children, initialLang = "ar", branding, dictionary }) {
  const [lang, setLang] = useState(() => normalizeAppLang(initialLang));

  // The lang cookie (read by the server in layout.js) is the single source of truth.

  const router = useRouter();

  const switchLanguage = (newLang) => {
    const next = normalizeAppLang(newLang);
    setLang(next);
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

  const contactPhone = branding?.contactPhone?.trim() || null;
  const contactEmail = branding?.contactEmail?.trim() || null;
  const contactAddress =
    (isRTL ? branding?.addressAr?.trim() || branding?.addressEn?.trim() : branding?.addressEn?.trim() || branding?.addressAr?.trim()) ||
    null;

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang: switchLanguage,
        isRTL,
        brandName: isRTL ? brandNameAr : brandNameEn,
        brandTagline: isRTL ? brandTaglineAr : brandTaglineEn,
        contactPhone,
        contactEmail,
        contactAddress,
        // Current language only; the server layout passes it and re-sends it after a language switch refresh.
        dictionary: dictionary || {},
      }}
    >
      <div dir={isRTL ? "rtl" : "ltr"} className={isRTL ? "font-arabic" : "font-sans"}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

export const useT = () => useContext(LanguageContext)?.dictionary || {};

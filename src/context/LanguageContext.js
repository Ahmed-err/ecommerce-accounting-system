"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const LanguageContext = createContext();

export function LanguageProvider({ children, initialLang = "ar", branding }) {
  const [lang, setLang] = useState(initialLang);

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved && saved !== lang) {
      setLang(saved);
    }
  }, [lang]);

  const router = useRouter();

  const switchLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    document.cookie = `lang=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}`;

    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";

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

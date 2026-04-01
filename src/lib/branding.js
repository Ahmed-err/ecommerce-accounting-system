import { translations } from "@/lib/translations";
import { getOrCreateStoreSettings } from "@/lib/settings";

export async function getStoreBranding() {
  try {
    const store = await getOrCreateStoreSettings();
    return {
      nameAr: store.nameAr || translations.ar.brandName,
      nameEn: store.nameEn || translations.en.brandName,
      taglineAr: store.sloganAr || translations.ar.brandTagline,
      taglineEn: store.sloganEn || translations.en.brandTagline,
    };
  } catch (error) {
    console.error("Failed to load store branding, using translation defaults:", error);
  }

  return {
    nameAr: translations.ar.brandName,
    nameEn: translations.en.brandName,
    taglineAr: translations.ar.brandTagline,
    taglineEn: translations.en.brandTagline,
  };
}

export function getBrandingForLang(branding, lang) {
  const isRTL = lang === "ar";
  const fallbackName = isRTL ? translations.ar.brandName : translations.en.brandName;
  const fallbackTagline = isRTL ? translations.ar.brandTagline : translations.en.brandTagline;
  return {
    brandName: isRTL ? branding?.nameAr || branding?.nameEn || fallbackName : branding?.nameEn || branding?.nameAr || fallbackName,
    brandTagline: isRTL
      ? branding?.taglineAr || branding?.taglineEn || fallbackTagline
      : branding?.taglineEn || branding?.taglineAr || fallbackTagline,
  };
}

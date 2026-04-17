import { unstable_cache } from "next/cache";
import { translations } from "@/lib/translations";
import { getOrCreateStoreSettings } from "@/lib/settings";

async function fetchStoreBranding() {
  try {
    const store = await getOrCreateStoreSettings();
    return {
      nameAr: store.nameAr || translations.ar.brandName,
      nameEn: store.nameEn || translations.en.brandName,
      taglineAr: store.sloganAr || translations.ar.brandTagline,
      taglineEn: store.sloganEn || translations.en.brandTagline,
      contactPhone: store.contactPhone?.trim() || null,
      contactEmail: store.contactEmail?.trim() || null,
      addressAr: store.addressAr?.trim() || null,
      addressEn: store.addressEn?.trim() || null,
    };
  } catch (error) {
    console.error("Failed to load store branding, using translation defaults:", error);
  }

  return {
    nameAr: translations.ar.brandName,
    nameEn: translations.en.brandName,
    taglineAr: translations.ar.brandTagline,
    taglineEn: translations.en.brandTagline,
    contactPhone: null,
    contactEmail: null,
    addressAr: null,
    addressEn: null,
  };
}

export const getStoreBranding = unstable_cache(fetchStoreBranding, ["store-branding"], {
  tags: ["branding"],
  revalidate: 300,
});

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

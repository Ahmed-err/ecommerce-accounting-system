import { unstable_cache } from "next/cache";
import { translations } from "@/lib/translations";
import { getOrCreateStoreSettings } from "@/lib/settings";

const clean = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function fetchStoreBranding() {
  try {
    const store = await getOrCreateStoreSettings();
    return {
      nameAr: clean(store.nameAr) || translations.ar.brandName,
      nameEn: clean(store.nameEn) || translations.en.brandName,
      taglineAr: clean(store.sloganAr) || translations.ar.brandTagline,
      taglineEn: clean(store.sloganEn) || translations.en.brandTagline,
      contactPhone: store.contactPhone?.trim() || null,
      contactEmail: store.contactEmail?.trim() || null,
      addressAr: store.addressAr?.trim() || null,
      addressEn: store.addressEn?.trim() || null,
      social: {
        facebook: clean(store.facebookUrl),
        instagram: clean(store.instagramUrl),
        whatsapp: clean(store.whatsappUrl),
        tiktok: clean(store.tiktokUrl),
      },
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
    social: { facebook: null, instagram: null, whatsapp: null, tiktok: null },
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

import { cachedQuery } from "@/lib/cached-query";
import { translations } from "@/lib/translations";
import { getStoreSettingsForDisplay, loadStoreSettingsOrThrow } from "@/lib/settings";
import { CACHE_TTL, TAGS } from "@/lib/cache-tags";

const clean = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

function brandingFromStore(store) {
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
}

function defaultBranding() {
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

export async function fetchStoreBranding() {
  try {
    return brandingFromStore(await getStoreSettingsForDisplay());
  } catch (error) {
    console.error("Failed to load store branding, using translation defaults:", error);
    return defaultBranding();
  }
}

// Read on every page (root layout). Cleared on any Store write, so a day is only a safety net.
// A database failure inside the cached function throws instead of caching the defaults.
const loadBrandingCached = cachedQuery(
  async () => brandingFromStore(await loadStoreSettingsOrThrow()),
  ["store-branding-v2"],
  { tags: [TAGS.branding], revalidate: CACHE_TTL.branding }
);

export async function getStoreBranding() {
  try {
    return await loadBrandingCached();
  } catch (error) {
    console.error("Failed to load store branding, using translation defaults:", error);
    return defaultBranding();
  }
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

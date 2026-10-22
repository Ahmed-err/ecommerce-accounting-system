import { cachedQuery } from "@/lib/cached-query";
import { prisma as db } from "@/lib/prisma";
import { pickPrinterFieldsFromStore } from "@/lib/receipt";
import { CACHE_TTL, TAGS } from "@/lib/cache-tags";

const DEFAULT_HOURS = {
  sunday: { open: true, from: "09:00", to: "17:00" },
  monday: { open: true, from: "09:00", to: "17:00" },
  tuesday: { open: true, from: "09:00", to: "17:00" },
  wednesday: { open: true, from: "09:00", to: "17:00" },
  thursday: { open: true, from: "09:00", to: "17:00" },
  friday: { open: false, from: "09:00", to: "17:00" },
  saturday: { open: true, from: "09:00", to: "17:00" },
};

// Throws on database errors (so a failure is never cached); callers below fall back.
export async function loadStoreSettingsOrThrow() {
  return loadStoreSettings();
}

async function loadStoreSettings() {
    const existing = await db.store.findFirst({
      orderBy: { createdAt: "asc" },
      include: {
        shippingZones: { orderBy: { createdAt: "asc" } },
        paymentMethods: { orderBy: { createdAt: "asc" } },
        notificationConfig: true,
      },
    });

    if (existing) return existing;

    const created = await db.store.create({
      data: {
        nameAr: "أعمال عصام الدين نصر للأدوات الكهربائية",
        nameEn: "Essam El-Din Nasr Electrical Tools",
        businessHoursJson: DEFAULT_HOURS,
        paymentMethods: {
          create: [
            { code: "CASH_ON_DELIVERY", labelAr: "الدفع عند الاستلام", labelEn: "Cash on Delivery", isEnabled: true },
            { code: "ONLINE_GATEWAY", labelAr: "الدفع الإلكتروني", labelEn: "Online Gateway", isEnabled: false },
          ],
        },
        notificationConfig: { create: {} },
      },
      include: {
        shippingZones: true,
        paymentMethods: true,
        notificationConfig: true,
      },
    });

    return created;
}

function defaultStoreSettings() {
    return {
      nameAr: "أعمال عصام الدين نصر للأدوات الكهربائية",
      nameEn: "Essam El-Din Nasr Electrical Tools",
      sloganAr: null,
      sloganEn: null,
      contactPhone: null,
      contactEmail: null,
      addressAr: null,
      addressEn: null,
      businessHoursJson: DEFAULT_HOURS,
      shippingZones: [],
      paymentMethods: [],
      notificationConfig: null,
    };
}

export async function getOrCreateStoreSettings() {
  try {
    return await loadStoreSettings();
  } catch (error) {
    console.error("Falling back to default store settings:", error);
    return defaultStoreSettings();
  }
}

const loadStoreSettingsCached = cachedQuery(loadStoreSettings, ["store-settings-v1"], {
  tags: [TAGS.storeSettings],
  revalidate: CACHE_TTL.storeSettings,
});

/**
 * Cached store settings for display only (storefront pages, branding). The result went
 * through JSON: dates are ISO strings and decimals are strings, so wrap numbers in
 * Number(). Code that charges money or writes settings uses getOrCreateStoreSettings().
 */
export async function getStoreSettingsForDisplay() {
  try {
    return await loadStoreSettingsCached();
  } catch (error) {
    console.error("Falling back to default store settings:", error);
    return defaultStoreSettings();
  }
}

export async function getPrinterSettings() {
  const store = await getOrCreateStoreSettings();
  return pickPrinterFieldsFromStore(store);
}

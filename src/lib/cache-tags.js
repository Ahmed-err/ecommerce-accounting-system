import { revalidateTag } from "next/cache";

// Tags on cached reads (unstable_cache). Every write to a model listed in MODEL_TAGS clears
// its tags automatically (see src/lib/db-write-tracking.js), so cached pages never outlive a
// change. Reads that must be exact (checkout, POS sale, stock receive/issue) never use the
// cache: they read inside their own database transaction.
export const TAGS = {
  catalog: "catalog",
  stock: "stock",
  reviews: "reviews",
  homepage: "homepage",
  branding: "branding",
  storeSettings: "store-settings",
  authUsers: "auth-users",
  notifications: "notifications",
  content: "store-content",
};

export const MODEL_TAGS = {
  Product: [TAGS.catalog, TAGS.stock, TAGS.homepage],
  Category: [TAGS.catalog, TAGS.homepage],
  Review: [TAGS.reviews, TAGS.catalog, TAGS.homepage],
  Banner: [TAGS.homepage],
  Offer: [TAGS.homepage],
  Store: [TAGS.branding, TAGS.storeSettings, TAGS.homepage],
  ShippingZone: [TAGS.storeSettings],
  PaymentMethod: [TAGS.storeSettings],
  NotificationConfig: [TAGS.storeSettings],
  User: [TAGS.authUsers],
  Notification: [TAGS.notifications],
  AboutFeature: [TAGS.content],
  TeamMember: [TAGS.content],
  LegalPage: [TAGS.content],
  Faq: [TAGS.content],
};

// How long a cached read may live if no write clears it first. Writes clear tags at once;
// these are only a safety net, long enough that an idle store lets Neon suspend.
export const CACHE_TTL = {
  catalog: 60 * 60,
  stock: 10 * 60,
  homepage: 60 * 60,
  branding: 24 * 60 * 60,
  storeSettings: 60 * 60,
  authUsers: 30 * 60,
  notifications: 10 * 60,
  content: 24 * 60 * 60,
};

/** Expire tags immediately (next read goes to the database). Never throws. */
export function invalidateTags(tags) {
  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch {
      // Outside a request (seed and maintenance scripts) or during render: there is no
      // request-scoped cache to clear, and the TTL above still bounds staleness.
    }
  }
}

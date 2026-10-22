import * as nextCache from "next/cache";

/**
 * Caches an async database read in Next's data cache (shared across serverless instances
 * on Vercel), so repeat visits, crawlers and polling screens do not wake the database.
 *
 * Rules for `load`:
 * - It must THROW on database errors. Catch outside the cached function and fall back
 *   there, otherwise a fallback would be cached for the whole TTL.
 * - Its result goes through JSON: Dates come back as ISO strings and Prisma Decimals as
 *   strings, so return plain serialized values (numbers, strings) where callers compute.
 * - Arguments are part of the cache key.
 */
export function cachedQuery(load, keyParts, { tags, revalidate }) {
  let make;
  try {
    make = nextCache.unstable_cache;
  } catch {
    make = undefined; // a test's vi.mock("next/cache") factory without unstable_cache
  }
  if (typeof make !== "function") return load;
  const cached = make(load, keyParts, { tags, revalidate });
  return async (...args) => {
    try {
      return await cached(...args);
    } catch (error) {
      // No Next.js request cache here (a script or a unit test): read directly instead.
      if (String(error?.message || "").includes("incrementalCache missing")) return load(...args);
      throw error;
    }
  };
}

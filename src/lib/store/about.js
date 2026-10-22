import { prisma as db } from "@/lib/prisma";
import { getStoreSettingsForDisplay } from "@/lib/settings";
import { cachedQuery } from "@/lib/cached-query";
import { CACHE_TTL, TAGS } from "@/lib/cache-tags";

// About page content; cleared by any AboutFeature or TeamMember write. Errors throw inside the
// cached functions (never cached) and fall back to an empty list here, as before.
const loadFeatures = cachedQuery(
  () => db.aboutFeature.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ["about-features-v1"],
  { tags: [TAGS.content], revalidate: CACHE_TTL.content }
);

const loadTeam = cachedQuery(
  () => db.teamMember.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ["about-team-v1"],
  { tags: [TAGS.content], revalidate: CACHE_TTL.content }
);

export async function getAboutPageData() {
  const [store, features, team] = await Promise.all([
    getStoreSettingsForDisplay(),
    loadFeatures().catch(() => []),
    loadTeam().catch(() => []),
  ]);
  return { store, features, team };
}

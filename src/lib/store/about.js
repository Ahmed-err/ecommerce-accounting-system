import { prisma as db } from "@/lib/prisma";
import { getOrCreateStoreSettings } from "@/lib/settings";

export async function getAboutPageData() {
  const [store, features, team] = await Promise.all([
    getOrCreateStoreSettings(),
    db.aboutFeature.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }).catch(() => []),
    db.teamMember.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }).catch(() => []),
  ]);
  return { store, features, team };
}

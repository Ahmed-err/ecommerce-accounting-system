import { prisma as db } from "@/lib/prisma";
import { HERO_BANNER_SEED_DATA } from "@/lib/hero-defaults";

export async function getHomepageData() {
  try {
    const [banners, categories, products, offers] = await Promise.all([
      db.banner.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      }),
      db.category.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: { select: { products: true } },
        },
      }),
      db.product.findMany({
        where: { isActive: true },
        orderBy: [{ stock: "desc" }, { createdAt: "desc" }],
        take: 8,
        include: { category: true },
      }),
      db.offer.findMany({
        where: { isActive: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const resolvedBanners =
      banners.length > 0
        ? banners
        : HERO_BANNER_SEED_DATA.map((b, i) => ({
            ...b,
            id: `fallback-banner-${i}`,
          }));

    return {
      banners: resolvedBanners,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        image: c.image,
        productCount: c._count.products,
      })),
      products,
      featuredOffer: offers[0] || null,
    };
  } catch (error) {
    console.error("Failed to fetch homepage data:", error);
    return {
      banners: HERO_BANNER_SEED_DATA.map((b, i) => ({
        ...b,
        id: `fallback-banner-${i}`,
      })),
      categories: [],
      products: [],
      featuredOffer: null,
    };
  }
}

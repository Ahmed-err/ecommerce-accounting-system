import { unstable_cache } from "next/cache";
import { prisma as db } from "@/lib/prisma";
import { HERO_BANNER_SEED_DATA } from "@/lib/hero-defaults";
import { getHomepageFeaturedSets } from "@/lib/store/homepage-featured";
import { getFallbackCategories } from "@/lib/store/fallback-data";

function buildFallbackFeatured() {
  return {
    bestSellers: [],
    newArrivals: [],
    topRated: [],
    catalogActiveCount: 0,
    featuredMeta: {
      bestSellersPeriod: null,
      newArrivalsWindowDays: null,
      newArrivalsFilledOlder: false,
      topRatedMinReviews: null,
      topRatedRelaxed: false,
    },
  };
}

function buildFallbackCategories() {
  return getFallbackCategories().map((category) => ({
    id: category.id,
    name: category.name,
    nameAr: category.nameAr,
    image: category.image,
    productCount: category.productCount,
  }));
}

async function fetchHomepageData() {
  try {
    const [banners, categories, featured, offers] = await Promise.all([
      db.banner.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      }),
      db.category.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              products: { where: { isActive: true } },
            },
          },
        },
      }),
      getHomepageFeaturedSets(),
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
      categories: categories
        .map((c) => ({
          id: c.id,
          name: c.name,
          image: c.image,
          productCount: c._count.products,
        }))
        .filter((c) => c.productCount > 0),
      featured,
      featuredOffer: offers[0] || null,
    };
  } catch (error) {
    console.error("Failed to fetch homepage data:", error);
    return {
      banners: HERO_BANNER_SEED_DATA.map((b, i) => ({
        ...b,
        id: `fallback-banner-${i}`,
      })),
      categories: buildFallbackCategories(),
      featured: buildFallbackFeatured(),
      featuredOffer: null,
    };
  }
}

export const getHomepageData = unstable_cache(fetchHomepageData, ["homepage-data"], {
  tags: ["homepage"],
  revalidate: 60,
});

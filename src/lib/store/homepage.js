import { unstable_cache } from "next/cache";
import { prisma as db } from "@/lib/prisma";
import { getHomepageFeaturedSets } from "@/lib/store/homepage-featured";
import { getFallbackCategories } from "@/lib/store/fallback-data";
import { buildCategoryTree } from "@/lib/category-tree";

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

// Home page data from the real catalog: top categories with a cover photo taken from
// one of their products, brands with product counts, and three hero products from
// different top categories (largest first).
export function buildShowcase(categoryRows, products) {
  const tree = buildCategoryTree(
    categoryRows.map((c) => ({
      id: c.id,
      name: c.name,
      nameAr: c.nameAr,
      image: c.image,
      parentId: c.parentId,
      productCount: c._count?.products ?? c.productCount ?? 0,
    }))
  ).sort((a, b) => b.productCount - a.productCount);
  const topOf = new Map();
  for (const top of tree) {
    topOf.set(top.id, top.id);
    for (const k of top.children) topOf.set(k.id, top.id);
  }
  const withPhoto = products.filter((p) => p.images?.length);
  const firstPhoto = (topId) => withPhoto.find((p) => topOf.get(p.categoryId) === topId);

  const categories = tree.map(({ children: _children, ...top }) => ({
    ...top,
    cover: firstPhoto(top.id)?.images[0] || null,
  }));

  const counts = new Map();
  for (const p of products) if (p.brand) counts.set(p.brand, (counts.get(p.brand) || 0) + 1);
  const brands = [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const heroProducts = tree
    .map((top) => firstPhoto(top.id))
    .filter(Boolean)
    .slice(0, 3)
    .map((p) => ({ id: p.id, name: p.name, nameAr: p.nameAr, nameEn: p.nameEn, image: p.images[0] }));

  return { categories, brands, heroProducts, productTotal: products.length };
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
    const products = await db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameAr: true, nameEn: true, brand: true, images: true, categoryId: true },
      orderBy: { createdAt: "asc" },
    });
    const showcase = buildShowcase(categories, products);

    return {
      // Only banners the admin created; the old stock placeholders are gone.
      banners,
      ...showcase,
      featured,
      featuredOffer: offers[0] || null,
    };
  } catch (error) {
    console.error("Failed to fetch homepage data:", error);
    return {
      banners: [],
      categories: buildFallbackCategories(),
      brands: [],
      heroProducts: [],
      productTotal: 0,
      featured: buildFallbackFeatured(),
      featuredOffer: null,
    };
  }
}

export const getHomepageData = unstable_cache(fetchHomepageData, ["homepage-data"], {
  tags: ["homepage"],
  revalidate: 60,
});

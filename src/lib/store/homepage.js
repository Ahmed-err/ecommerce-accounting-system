import { prisma as db } from "@/lib/prisma";
import { HERO_BANNER_SEED_DATA } from "@/lib/hero-defaults";
import { productPublicFields } from "@/lib/store/product-public-fields";

function decimalToNumber(value) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value?.toNumber === "function") return value.toNumber();
  return Number(value);
}

/** Plain object safe for Server → Client Component props (no Prisma Decimal). */
function serializeProductForClient(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sku: row.sku,
    purchasePrice: decimalToNumber(row.purchasePrice),
    sellingPrice: decimalToNumber(row.sellingPrice),
    stock: row.stock,
    images: row.images,
    category: row.category
      ? {
          name: row.category.name,
        }
      : null,
  };
}

export async function getHomepageData() {
  try {
    const [banners, categories, activeProducts, offers] = await Promise.all([
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
        take: 6,
        select: {
          ...productPublicFields,
          category: { select: { name: true } },
        },
      }),
      db.offer.findMany({
        where: { isActive: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // If there are no active products, fall back to any products so the homepage
    // featured section doesn't look broken in dev/empty DB scenarios.
    const products =
      activeProducts && activeProducts.length > 0
        ? activeProducts
        : await db.product.findMany({
            orderBy: [{ stock: "desc" }, { createdAt: "desc" }],
            take: 6,
            select: {
              ...productPublicFields,
              category: { select: { name: true } },
            },
          });

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
      products: products.map(serializeProductForClient),
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

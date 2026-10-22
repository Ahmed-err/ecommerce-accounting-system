import { prisma as db } from "@/lib/prisma";
import { serializeCatalogProduct } from "@/lib/catalog-serialize";
import { productPublicFields } from "@/lib/store/product-public-fields";
import { getFallbackStorefrontProductBySlug } from "@/lib/store/fallback-data";
import { cachedQuery } from "@/lib/cached-query";
import { CACHE_TTL, TAGS } from "@/lib/cache-tags";

// Product page reads, cached and cleared by any product, category or review write.
const catalogCache = (load, key) =>
  cachedQuery(load, [key], { tags: [TAGS.catalog], revalidate: CACHE_TTL.catalog });

function buildProductLookupWhere(slug) {
  const normalizedSlug = String(slug || "").trim();
  if (!normalizedSlug) return null;

  return {
    OR: [
      { id: normalizedSlug },
      { sku: normalizedSlug },
      { name: normalizedSlug },
      { nameEn: normalizedSlug },
      { nameAr: normalizedSlug },
    ],
    isActive: true,
  };
}

const loadProductBySlug = catalogCache(async (slug) => {
  const product = await db.product.findFirst({
    where: buildProductLookupWhere(slug),
    select: { ...productPublicFields, category: true },
  });
  return product ? serializeCatalogProduct(product) : null;
}, "storefront-product-by-slug-v1");

export async function getStorefrontProductBySlug(slug) {
  const where = buildProductLookupWhere(slug);
  if (!where) return null;

  try {
    return await loadProductBySlug(String(slug).trim());
  } catch {
    const fallbackProduct = getFallbackStorefrontProductBySlug(slug);
    return fallbackProduct ? serializeCatalogProduct(fallbackProduct) : null;
  }
}

export const getRelatedStoreProducts = catalogCache(async (categoryId, excludeProductId, take = 8) => {
  const rows = await db.product.findMany({
    where: {
      categoryId,
      isActive: true,
      id: { not: excludeProductId },
    },
    orderBy: { createdAt: "desc" },
    take,
    select: { ...productPublicFields, category: true },
  });
  return rows.map(serializeCatalogProduct);
}, "storefront-related-products-v1");

export async function getTopProductSlugsForStatic(limit = 100) {
  return db.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true },
  });
}

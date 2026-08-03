import { prisma as db } from "@/lib/prisma";
import { serializeCatalogProduct } from "@/lib/catalog-serialize";
import { productPublicFields } from "@/lib/store/product-public-fields";
import { getFallbackStorefrontProductBySlug } from "@/lib/store/fallback-data";

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

export async function getStorefrontProductBySlug(slug) {
  const where = buildProductLookupWhere(slug);
  if (!where) return null;

  try {
    const product = await db.product.findFirst({
      where,
      select: { ...productPublicFields, category: true },
    });
    return product ? serializeCatalogProduct(product) : null;
  } catch {
    const fallbackProduct = getFallbackStorefrontProductBySlug(slug);
    return fallbackProduct ? serializeCatalogProduct(fallbackProduct) : null;
  }
}

export async function getRelatedStoreProducts(categoryId, excludeProductId, take = 8) {
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
}

export async function getTopProductSlugsForStatic(limit = 100) {
  return db.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true },
  });
}

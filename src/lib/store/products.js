import { prisma as db } from "@/lib/prisma";
import { serializeCatalogProduct } from "@/lib/catalog-serialize";
import { productPublicFields } from "@/lib/store/product-public-fields";

export async function getStorefrontProductBySlug(slug) {
  const product = await db.product.findFirst({
    where: { id: slug, isActive: true },
    select: { ...productPublicFields, category: true },
  });
  return product ? serializeCatalogProduct(product) : null;
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

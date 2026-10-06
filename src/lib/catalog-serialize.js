export function serializeCatalogProduct(p) {
  if (!p) return null;
  const sellingPrice = Number(p.sellingPrice);
  // Public shape: no cost price, and a discount only from a compare-at price the admin set.
  const compareRaw = p.compareAtPrice != null ? Number(p.compareAtPrice) : null;
  const listPrice = compareRaw != null && !Number.isNaN(compareRaw) ? compareRaw : null;
  const hasDiscount = listPrice != null && listPrice > sellingPrice && sellingPrice >= 0;
  const discountPct = hasDiscount ? Math.min(99, Math.round((1 - sellingPrice / listPrice) * 100)) : 0;

  return {
    id: p.id,
    name: p.name,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    brand: p.brand ?? null,
    description: p.description,
    descriptionEn: p.descriptionEn,
    descriptionAr: p.descriptionAr,
    sku: p.sku,
    barcode: p.barcode,
    unit: p.unit || "pcs",
    sellingPrice,
    stock: p.stock,
    minStock: p.minStock,
    images: p.images || [],
    isActive: p.isActive,
    compareAtPrice: compareRaw,
    listPrice: hasDiscount ? listPrice : null,
    hasDiscount,
    discountPct,
    specs: p.specs ?? null,
    highlights: p.highlights ?? null,
    categoryId: p.categoryId ?? null,
    category: p.category
      ? {
          id: p.category.id,
          name: p.category.name,
          nameAr: p.category.nameAr ?? null,
          description: p.category.description,
          image: p.category.image,
        }
      : null,
  };
}

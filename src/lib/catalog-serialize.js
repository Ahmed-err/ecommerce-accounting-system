export function serializeCatalogProduct(p) {
  if (!p) return null;
  const sellingPrice = Number(p.sellingPrice);
  const purchasePrice = Number(p.purchasePrice);
  const compareRaw = p.compareAtPrice != null ? Number(p.compareAtPrice) : null;
  const derivedCompare =
    (compareRaw == null || Number.isNaN(compareRaw)) && purchasePrice > 0
      ? Math.round(purchasePrice * 1.5 * 100) / 100
      : null;
  const listPrice = compareRaw != null && !Number.isNaN(compareRaw) ? compareRaw : derivedCompare;
  const hasDiscount = listPrice != null && listPrice > sellingPrice && sellingPrice >= 0;
  const discountPct = hasDiscount ? Math.min(99, Math.round((1 - sellingPrice / listPrice) * 100)) : 0;

  return {
    ...p,
    sellingPrice,
    purchasePrice,
    compareAtPrice: compareRaw,
    listPrice: hasDiscount ? listPrice : null,
    hasDiscount,
    discountPct,
    specs: p.specs ?? null,
    highlights: p.highlights ?? null,
    category: p.category
      ? {
          id: p.category.id,
          name: p.category.name,
          description: p.category.description,
          image: p.category.image,
        }
      : null,
  };
}

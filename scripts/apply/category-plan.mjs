// Pure planning for the P1.1 category move: what to create, update and move.
// No database access here, so it can be unit-tested.

export function planCategoryChanges({ tree, moves, categories, products }) {
  const byName = new Map(categories.map((c) => [c.name, c]));
  const ops = { createCategories: [], updateCategories: [], moveProducts: [], errors: [] };

  // Desired categories in order: each top category before its children.
  const wanted = tree.flatMap((top) => [
    { name: top.name, nameAr: top.nameAr, parentName: null },
    ...top.children.map((k) => ({ name: k.name, nameAr: k.nameAr, parentName: top.name })),
  ]);
  for (const w of wanted) {
    const existing = byName.get(w.name);
    if (!existing) {
      ops.createCategories.push(w);
      continue;
    }
    const parentId = w.parentName ? byName.get(w.parentName)?.id ?? `new:${w.parentName}` : null;
    if (existing.nameAr !== w.nameAr || existing.parentId !== parentId) {
      ops.updateCategories.push({ id: existing.id, name: w.name, nameAr: w.nameAr, parentName: w.parentName, before: { nameAr: existing.nameAr, parentId: existing.parentId } });
    }
  }

  const subNames = new Set(wanted.filter((w) => w.parentName).map((w) => w.name));
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const catNameById = new Map(categories.map((c) => [c.id, c.name]));
  for (const m of moves) {
    const p = bySku.get(m.sku);
    if (!p) ops.errors.push(`SKU not found: ${m.sku}`);
    else if (!subNames.has(m.to_subcategory)) ops.errors.push(`Unknown subcategory for ${m.sku}: ${m.to_subcategory}`);
    else if (catNameById.get(p.categoryId) !== m.to_subcategory) {
      ops.moveProducts.push({ id: p.id, sku: m.sku, to: m.to_subcategory, fromCategoryId: p.categoryId });
    }
  }
  return ops;
}

// Old categories left empty after the move (cleanup run only).
export function emptyOldCategories({ tree, categories, productCounts }) {
  const keep = new Set(tree.flatMap((t) => [t.name, ...t.children.map((k) => k.name)]));
  return categories.filter((c) => !keep.has(c.name) && !(productCounts.get(c.id) > 0));
}

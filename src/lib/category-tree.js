// Two-level category tree helpers (P1.1). Pure functions over a flat list of
// { id, name, parentId, productCount } so server and client code can share them.

const byName = (a, b) => a.name.localeCompare(b.name);

export function buildCategoryTree(flat, { hideEmpty = true } = {}) {
  const children = new Map();
  for (const c of flat) {
    if (c.parentId) children.set(c.parentId, [...(children.get(c.parentId) || []), c]);
  }
  return flat
    .filter((c) => !c.parentId || !flat.some((p) => p.id === c.parentId))
    .map((top) => {
      const kids = (children.get(top.id) || [])
        .map((k) => ({ ...k, children: [] }))
        .filter((k) => !hideEmpty || k.productCount > 0)
        .sort(byName);
      const total = (top.productCount || 0) + kids.reduce((s, k) => s + (k.productCount || 0), 0);
      return { ...top, productCount: total, children: kids };
    })
    .filter((c) => !hideEmpty || c.productCount > 0)
    .sort(byName);
}

export function categoryWithChildren(id, flat) {
  return [id, ...flat.filter((c) => c.parentId === id).map((c) => c.id)];
}

// null when valid, otherwise a reason code.
export function parentError({ id, parentId }, flat) {
  if (!parentId) return null;
  if (parentId === id) return "self";
  const parent = flat.find((c) => c.id === parentId);
  if (!parent) return "notFound";
  if (parent.parentId) return "depth";
  if (id && flat.some((c) => c.parentId === id)) return "hasChildren";
  return null;
}

// Flat list for <select>: each top category, then its subcategories (depth 1).
export function sortForSelect(flat) {
  return buildCategoryTree(flat, { hideEmpty: false }).flatMap((top) => [
    { ...top, depth: 0 },
    ...top.children.map((k) => ({ ...k, depth: 1 })),
  ]);
}

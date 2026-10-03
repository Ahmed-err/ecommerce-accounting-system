import { PARENT_CATEGORIES, SUB_CATEGORIES, PRODUCTS } from "./catalog-data.js";

export async function seedCatalog(prisma) {
  const local = await prisma.supplier.create({ data: { name: "Khartoum Electrical Wholesale", phone: "+249912345678" } });
  const importer = await prisma.supplier.create({ data: { name: "Red Sea Trading & Import", phone: "+249987654321" } });

  const byName = new Map();
  for (const c of PARENT_CATEGORIES) byName.set(c.name, await prisma.category.create({ data: c }));
  for (const s of SUB_CATEGORIES) {
    const parent = byName.get(s.parent);
    byName.set(s.name, await prisma.category.create({ data: { name: s.name, nameAr: s.nameAr, parentId: parent.id, image: parent.image } }));
  }

  const products = [];
  for (const [i, p] of PRODUCTS.entries()) {
    const category = byName.get(p.category);
    const parent = byName.get(SUB_CATEGORIES.find((s) => s.name === p.category).parent);
    products.push(
      await prisma.product.create({
        data: {
          sku: p.sku,
          barcode: `6290000000${String(i + 1).padStart(3, "0")}`,
          name: p.nameEn,
          nameEn: p.nameEn,
          nameAr: p.nameAr,
          description: p.descriptionEn,
          descriptionEn: p.descriptionEn,
          descriptionAr: p.descriptionAr,
          unit: p.unit,
          purchasePrice: p.purchasePrice,
          sellingPrice: p.sellingPrice,
          stock: p.stock,
          minStock: p.minStock,
          origin: p.origin,
          countryOfOrigin: p.countryOfOrigin,
          specs: p.specs,
          images: [parent.image],
          categoryId: category.id,
          supplierId: p.origin === "LOCAL" ? local.id : importer.id,
        },
      })
    );
  }
  console.log(`   ✓ 2 suppliers, ${PARENT_CATEGORIES.length} categories, ${SUB_CATEGORIES.length} subcategories, ${products.length} products`);
  return products;
}

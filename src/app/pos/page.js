import { prisma as db } from "@/lib/prisma";
import POSClient from "@/components/pos/POSClient";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  // Fetch all active products for the POS local memory
  // This allows instant barcode scanning and search without hitting the DB every keystroke.
  const products = await db.product.findMany({
    where: { isActive: true },
    include: {
      category: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const normalizedProducts = products.map((p) => ({
    ...p,
    sellingPrice:
      typeof p.sellingPrice?.toNumber === "function"
        ? p.sellingPrice.toNumber()
        : Number(p.sellingPrice),
    stock: Number(p.stock ?? 0),
    minStock: Number(p.minStock ?? 0),
    sku: p.sku ?? "",
  }));

  return <POSClient initialProducts={JSON.parse(JSON.stringify(normalizedProducts))} />;
}

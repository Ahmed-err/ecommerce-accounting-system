import { prisma as db } from "@/lib/prisma";
import { getPrinterSettings } from "@/lib/settings";
import POSClient from "@/components/pos/POSClient";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  // Fetch products for POS regardless of storefront active flag.
  // POS inventory can differ from storefront publication state.
  const products = await db.product.findMany({
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

  const printerSettings = await getPrinterSettings();

  return (
    <POSClient
      initialProducts={JSON.parse(JSON.stringify(normalizedProducts))}
      initialPrinterSettings={
        printerSettings ? JSON.parse(JSON.stringify(printerSettings)) : null
      }
    />
  );
}

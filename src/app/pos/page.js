import { redirect } from "next/navigation";
import { prisma as db } from "@/lib/prisma";
import { getPrinterSettings } from "@/lib/settings";
import POSClient from "@/components/pos/POSClient";
import { auth } from "@/auth";
import { canOpenArea, staffHome } from "@/lib/staff-access";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER", "CASHIER"].includes(session.user.role)) {
    redirect("/login?callbackUrl=/pos");
  }
  if (!canOpenArea(session.user.role, "pos")) {
    redirect(staffHome(session?.user?.role));
  }
  // Same sellable catalog as admin inventory: only active products.
  const products = await db.product.findMany({
    where: { isActive: true },
    include: {
      category: { select: { id: true, name: true, nameAr: true } },
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

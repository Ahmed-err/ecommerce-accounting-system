import { Suspense } from "react";
import { auth } from "@/auth";
import {
  getProducts,
  getCategories,
  getSuppliers,
  getInventorySummaryAction,
  getStockMovementsAction,
} from "@/app/actions/inventory";
import ProductTable from "@/components/inventory/ProductTable";
import InventoryStatsClient from "@/components/inventory/InventoryStatsClient";
import InventoryChartsClient from "@/components/inventory/InventoryChartsClient";
import InventoryStockSection from "@/components/inventory/InventoryStockSection";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang] || translations.en;
  return {
    title: `${t.adminInventoryTitle} | ${t.brandName}`,
  };
}

export default async function InventoryPage({ searchParams }) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const search = params?.search || "";
  const categoryId = params?.category || "";
  const supplierId = params?.supplier || "";
  const status = params?.status || "all";
  const sort = params?.sort || "newest";

  const session = await auth();
  const role = session?.user?.role;
  const canManage = role === "ADMIN" || role === "MANAGER";
  const isCashier = role === "CASHIER";
  const canStockOps = canManage || isCashier;

  const [{ products, total }, categories, suppliers, summary, movData] = await Promise.all([
    getProducts({ search, categoryId, supplierId, status, sort, page }),
    getCategories(),
    getSuppliers(),
    getInventorySummaryAction(),
    getStockMovementsAction({ page: 1, limit: 15 }),
  ]);

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang] || translations.en;
  const isRTL = lang === "ar";

  return (
    <div
      className={cn("space-y-6", isRTL ? "text-right" : "text-left")}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold text-amber-500/90">{t.brandName}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
            {t.adminInventoryTitle}
          </h1>
          <p className="mt-1 text-gray-400">{t.adminInventoryDesc}</p>
        </div>
      </div>

      {summary.outOfStock > 0 && (
        <div
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          role="alert"
        >
          {t.inventoryOutStockBanner}
        </div>
      )}

      <InventoryStatsClient
        t={t}
        isRTL={isRTL}
        totalProducts={summary.totalProducts}
        lowStock={summary.lowStock}
        outOfStock={summary.outOfStock}
        totalInventoryCostValue={summary.totalInventoryCostValue}
        currency={t.currency}
      />

      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-gray-900/80" />}>
        <ProductTable
          initialProducts={products}
          total={total}
          categories={categories}
          suppliers={suppliers}
          canManage={canManage}
          isCashier={isCashier}
        />
      </Suspense>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-gray-900/80" />}>
        <InventoryChartsClient
          receiptValueByMonth={summary.receiptValueByMonth}
          topByQuantity={summary.topByQuantity}
          movementByMonth={summary.movementByMonth}
        />
      </Suspense>

      <InventoryStockSection
        suppliers={suppliers}
        initialMovements={movData.movements}
        initialMovementsTotal={movData.total}
        canStockOps={canStockOps}
      />
    </div>
  );
}

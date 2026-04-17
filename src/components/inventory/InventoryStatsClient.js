"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  AlertTriangle,
  DollarSign,
  Ban,
  Globe2,
  Plane,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function InventoryStatsClient({
  t,
  isRTL,
  totalProducts,
  lowStock,
  outOfStock,
  totalInventoryCostValue,
  localProductsCount,
  importedProductsCount,
  currency,
}) {
  const base = "/admin/inventory";
  const stats = [
    {
      label: t.adminTotalProducts,
      value: totalProducts,
      icon: Package,
      href: `${base}?status=all`,
      color: "blue",
    },
    {
      label: t.inventoryLowStock,
      value: lowStock,
      icon: AlertTriangle,
      href: `${base}?status=low`,
      color: lowStock > 0 ? "amber" : "emerald",
    },
    {
      label: t.adminInventoryOutOfStock,
      value: outOfStock,
      icon: Ban,
      href: `${base}?status=out`,
      color: outOfStock > 0 ? "red" : "emerald",
    },
    {
      label: t.adminInventoryValueCost,
      value: `${Math.round(totalInventoryCostValue).toLocaleString()} ${currency}`,
      icon: DollarSign,
      href: null,
      color: "emerald",
    },
    {
      label: t.inventoryLocalProducts,
      value: localProductsCount,
      icon: Globe2,
      href: `${base}?origin=LOCAL`,
      color: "local",
    },
    {
      label: t.inventoryImportedProducts,
      value: importedProductsCount,
      icon: Plane,
      href: `${base}?origin=IMPORTED`,
      color: "imported",
    },
  ];

  const colorMap = {
    blue: { bg: "bg-blue-500/10", icon: "text-blue-500" },
    amber: { bg: "bg-amber-500/10", icon: "text-amber-500" },
    emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-500" },
    red: { bg: "bg-red-500/10", icon: "text-red-500" },
    local: { bg: "bg-green-500/10", icon: "text-green-500" },
    imported: { bg: "bg-blue-500/10", icon: "text-blue-500" },
  };

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6",
        isRTL && "text-right"
      )}
    >
      {stats.map((stat, i) => {
        const Inner = (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            className={cn(
              "relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 transition-colors",
              stat.href && "cursor-pointer hover:bg-muted/40"
            )}
          >
            <div className="flex items-start justify-between">
              <div
                className={cn(
                  "rounded-xl p-2.5",
                  colorMap[stat.color].bg,
                  colorMap[stat.color].icon
                )}
              >
                <stat.icon className="h-4 w-4" />
              </div>
              {stat.color === "red" && stat.value > 0 && (
                <span className="absolute end-5 top-5 flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
              )}
            </div>
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {stat.label}
              </p>
              <p className="regular-nums text-xl font-bold text-foreground">
                {stat.value}
              </p>
            </div>
          </motion.div>
        );

        return stat.href ? (
          <Link key={stat.label} href={stat.href} className="block">
            {Inner}
          </Link>
        ) : (
          <div key={stat.label}>{Inner}</div>
        );
      })}
    </div>
  );
}

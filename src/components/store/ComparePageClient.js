"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { translations, translateCategory } from "@/lib/translations";
import { useCart } from "@/components/store/CartProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, ShoppingCart } from "lucide-react";

export default function ComparePageClient({ products }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const { addToCart } = useCart();

  if (!products.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
        <p className="text-muted-foreground">{t.catalogComparePage}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t.noProductsFound}</p>
        <Link
          href="/products"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-6 inline-flex bg-amber-500 text-black hover:bg-amber-400"
          )}
        >
          {t.browseProducts}
        </Link>
      </div>
    );
  }

  const rows = [
    { key: "category", label: t.filterByCategory, fn: (p) => translateCategory(p.category?.name, t) },
    { key: "sku", label: t.productSku, fn: (p) => p.sku || "—" },
    {
      key: "price",
      label: t.unitPrice,
      fn: (p) => `${Number(p.sellingPrice).toLocaleString()} ${t.currency}`,
    },
    { key: "stock", label: t.inStock, fn: (p) => String(p.stock) },
  ];

  return (
    <div className={cn("overflow-x-auto", isRTL && "text-right")}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-36 border border-border bg-muted/30 p-3 text-left text-muted-foreground rtl:text-right" />
            {products.map((p) => (
              <th
                key={p.id}
                className="min-w-[180px] border border-border bg-muted/30 p-3 align-bottom"
              >
                <div className="relative mx-auto mb-2 h-32 w-full max-w-[140px] overflow-hidden rounded-xl bg-muted">
                  {p.images?.[0] ? (
                    <Image
                      src={p.images[0]}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="140px"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-2xl opacity-30">
                      📦
                    </span>
                  )}
                </div>
                <Link
                  href={`/products/${p.id}`}
                  className="line-clamp-2 font-semibold text-foreground hover:text-amber-500"
                >
                  {p.name}
                </Link>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 w-full bg-amber-500 text-black hover:bg-amber-400"
                  disabled={p.stock <= 0}
                  onClick={() => addToCart(p)}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="ms-2">{t.addToCart}</span>
                </Button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="border border-border bg-muted/10 p-3 font-medium text-muted-foreground">
                {row.label}
              </td>
              {products.map((p) => (
                <td
                  key={`${row.key}-${p.id}`}
                  className="border border-border p-3 text-foreground"
                >
                  {row.fn(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className={cn("mt-6", isRTL && "text-right")}>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-amber-500 hover:text-amber-400"
        >
          {isRTL ? (
            <ArrowRight className="h-4 w-4 rotate-180" />
          ) : (
            <ArrowLeft className="h-4 w-4" />
          )}
          {t.backToProducts}
        </Link>
      </div>
    </div>
  );
}

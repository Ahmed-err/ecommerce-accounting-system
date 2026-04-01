"use client";

import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, X, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import ProductCard from "./ProductCard";
import { useLanguage } from "@/context/LanguageContext";
import { translations, translateCategory } from "@/lib/translations";
import { getCatalogProductsByIds } from "@/app/actions/catalog";
import { cn } from "@/lib/utils";

const COMPARE_KEY = "powerstore_compare";

const getSortOptions = (t) => [
  { label: t.newest, value: "newest" },
  { label: t.priceLowHigh, value: "price_asc" },
  { label: t.priceHighLow, value: "price_desc" },
  { label: t.sortByName, value: "name_asc" },
  { label: t.catalogSortBestSelling, value: "best_selling" },
  { label: t.catalogSortTopRated, value: "top_rated" },
];

function RecentViewedStrip() {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    try {
      const ids = JSON.parse(localStorage.getItem("powerstore_recent") || "[]");
      if (!Array.isArray(ids) || ids.length === 0) return;
      getCatalogProductsByIds(ids.slice(0, 8)).then((rows) => {
        if (!cancelled && Array.isArray(rows)) setProducts(rows);
      });
    } catch {
      /* ignore */
    }
    return () => {
      cancelled = true;
    };
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="mt-14 space-y-4 border-t border-border pt-10">
      <h2 className={cn("text-lg font-bold text-foreground", isRTL && "text-right")}>
        {t.catalogRecentlyViewed}
      </h2>
      <div
        className={cn(
          "flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isRTL && "flex-row-reverse"
        )}
      >
        {products.map((product, i) => (
          <div key={product.id} className="w-[220px] shrink-0">
            <ProductCard product={product} index={i} compactRail />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ProductGrid({
  initialProducts,
  total,
  allProductsTotal = total,
  categories,
  searchParams: initialSearchParams,
  priceBounds = { min: 0, max: 0 },
}) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const SORT_OPTIONS = getSortOptions(t);

  const router = useRouter();
  const urlParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(urlParams.get("search") || "");
  const [showFilters, setShowFilters] = useState(false);
  const searchTimeout = useRef(null);
  const priceTimeout = useRef(null);

  const [compareIds, setCompareIds] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COMPARE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) setCompareIds(arr.filter(Boolean).slice(0, 3));
    } catch {
      setCompareIds([]);
    }
  }, []);

  const toggleCompare = useCallback((id) => {
    if (!id) return;
    setCompareIds((prev) => {
      let next;
      if (prev.includes(id)) next = prev.filter((x) => x !== id);
      else if (prev.length >= 3) next = [...prev.slice(1), id];
      else next = [...prev, id];
      try {
        localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const currentPage = Number(urlParams.get("page")) || 1;
  const totalPages = Math.ceil(total / 12) || 1;
  const activeCategory = urlParams.get("category") || "all";
  const activeSort = urlParams.get("sort") || "newest";
  const minPriceParam = urlParams.get("minPrice") || "";
  const maxPriceParam = urlParams.get("maxPrice") || "";
  const inStockOnly = urlParams.get("inStock") === "1";

  const [localMin, setLocalMin] = useState(minPriceParam);
  const [localMax, setLocalMax] = useState(maxPriceParam);

  useEffect(() => {
    setLocalMin(minPriceParam);
    setLocalMax(maxPriceParam);
  }, [minPriceParam, maxPriceParam]);

  useEffect(() => {
    setSearchValue(urlParams.get("search") || "");
  }, [urlParams]);

  const updateParams = (updates, resetPage = true) => {
    const p = new URLSearchParams(urlParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === "" || value === null || value === undefined) p.delete(key);
      else p.set(key, String(value));
    }
    if (resetPage) p.set("page", "1");
    startTransition(() => {
      router.replace(`${pathname}?${p.toString()}`);
      router.refresh();
    });
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchValue(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      updateParams({ search: val || "" });
    }, 300);
  };

  const clearSearch = () => {
    setSearchValue("");
    updateParams({ search: "" });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    const p = new URLSearchParams(urlParams.toString());
    p.set("page", newPage.toString());
    startTransition(() => {
      router.replace(`${pathname}?${p.toString()}`);
      router.refresh();
    });
  };

  const schedulePriceUpdate = (minV, maxV) => {
    clearTimeout(priceTimeout.current);
    priceTimeout.current = setTimeout(() => {
      const minN = minV === "" ? "" : Number(minV);
      const maxN = maxV === "" ? "" : Number(maxV);
      updateParams({
        minPrice:
          minV === "" || Number.isNaN(minN) ? "" : String(Math.max(0, minN)),
        maxPrice:
          maxV === "" || Number.isNaN(maxN) ? "" : String(Math.max(0, maxN)),
      });
    }, 300);
  };

  const resetAllFilters = () => {
    setSearchValue("");
    setLocalMin("");
    setLocalMax("");
    startTransition(() => {
      router.replace(pathname);
      router.refresh();
    });
    setShowFilters(false);
  };

  const categoryLabel =
    activeCategory === "all"
      ? t.allProducts
      : translateCategory(activeCategory, t);

  const filterPanel = (opts = {}) => {
    const { onNavigate } = opts;
    const pbMin = priceBounds.min ?? 0;
    const pbMax = priceBounds.max ?? 0;
    const hint =
      pbMax > pbMin
        ? `${pbMin.toLocaleString()} — ${pbMax.toLocaleString()} ${t.currency}`
        : null;

    return (
      <div className="space-y-5">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.categoriesTab}
          </h3>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                updateParams({ category: "" });
                onNavigate?.();
              }}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-sm transition-all",
                isRTL ? "text-right" : "text-left",
                activeCategory === "all"
                  ? "bg-amber-500/15 font-medium text-amber-500"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {t.allProducts}{" "}
                <span className="mx-1 text-muted-foreground/60">({allProductsTotal})</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  updateParams({ category: cat.name });
                  onNavigate?.();
                }}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-sm transition-all",
                  isRTL ? "text-right" : "text-left",
                  activeCategory === cat.name
                    ? "bg-amber-500/15 font-medium text-amber-500"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {translateCategory(cat.name, t)}{" "}
                <span className="mx-1 text-muted-foreground/60">({cat.productCount})</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.filterPriceRange}
          </h3>
          {hint && (
            <p className="mb-2 text-[10px] text-muted-foreground">{hint}</p>
          )}
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              placeholder={t.priceLowHigh.split(":")[0]}
              value={localMin}
              onChange={(e) => {
                setLocalMin(e.target.value);
                schedulePriceUpdate(e.target.value, localMax);
              }}
            />
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              placeholder={t.priceHighLow.split(":")[0]}
              value={localMax}
              onChange={(e) => {
                setLocalMax(e.target.value);
                schedulePriceUpdate(localMin, e.target.value);
              }}
            />
          </div>
        </div>

        <label
          className={cn(
            "flex cursor-pointer items-center gap-2 text-sm text-foreground",
            isRTL && "flex-row-reverse"
          )}
        >
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => {
              updateParams({ inStock: e.target.checked ? "1" : "" });
              onNavigate?.();
            }}
            className="size-4 rounded accent-amber-500"
          />
          {t.filterInStockOnly}
        </label>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            resetAllFilters();
            onNavigate?.();
          }}
        >
          {t.resetFilters}
        </Button>
      </div>
    );
  };

  const compareHref =
    compareIds.length > 0
      ? `/products/compare?ids=${encodeURIComponent(compareIds.join(","))}`
      : null;

  return (
    <div className={cn("space-y-6", isRTL ? "text-right" : "text-left")}>
      {/* Breadcrumb */}
      <nav
        className={cn(
          "flex flex-wrap items-center gap-2 text-xs text-muted-foreground",
          isRTL && "flex-row-reverse"
        )}
        aria-label="Breadcrumb"
      >
        <Link href="/" className="hover:text-amber-500">
          {t.catalogBreadcrumbHome}
        </Link>
        <span className="text-muted-foreground/50">/</span>
        <Link href="/products" className="hover:text-amber-500">
          {t.catalog}
        </Link>
        {activeCategory !== "all" && (
          <>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-foreground">{categoryLabel}</span>
          </>
        )}
      </nav>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search
            className={cn(
              "pointer-events-none absolute inset-y-0 my-auto h-4 w-4 text-muted-foreground",
              isRTL ? "right-3" : "left-3"
            )}
          />
          <Input
            placeholder={t.searchPlaceholder}
            className={cn(
              isRTL ? "pr-10 pl-10 text-right" : "pl-10 pr-10 text-left",
              "focus:border-amber-500/50"
            )}
            value={searchValue}
            onChange={handleSearch}
          />
          {searchValue && (
            <button
              type="button"
              onClick={clearSearch}
              className={cn(
                "absolute inset-y-0 my-auto text-muted-foreground hover:text-foreground",
                isRTL ? "left-3" : "right-3"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div
          className={cn(
            "flex flex-wrap items-center gap-3",
            isRTL && "flex-row-reverse"
          )}
        >
          {compareHref && (
            <Link
              href={compareHref}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-500 hover:bg-amber-500/20"
            >
              {t.catalogCompare} ({compareIds.length})
            </Link>
          )}

          {/* Sort tabs */}
          <div
            className={cn(
              "flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1",
              isRTL && "flex-row-reverse"
            )}
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateParams({ sort: opt.value })}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-[10px] font-medium transition-all sm:px-3 sm:text-xs",
                  activeSort === opt.value
                    ? "bg-amber-500 text-black"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Mobile filter sheet trigger */}
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="rounded-xl border border-border bg-muted/40 p-2 text-muted-foreground hover:text-foreground md:hidden"
                aria-label={t.catalogFilters}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{t.catalogFilters}</SheetTitle>
              </SheetHeader>
              <div className="px-1 pb-6 pt-2">
                {filterPanel({ onNavigate: () => setShowFilters(false) })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar filters (desktop) */}
        <div
          className={cn(
            "hidden w-full shrink-0 md:block md:w-56",
            isRTL ? "md:order-last" : "md:order-first"
          )}
        >
          <div className="sticky top-24 space-y-4 rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.catalogFilters}
            </h3>
            {filterPanel()}
          </div>
        </div>

        {/* Product grid */}
        <div className="relative flex-1">
          {isPending && (
            <div
              className="absolute inset-0 z-10 flex items-start justify-center rounded-2xl bg-background/40 pt-24 backdrop-blur-[2px]"
              aria-busy="true"
            >
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          )}

          {initialProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-20 text-center">
              <p className="text-lg text-foreground">{t.catalogEmptyTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.tryDifferentSearch}</p>
              <Button
                type="button"
                className="mt-6 bg-amber-500 text-black hover:bg-amber-400"
                onClick={resetAllFilters}
              >
                {t.catalogEmptyReset}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {initialProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  compareIds={compareIds}
                  onToggleCompare={toggleCompare}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className={cn(
                "mt-8 flex items-center justify-center gap-3",
                isRTL && "flex-row-reverse"
              )}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isPending}
              >
                <ChevronRight
                  className={cn(
                    "h-4 w-4",
                    isRTL ? "ml-1" : "mr-1 rotate-180"
                  )}
                />{" "}
                {t.tablePrevious}
              </Button>
              <span className="rounded-lg border border-border bg-card px-4 py-1.5 text-sm text-foreground">
                {t.tablePage} {currentPage} {t.tablePageOf} {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isPending}
              >
                {t.tableNext}{" "}
                <ChevronLeft
                  className={cn(
                    "h-4 w-4",
                    isRTL ? "mr-1" : "ml-1 rotate-180"
                  )}
                />
              </Button>
            </div>
          )}
        </div>
      </div>

      <RecentViewedStrip />
    </div>
  );
}

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
import { useT } from "@/context/LanguageContext";
import { translateCategory } from "@/lib/i18n/translate-category";
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
  const t = useT();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    try {
      const ids = JSON.parse(localStorage.getItem("powerstore_recent") || "[]");
      if (!Array.isArray(ids) || ids.length === 0) return;
      getCatalogProductsByIds(ids.slice(0, 8)).then((rows) => {
        if (cancelled || !Array.isArray(rows)) return;
        const visibleRows = rows.filter((row) => row && row.id && row.isActive !== false);
        setProducts(visibleRows);
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
      <h2 className="text-lg font-bold text-foreground">
        {t.catalogRecentlyViewed}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((product, i) => (
          <div key={product.id} className="w-[220px] shrink-0">
            <ProductCard product={product} index={i} compactRail />
          </div>
        ))}
      </div>
    </section>
  );
}


// Top categories only; the one in use (or the parent of the one in use) opens to show its subcategories.
export function visibleCategoryRows(categories, activeCategory) {
  const active = categories.find((c) => c.id === activeCategory);
  const openId = active ? active.parentId || active.id : null;
  return categories.filter((c) => !c.parentId || c.parentId === openId);
}

const filterHeading = "mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground";

function FilterOption({ active, onClick, child, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-baseline justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors",
        child ? "ps-6 text-[13px]" : "font-semibold",
        active
          ? "bg-amber-500/15 text-accent-text"
          : child
            ? "text-muted-foreground hover:bg-muted hover:text-foreground"
            : "text-foreground hover:bg-muted"
      )}
    >
      <span>{children}</span>
      {count !== undefined && <span className="shrink-0 text-xs font-normal text-muted-foreground/70">{count}</span>}
    </button>
  );
}

export default function ProductGrid({
  initialProducts,
  total,
  allProductsTotal = total,
  categories,
  brands = [],
  priceBounds = { min: 0, max: 0 },
}) {
  const t = useT();
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
  const activeBrand = urlParams.get("brand") || "";
  const activeSort = urlParams.get("sort") || "newest";
  const activeSearch = urlParams.get("search") || "";
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

  // One navigation per change; the page is dynamic, so the new URL re-renders on the server.
  const navigate = (p, scroll = false) => {
    const qs = p.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll });
    });
  };

  const updateParams = (updates) => {
    const p = new URLSearchParams(urlParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === "" || value === null || value === undefined) p.delete(key);
      else p.set(key, String(value));
    }
    p.delete("page");
    navigate(p);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchValue(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      updateParams({ search: val.trim() });
    }, 300);
  };

  const clearSearch = () => {
    setSearchValue("");
    updateParams({ search: "" });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    const p = new URLSearchParams(urlParams.toString());
    if (newPage === 1) p.delete("page");
    else p.set("page", String(newPage));
    navigate(p, true);
  };

  const schedulePriceUpdate = (minV, maxV) => {
    clearTimeout(priceTimeout.current);
    priceTimeout.current = setTimeout(() => {
      const minN = minV === "" ? "" : Number(minV);
      const maxN = maxV === "" ? "" : Number(maxV);
      updateParams({
        minPrice: minV === "" || Number.isNaN(minN) ? "" : String(Math.max(0, minN)),
        maxPrice: maxV === "" || Number.isNaN(maxN) ? "" : String(Math.max(0, maxN)),
      });
    }, 300);
  };

  const handlePriceChange = (key, value) => {
    if (key === "min") {
      setLocalMin(value);
      schedulePriceUpdate(value, localMax);
    } else {
      setLocalMax(value);
      schedulePriceUpdate(localMin, value);
    }
  };

  const resetAllFilters = () => {
    setSearchValue("");
    setLocalMin("");
    setLocalMax("");
    const p = new URLSearchParams();
    if (activeSort !== "newest") p.set("sort", activeSort);
    navigate(p);
    setShowFilters(false);
  };

  const categoryById = (id) => categories.find((cat) => cat.id === id);
  const categoryLabel = (id) => {
    const cat = categoryById(id);
    return translateCategory(cat?.name || id, t, cat?.nameAr);
  };

  const activeChips = [
    activeSearch && { key: "search", label: `«${activeSearch}»`, clear: clearSearch },
    activeCategory !== "all" && { key: "category", label: categoryLabel(activeCategory), clear: () => updateParams({ category: "" }) },
    activeBrand && { key: "brand", label: activeBrand, ltr: true, clear: () => updateParams({ brand: "" }) },
    (minPriceParam || maxPriceParam) && {
      key: "price",
      label: `${minPriceParam || 0} – ${maxPriceParam || "∞"} ${t.currency}`,
      clear: () => updateParams({ minPrice: "", maxPrice: "" }),
    },
    inStockOnly && { key: "inStock", label: t.catalogInStock, clear: () => updateParams({ inStock: "" }) },
  ].filter(Boolean);
  const filterCount = activeChips.filter((c) => c.key !== "search").length;

  const filterPanel = ({ idPrefix, onNavigate } = {}) => {
    const pbMin = priceBounds.min ?? 0;
    const pbMax = priceBounds.max ?? 0;
    const hint = pbMax > pbMin ? `${pbMin.toLocaleString()} — ${pbMax.toLocaleString()} ${t.currency}` : null;
    const pick = (updates) => {
      updateParams(updates);
      onNavigate?.();
    };

    return (
      <div className="space-y-6">
        <section aria-labelledby={`${idPrefix}-cat`}>
          <h2 id={`${idPrefix}-cat`} className={filterHeading}>
            {t.categoriesTab}
          </h2>
          <div className="space-y-0.5">
            <FilterOption active={activeCategory === "all"} onClick={() => pick({ category: "" })} count={allProductsTotal}>
              {t.allProducts}
            </FilterOption>
            {visibleCategoryRows(categories, activeCategory).map((cat) => (
              <FilterOption
                key={cat.id}
                child={Boolean(cat.parentId)}
                active={activeCategory === cat.id}
                onClick={() => pick({ category: cat.id })}
                count={cat.productCount}
              >
                {translateCategory(cat.name, t, cat.nameAr)}
              </FilterOption>
            ))}
          </div>
        </section>

        {brands.length > 1 && (
          <section aria-labelledby={`${idPrefix}-brand`}>
            <h2 id={`${idPrefix}-brand`} className={filterHeading}>
              {t.catalogBrand}
            </h2>
            <div className="max-h-64 space-y-0.5 overflow-y-auto">
              <FilterOption active={!activeBrand} onClick={() => pick({ brand: "" })}>
                {t.catalogAllBrands}
              </FilterOption>
              {brands.map((b) => (
                <FilterOption
                  key={b.name}
                  active={activeBrand.toLowerCase() === b.name.toLowerCase()}
                  onClick={() => pick({ brand: b.name })}
                  count={b.count}
                >
                  <bdi>{b.name}</bdi>
                </FilterOption>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby={`${idPrefix}-price`}>
          <h2 id={`${idPrefix}-price`} className={filterHeading}>
            {t.filterPriceRange}
          </h2>
          {hint && <p className="mb-2 text-xs text-muted-foreground">{hint}</p>}
          <div className="flex gap-2">
            {[
              ["min", t.catalogPriceFrom, localMin],
              ["max", t.catalogPriceTo, localMax],
            ].map(([key, label, value]) => (
              <div key={key} className="min-w-0 flex-1">
                <label htmlFor={`${idPrefix}-price-${key}`} className="mb-1 block text-xs text-muted-foreground">
                  {label}
                </label>
                <Input
                  id={`${idPrefix}-price-${key}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={value}
                  onChange={(e) => handlePriceChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </section>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => pick({ inStock: e.target.checked ? "1" : "" })}
            className="size-4 rounded accent-amber-500"
          />
          {t.filterInStockOnly}
        </label>

        <Button type="button" variant="outline" className="w-full" onClick={resetAllFilters}>
          {t.resetFilters}
        </Button>
      </div>
    );
  };

  const compareHref =
    compareIds.length > 0 ? `/products/compare?ids=${encodeURIComponent(compareIds.join(","))}` : null;

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-accent-text">
          {t.catalogBreadcrumbHome}
        </Link>
        <span className="text-muted-foreground/50" aria-hidden="true">/</span>
        {activeCategory === "all" ? (
          <span className="text-foreground" aria-current="page">{t.catalog}</span>
        ) : (
          <>
            <Link href="/products" className="hover:text-accent-text">
              {t.catalog}
            </Link>
            <span className="text-muted-foreground/50" aria-hidden="true">/</span>
            <span className="text-foreground" aria-current="page">{categoryLabel(activeCategory)}</span>
          </>
        )}
      </nav>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-80">
          <label htmlFor="catalog-search" className="sr-only">
            {t.catalogSearchLabel}
          </label>
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" aria-hidden="true" />
          <Input
            id="catalog-search"
            type="search"
            enterKeyHint="search"
            placeholder={t.searchPlaceholder}
            autoComplete="off"
            spellCheck={false}
            className="h-10 ps-10 pe-10 [&::-webkit-search-cancel-button]:hidden"
            value={searchValue}
            onChange={handleSearch}
          />
          {searchValue && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label={t.catalogClearSearch}
              className="absolute inset-y-0 end-1 my-auto flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Phone: filters + sort dropdown */}
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" className="h-10 gap-2 md:hidden">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                {t.catalogFilters}
                {filterCount > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 text-xs font-bold text-black">{filterCount}</span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{t.catalogFilters}</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6 pt-2">{filterPanel({ idPrefix: "sheet", onNavigate: () => setShowFilters(false) })}</div>
            </SheetContent>
          </Sheet>

          <label htmlFor="catalog-sort" className="sr-only">
            {t.sortBy}
          </label>
          <select
            id="catalog-sort"
            value={activeSort}
            onChange={(e) => updateParams({ sort: e.target.value === "newest" ? "" : e.target.value })}
            className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm text-foreground md:hidden"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {compareHref && (
            <Link
              href={compareHref}
              className="flex h-10 items-center rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 text-xs font-semibold text-accent-text hover:bg-amber-500/20"
            >
              {t.catalogCompare} ({compareIds.length})
            </Link>
          )}

          {/* Desktop: sort tabs */}
          <div role="group" aria-label={t.sortBy} className="hidden items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 md:flex">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={activeSort === opt.value}
                onClick={() => updateParams({ sort: opt.value === "newest" ? "" : opt.value })}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  activeSort === opt.value ? "bg-amber-500 text-black" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result count + active filters */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <p className="me-2 text-muted-foreground" aria-live="polite">
          {t.catalogResultCount.replace("{count}", total)}
        </p>
        {activeChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.clear}
            aria-label={t.catalogRemoveFilter.replace("{name}", chip.label)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground hover:border-amber-500/60"
          >
            {chip.ltr ? <bdi>{chip.label}</bdi> : chip.label}
            <X className="size-3" aria-hidden="true" />
          </button>
        ))}
        {activeChips.length > 1 && (
          <button type="button" onClick={resetAllFilters} className="text-xs font-semibold text-accent-text hover:underline">
            {t.catalogClearAll}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="hidden w-60 shrink-0 md:block" aria-label={t.catalogFilters}>
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-xl border border-border bg-card p-4">
            {filterPanel({ idPrefix: "side" })}
          </div>
        </aside>

        <div className="relative min-w-0 flex-1" aria-busy={isPending}>
          {isPending && (
            <div className="absolute inset-0 z-30 flex items-start justify-center rounded-2xl bg-background/40 pt-24 backdrop-blur-[2px]">
              <div className="size-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          )}

          {initialProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-20 text-center">
              <p className="text-lg text-foreground">{t.catalogEmptyTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.tryDifferentSearch}</p>
              <Button type="button" className="mt-6" onClick={resetAllFilters}>
                {t.catalogEmptyReset}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
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

          {totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-3" aria-label={t.tablePage}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isPending}
              >
                <ChevronLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                {t.tablePrevious}
              </Button>
              <span className="rounded-lg border border-border bg-card px-4 py-1.5 text-sm text-foreground" aria-current="page">
                {t.tablePage} {currentPage} {t.tablePageOf} {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isPending}
              >
                {t.tableNext}
                <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </Button>
            </nav>
          )}
        </div>
      </div>

      <RecentViewedStrip />
    </div>
  );
}

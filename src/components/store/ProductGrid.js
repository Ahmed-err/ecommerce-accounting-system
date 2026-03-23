"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import ProductCard from "./ProductCard";

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low → High", value: "price_asc" },
  { label: "Price: High → Low", value: "price_desc" },
  { label: "Name: A → Z", value: "name_asc" },
];

export default function ProductGrid({ initialProducts, total, categories, searchParams }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const [searchValue, setSearchValue] = useState(params.get("search") || "");
  const [showFilters, setShowFilters] = useState(false);
  const searchTimeout = useRef(null);

  const currentPage = Number(params.get("page")) || 1;
  const totalPages = Math.ceil(total / 12) || 1;
  const activeCategory = params.get("category") || "all";
  const activeSort = params.get("sort") || "newest";

  const updateParam = (key, value, defaults = {}) => {
    const p = new URLSearchParams(params);
    if (value && value !== (defaults[key] || "all")) p.set(key, value);
    else p.delete(key);
    p.set("page", "1");
    router.replace(`${pathname}?${p.toString()}`);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchValue(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      updateParam("search", val, { search: "" });
    }, 300);
  };

  const clearSearch = () => {
    setSearchValue("");
    updateParam("search", "", { search: "" });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    const p = new URLSearchParams(params);
    p.set("page", newPage.toString());
    router.replace(`${pathname}?${p.toString()}`);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative group w-full md:w-80">
          <Search className="absolute left-3 inset-y-0 my-auto h-4 w-4 text-gray-500 pointer-events-none" />
          <Input
            placeholder="Search products..."
            className="pl-10 pr-10 bg-white/5 border-white/10 text-white focus:border-amber-500/50"
            value={searchValue}
            onChange={handleSearch}
          />
          {searchValue && (
            <button onClick={clearSearch} className="absolute right-3 inset-y-0 my-auto text-gray-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateParam("sort", opt.value, { sort: "newest" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeSort === opt.value
                    ? "bg-amber-500 text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Category Sidebar */}
        <div className={`${showFilters ? "block" : "hidden"} md:block w-full md:w-56 shrink-0`}>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1 sticky top-24">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Categories</h3>
            <button
              onClick={() => updateParam("category", "all")}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                activeCategory === "all" ? "bg-amber-500/15 text-amber-500 font-medium" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              All Products <span className="text-gray-600 ml-1">({total})</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => updateParam("category", cat.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  activeCategory === cat.name ? "bg-amber-500/15 text-amber-500 font-medium" : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {cat.name} <span className="text-gray-600 ml-1">({cat.productCount})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1">
          {initialProducts.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed">
              <p className="text-gray-400 text-lg">No products found.</p>
              <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {initialProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="outline" size="sm"
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="px-4 py-1.5 bg-white/5 rounded-lg border border-white/10 text-white text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline" size="sm"
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

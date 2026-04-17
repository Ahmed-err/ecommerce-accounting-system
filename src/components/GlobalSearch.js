"use client";

import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, X, Loader2 } from "lucide-react";
import { getCatalogProducts } from "@/app/actions/catalog";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { useDebounce } from "@/hooks/useDebounce";

export default function GlobalSearch({ inputId }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { lang, isRTL } = useLanguage();
  const t = translations[lang] || translations.en;
  const searchPlaceholder =
    t.searchPlaceholder ||
    (lang === "ar" ? "بحث عن منتج" : "Search products");
  const searchRef = useRef(null);
  const router = useRouter();
  const debouncedQuery = useDebounce(query, 300);

  const handleQueryChange = (nextValue) => {
    const value = typeof nextValue === "string" ? nextValue : "";
    setQuery(value);
    if (value.trim().length >= 2) setIsOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setIsOpen(false);
      return;
    }

    const search = async () => {
      try {
        setLoading(true);
        const res = await getCatalogProducts({ search: debouncedQuery.trim(), limit: 5 });
        setResults(Array.isArray(res?.products) ? res.products : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setIsOpen(true);
      }
    };

    search();
  }, [debouncedQuery]);

  return (
    <div ref={searchRef} className="relative w-full max-w-none min-w-0 group [transform:translateZ(0)]">
      <div className="relative z-10">
        <SearchIcon
          className={cn(
            "pointer-events-none absolute top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-zinc-700 transition-colors group-hover:text-amber-500 dark:text-zinc-400",
            isRTL ? "right-3" : "left-3"
          )}
        />
        <input
          id={inputId}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoCapitalize="off"
          autoCorrect="off"
          role="searchbox"
          aria-label={searchPlaceholder}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const value = query.trim();
            if (!value) return;
            setIsOpen(false);
            router.push(`/products?search=${encodeURIComponent(value)}`);
          }}
          autoComplete="off"
          spellCheck={false}
          placeholder={searchPlaceholder}
          className={cn(
            "relative z-[2] h-11 w-full min-w-0 rounded-full border text-sm shadow-inner outline-none transition-all",
            "[color-scheme:light] [-webkit-text-fill-color:#18181b]",
            "border-zinc-300/80 bg-white !text-zinc-900 caret-zinc-900",
            "placeholder:text-zinc-500 placeholder:opacity-100",
            "focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/30",
            "dark:[color-scheme:dark] dark:border-white/15 dark:bg-zinc-900/80 dark:!text-white dark:[-webkit-text-fill-color:#fff] dark:caret-amber-400 dark:placeholder:text-zinc-400",
            isRTL ? "pr-10 pl-10" : "pl-10 pr-10"
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className={cn(
              "absolute top-1/2 z-20 -translate-y-1/2 rounded-full p-1 hover:bg-zinc-200/80 dark:hover:bg-white/10",
              isRTL ? "left-3" : "right-3"
            )}
          >
            <X className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          </button>
        )}
      </div>

      {isOpen && (query.trim().length >= 2) && (
        <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2`}>
          {loading ? (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            </div>
          ) : results.length > 0 ? (
            <div className="p-2 space-y-1">
              {results.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-xl p-2 transition-all hover:bg-muted ${isRTL ? "text-right" : "text-left"}`}
                >
                  <div className="relative h-12 w-12 rounded-lg bg-black/20 overflow-hidden shrink-0">
                    <Image
                      src={product.images[0] || "/placeholder.png"}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{product.category?.name || ""}</p>
                  </div>
                  <div className="text-sm font-black text-amber-500 whitespace-nowrap">
                    {product.sellingPrice.toLocaleString()} {t.currency}
                  </div>
                </Link>
              ))}
              <Link
                href={`/products?search=${query}`}
                onClick={() => setIsOpen(false)}
                className="block border-t border-border p-3 text-center text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400"
              >
                {t.viewAll}
              </Link>
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t.noSearchResults}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

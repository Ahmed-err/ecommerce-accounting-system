"use client";

import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getCatalogProducts } from "@/app/actions/catalog";
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
  const t = translations[lang];
  const searchRef = useRef(null);
  const router = useRouter();
  const debouncedQuery = useDebounce(query, 300);

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
    <div ref={searchRef} className="relative w-full max-w-md group">
      <div className="relative">
        <SearchIcon className={`pointer-events-none absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-hover:text-amber-500 transition-colors`} />
        <Input
          id={inputId}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const value = query.trim();
            if (!value) return;
            setIsOpen(false);
            router.push(`/products?search=${encodeURIComponent(value)}`);
          }}
          placeholder={t.searchPlaceholder}
          className={`h-11 ${isRTL ? 'pr-10' : 'pl-10'} bg-white/5 border-white/10 text-foreground caret-foreground placeholder:text-muted-foreground text-sm focus:ring-1 focus:ring-amber-500/50 rounded-full transition-all`}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full`}
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {isOpen && (query.trim().length >= 2) && (
        <div className={`absolute top-full left-0 right-0 mt-2 bg-popover border border-white/10 text-popover-foreground rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2`}>
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
                  className={`flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-all ${isRTL ? 'text-right' : 'text-left'}`}
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
                    <p className="text-xs text-gray-500 truncate">{product.category?.name || ""}</p>
                  </div>
                  <div className="text-sm font-black text-amber-500 whitespace-nowrap">
                    {product.sellingPrice.toLocaleString()} {t.currency}
                  </div>
                </Link>
              ))}
              <Link
                href={`/products?search=${query}`}
                onClick={() => setIsOpen(false)}
                className="block p-3 text-center text-xs font-bold text-amber-500 hover:text-amber-400 border-t border-white/5"
              >
                {t.viewAll}
              </Link>
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              {t.noSearchResults}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

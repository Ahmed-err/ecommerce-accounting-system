"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import GlobalSearch from "@/components/GlobalSearch";
import { useLanguage, useT } from "@/context/LanguageContext";
import { getCatalogCategories } from "@/app/actions/catalog";
import { cn } from "@/lib/utils";

const linkCls = "inline-flex h-10 items-center whitespace-nowrap rounded-lg px-3 text-[15px] font-semibold text-ink-2 hover:bg-muted hover:text-foreground";

export function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Desktop navigation: categories disclosure, main links (current page marked), search.
export default function HeaderNav() {
  const t = useT();
  const { lang } = useLanguage();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const panelId = useId();
  const wrapRef = useRef(null);

  useEffect(() => {
    getCatalogCategories().then((cats) => setCategories(cats || []));
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const links = [
    { name: t.home, href: "/" },
    { name: t.catalog, href: "/products" },
    { name: t.about, href: "/about" },
    { name: t.contact, href: "/contact" },
  ];

  return (
    <div className="hidden min-w-0 flex-1 items-center gap-4 lg:flex">
      <nav className="flex shrink-0 items-center gap-0.5" aria-label={t.catalog}>
        <div className="relative" ref={wrapRef}>
          <button
            type="button"
            className={cn(linkCls, "gap-1", open && "bg-muted text-foreground")}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
          >
            {t.categoriesTab}
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </button>
          {open ? (
            <div id={panelId} className="absolute start-0 top-full z-[60] mt-2 max-h-[calc(100dvh-80px)] w-64 overflow-y-auto rounded-[10px] border border-border bg-popover p-2">
              <ul className="grid gap-0.5">
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/products?category=${encodeURIComponent(cat.id)}`}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
                    >
                      {lang === "ar" && cat.nameAr ? cat.nameAr : cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/products"
                onClick={() => setOpen(false)}
                className="mt-1 block border-t border-border px-3 pt-2 text-center text-sm font-semibold text-accent-text hover:underline"
              >
                {t.viewAll}
              </Link>
            </div>
          ) : null}
        </div>
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(linkCls, active && "bg-muted font-bold text-foreground")}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>
      <div className="min-w-0 max-w-[360px] flex-1">
        <GlobalSearch inputId="global-search-desktop" />
      </div>
    </div>
  );
}

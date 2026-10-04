"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandLockup from "@/components/brand/BrandLockup";
import { useT } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import HeaderNav from "./HeaderNav";
import HeaderActions from "./HeaderActions";
import MobileMenu from "./MobileMenu";

export { cartLabel } from "./cart-label";

// Store header (P0.4, board 5): sticky, fixed 64px height, only the search box shrinks.
export default function SiteHeader() {
  const t = useT();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-colors",
        scrolled ? "border-border bg-card/95 backdrop-blur" : "border-transparent bg-background"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label={t.brandWordmark} className="flex min-w-0 shrink items-center lg:w-[250px] lg:shrink-0">
          <BrandLockup variant="compact" tone="auto" className="min-w-0" />
        </Link>
        <HeaderNav />
        <HeaderActions />
        <MobileMenu />
      </div>
    </header>
  );
}

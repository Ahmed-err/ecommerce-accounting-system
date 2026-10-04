"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, LayoutDashboard, LogOut, Menu, Package, Settings, ShoppingCart, Zap } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import BrandLockup from "@/components/brand/BrandLockup";
import GlobalSearch from "@/components/GlobalSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage, useT } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { roleFlags } from "./HeaderActions";

const rowCls = "flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-semibold text-foreground hover:bg-muted";
const sectionTitle = "px-3 pb-1 text-xs font-bold text-muted-foreground";

/**
 * Base UI Dialog/Trigger generates React useId-based ids. Session, theme, and cart
 * can change the useId call order between SSR and the first client render, which
 * mismatches the mobile trigger id. Mount the sheet only after hydration.
 */
export default function MobileMenu() {
  const t = useT();
  const { lang, setLang, isRTL } = useLanguage();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAdmin, isStaff } = roleFlags(session?.user?.role);
  const close = () => setOpen(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="size-11 shrink-0 lg:hidden" aria-hidden="true" />;
  }

  const links = [
    { name: t.home, href: "/" },
    { name: t.catalog, href: "/products" },
    { name: t.about, href: "/about" },
    { name: t.contact, href: "/contact" },
  ];

  return (
    <div className="shrink-0 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="secondary" size="icon" aria-label={t.toggleMenu}>
            <Menu aria-hidden="true" />
          </Button>
        </SheetTrigger>
        {open ? (
          <SheetContent side={isRTL ? "left" : "right"} className="flex w-full flex-col gap-0 bg-background p-0 sm:max-w-xs">
            <SheetHeader className="border-b border-border p-4">
              <SheetTitle>
                <BrandLockup variant="compact" tone="auto" />
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <GlobalSearch inputId="global-search-mobile" />
              <nav aria-label={t.catalog} className="space-y-1">
                {links.map((link) => (
                  <Link key={link.href} href={link.href} onClick={close} className={rowCls}>
                    {link.name}
                  </Link>
                ))}
              </nav>
              {session && isStaff ? (
                <div className="space-y-1 border-t border-border pt-4">
                  <p className={sectionTitle}>{t.staffArea}</p>
                  <Link href="/pos" onClick={close} className={cn(rowCls, "text-accent-text")}>
                    <Zap className="size-5" aria-hidden="true" />
                    {t.adminPos}
                  </Link>
                  <Link href="/admin/orders" onClick={close} className={rowCls}>
                    <ShoppingCart className="size-5" aria-hidden="true" />
                    {t.adminOrders}
                  </Link>
                  {isAdmin ? (
                    <Link href="/admin" onClick={close} className={rowCls}>
                      <LayoutDashboard className="size-5" aria-hidden="true" />
                      {t.admin}
                    </Link>
                  ) : null}
                </div>
              ) : null}
              {session ? (
                <div className="space-y-1 border-t border-border pt-4">
                  <p className={sectionTitle}>{t.myAccount}</p>
                  <Link href="/account/orders" onClick={close} className={rowCls}>
                    <Package className="size-5" aria-hidden="true" />
                    {t.myOrders}
                  </Link>
                  <Link href="/account/notifications" onClick={close} className={rowCls}>
                    <Bell className="size-5" aria-hidden="true" />
                    {t.notifications}
                  </Link>
                  <Link href="/account/settings" onClick={close} className={rowCls}>
                    <Settings className="size-5" aria-hidden="true" />
                    {t.settings}
                  </Link>
                  <button type="button" onClick={() => { close(); signOut(); }} className={cn(rowCls, "w-full text-destructive")}>
                    <LogOut className="size-5" aria-hidden="true" />
                    {t.logout}
                  </button>
                </div>
              ) : null}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between px-3">
                  <span className="text-sm font-semibold text-muted-foreground">{t.appearance}</span>
                  <ThemeToggle />
                </div>
                <div className="flex items-center justify-between px-3">
                  <span className="text-sm font-semibold text-muted-foreground">{t.language}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-16"
                    aria-label={lang === "ar" ? t.switchToEnglish : t.switchToArabic}
                    onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                  >
                    {lang === "ar" ? "EN" : "عربي"}
                  </Button>
                </div>
              </div>
            </div>
            {!session ? (
              <div className="border-t border-border p-4">
                <Link href="/login" onClick={close} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
                  {t.login}
                </Link>
              </div>
            ) : null}
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  );
}

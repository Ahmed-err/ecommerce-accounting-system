"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Bell, ChevronDown, LayoutDashboard, LogOut, Package, Settings, ShoppingCart, User, Zap } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/ThemeToggle";
import StoreNotificationBell from "@/components/store/NotificationBell";
import { useCart } from "@/components/store/CartProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLanguage, useT } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { cartLabel } from "./cart-label";

export function roleFlags(role) {
  const isAdmin = role === "ADMIN" || role === "MANAGER";
  return { isAdmin, isStaff: isAdmin || role === "CASHIER" };
}

const itemCls = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted";

function AccountMenu({ session, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const panelId = useId();
  const { isAdmin, isStaff } = roleFlags(session.user?.role);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        className="h-10 gap-1.5 px-1.5"
        aria-label={t.myAccount}
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-extrabold text-primary-foreground" aria-hidden="true">
          {session.user?.name?.charAt(0) || "U"}
        </span>
        <ChevronDown className="size-3.5 opacity-60" aria-hidden="true" />
      </Button>
      {open ? (
        <div id={panelId} className="absolute end-0 top-full z-[60] mt-2 w-60 rounded-[10px] border border-border bg-popover p-2">
          <div className="mb-1 border-b border-border px-3 pb-2 pt-1">
            <p className="text-xs text-muted-foreground">{t.welcome}</p>
            <p className="truncate text-sm font-semibold">{session.user?.email}</p>
          </div>
          {isStaff && (
            <Link href="/pos" className={cn(itemCls, "text-accent-text")}>
              <Zap className="size-4" aria-hidden="true" />
              {t.adminPos}
            </Link>
          )}
          {isStaff && (
            <Link href="/admin/orders" className={itemCls}>
              <ShoppingCart className="size-4" aria-hidden="true" />
              {t.adminOrders}
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className={itemCls}>
              <LayoutDashboard className="size-4" aria-hidden="true" />
              {t.admin}
            </Link>
          )}
          <Link href="/my-orders" className={itemCls}>
            <Package className="size-4" aria-hidden="true" />
            {t.myOrders}
          </Link>
          <Link href="/account/notifications" className={itemCls}>
            <Bell className="size-4" aria-hidden="true" />
            {t.notifications}
          </Link>
          <Link href="/account/settings" className={itemCls}>
            <Settings className="size-4" aria-hidden="true" />
            {t.settings}
          </Link>
          <button type="button" onClick={() => signOut()} className={cn(itemCls, "w-full text-destructive")}>
            <LogOut className="size-4" aria-hidden="true" />
            {t.logout}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// Theme, language, notifications, cart, and account/login — one named control each.
export default function HeaderActions() {
  const t = useT();
  const { lang, setLang } = useLanguage();
  const { data: session } = useSession();
  const { cartCount, loaded } = useCart();

  return (
    <div className="ms-auto flex shrink-0 items-center gap-2">
      <div className="hidden items-center gap-2 lg:flex">
        <ThemeToggle />
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-11"
          aria-label={lang === "ar" ? t.switchToEnglish : t.switchToArabic}
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
        >
          {lang === "ar" ? "EN" : "ع"}
        </Button>
      </div>
      {session ? <StoreNotificationBell /> : null}
      <Link
        href="/cart"
        aria-label={cartLabel(t, cartCount, loaded)}
        className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
      >
        <ShoppingCart className="size-[18px]" aria-hidden="true" />
        {loaded && cartCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -end-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-brand px-1 text-[11px] font-extrabold text-brand-foreground"
          >
            {cartCount > 9 ? "9+" : cartCount}
          </span>
        ) : null}
      </Link>
      {session ? (
        <AccountMenu session={session} t={t} />
      ) : (
        <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "hidden h-10 gap-2 whitespace-nowrap px-4 lg:inline-flex")}>
          <User className="size-4" aria-hidden="true" />
          {t.login}
        </Link>
      )}
    </div>
  );
}

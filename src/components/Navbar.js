"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Zap,
    ShoppingCart,
    Menu,
    User,
    LogOut,
    Package,
    Settings,
    LayoutDashboard,
    ChevronDown,
    Globe,
    Layers
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useCart } from "@/components/store/CartProvider";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { normalizeAppLang } from "@/lib/i18n-lang";
import { ThemeToggle } from "./ThemeToggle";
import GlobalSearch from "./GlobalSearch";
import StoreNotificationBell from "@/components/store/NotificationBell";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Base UI Dialog/Trigger generates React useId-based ids. Session, theme, and cart
 * can change the useId call order between SSR and the first client render, which
 * mismatches the mobile trigger id. Mount the sheet only after hydration.
 */
function NavbarMobileSheet({ isRTL, lang, setLang, t, session, navLinks, brandName, brandTagline, isAdmin, isStaff }) {
    const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="flex items-center lg:hidden">
                <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground"
                    aria-hidden
                >
                    <Menu className="h-5 w-5" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center lg:hidden">
            <Sheet id="navbar-mobile-sheet" open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-full"
                        aria-label={t.toggleMenu}
                        type="button"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                </SheetTrigger>
                {open ? (
                <SheetContent
                    side={isRTL ? "left" : "right"}
                    className="w-full border-none bg-background p-0 sm:max-w-xs"
                >
                    <div className="flex h-full flex-col bg-background">
                        <SheetHeader className="border-b border-foreground/5 p-6">
                            <SheetTitle className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-2 rounded-xl shadow-md shadow-amber-500/30">
                                    <Zap className="h-4 w-4 text-white" />
                                </div>
                                <div className={cn("flex flex-col leading-none", isRTL && "items-end")}>
                                    <span className={cn("text-sm font-black text-foreground", isRTL ? "text-right" : "tracking-tight")}>
                                        {brandName}
                                    </span>
                                    <span className="mt-0.5 text-[9px] font-bold text-amber-500 tracking-wide">
                                        {brandTagline}
                                    </span>
                                </div>
                            </SheetTitle>
                        </SheetHeader>

                        <div className="flex-1 space-y-8 overflow-y-auto p-6">
                            <div className="relative">
                                <GlobalSearch inputId="global-search-mobile" />
                            </div>

                            <div className="space-y-2">
                                <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    {t.catalog}
                                </p>
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        onClick={() => setOpen(false)}
                                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-lg font-bold text-foreground transition-all hover:bg-foreground/5"
                                    >
                                        {link.name}
                                    </Link>
                                ))}
                            </div>

                            {session && isStaff && (
                                <div className="space-y-2 border-t border-foreground/5 pt-6">
                                    <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        {t.ordStaffSection || (lang === "ar" ? "لوحة العمل" : "Staff")}
                                    </p>
                                    <Link
                                        href="/pos"
                                        onClick={() => setOpen(false)}
                                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-lg font-bold text-amber-500 transition-all hover:bg-amber-500/10"
                                    >
                                        <Zap className="h-5 w-5 shrink-0" />
                                        {t.adminPos}
                                    </Link>
                                    <Link
                                        href="/admin/orders"
                                        onClick={() => setOpen(false)}
                                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-lg font-bold text-foreground transition-all hover:bg-foreground/5"
                                    >
                                        <ShoppingCart className="h-5 w-5 shrink-0" />
                                        {t.adminOrders}
                                    </Link>
                                    {isAdmin && (
                                        <Link
                                            href="/admin"
                                            onClick={() => setOpen(false)}
                                            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-lg font-bold text-foreground transition-all hover:bg-foreground/5"
                                        >
                                            <LayoutDashboard className="h-5 w-5 shrink-0" />
                                            {t.admin}
                                        </Link>
                                    )}
                                </div>
                            )}

                            <div className="space-y-4 border-t border-foreground/5 pt-6">
                                <div className="flex items-center justify-between px-2">
                                    <span className="text-sm font-bold text-muted-foreground">
                                        {t.appearance}
                                    </span>
                                    <ThemeToggle />
                                </div>
                                <div className="flex items-center justify-between px-2">
                                    <span className="text-sm font-bold text-muted-foreground">
                                        {t.language}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setLang(lang === "ar" ? "en" : "ar")
                                        }
                                        className="rounded-full px-4 font-bold"
                                    >
                                        {lang === "ar" ? "EN" : "عربي"}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {!session && (
                            <div className="bg-foreground/5 p-6">
                                <Link href="/login" onClick={() => setOpen(false)}>
                                    <Button className="h-14 w-full rounded-2xl bg-amber-500 font-black text-black hover:bg-amber-600">
                                        {t.login}
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </SheetContent>
                ) : null}
            </Sheet>
        </div>
    );
}

export default function Navbar() {
    const { data: session } = useSession();
    const { cartCount, loaded } = useCart();
    const { lang: langRaw, setLang, isRTL, brandName, brandTagline } = useLanguage();
    const lang = normalizeAppLang(langRaw);
    const t = translations[lang] || translations.ar;
    const [scrolled, setScrolled] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (!event.target.closest("[data-user-menu]")) {
                setShowUserMenu(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                setShowUserMenu(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("touchstart", handleOutsideClick);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("touchstart", handleOutsideClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const categories = [
        { name: t.catLighting || "Lighting", icon: "💡", href: "/products?category=Lighting" },
        { name: t.catCablesWires || "Cables", icon: "🔌", href: "/products?category=Cables & Wires" },
        { name: t.catSwitchesSockets || "Switches", icon: "🎛️", href: "/products?category=Switches & Sockets" },
        { name: t.catPowerSystems || "Power", icon: "🔋", href: "/products?category=Power Systems" },
    ];

    const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";
    const isStaff = isAdmin || session?.user?.role === "CASHIER";

    const navLinks = [
        { name: t.home, href: "/" },
        { name: t.catalog, href: "/products" },
        { name: t.about, href: "/about" },
        { name: t.contact, href: "/contact" },
    ];

    return (
        <>
        <header className={cn(
            "fixed inset-x-0 top-0 z-50 w-full max-w-full transition-all duration-300",
            scrolled 
                ? "bg-background/80 backdrop-blur-xl shadow-lg border-b border-foreground/5"
                : "bg-background border-b border-transparent"
        )}>
            <div className="mx-auto max-w-7xl min-w-0 px-4 sm:px-6 lg:px-8">
                <div
                  className={cn(
                    "flex min-w-0 max-w-full items-center justify-between gap-2 sm:gap-3 lg:justify-start lg:gap-4 transition-[height] duration-300",
                    scrolled ? "h-[60px]" : "h-[72px]"
                  )}
                >
                    {/* === Logo === */}
                    <Link href="/" className="flex items-center gap-2 group shrink-0 min-w-0 max-w-[min(9rem,40vw)] sm:max-w-[180px] md:max-w-[200px] lg:max-w-[200px] xl:max-w-[220px] 2xl:max-w-[240px] sm:gap-2.5">
                        <div className="shrink-0 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-2 rounded-xl shadow-lg shadow-amber-500/30 group-hover:scale-105 group-hover:shadow-amber-500/50 transition-all duration-300 sm:p-2.5 sm:rounded-2xl">
                            <Zap className="h-4 w-4 text-white drop-shadow sm:h-5 sm:w-5" />
                        </div>

                        <div className={cn("flex flex-col leading-none min-w-0 flex-1", isRTL && "items-end")}>
                            <span className={cn(
                                "text-xs font-black tracking-tight text-foreground whitespace-normal break-words leading-[1.15] sm:text-sm",
                                isRTL ? "text-right" : ""
                            )} style={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: '2',
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                wordBreak: 'break-word'
                            }}>
                                {brandName}
                            </span>
                            <span className={cn(
                                "mt-0.5 text-[8px] font-bold text-amber-500 tracking-wide truncate w-full sm:text-[9px]",
                                isRTL && "text-right"
                            )}>
                                {brandTagline}
                            </span>
                        </div>
                    </Link>

                    {/* === Desktop: nav + search (flexible width so the bar stays on-screen) === */}
                    <div className="hidden min-w-0 flex-1 items-center justify-end gap-2 lg:flex xl:gap-3 2xl:gap-4">
                        <nav className="flex shrink-0 items-center gap-0.5">
                            {/* Categories Dropdown */}
                            <div
                                className="relative group/cat"
                                onMouseEnter={() => setShowCategories(true)}
                                onMouseLeave={() => setShowCategories(false)}
                            >
                                <button
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-2 rounded-full text-sm font-bold transition-all xl:px-3",
                                        showCategories ? "bg-amber-500 text-black" : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                                    )}
                                    onClick={() => setShowCategories(!showCategories)}
                                    onKeyDown={(e) => e.key === "Escape" && setShowCategories(false)}
                                    aria-expanded={showCategories}
                                    aria-haspopup="true"
                                >
                                    <Layers className="h-4 w-4 shrink-0" />
                                    {t.categoriesTab}
                                    <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform duration-300", showCategories && "rotate-180")} />
                                </button>

                                {/* Dropdown Menu */}
                                <div className={cn(
                                    "absolute top-full mt-2 w-64 bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-2xl p-2 transition-all duration-300 z-[110] origin-top",
                                    isRTL ? "left-0" : "right-0",
                                    showCategories ? "visible opacity-100 scale-100" : "invisible opacity-0 scale-95"
                                )}>
                                    <div className="grid gap-1">
                                        {categories.map((cat) => (
                                            <Link
                                                key={cat.name}
                                                href={cat.href}
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-amber-500/10 hover:text-amber-500 transition-all group/item"
                                            >
                                                <span className="text-xl group-hover/item:scale-125 transition-transform">{cat.icon}</span>
                                                <span className="text-sm font-bold text-foreground group-hover/item:text-amber-500">{cat.name}</span>
                                            </Link>
                                        ))}
                                        <div className="border-t border-foreground/5 mt-1 pt-1">
                                            <Link href="/products" className="flex items-center justify-center p-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-amber-500 transition-colors">
                                                {t.viewAll}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className="px-2 py-2 rounded-full text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all xl:px-3"
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </nav>

                        <div className="min-w-0 max-w-[13rem] flex-1 basis-0 xl:max-w-[17rem] 2xl:max-w-[21rem]">
                            <GlobalSearch inputId="global-search-desktop" />
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <div className="hidden items-center gap-0.5 lg:flex">
                            <ThemeToggle />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                                className="w-9 h-9 rounded-full"
                                aria-label={t.language}
                                type="button"
                            >
                                <Globe className="h-4 w-4" />
                                <span className="sr-only">Language</span>
                            </Button>
                        </div>

                        {session ? <StoreNotificationBell /> : null}

                        <Link href="/cart" className="relative group">
                             <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full relative bg-foreground/5 hover:bg-amber-500 hover:text-black transition-all sm:w-10 sm:h-10">
                                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                                {loaded && cartCount > 0 && (
                                    <span className={cn(
                                        "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-black ring-2 ring-background animate-in zoom-in-0 duration-300",
                                        isRTL && "-left-1 -right-auto"
                                    )}>
                                        {cartCount > 9 ? "9+" : cartCount}
                                    </span>
                                )}
                             </Button>
                        </Link>

                        {/* Account or Auth */}
                        {session ? (
                            <div
                                className="relative group/user"
                                data-user-menu
                                onMouseEnter={() => setShowUserMenu(true)}
                                onMouseLeave={() => setShowUserMenu(false)}
                            >
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "h-9 px-1 !rounded-full bg-foreground/5 hover:bg-foreground/10 transition-all border border-foreground/5 sm:h-10",
                                        isRTL ? "pl-2 sm:pl-3" : "pr-2 sm:pr-3"
                                    )}
                                    onClick={() => setShowUserMenu((prev) => !prev)}
                                    aria-haspopup="menu"
                                    aria-expanded={showUserMenu}
                                    type="button"
                                >
                                    <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-black font-black text-xs shrink-0 sm:w-8 sm:h-8">
                                        {session.user.name?.charAt(0) || "U"}
                                    </div>
                                    <ChevronDown className="h-3.5 w-3.5 opacity-50 sm:h-4 sm:w-4" />
                                </Button>

                                {/* Dropdown */}
                                <div className={cn(
                                    "absolute top-full mt-2 w-56 bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-2xl p-2 transition-all duration-200 z-[110] origin-top",
                                    showUserMenu ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0",
                                    isRTL ? "left-0" : "right-0"
                                )}>
                                    <div className="p-3 mb-1 border-b border-foreground/5">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{t.welcome}</p>
                                        <p className="text-sm font-bold text-foreground truncate">{session.user.email}</p>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        {isStaff && (
                                            <Link href="/pos" className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all">
                                                <Zap className="h-4 w-4" />
                                                {t.adminPos}
                                            </Link>
                                        )}
                                        {isStaff && (
                                            <Link href="/admin/orders" className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-foreground hover:bg-foreground/5 rounded-xl transition-all">
                                                <ShoppingCart className="h-4 w-4" />
                                                {t.adminOrders}
                                            </Link>
                                        )}
                                        {isAdmin && (
                                            <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-foreground hover:bg-foreground/5 rounded-xl transition-all">
                                                <LayoutDashboard className="h-4 w-4" />
                                                {t.admin}
                                            </Link>
                                        )}
                                        <Link href="/my-orders" className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-foreground hover:bg-foreground/5 rounded-xl transition-all">
                                            <Package className="h-4 w-4" />
                                            {t.myOrders}
                                        </Link>
                                        <Link href="/account/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-foreground hover:bg-foreground/5 rounded-xl transition-all">
                                            <Settings className="h-4 w-4" />
                                            {t.settings}
                                        </Link>
                                        <button
                                            onClick={() => signOut()}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            {t.logout}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Link href="/login" className="shrink-0">
                                <Button className="h-9 w-9 justify-center rounded-full bg-amber-500 text-black shadow-lg shadow-amber-500/20 transition-all active:scale-95 hover:bg-amber-600 sm:h-10 sm:w-10 lg:h-10 lg:w-auto lg:px-5 lg:text-sm">
                                    <User className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", !isRTL && "lg:mr-2", isRTL && "lg:ml-2")} />
                                    <span className="hidden lg:inline">{t.login}</span>
                                </Button>
                            </Link>
                        )}

                        <NavbarMobileSheet
                            isRTL={isRTL}
                            lang={lang}
                            setLang={setLang}
                            t={t}
                            session={session}
                            navLinks={navLinks}
                            brandName={brandName}
                            brandTagline={brandTagline}
                            isAdmin={isAdmin}
                            isStaff={isStaff}
                        />
                    </div>
                </div>
            </div>
        </header>
        <div
          aria-hidden
          className={cn(
            "transition-[height] duration-300",
            scrolled ? "h-[60px]" : "h-[72px]"
          )}
        />
        </>
    );
}

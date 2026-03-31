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
function NavbarMobileSheet({ isRTL, lang, setLang, t, session, navLinks }) {
    const [mounted, setMounted] = useState(false);

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
            <Sheet id="navbar-mobile-sheet">
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
                                    <span className={cn("text-sm font-black text-foreground", isRTL ? "text-right" : "uppercase tracking-tight")}>
                                        {isRTL ? "عصام الدين نصر" : "Essam El-Din Nasr"}
                                    </span>
                                    <span className="text-[9px] font-bold text-amber-500 tracking-widest uppercase mt-0.5">
                                        {isRTL ? "للأدوات الكهربائية" : "Electrical Tools"}
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
                                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-lg font-bold text-foreground transition-all hover:bg-foreground/5"
                                    >
                                        {link.name}
                                    </Link>
                                ))}
                            </div>

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
                                <Link href="/login">
                                    <Button className="h-14 w-full rounded-2xl bg-amber-500 font-black text-black hover:bg-amber-600">
                                        {t.login}
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

export default function Navbar() {
    const { data: session } = useSession();
    const { cartCount, loaded } = useCart();
    const { lang, setLang, isRTL } = useLanguage();
    const t = translations[lang];
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
        <header className={cn(
            "sticky top-0 z-[100] w-full transition-all duration-300",
            scrolled 
                ? "bg-background/80 backdrop-blur-xl shadow-lg border-b border-foreground/5 py-2" 
                : "bg-background py-4"
        )}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-3 sm:gap-4 lg:gap-8">
                    {/* === Logo === */}
                    <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                        <div className="shrink-0 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-2.5 rounded-2xl shadow-lg shadow-amber-500/30 group-hover:scale-105 group-hover:shadow-amber-500/50 transition-all duration-300">
                            <Zap className="h-5 w-5 text-white drop-shadow" />
                        </div>

                        <div className={cn("flex flex-col leading-none", isRTL && "items-end")}>
                            <span className={cn(
                                "text-sm font-black tracking-tight text-foreground",
                                isRTL ? "text-right" : "uppercase"
                            )}>
                                {isRTL ? "عصام الدين نصر" : "Essam El-Din Nasr"}
                            </span>
                            <span className={cn(
                                "text-[9px] font-bold text-amber-500 tracking-widest uppercase mt-0.5",
                                isRTL && "text-right"
                            )}>
                                {isRTL ? "للأدوات الكهربائية" : "Electrical Tools"}
                            </span>
                        </div>
                    </Link>

                    {/* === Navigation (Desktop) === */}
                    <nav className="hidden lg:flex items-center gap-1">
                        {/* Categories Dropdown */}
                        <div 
                            className="relative group/cat"
                            onMouseEnter={() => setShowCategories(true)}
                            onMouseLeave={() => setShowCategories(false)}
                        >
                            <button 
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all",
                                    showCategories ? "bg-amber-500 text-black" : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                                )}
                                onClick={() => setShowCategories(!showCategories)}
                                onKeyDown={(e) => e.key === "Escape" && setShowCategories(false)}
                                aria-expanded={showCategories}
                                aria-haspopup="true"
                            >
                                <Layers className="h-4 w-4" />
                                {t.categoriesTab}
                                <ChevronDown className={cn("h-3 w-3 transition-transform duration-300", showCategories && "rotate-180")} />
                            </button>

                            {/* Dropdown Menu */}
                            <div className={cn(
                                "absolute top-full mt-2 w-64 bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-2xl p-2 transition-all duration-300 z-[110] origin-top",
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
                                className="px-4 py-2 rounded-full text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </nav>

                    {/* Search + theme + language: large screens only; smaller viewports use mobile sheet */}
                    <div className="hidden min-w-0 lg:block lg:flex-1 lg:max-w-md lg:mx-4 xl:mx-8">
                        <GlobalSearch inputId="global-search-desktop" />
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="hidden items-center gap-1 lg:flex">
                            <ThemeToggle />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                                className="w-9 h-9 rounded-full"
                                aria-label={t.language}
                                type="button"
                            >
                                <Globe className="h-5 w-5" />
                                <span className="sr-only">Language</span>
                            </Button>
                        </div>

                        {session ? <StoreNotificationBell /> : null}

                        <Link href="/cart" className="relative group">
                             <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full relative bg-foreground/5 hover:bg-amber-500 hover:text-black transition-all">
                                <ShoppingCart className="h-5 w-5" />
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
                                        "h-10 px-1 !rounded-full bg-foreground/5 hover:bg-foreground/10 transition-all border border-foreground/5",
                                        isRTL ? "pl-3" : "pr-3"
                                    )}
                                    onClick={() => setShowUserMenu((prev) => !prev)}
                                    aria-haspopup="menu"
                                    aria-expanded={showUserMenu}
                                    type="button"
                                >
                                    <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black font-black text-xs shrink-0">
                                        {session.user.name?.charAt(0) || "U"}
                                    </div>
                                    <span className="hidden sm:inline-block ml-2 text-sm font-bold truncate max-w-[80px]">
                                        {session.user.name?.split(' ')[0]}
                                    </span>
                                    <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
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
                            <Link href="/login">
                                <Button className="h-10 px-6 rounded-full bg-amber-500 hover:bg-amber-600 text-black font-black text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                                    <User className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">{t.login}</span>
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
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}

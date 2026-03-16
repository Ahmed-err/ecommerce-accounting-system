"use client";
// ☝️ "use client" tells Next.js this component runs in the BROWSER
// We need this because we use useState (interactive state) for the mobile menu

import { useState } from "react";
import Link from "next/link";
// ☝️ Link = Next.js's version of <a> tag. It's faster because it pre-loads pages

import {
    Zap,          // Lightning bolt icon (our logo)
    ShoppingCart,  // Cart icon
    Menu,          // Hamburger menu icon (mobile)
    X,             // Close icon (mobile menu)
    User,          // User/account icon
} from "lucide-react";
// ☝️ lucide-react = an icon library. Each icon is a React component

import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
    const { data: session } = useSession();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";

    const navLinks = [
        { name: "Home", href: "/" },
        { name: "Products", href: "/products" },
        { name: "Categories", href: "/categories" },
        ...(isAdmin ? [{ name: "Dashboard", href: "/admin" }] : []),
    ];

    return (
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-gray-950/80 border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* === LEFT SIDE: Logo === */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-2 rounded-lg group-hover:shadow-lg group-hover:shadow-amber-500/25 transition-all duration-300">
                            <Zap className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">
                            Power<span className="text-amber-500">Store</span>
                        </span>
                    </Link>

                    {/* === CENTER: Navigation Links === */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    {/* === RIGHT SIDE: Icons === */}
                    <div className="flex items-center gap-3">
                        <button className="relative p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
                            <ShoppingCart className="h-5 w-5" />
                            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                0
                            </span>
                        </button>

                        {/* Account Area */}
                        {session ? (
                            <div className="relative">
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center gap-2 p-1.5 pr-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all"
                                >
                                    <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-gray-950 font-bold text-sm">
                                        {session.user.name?.charAt(0) || "U"}
                                    </div>
                                    <span className="hidden sm:block text-sm font-medium text-gray-300">{session.user.name?.split(' ')[0] || 'User'}</span>
                                </button>

                                {isUserMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-white/10 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-3 py-2 border-b border-white/5 mb-1">
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Signed in as</p>
                                            <p className="text-sm text-white font-bold truncate">{session.user.email}</p>
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded uppercase">{session.user.role}</span>
                                        </div>
                                        {isAdmin && (
                                            <Link href="/admin" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                                                Dashboard
                                            </Link>
                                        )}
                                        <button
                                            onClick={() => signOut()}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all text-left"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/25"
                            >
                                <User className="h-4 w-4" />
                                Login
                            </Link>
                        )}

                        <button
                            className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* === MOBILE MENU === */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-gray-800 bg-gray-950/95 backdrop-blur-xl">
                    <div className="px-4 py-3 space-y-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="block px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        {!session && (
                            <Link
                                href="/login"
                                className="block px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm text-center mt-2 transition-all"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}

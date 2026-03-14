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

export default function Navbar() {
    // useState = React's way of tracking a value that can CHANGE
    // isMobileMenuOpen starts as false (menu closed)
    // setIsMobileMenuOpen is the FUNCTION to change it
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // These are the navigation links — stored in an array so we don't repeat code
    const navLinks = [
        { name: "Home", href: "/" },
        { name: "Products", href: "/products" },
        { name: "Categories", href: "/categories" },
        { name: "About", href: "/about" },
        { name: "Contact", href: "/contact" },
    ];

    return (
        // "sticky top-0 z-50" = navbar stays at top when scrolling
        // "backdrop-blur-xl" = glassmorphism effect — blurs the background behind navbar
        // "bg-gray-950/80" = dark background with 80% opacity (lets blur show through)
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-gray-950/80 border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* ☝️ max-w-7xl = max width container, mx-auto = center it, px = horizontal padding */}
                {/* sm:px-6 = on small screens use 24px padding, lg:px-8 = on large screens use 32px */}

                <div className="flex items-center justify-between h-16">
                    {/* ☝️ flex = horizontal layout, items-center = vertically aligned, h-16 = 64px height */}

                    {/* === LEFT SIDE: Logo === */}
                    <Link href="/" className="flex items-center gap-2 group">
                        {/* group = lets child elements react to parent hover */}
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-2 rounded-lg group-hover:shadow-lg group-hover:shadow-amber-500/25 transition-all duration-300">
                            <Zap className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">
                            Power<span className="text-amber-500">Store</span>
                        </span>
                    </Link>

                    {/* === CENTER: Navigation Links (hidden on mobile) === */}
                    <div className="hidden md:flex items-center gap-1">
                        {/* ☝️ hidden = invisible by default, md:flex = visible on medium+ screens */}
                        {navLinks.map((link) => (
                            // .map() loops over the array and creates a Link for each item
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
                        {/* Cart button with item count badge */}
                        <button className="relative p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
                            <ShoppingCart className="h-5 w-5" />
                            {/* Badge showing number of items in cart */}
                            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                0
                            </span>
                        </button>

                        {/* Account button */}
                        <Link
                            href="/login"
                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/25"
                        >
                            <User className="h-4 w-4" />
                            Account
                        </Link>

                        {/* Mobile menu button (only visible on small screens) */}
                        <button
                            className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        // ☝️ Toggle: if open → close, if closed → open
                        >
                            {isMobileMenuOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                            {/* ☝️ Ternary operator: condition ? (if true) : (if false) */}
                        </button>
                    </div>
                </div>
            </div>

            {/* === MOBILE MENU (slides down when hamburger is clicked) === */}
            {isMobileMenuOpen && (
                // ☝️ && = "short-circuit". Only renders this <div> if isMobileMenuOpen is true
                <div className="md:hidden border-t border-gray-800 bg-gray-950/95 backdrop-blur-xl">
                    <div className="px-4 py-3 space-y-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="block px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
                                onClick={() => setIsMobileMenuOpen(false)}
                            // ☝️ Close menu when a link is clicked
                            >
                                {link.name}
                            </Link>
                        ))}
                        <Link
                            href="/login"
                            className="block px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm text-center mt-2 transition-all"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Account
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}

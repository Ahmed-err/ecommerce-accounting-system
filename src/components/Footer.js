import Link from "next/link";
import { Zap, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-gray-900 border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* === FOOTER GRID === */}
                {/* 1 column on mobile, 2 on tablet, 4 on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

                    {/* Column 1: Brand / About */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-2 rounded-lg">
                                <Zap className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">
                                Power<span className="text-amber-500">Store</span>
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed mb-4">
                            Your trusted supplier for professional-grade electrical supplies.
                            Serving contractors and homeowners since 2024.
                        </p>
                        {/* Contact info */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Phone className="h-4 w-4 text-amber-500" />
                                <span>+20 123 456 7890</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Mail className="h-4 w-4 text-amber-500" />
                                <span>info@powerstore.com</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <MapPin className="h-4 w-4 text-amber-500" />
                                <span>Cairo, Egypt</span>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Quick Links</h3>
                        <ul className="space-y-2">
                            {/* ☝️ space-y-2 = adds 8px gap between each <li> */}
                            {["Home", "Products", "Categories", "About Us", "Contact"].map(
                                (link) => (
                                    <li key={link}>
                                        <Link
                                            href="#"
                                            className="text-gray-400 hover:text-amber-500 text-sm transition-colors"
                                        >
                                            {link}
                                        </Link>
                                    </li>
                                )
                            )}
                        </ul>
                    </div>

                    {/* Column 3: Categories */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Categories</h3>
                        <ul className="space-y-2">
                            {[
                                "Lighting",
                                "Cables & Wires",
                                "Switches & Sockets",
                                "Power Systems",
                                "Safety Gear",
                            ].map((cat) => (
                                <li key={cat}>
                                    <Link
                                        href="#"
                                        className="text-gray-400 hover:text-amber-500 text-sm transition-colors"
                                    >
                                        {cat}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Newsletter */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Stay Updated</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Subscribe to get the latest deals and product updates.
                        </p>
                        {/* Email input + Subscribe button */}
                        <div className="flex gap-2">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                            // ☝️ flex-1 = take up remaining space
                            // focus:outline-none = removes browser default blue outline
                            // focus:border-amber-500 = amber border when input is active
                            />
                            <button className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors whitespace-nowrap">
                                Subscribe
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* === BOTTOM BAR === */}
            <div className="border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-gray-500 text-sm">
                        © 2024 PowerStore. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link
                            href="#"
                            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            href="#"
                            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                        >
                            Terms of Service
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

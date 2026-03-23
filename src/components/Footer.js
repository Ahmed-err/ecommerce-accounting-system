"use client";

import Link from "next/link";
import { Zap, Mail, Phone, MapPin } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export default function Footer() {
    const { lang, isRTL } = useLanguage();
    const t = translations[lang];

    const quickLinks = [
        { name: t.home, href: "/" },
        { name: t.catalog, href: "/products" },
        { name: isRTL ? "الأقسام" : "Categories", href: "/#categories" },
        { name: t.contact, href: "/contact" }
    ];

    const categories = isRTL 
        ? ["الإضاءة", "الكابلات والأسلاك", "المفاتيح والمقابس", "أنظمة الطاقة", "معدات السلامة"]
        : ["Lighting", "Cables & Wires", "Switches & Sockets", "Power Systems", "Safety Gear"];

    return (
        <footer className={`bg-gray-900 border-t border-gray-800 ${isRTL ? 'font-arabic' : 'font-sans'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                    {/* Column 1: Brand / About */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-2 rounded-lg">
                                <Zap className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">
                                {isRTL ? 'باور' : 'Power'}<span className="text-amber-500">{isRTL ? 'ستور' : 'Store'}</span>
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed mb-4">
                            {isRTL 
                                ? "موردك الموثوق للمستلزمات الكهربائية الاحترافية. نخدم المقاولين وأصحاب المنازل في السودان منذ 2024."
                                : "Your trusted provider of professional electrical supplies. Serving contractors and homeowners in Sudan since 2024."
                            }
                        </p>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Phone className="h-4 w-4 text-amber-500" />
                                <span className="regular-nums">+249 123 456 789</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Mail className="h-4 w-4 text-amber-500" />
                                <span>info@powerstore.com</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <MapPin className="h-4 w-4 text-amber-500" />
                                <span>{isRTL ? 'الخرطوم، السودان' : 'Khartoum, Sudan'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">{isRTL ? 'روابط سريعة' : 'Quick Links'}</h3>
                        <ul className="space-y-2">
                            {quickLinks.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-gray-400 hover:text-amber-500 text-sm transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                            <li>
                                <Link href="/login" className="text-amber-500 hover:text-amber-400 text-sm font-bold transition-colors">
                                    {isRTL ? 'الحساب / الدخول' : 'Account / Login'}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Categories */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">{isRTL ? 'الأقسام' : 'Categories'}</h3>
                        <ul className="space-y-2">
                            {categories.map((cat) => (
                                <li key={cat}>
                                    <Link href={`/products?category=${encodeURIComponent(cat)}`} className="text-gray-400 hover:text-amber-500 text-sm transition-colors">
                                        {cat}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Newsletter */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">{isRTL ? 'ابقَ على اطلاع' : 'Stay Tuned'}</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            {isRTL ? "اشترك لتعرف آخر العروض وتحديثات المنتجات." : "Subscribe to get the latest offers and product updates."}
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                placeholder={isRTL ? "أدخل بريدك الإلكتروني" : "Enter your email"}
                                className={`flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors ${isRTL ? 'text-right' : 'text-left'}`}
                            />
                            <button className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors whitespace-nowrap">
                                {isRTL ? 'اشترك' : 'Subscribe'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* === BOTTOM BAR === */}
            <div className="border-t border-gray-800">
                <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4`}>
                    <p className="text-gray-500 text-sm regular-nums">
                        {isRTL ? "© 2024 باور ستور. جميع الحقوق محفوظة." : "© 2024 Power Store. All rights reserved."}
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                            {isRTL ? "سياسة الخصوصية" : "Privacy Policy"}
                        </Link>
                        <Link href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                            {isRTL ? "شروط الخدمة" : "Terms of Service"}
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

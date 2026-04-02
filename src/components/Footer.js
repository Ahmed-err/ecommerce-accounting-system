"use client";

import Link from "next/link";
import { Zap, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

export default function Footer() {
    const { lang, isRTL, brandName } = useLanguage();
    const t = translations[lang];

    const quickLinks = [
        { name: t.home, href: "/" },
        { name: t.catalog, href: "/products" },
        { name: t.about, href: "/about" },
        { name: t.contact, href: "/contact" }
    ];

    return (
        <footer className={cn(
            "border-t border-border",
             isRTL ? "font-arabic" : "font-sans"
        )}>
            <div className="bg-neutral-950 text-zinc-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14 lg:py-16">
                <div className={cn(
                    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12",
                    isRTL ? "text-right" : "text-left"
                )}>
                    {/* Brand Section */}
                    <div className="space-y-6 flex flex-col items-center sm:items-start">
                        <Link href="/" className="flex items-center gap-2.5 group">
                            <div className="relative shrink-0">
                                <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-2.5 rounded-2xl shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform duration-300">
                                    <Zap className="h-5 w-5 text-white" />
                                </div>
                            </div>
                            <span className={cn(
                                "text-base font-black text-zinc-100 leading-snug max-w-[16rem]",
                                isRTL ? "text-right" : "uppercase tracking-tight"
                            )}>
                                {brandName}
                            </span>
                        </Link>
                        <p className={cn("text-zinc-400 text-sm leading-relaxed font-medium", isRTL && "text-right")}>
                            {t.brandDesc}
                        </p>
                        <div className="flex gap-4">
                            {[
                              { Icon: Facebook, href: "https://facebook.com" },
                              { Icon: Twitter, href: "https://twitter.com" },
                              { Icon: Instagram, href: "https://instagram.com" },
                              { Icon: Linkedin, href: "https://linkedin.com" },
                            ].map(({ Icon, href }, i) => (
                                <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-zinc-300 hover:bg-amber-500 hover:text-black transition-all border border-white/10" aria-label={Icon.displayName}>
                                    <Icon className="h-4 w-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links */}
                    <div className={cn(isRTL ? "sm:items-start" : "sm:items-start")}>
                        <h3 className="text-zinc-100 font-black uppercase tracking-widest text-sm mb-8">{t.quickLinks}</h3>
                        <ul className="space-y-4">
                            {quickLinks.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-zinc-400 hover:text-amber-400 text-sm font-bold transition-colors uppercase tracking-tight">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h3 className="text-zinc-100 font-black uppercase tracking-widest text-sm mb-8">{isRTL ? "الدعم" : "Support"}</h3>
                        <ul className="space-y-4">
                             <li>
                                <Link href="/contact" className="text-zinc-400 hover:text-amber-400 text-sm font-bold transition-colors uppercase tracking-tight">
                                    {t.contact}
                                </Link>
                             </li>
                             <li>
                                <Link href="/contact" className="text-zinc-400 hover:text-amber-400 text-sm font-bold transition-colors uppercase tracking-tight">
                                    {isRTL ? "الأسئلة الشائعة" : "FAQ"}
                                </Link>
                             </li>
                             <li>
                                <Link href="/contact" className="text-zinc-400 hover:text-amber-400 text-sm font-bold transition-colors uppercase tracking-tight">
                                    {isRTL ? "سياسة الشحن" : "Shipping Policy"}
                                </Link>
                             </li>
                             <li>
                                <Link href="/terms" className="text-zinc-400 hover:text-amber-400 text-sm font-bold transition-colors uppercase tracking-tight">
                                    {t.termsOfService}
                                </Link>
                             </li>
                             <li>
                                <Link href="/privacy" className="text-zinc-400 hover:text-amber-400 text-sm font-bold transition-colors uppercase tracking-tight">
                                    {t.privacyPolicy}
                                </Link>
                             </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-8">
                        <h3 className="text-zinc-100 font-black uppercase tracking-widest text-sm mb-8">{isRTL ? "تواصل معنا" : "Contact Us"}</h3>
                        <div className="space-y-6 text-zinc-100">
                            <div className="flex items-start gap-4 group">
                                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 border border-white/10 shrink-0 group-hover:bg-amber-500 group-hover:text-black transition-all">
                                    <Phone className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-zinc-500 mb-1">{isRTL ? "المبيعات" : "Sales"}</span>
                                    <span className="text-sm font-bold tracking-tight regular-nums">{t.salesPhone}</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 group">
                                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 border border-white/10 shrink-0 group-hover:bg-amber-500 group-hover:text-black transition-all">
                                    <Mail className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-black uppercase text-zinc-500 mb-1">{isRTL ? "البريد الإلكتروني" : "Email"}</span>
                                    <span className="text-sm font-bold tracking-tight truncate">{t.businessEmail}</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 group">
                                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 border border-white/10 shrink-0 group-hover:bg-amber-500 group-hover:text-black transition-all">
                                    <MapPin className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-zinc-500 mb-1">{isRTL ? "العنوان" : "Address"}</span>
                                    <span className="text-sm font-bold tracking-tight">{t.khartoumSudan}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>

            {/* Bottom Bar */}
            <div className="border-t border-white/10 py-8 bg-neutral-950 text-zinc-400">
                <div className={cn(
                    "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6",
                    isRTL && "md:flex-row-reverse"
                )}>
                    <p className={cn(
                        "text-zinc-400 text-xs font-semibold tracking-tight text-center md:text-left max-w-3xl leading-relaxed",
                        isRTL && "md:text-right"
                    )}>
                        &copy; {new Date().getFullYear()} {brandName}. {t.allRightsReserved}
                    </p>
                    <div className="flex items-center gap-8">
                         <Link href="/privacy" className="text-zinc-500 hover:text-zinc-100 text-[10px] font-black uppercase tracking-widest transition-colors">{t.privacyPolicy}</Link>
                         <Link href="/terms" className="text-zinc-500 hover:text-zinc-100 text-[10px] font-black uppercase tracking-widest transition-colors">{t.termsOfService}</Link>
                    </div>
                </div>
            </div>
            </div>
        </footer>
    );
}

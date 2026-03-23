"use client";

import Link from "next/link";
import {
    ArrowLeft,
    ArrowRight,
    Zap,
    Shield,
    Truck,
    Headphones,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function Hero() {
    const { isRTL, lang } = useLanguage();

    const stats = isRTL ? [
        { icon: Truck, title: "توصيل سريع", desc: "للمناطق المدعومة في السودان" },
        { icon: Shield, title: "ضمان الجودة", desc: "جميع المنتجات أصلية ومعتمدة" },
        { icon: Headphones, title: "دعم فني 24/7", desc: "فريقنا جاهز لمساعدتك" },
    ] : [
        { icon: Truck, title: "Fast Delivery", desc: "To supported areas in Sudan" },
        { icon: Shield, title: "Quality Guarantee", desc: "All products are original" },
        { icon: Headphones, title: "24/7 Support", desc: "Our team is here for you" },
    ];

    return (
        <section className={`relative overflow-hidden bg-gray-950 pt-16 pb-24 ${isRTL ? 'font-arabic' : 'font-sans'}`}>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl opacity-50" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl opacity-50" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-8">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <span className="text-amber-500 text-sm font-medium">
                            {isRTL ? 'مستلزمات كهربائية متميزة' : 'Premium Electrical Supplies'}
                        </span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                        {isRTL ? 'كل ما تحتاجه لـ ' : 'Everything You Need to '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                             {isRTL ? 'بناء مشروعك' : 'Build Your Project'}
                        </span>
                    </h1>

                    <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        {isRTL 
                            ? "معدات كهربائية بمواصفات مهنية للمقاولين، المهندسين، وأصحاب المنازل. أجود العلامات التجارية، أسعار تنافسية، وتوصيل سريع في السودان."
                            : "Professional-grade electrical equipment for contractors, engineers, and homeowners. Best brands, competitive prices, and fast delivery in Sudan."
                        }
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/products"
                            className="group flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/25 hover:-translate-y-0.5"
                        >
                            {isRTL ? 'تصفح المنتجات' : 'Browse Products'}
                            {isRTL ? (
                                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                            ) : (
                                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            )}
                        </Link>
                        <Link
                            href="/contact"
                            className="flex items-center gap-2 border border-gray-700 hover:border-gray-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:bg-white/5"
                        >
                            {isRTL ? 'اتصل بالمبيعات' : 'Contact Sales'}
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 max-w-3xl mx-auto">
                    {stats.map((item) => (
                        <div
                            key={item.title}
                            className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm"
                        >
                            <div className="bg-amber-500/10 p-3 rounded-lg">
                                <item.icon className="h-6 w-6 text-amber-500" />
                            </div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <h3 className="text-white font-semibold">{item.title}</h3>
                                <p className="text-gray-400 text-sm">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

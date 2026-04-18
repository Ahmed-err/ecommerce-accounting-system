"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    ArrowRight,
    Zap,
    Shield,
    Truck,
    Headphones,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export default function Hero() {
    const { isRTL, lang } = useLanguage();
    const t = translations[lang];

    const stats = [
        { icon: Truck, title: t.fastDelivery, desc: t.fastDeliveryDesc },
        { icon: Shield, title: t.qualityGuarantee, desc: t.qualityGuaranteeDesc },
        { icon: Headphones, title: t.support247, desc: t.support247Desc },
    ];

    const fadeInUp = {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 }
    };

    const staggerContainer = {
        animate: {
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2
            }
        }
    };

    const pulseGlow = {
        scale: [1, 1.02, 1],
        opacity: [0.5, 0.7, 0.5],
        transition: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
        }
    };

    return (
        <section className={`relative overflow-hidden bg-background pt-16 pb-24 ${isRTL ? 'font-arabic' : 'font-sans'}`}>
            {/* Animated Background Elements */}
            <motion.div 
                className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"
                animate={pulseGlow}
            />
            <motion.div 
                className="absolute bottom-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"
                animate={{
                    scale: [1, 1.03, 1],
                    opacity: [0.5, 0.6, 0.5],
                    transition: {
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1
                    }
                }}
            />
            <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-amber-500/5 to-transparent rounded-full blur-3xl"
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3],
                    transition: {
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }
                }}
            />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div 
                    className="text-center max-w-4xl mx-auto"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                >
                    {/* Badge */}
                    <motion.div 
                        className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-8"
                        variants={fadeInUp}
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                            <Zap className="h-4 w-4 text-amber-500" />
                        </motion.div>
                        <span className="text-amber-500 text-sm font-medium">
                            {t.premiumSupplies}
                        </span>
                    </motion.div>

                    {/* Title */}
                    <motion.h1 
                        className="text-4xl sm:text-5xl lg:text-7xl font-bold text-foreground mb-6 leading-tight"
                        variants={fadeInUp}
                    >
                        {t.heroTitle1}
                        <motion.span 
                            className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500"
                            animate={{
                                backgroundPosition: ["0%", "100%", "0%"],
                            }}
                            transition={{
                                duration: 5,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                            style={{ backgroundSize: "200%" }}
                        >
                             {t.heroTitle2}
                        </motion.span>
                    </motion.h1>

                    {/* Description */}
                    <motion.p 
                        className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
                        variants={fadeInUp}
                    >
                        {t.heroDesc}
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div 
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                        variants={fadeInUp}
                    >
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Link
                                href="/products"
                                className="group flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/25"
                            >
                                {t.browseProducts}
                                {isRTL ? (
                                    <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                                ) : (
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                )}
                            </Link>
                        </motion.div>
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Link
                                href="/contact"
                                className="flex items-center gap-2 border border-gray-700 hover:border-gray-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:bg-white/5"
                            >
                                {t.contactSales}
                            </Link>
                        </motion.div>
                    </motion.div>
                </motion.div>

                {/* Stats Cards */}
                <motion.div 
                    className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 max-w-3xl mx-auto"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                >
                    {stats.map((item, index) => (
                        <motion.div
                            key={item.title}
                            className="flex items-center gap-4 bg-card/80 border border-border rounded-xl p-4 backdrop-blur-sm"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9 + index * 0.1, duration: 0.5 }}
                            whileHover={{ 
                                y: -5, 
                                borderColor: "rgba(245, 158, 11, 0.3)",
                                transition: { duration: 0.2 }
                            }}
                        >
                            <motion.div 
                                className="bg-amber-500/10 p-3 rounded-lg"
                                animate={{ 
                                    boxShadow: [
                                        "0 0 0 0 rgba(245, 158, 11, 0)",
                                        "0 0 20px 0 rgba(245, 158, 11, 0.3)",
                                        "0 0 0 0 rgba(245, 158, 11, 0)"
                                    ]
                                }}
                                transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                            >
                                <item.icon className="h-6 w-6 text-amber-500" />
                            </motion.div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <h3 className="text-foreground font-semibold">{item.title}</h3>
                                <p className="text-muted-foreground text-sm">{item.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}

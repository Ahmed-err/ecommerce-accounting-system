import Link from "next/link";
import {
    ArrowRight,   // Arrow icon for the CTA button
    Zap,          // Lightning bolt
    Shield,       // Shield icon for trust badges
    Truck,        // Delivery truck
    Headphones,   // Support icon
} from "lucide-react";

export default function Hero() {
    return (
        // "relative overflow-hidden" = allows us to place decorative elements behind content
        <section className="relative overflow-hidden bg-gray-950 pt-16 pb-24">

            {/* === DECORATIVE BACKGROUND ELEMENTS === */}
            {/* These create the glowing gradient orbs behind the text */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
            {/* ☝️ absolute = positioned relative to parent, blur-3xl = extreme blur effect */}
            {/* bg-amber-500/10 = amber color at 10% opacity — creates subtle glow */}

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* "relative" here = ensures content sits ABOVE the absolute decorative elements */}

                <div className="text-center max-w-4xl mx-auto">
                    {/* === BADGE === */}
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-8">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <span className="text-amber-500 text-sm font-medium">
                            Premium Electrical Supplies
                        </span>
                    </div>

                    {/* === MAIN HEADING === */}
                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                        {/* ☝️ Responsive font sizes: text-4xl on mobile → text-7xl on large desktop */}
                        Everything You Need to{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                            Power Up
                        </span>
                        {/* ☝️ Gradient text trick:
                text-transparent = makes text invisible
                bg-clip-text = clips the gradient to the text shape
                bg-gradient-to-r = gradient going left to right
            */}
                    </h1>

                    {/* === SUBTITLE === */}
                    <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Professional-grade electrical supplies for contractors, builders, and
                        DIY enthusiasts. Quality brands, competitive prices, fast delivery.
                    </p>

                    {/* === CTA BUTTONS === */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        {/* ☝️ flex-col = stacked on mobile, sm:flex-row = side by side on desktop */}
                        <Link
                            href="/products"
                            className="group flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/25 hover:-translate-y-0.5"
                        >
                            {/* ☝️ hover:-translate-y-0.5 = slightly lifts the button on hover (micro-animation) */}
                            Browse Products
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            {/* ☝️ group-hover = moves arrow right when PARENT is hovered */}
                        </Link>
                        <Link
                            href="/contact"
                            className="flex items-center gap-2 border border-gray-700 hover:border-gray-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:bg-white/5"
                        >
                            Contact Sales
                        </Link>
                    </div>
                </div>

                {/* === TRUST BADGES === */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 max-w-3xl mx-auto">
                    {/* ☝️ grid = CSS Grid layout, grid-cols-3 = 3 equal columns on desktop */}
                    {/* mt-20 = margin-top 80px */}

                    {[
                        // Array of objects — we map over this to avoid repeating HTML
                        { icon: Truck, title: "Free Delivery", desc: "On orders over $100" },
                        { icon: Shield, title: "Quality Guarantee", desc: "Certified products only" },
                        { icon: Headphones, title: "24/7 Support", desc: "Expert help anytime" },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm"
                        >
                            <div className="bg-amber-500/10 p-3 rounded-lg">
                                <item.icon className="h-6 w-6 text-amber-500" />
                                {/* ☝️ item.icon is a Component (like <Truck />), so we use <item.icon /> */}
                            </div>
                            <div>
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

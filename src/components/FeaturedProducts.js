import Link from "next/link";
import { Star, ShoppingCart, Eye } from "lucide-react";

// Sample products — later these will come from the PostgreSQL database
const products = [
    {
        id: 1,
        name: "LED Panel Light 60W",
        price: 45.99,
        originalPrice: 59.99,
        rating: 4.8,
        reviews: 124,
        category: "Lighting",
        badge: "Best Seller",
        badgeColor: "bg-amber-500",
    },
    {
        id: 2,
        name: "Industrial Cable 100m",
        price: 89.99,
        originalPrice: null, // no discount
        rating: 4.6,
        reviews: 89,
        category: "Cables & Wires",
        badge: "New",
        badgeColor: "bg-emerald-500",
    },
    {
        id: 3,
        name: "Smart Switch 3-Gang",
        price: 34.99,
        originalPrice: 44.99,
        rating: 4.9,
        reviews: 256,
        category: "Switches & Sockets",
        badge: "Popular",
        badgeColor: "bg-blue-500",
    },
    {
        id: 4,
        name: "Circuit Breaker 32A",
        price: 24.99,
        originalPrice: null,
        rating: 4.7,
        reviews: 67,
        category: "Safety Gear",
        badge: null,
        badgeColor: null,
    },
    {
        id: 5,
        name: "Power Inverter 3000W",
        price: 299.99,
        originalPrice: 349.99,
        rating: 4.5,
        reviews: 45,
        category: "Power Systems",
        badge: "Sale",
        badgeColor: "bg-red-500",
    },
    {
        id: 6,
        name: "Electrical Tape Set",
        price: 12.99,
        originalPrice: null,
        rating: 4.4,
        reviews: 312,
        category: "Accessories",
        badge: null,
        badgeColor: null,
    },
    {
        id: 7,
        name: "Voltage Tester Pro",
        price: 29.99,
        originalPrice: 39.99,
        rating: 4.8,
        reviews: 198,
        category: "Tools",
        badge: "Best Seller",
        badgeColor: "bg-amber-500",
    },
    {
        id: 8,
        name: "Distribution Board 12-Way",
        price: 64.99,
        originalPrice: null,
        rating: 4.6,
        reviews: 56,
        category: "Safety Gear",
        badge: null,
        badgeColor: null,
    },
];

export default function FeaturedProducts() {
    return (
        <section className="py-20 bg-gray-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* === SECTION HEADER === */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12">
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                            Featured Products
                        </h2>
                        <p className="text-gray-400 text-lg">
                            Top picks from our electrical supplies catalog
                        </p>
                    </div>
                    <Link
                        href="/products"
                        className="mt-4 sm:mt-0 text-amber-500 hover:text-amber-400 font-medium transition-colors"
                    >
                        View All Products →
                    </Link>
                </div>

                {/* === PRODUCTS GRID === */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* ☝️ Responsive:
              1 column on mobile
              2 columns on tablet (sm)
              4 columns on desktop (lg)
           */}
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/5"
                        >
                            {/* === PRODUCT IMAGE PLACEHOLDER === */}
                            <div className="relative h-48 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                {/* This gradient box is a placeholder — later we'll use real product images */}
                                <span className="text-4xl">
                                    {product.category === "Lighting" && "💡"}
                                    {product.category === "Cables & Wires" && "🔌"}
                                    {product.category === "Switches & Sockets" && "🔲"}
                                    {product.category === "Safety Gear" && "🛡️"}
                                    {product.category === "Power Systems" && "⚡"}
                                    {product.category === "Accessories" && "🔧"}
                                    {product.category === "Tools" && "🔨"}
                                </span>
                                {/* ☝️ Emoji as placeholder icons for each category */}

                                {/* Badge (Best Seller, New, Sale, etc.) */}
                                {product.badge && (
                                    // ☝️ Only show badge if product.badge is not null
                                    <span
                                        className={`absolute top-3 left-3 ${product.badgeColor} text-white text-xs font-bold px-2.5 py-1 rounded-full`}
                                    >
                                        {product.badge}
                                    </span>
                                )}

                                {/* Quick action buttons (appear on hover) */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                                    {/* ☝️ opacity-0 = invisible, group-hover:opacity-100 = visible on hover */}
                                    <button className="bg-white text-gray-900 p-2.5 rounded-full hover:bg-amber-500 hover:text-white transition-colors">
                                        <Eye className="h-4 w-4" />
                                        {/* Quick View button */}
                                    </button>
                                    <button className="bg-white text-gray-900 p-2.5 rounded-full hover:bg-amber-500 hover:text-white transition-colors">
                                        <ShoppingCart className="h-4 w-4" />
                                        {/* Add to Cart button */}
                                    </button>
                                </div>
                            </div>

                            {/* === PRODUCT INFO === */}
                            <div className="p-5">
                                {/* Category label */}
                                <span className="text-amber-500 text-xs font-medium uppercase tracking-wider">
                                    {product.category}
                                </span>

                                {/* Product name */}
                                <h3 className="text-white font-semibold mt-1 mb-2 group-hover:text-amber-500 transition-colors">
                                    {product.name}
                                </h3>

                                {/* Star rating */}
                                <div className="flex items-center gap-1 mb-3">
                                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                                    {/* ☝️ fill-amber-500 = fills the star, text-amber-500 = stroke color */}
                                    <span className="text-white text-sm font-medium">
                                        {product.rating}
                                    </span>
                                    <span className="text-gray-500 text-sm">
                                        ({product.reviews})
                                    </span>
                                </div>

                                {/* Price */}
                                <div className="flex items-center gap-2">
                                    <span className="text-white text-xl font-bold">
                                        ${product.price}
                                    </span>
                                    {product.originalPrice && (
                                        // Show original price with strikethrough if there's a discount
                                        <span className="text-gray-500 text-sm line-through">
                                            ${product.originalPrice}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

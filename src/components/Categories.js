import Link from "next/link";
import {
    Lightbulb,     // Light bulb icon
    Cable,         // Cable/wire icon
    ToggleLeft,    // Switch icon
    Plug,          // Plug icon
    Battery,       // Battery icon
    Shield,        // Safety equipment icon
} from "lucide-react";

// Categories data — in a real app this would come from the DATABASE
// For now we hardcode it so you can see the UI
const categories = [
    {
        name: "Lighting",
        desc: "LED, Bulbs, Fixtures",
        icon: Lightbulb,
        color: "from-yellow-500 to-amber-500",
        count: 124,
    },
    {
        name: "Cables & Wires",
        desc: "Power, Data, Fiber",
        icon: Cable,
        color: "from-blue-500 to-cyan-500",
        count: 89,
    },
    {
        name: "Switches & Sockets",
        desc: "Wall Plates, Dimmers",
        icon: ToggleLeft,
        color: "from-emerald-500 to-green-500",
        count: 156,
    },
    {
        name: "Connectors",
        desc: "Plugs, Adapters, Junctions",
        icon: Plug,
        color: "from-purple-500 to-violet-500",
        count: 67,
    },
    {
        name: "Power Systems",
        desc: "Generators, UPS, Inverters",
        icon: Battery,
        color: "from-red-500 to-rose-500",
        count: 45,
    },
    {
        name: "Safety Gear",
        desc: "Breakers, Fuses, PPE",
        icon: Shield,
        color: "from-orange-500 to-amber-600",
        count: 78,
    },
];

export default function Categories() {
    return (
        <section className="py-20 bg-gray-900">
            {/* ☝️ py-20 = vertical padding 80px, bg-gray-900 = slightly lighter than hero */}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* === SECTION HEADER === */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Shop by Category
                    </h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Find exactly what you need from our comprehensive range of
                        electrical supplies
                    </p>
                </div>

                {/* === CATEGORIES GRID === */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {/* ☝️ Responsive grid:
              - 2 columns on mobile (grid-cols-2)
              - 3 columns on tablet (md:grid-cols-3)
              - 6 columns on desktop (lg:grid-cols-6)
          */}
                    {categories.map((category) => (
                        <Link
                            key={category.name}
                            href={`/categories/${category.name.toLowerCase()}`}
                            // ☝️ Template literal: creates URL like /categories/lighting
                            className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
                        // ☝️ hover:-translate-y-1 = lifts card up 4px on hover (subtle float effect)
                        >
                            {/* Icon with gradient background */}
                            <div
                                className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${category.color} mb-4 group-hover:scale-110 transition-transform duration-300`}
                            // ☝️ ${category.color} injects the gradient classes dynamically
                            // group-hover:scale-110 = icon grows 10% when card is hovered
                            >
                                <category.icon className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-white font-semibold text-sm mb-1">
                                {category.name}
                            </h3>
                            <p className="text-gray-500 text-xs">{category.desc}</p>
                            <span className="text-gray-600 text-xs mt-2 block">
                                {category.count} products
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

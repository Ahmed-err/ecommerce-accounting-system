import Link from "next/link";
import { cookies } from "next/headers";
import { getCatalogCategories } from "@/app/actions/catalog";
import { translations } from "@/lib/translations";
import {
    Lightbulb,
    Cable,
    ToggleLeft,
    Plug,
    Battery,
    Shield,
    Package,
} from "lucide-react";

export default async function Categories() {
    const cookieStore = await cookies();
    const lang = cookieStore.get("lang")?.value || "ar";
    const t = translations[lang];

    const categoryStyling = {
        Lighting: { icon: Lightbulb, color: "from-yellow-500 to-amber-500", title: t.catLighting, desc: t.catLightingDesc },
        "Cables & Wires": { icon: Cable, color: "from-blue-500 to-cyan-500", title: t.catCablesWires, desc: t.catCablesWiresDesc },
        "Switches & Sockets": { icon: ToggleLeft, color: "from-emerald-500 to-green-500", title: t.catSwitchesSockets, desc: t.catSwitchesSocketsDesc },
        Connectors: { icon: Plug, color: "from-purple-500 to-violet-500", title: t.catConnectors, desc: t.catConnectorsDesc },
        "Power Systems": { icon: Battery, color: "from-red-500 to-rose-500", title: t.catPowerSystems, desc: t.catPowerSystemsDesc },
        "Safety Gear": { icon: Shield, color: "from-orange-500 to-amber-600", title: t.catSafetyGear, desc: t.catSafetyGearDesc },
    };

    const categoriesList = await getCatalogCategories();

    if (!categoriesList || categoriesList.length === 0) {
        return null;
    }

    return (
        <section id="categories" className="py-20 bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* === SECTION HEADER === */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        {t.shopByCategory}
                    </h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        {t.shopByCategoryDesc}
                    </p>
                </div>

                {/* === CATEGORIES GRID === */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {categoriesList.map((category) => {
                        const style = categoryStyling[category.name] || { icon: Package, color: "from-gray-500 to-gray-600", title: category.name, desc: category.description };
                        const IconComponent = style.icon;

                        return (
                            <Link
                                key={category.id}
                                href={`/products?category=${encodeURIComponent(category.name)}`}
                                className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
                            >
                                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${style.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    <IconComponent className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="text-white font-semibold text-sm mb-1 line-clamp-1 py-1 px-1">
                                    {style.title}
                                </h3>
                                <p className="text-gray-500 text-xs line-clamp-2 min-h-8">
                                    {style.desc}
                                </p>
                                <span className="text-gray-600 text-xs mt-2 block">
                                    {category.productCount} {t.productsCountText}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}


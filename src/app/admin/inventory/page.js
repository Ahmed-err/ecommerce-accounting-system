import { getProducts, getCategories, getInventorySummary } from "@/app/actions/inventory";
import ProductTable from "@/components/inventory/ProductTable";
import { Package, AlertTriangle, Layers, DollarSign } from "lucide-react";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";

export const metadata = {
  title: "Inventory | Admin Dashboard",
};

export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const search = params?.search || "";
  const categoryId = params?.category || "";
  const status = params?.status || "all";
  const sort = params?.sort || "newest";

  const [{ products, total }, categories, summary] = await Promise.all([
     getProducts({ search, categoryId, status, sort, page }),
     getCategories(),
     getInventorySummary()
  ]);

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  const isRTL = lang === "ar";

  const stats = [
    { label: t.adminTotalProducts, value: summary.totalProducts, icon: Package, color: "blue" },
    { label: lang === 'ar' ? "إجمالي المخزون" : "Total Stock", value: summary.totalStock, icon: Layers, color: "indigo" },
    { label: lang === 'ar' ? "قيمة المخزون" : "Inventory Value", value: `${summary.totalValue.toLocaleString()} ${t.currency}`, icon: DollarSign, color: "emerald" },
    { label: t.inventoryLowStock, value: summary.lowStock, icon: AlertTriangle, color: summary.lowStock > 0 ? "red" : "emerald" },
  ];

  const colorMap = {
    blue: { bg: "bg-blue-500/10", icon: "text-blue-500", aura: "opacity-20" },
    indigo: { bg: "bg-indigo-500/10", icon: "text-indigo-500", aura: "opacity-20" },
    emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-500", aura: "opacity-20" },
    red: { bg: "bg-red-500/10", icon: "text-red-500", aura: "opacity-20 flex-animate-pulse" },
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t.adminInventoryTitle}</h1>
          <p className="text-gray-400 mt-1">{t.adminInventoryDesc}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-gray-900 border border-white/5 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:bg-white/[0.02] transition-colors">
             <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${colorMap[stat.color].bg} ${colorMap[stat.color].icon}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                {stat.color === 'red' && stat.value > 0 && (
                   <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping absolute top-5 right-5" />
                )}
             </div>
             <div className="mt-4">
                <p className="text-xs text-gray-500 font-medium mb-1">{stat.label}</p>
                <p className={`text-xl font-bold text-white regular-nums`}>{stat.value}</p>
             </div>
          </div>
        ))}
      </div>
      
      <ProductTable 
        initialProducts={products} 
        total={total}
        categories={categories}
        searchParams={params}
      />
    </div>
  );
}

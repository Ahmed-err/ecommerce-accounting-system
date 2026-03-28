"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LayoutDashboard, Package, Users, ShoppingCart, Settings, CreditCard, ChevronLeft, ChevronRight, Monitor } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export default function AdminSidebar({ onNavigate }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];

  const userRole = session?.user?.role || "CASHIER";

  const allItems = [
    { name: t.adminDashboard, href: "/admin", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "CASHIER"] },
    { name: t.adminPos, href: "/pos", icon: Monitor, roles: ["ADMIN", "MANAGER", "CASHIER"] },
    { name: t.adminOrders, href: "/admin/orders", icon: ShoppingCart, roles: ["ADMIN", "MANAGER", "CASHIER"] },
    { name: t.adminInventory, href: "/admin/inventory", icon: Package, roles: ["ADMIN", "MANAGER"] },
    { name: t.adminEmployees, href: "/admin/employees", icon: Users, roles: ["ADMIN"] },
    { name: t.adminAccounting, href: "/admin/accounting", icon: CreditCard, roles: ["ADMIN"] },
    { name: t.adminSettings, href: "/admin/settings", icon: Settings, roles: ["ADMIN", "MANAGER", "CASHIER"] },
  ];

  const navItems = allItems.filter(item => item.roles.includes(userRole));

  return (
    <div className={`flex h-full flex-col bg-gray-950/95 backdrop-blur-xl ${isRTL ? 'border-l' : 'border-r'} border-white/5 text-gray-300 w-full md:w-64 ${isRTL ? 'text-right font-arabic' : 'text-left font-sans'}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="p-8">
        <h2 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
             <span className="text-black text-xs">PS</span>
          </div>
          <div>
            Power<span className="text-amber-500">Store</span>
            <div className={`text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-0.5 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.adminErp}
            </div>
          </div>
        </h2>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = item.href === "/admin" 
            ? pathname === "/admin" 
            : pathname?.startsWith(item.href);
          
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative ${
                isActive 
                  ? "bg-amber-500/10 text-amber-500 font-bold" 
                  : "hover:bg-white/5 hover:text-white"
              }`}
            >
              {isActive && (
                <div className={`absolute ${isRTL ? 'right-0' : 'left-0'} w-1 h-6 bg-amber-500 rounded-full my-auto inset-y-0`} />
              )}
              <Icon className={`h-5 w-5 transition-all duration-300 ${isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "group-hover:scale-110 group-hover:text-amber-400 opacity-60 group-hover:opacity-100"}`} />
              <span className="tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-6 border-t border-white/5 mt-auto bg-black/20">
        <Link 
          href="/" 
          className={`text-sm text-gray-400 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 group`}
        >
          <span className="group-hover:translate-x-[-2px] transition-transform">
             {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <span className="font-medium">{t.backToStore}</span>
        </Link>
      </div>
    </div>
  );
}

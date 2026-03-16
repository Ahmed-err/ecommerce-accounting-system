"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Users, ShoppingCart, Settings, CreditCard } from "lucide-react";

export default function AdminSidebar({ onNavigate }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { name: "Inventory", href: "/admin/inventory", icon: Package },
    { name: "Customers", href: "/admin/customers", icon: Users },
    { name: "Accounting", href: "/admin/accounting", icon: CreditCard },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="flex h-full flex-col bg-gray-900 border-r border-white/5 text-gray-300 w-full md:w-64">
      <div className="p-6">
        <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
          Power<span className="text-amber-500">Store</span> <span className="text-sm font-medium text-gray-500 uppercase tracking-widest ml-1">ERP</span>
        </h2>
      </div>
      
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          // Exact match for dashboard, prefix match for others
          const isActive = item.href === "/admin" 
            ? pathname === "/admin" 
            : pathname?.startsWith(item.href);
          
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? "bg-amber-500/15 text-amber-500 font-medium" 
                  : "hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110 group-hover:text-amber-400"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-white/5 mt-auto">
        <Link 
          href="/" 
          className="text-sm text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2 p-2 hover:bg-white/5 rounded-lg"
        >
          ← Back to Storefront
        </Link>
      </div>
    </div>
  );
}

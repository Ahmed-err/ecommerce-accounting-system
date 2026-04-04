"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Zap,
  MessageSquare,
  Truck,
  Mail,
  Bell,
  TicketPercent,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export default function AdminSidebar({ onNavigate, unreadContactCount = 0 }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { lang, isRTL, brandName } = useLanguage();
  const t = translations[lang];

  const userRole = session?.user?.role || "CASHIER";

  const allItems = [
    { name: t.adminDashboard, href: "/admin", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "CASHIER"] },
    { name: t.adminPos, href: "/pos", icon: Monitor, roles: ["ADMIN", "MANAGER", "CASHIER"] },
    { name: t.adminOrders, href: "/admin/orders", icon: ShoppingCart, roles: ["ADMIN", "MANAGER", "CASHIER"] },
    { name: t.adminReviews || "Reviews", href: "/admin/reviews", icon: MessageSquare, roles: ["ADMIN", "MANAGER"] },
    { name: t.adminInventory, href: "/admin/inventory", icon: Package, roles: ["ADMIN", "MANAGER"] },
    { name: t.adminSuppliers, href: "/admin/suppliers", icon: Truck, roles: ["ADMIN", "MANAGER"] },
    {
      name: t.adminContacts,
      href: "/admin/contacts",
      icon: Mail,
      roles: ["ADMIN", "MANAGER"],
      badge: unreadContactCount,
    },
    { name: t.adminNotifications || "Notifications", href: "/admin/notifications", icon: Bell, roles: ["ADMIN", "MANAGER"] },
    { name: t.adminCoupons || "Coupons", href: "/admin/coupons", icon: TicketPercent, roles: ["ADMIN"] },
    { name: t.adminEmployees, href: "/admin/employees", icon: Users, roles: ["ADMIN"] },
    { name: t.adminAccounting, href: "/admin/accounting", icon: CreditCard, roles: ["ADMIN"] },
    { name: t.adminSettings, href: "/admin/settings", icon: Settings, roles: ["ADMIN"] },
  ];

  const navItems = allItems.filter(item => item.roles.includes(userRole));

  return (
    <div
      className={`flex h-full flex-col bg-gray-950/95 backdrop-blur-xl ${isRTL ? "border-l" : "border-r"} border-white/5 text-gray-300 w-64 max-w-full overflow-x-hidden ${isRTL ? "text-right font-arabic" : "text-left font-sans"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="p-8">
        <h2 className="flex items-start gap-2 text-white drop-shadow-sm">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500">
            <Zap className="h-4 w-4 text-black" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold leading-snug tracking-tight line-clamp-3">
              {brandName}
            </span>
            <div
              className={`mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 ${isRTL ? "text-right" : "text-left"}`}
            >
              {t.adminErp}
            </div>
          </div>
        </h2>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href.split("?")[0]);

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
                <div
                  className={`absolute ${isRTL ? "right-0" : "left-0"} my-auto inset-y-0 h-6 w-1 rounded-full bg-amber-500`}
                />
              )}
              <Icon
                className={`h-5 w-5 shrink-0 transition-all duration-300 ${
                  isActive
                    ? "scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    : "opacity-60 group-hover:scale-110 group-hover:text-amber-400 group-hover:opacity-100"
                }`}
              />
              <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap tracking-wide">
                {item.name}
              </span>
              {item.badge > 0 ? (
                <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-black">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
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

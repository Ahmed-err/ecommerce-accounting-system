"use client";

import BrandLockup from "@/components/brand/BrandLockup";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  MessageSquare,
  Truck,
  Mail,
  Bell,
  TicketPercent,
} from "lucide-react";
import { useLanguage, useT } from "@/context/LanguageContext";
import { STAFF_AREAS } from "@/lib/staff-access";

const AREA_ICONS = {
  dashboard: LayoutDashboard,
  pos: Monitor,
  orders: ShoppingCart,
  reviews: MessageSquare,
  inventory: Package,
  suppliers: Truck,
  contacts: Mail,
  notifications: Bell,
  coupons: TicketPercent,
  employees: Users,
  accounting: CreditCard,
  settings: Settings,
};

// `role` comes from the server session, so the menu is right on first paint.
export default function AdminSidebar({ role, onNavigate, unreadContactCount = 0 }) {
  const pathname = usePathname();
  const { isRTL } = useLanguage();
  const t = useT();

  const navItems = STAFF_AREAS.filter((a) => a.roles.includes(role)).map((a) => ({
    name: t[a.labelKey],
    href: a.path,
    icon: AREA_ICONS[a.key],
    badge: a.key === "contacts" ? unreadContactCount : 0,
  }));

  return (
    <div
      className={`flex h-full flex-col bg-card/95 backdrop-blur-xl ${isRTL ? "border-l" : "border-r"} border-border text-muted-foreground w-64 max-w-full overflow-x-hidden shadow-sm ${isRTL ? "text-right font-arabic" : "text-left font-sans"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="px-6 py-7">
        <h2 className="flex min-w-0 flex-col items-stretch gap-1 text-foreground">
          <BrandLockup variant="compact" wrapShop className="w-full" />
          <div className="min-w-0 flex-1">
            <div
              className={`mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ${isRTL ? "text-right" : "text-left"}`}
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
                  ? "bg-amber-500/15 text-accent-text font-bold border border-amber-500/20"
                  : "hover:bg-muted hover:text-foreground border border-transparent hover:border-border"
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
                    : "opacity-60 group-hover:scale-110 group-hover:text-accent-text group-hover:opacity-100"
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
      
      <div className="p-6 border-t border-border mt-auto bg-muted/40">
        <Link 
          href="/" 
          className={`text-sm text-muted-foreground hover:text-foreground transition-all duration-300 flex items-center justify-center gap-2 p-3 bg-background/80 hover:bg-background rounded-2xl border border-border group`}
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

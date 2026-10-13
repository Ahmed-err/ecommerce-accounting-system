"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import NotificationBell from "@/components/admin/NotificationBell";
import BrandLockup from "@/components/brand/BrandLockup";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { areaFor } from "@/lib/staff-access";

import { useLanguage, useT } from "@/context/LanguageContext";

export default function AdminLayoutClient({ children, role, unreadContactCount = 0 }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isRTL } = useLanguage();
  const t = useT();
  const pathname = usePathname();
  const area = areaFor(pathname);
  const pageTitle = area ? t[area.labelKey] : "";

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={`admin-shell flex min-h-dvh w-full flex-col bg-background text-foreground selection:bg-amber-500/30 md:h-dvh md:max-h-dvh md:flex-row md:overflow-hidden ${isRTL ? "text-right font-arabic" : "text-left font-sans"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <aside className="hidden h-full min-h-0 w-64 max-w-full shrink-0 overflow-y-auto md:block">
        <AdminSidebar role={role} unreadContactCount={unreadContactCount} />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:overflow-hidden">
        
        {/* --- MOBILE HEADER --- */}
        <header className="md:hidden sticky top-0 z-50 isolate grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 border-b border-border bg-card/90 p-4 backdrop-blur-xl">
          <div className="flex justify-start">
            {mounted ? (
              <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">{t.adminToggleMenu}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side={isRTL ? "right" : "left"}
                  className={`w-full max-w-[calc(100vw-2rem)] border-border bg-card p-0 pt-0 ${isRTL ? "border-l" : "border-r"} overflow-x-hidden`}
                >
                  <SheetHeader className="sr-only">
                    <SheetTitle>{t.adminNavMenu}</SheetTitle>
                  </SheetHeader>
                  <AdminSidebar
                    role={role}
                    unreadContactCount={unreadContactCount}
                    onNavigate={() => setIsMobileOpen(false)}
                  />
                </SheetContent>
              </Sheet>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                disabled
                className="h-10 w-10 text-muted-foreground opacity-100"
                aria-label={t.adminToggleMenu}
              >
                <Menu className="h-6 w-6" />
              </Button>
            )}
          </div>
          <Link href="/admin" className="flex min-w-0 justify-center" aria-label={t.adminDashboard}>
            <BrandLockup variant="compact" size={30} />
          </Link>
          <div className="flex justify-end">
            <NotificationBell />
          </div>
        </header>

        <div className="relative z-50 isolate hidden shrink-0 border-b border-border bg-card/80 px-6 py-3 backdrop-blur-xl md:flex md:items-center md:justify-between">
          <p className="truncate text-sm font-bold text-foreground">{pageTitle}</p>
          <NotificationBell />
        </div>

        <main className="flex-1 overflow-x-auto overflow-y-auto p-4 md:min-h-0 md:p-8 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

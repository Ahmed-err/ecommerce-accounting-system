"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import NotificationBell from "@/components/admin/NotificationBell";

import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export default function AdminLayoutClient({ children, unreadContactCount = 0 }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isRTL, lang, brandName } = useLanguage();
  const t = translations[lang];

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={`flex min-h-dvh bg-gray-950 text-gray-100 selection:bg-amber-500/30 overflow-x-hidden ${isRTL ? 'text-right font-arabic' : 'text-left font-sans'}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      
      {/* --- SIDEBAR --- */}
      <aside className="hidden md:block w-64 max-w-full flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
        <AdminSidebar unreadContactCount={unreadContactCount} />
      </aside>

      {/* --- MAIN CONTENT CONTAINER --- */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* --- MOBILE HEADER --- */}
        <header className="md:hidden sticky top-0 z-50 isolate grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 border-b border-white/5 bg-gray-900/80 p-4 backdrop-blur-xl">
          <div className="flex justify-start">
            {mounted ? (
              <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-300 hover:bg-white/10 hover:text-white">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">{t.adminToggleMenu}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side={isRTL ? "right" : "left"}
                  className={`w-full max-w-[calc(100vw-2rem)] border-white/5 bg-gray-900 p-0 pt-0 ${isRTL ? "border-l" : "border-r"} overflow-x-hidden`}
                >
                  <SheetHeader className="sr-only">
                    <SheetTitle>{t.adminNavMenu}</SheetTitle>
                  </SheetHeader>
                  <AdminSidebar
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
                className="h-10 w-10 text-gray-300 opacity-100"
                aria-label={t.adminToggleMenu}
              >
                <Menu className="h-6 w-6" />
              </Button>
            )}
          </div>
          <h2 className="min-w-0 truncate text-center text-sm font-bold leading-tight text-white">
            {brandName}
          </h2>
          <div className="flex justify-end">
            <NotificationBell />
          </div>
        </header>

        <div className="relative z-50 isolate hidden md:flex items-center justify-end border-b border-white/5 bg-gray-900/70 px-6 py-3 backdrop-blur-xl">
          <NotificationBell />
        </div>

        {/* --- PAGE CONTENT --- */}
        <main className="flex-1 overflow-x-auto p-4 md:p-8 lg:px-10">
          <div className="mx-auto max-w-6xl w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

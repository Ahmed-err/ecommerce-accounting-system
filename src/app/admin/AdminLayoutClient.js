"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export default function AdminLayoutClient({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isRTL, lang } = useLanguage();
  const t = translations[lang];

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={`flex min-h-screen bg-gray-950 text-gray-100 selection:bg-amber-500/30 ${isRTL ? 'text-right font-arabic' : 'text-left font-sans'}`} dir={isRTL ? "rtl" : "ltr"}>
      
      {/* --- SIDEBAR --- */}
      <aside className="hidden md:block w-64 flex-shrink-0 sticky top-0 h-screen">
        <AdminSidebar />
      </aside>

      {/* --- MAIN CONTENT CONTAINER --- */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* --- MOBILE HEADER --- */}
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between p-4 border-b border-white/5 bg-gray-900/80 backdrop-blur-xl">
          {mounted && (
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-white/10 shrink-0">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">{t.adminToggleMenu}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side={isRTL ? "right" : "left"} className={`p-0 bg-gray-900 border-white/5 w-72 pt-0 ${isRTL ? 'border-l' : 'border-r'}`}>
                <SheetHeader className="sr-only">
                  <SheetTitle>{t.adminNavMenu}</SheetTitle>
                </SheetHeader>
                <AdminSidebar onNavigate={() => setIsMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          )}

          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-white">
              {lang === 'ar' ? 'بـاور' : 'Power'}<span className="text-amber-500">{lang === 'ar' ? 'سـتور' : 'Store'}</span>
            </h2>
          </div>
        </header>

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

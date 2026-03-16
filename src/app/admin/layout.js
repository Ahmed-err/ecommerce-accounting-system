"use client";

import { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function AdminLayout({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-amber-500/30">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:block w-64 flex-shrink-0 sticky top-0 h-screen">
        <AdminSidebar />
      </aside>

      {/* --- MAIN CONTENT CONTAINER --- */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* --- MOBILE HEADER --- */}
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between p-4 border-b border-white/5 bg-gray-900/80 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Power<span className="text-amber-500">Store</span>
            </h2>
          </div>
          
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-white/10">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle mobile menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-gray-900 border-r border-white/5 w-72 pt-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <AdminSidebar onNavigate={() => setIsMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        {/* --- PAGE CONTENT --- */}
        <main className="flex-1 overflow-x-hidden p-4 md:p-8 lg:px-10">
          <div className="mx-auto max-w-6xl w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

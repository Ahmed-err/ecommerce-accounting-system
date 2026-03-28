"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
      className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg shadow-lg shadow-amber-500/20 transition-all"
    >
      <Printer className="w-4 h-4" />
      <span>Print Receipt</span>
    </button>
  );
}

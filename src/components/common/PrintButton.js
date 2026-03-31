"use client";

import { Printer } from "lucide-react";
import { printElementById } from "@/lib/print";

export default function PrintButton({ targetId }) {
  return (
    <button 
      onClick={() => (targetId ? printElementById(targetId) : window.print())}
      className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg shadow-lg shadow-amber-500/20 transition-all"
      type="button"
    >
      <Printer className="w-4 h-4" />
      <span>Print Receipt</span>
    </button>
  );
}

"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { printElementById } from "@/lib/print";

export default function PrintReportButton({ label, isRTL, targetId }) {
  return (
    <Button 
      className="bg-gray-800 border border-white/5 text-white hover:bg-gray-700 font-medium" 
      onClick={() => (targetId ? printElementById(targetId) : window.print())}
      type="button"
    >
      <Printer className={`${isRTL ? 'ml-2' : 'mr-2'} h-4 w-4`} /> 
      {label}
    </Button>
  );
}

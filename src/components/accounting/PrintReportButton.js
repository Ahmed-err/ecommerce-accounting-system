"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { printElementById } from "@/lib/print";

export default function PrintReportButton({ label, isRTL, targetId }) {
  return (
    <Button 
      className="bg-background border border-border text-foreground hover:bg-muted font-medium" 
      onClick={() => (targetId ? printElementById(targetId) : window.print())}
      type="button"
    >
      <Printer className={`${isRTL ? 'ml-2' : 'mr-2'} h-4 w-4`} /> 
      {label}
    </Button>
  );
}

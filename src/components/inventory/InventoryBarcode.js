"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { cn } from "@/lib/utils";

export default function InventoryBarcode({ value, className = "" }) {
  const svgRef = useRef(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || !value) return;
    try {
      while (el.firstChild) el.removeChild(el.firstChild);
      JsBarcode(el, String(value), {
        format: "CODE128",
        displayValue: true,
        height: 44,
        margin: 6,
        marginTop: 4,
        marginBottom: 4,
        width: 2,
        fontSize: 13,
        textAlign: "center",
        textMargin: 5,
        lineColor: "#000000",
      });
      el.setAttribute("preserveAspectRatio", "xMidYMid meet");
    } catch {
      /* invalid barcode value */
    }
  }, [value]);

  if (!value) return null;
  return (
    <div
      dir="ltr"
      className={cn("flex w-full justify-center overflow-x-auto", className)}
      style={{ unicodeBidi: "isolate" }}
    >
      <svg
        ref={svgRef}
        role="img"
        aria-label={`Barcode ${value}`}
        className="block h-auto max-h-20 max-w-full text-black [direction:ltr]"
      />
    </div>
  );
}

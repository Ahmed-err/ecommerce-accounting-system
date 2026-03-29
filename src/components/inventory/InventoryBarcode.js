"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

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
        height: 48,
        margin: 4,
        width: 1.4,
      });
    } catch {
      /* invalid barcode value */
    }
  }, [value]);

  if (!value) return null;
  return <svg ref={svgRef} className={`max-h-20 w-full text-black ${className}`} />;
}

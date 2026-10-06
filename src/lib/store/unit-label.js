const PIECE_UNITS = new Set(["", "pcs", "pc", "piece", "pieces", "unit", "قطعة"]);

// Product.unit is free text from inventory; the default piece units read as one word.
export function unitLabel(unit, t) {
  const u = String(unit || "").trim();
  return PIECE_UNITS.has(u.toLowerCase()) ? t.pdpUnitPiece : u;
}

const PIECE_UNITS = new Set(["", "pcs", "pc", "piece", "pieces", "unit", "قطعة"]);

const UNIT_KEYS = {
  roll: "unitRoll",
  box: "unitBox",
  carton: "unitBox",
  m: "unitMeter",
  meter: "unitMeter",
  set: "unitSet",
  pack: "unitPack",
};

// Product.unit is free text from inventory; the default piece units read as one word and
// the common English units are translated. Anything else is shown as entered.
export function unitLabel(unit, t) {
  const u = String(unit || "").trim();
  const key = u.toLowerCase();
  if (PIECE_UNITS.has(key)) return t.pdpUnitPiece;
  return (UNIT_KEYS[key] && t[UNIT_KEYS[key]]) || u;
}

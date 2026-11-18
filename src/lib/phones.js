// The store's contact phone setting may hold several numbers, separated by "/", ",", "،",
// ";" or new lines (e.g. "0116881128 / 012 400 2234"). Each is shown and linked separately.

export function splitPhones(value) {
  return String(value || "")
    .split(/[\/,،;\n]+/)
    .map((p) => p.trim())
    .filter((p) => /\d/.test(p));
}

/** tel: link for one number (keeps a leading +). */
export function telHref(phone) {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

/**
 * Digits for wa.me, which needs the international form without + or 00.
 * Local numbers ("0912…", "0116…") are Sudanese: the leading 0 becomes 249.
 */
export function whatsappDigits(phone, countryCode = "249") {
  let d = String(phone || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("0")) return countryCode + d.slice(1);
  return d;
}

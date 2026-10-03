const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const withCents = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Western digits, thousands grouped; two decimals only when the amount has cents. */
export function formatAmount(value) {
  const n = Number(value);
  if (value === null || value === undefined || !Number.isFinite(n)) return "0";
  return Number.isInteger(Math.round(n * 100) / 100) ? grouped.format(n) : withCents.format(n);
}

/** Whole-percent saving, or null when compareAt is missing or not higher than amount. */
export function discountPercent(amount, compareAt) {
  const a = Number(amount);
  const c = Number(compareAt);
  if (!Number.isFinite(a) || !Number.isFinite(c) || c <= 0 || c <= a) return null;
  return Math.round(((c - a) / c) * 100);
}

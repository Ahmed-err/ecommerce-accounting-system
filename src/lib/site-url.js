export function getAbsoluteSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL || "https://www.himmat.store";
  const s = String(raw).trim();
  if (!s) return "https://www.himmat.store";
  if (/^https?:\/\//i.test(s)) return s.replace(/\/$/, "");
  return `https://${s.replace(/\/$/, "")}`;
}

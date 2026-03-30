export function getAbsoluteSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL || "https://essamnasr.com";
  const s = String(raw).trim();
  if (!s) return "https://essamnasr.com";
  if (/^https?:\/\//i.test(s)) return s.replace(/\/$/, "");
  return `https://${s.replace(/\/$/, "")}`;
}

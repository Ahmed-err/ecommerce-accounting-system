/**
 * App only ships `ar` and `en`. Cookies/localStorage can contain garbage;
 * never pass raw values into translations[lang] or it will throw at runtime.
 */
export function normalizeAppLang(value) {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "en") return "en";
  return "ar";
}

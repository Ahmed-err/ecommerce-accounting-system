// Number and date formats for the account pages: Latin digits in both languages,
// matching prices elsewhere in the store.

export function formatMoney(value, t) {
  return `${Number(value || 0).toLocaleString("en-US")} ${t.currency}`;
}

export function formatDate(value, lang, withTime = false) {
  return new Date(value).toLocaleString(lang === "ar" ? "ar-SD-u-nu-latn" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

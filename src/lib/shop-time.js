/**
 * The shop's clock. The shop is in Khartoum; the server runs in UTC. Attendance times, "today"
 * and month ranges on the HR screens follow the shop's calendar, not the server's.
 * Days are "YYYY-MM-DD" strings; times are "HH:MM".
 */
export const SHOP_TIME_ZONE = "Africa/Khartoum";

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: SHOP_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function shopParts(date) {
  const p = {};
  for (const { type, value } of partsFmt.formatToParts(date)) p[type] = value;
  return p;
}

/** Shop-clock offset from UTC at that instant, in ms. */
function offsetAt(date) {
  const p = shopParts(date);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function parseDay(day) {
  const m = typeof day === "string" && day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
  return { y, mo, d };
}

/** Shop wall time → instant. */
function wall(y, mo, d, h = 0, min = 0, s = 0, ms = 0) {
  const guess = Date.UTC(y, mo - 1, d, h, min, s, ms);
  const first = guess - offsetAt(new Date(guess));
  return new Date(guess - offsetAt(new Date(first)));
}

/** "HH:MM" on a shop day → instant, or null if either is invalid. */
export function shopClock(day, hhmm) {
  const c = parseDay(day);
  const m = typeof hhmm === "string" && hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!c || !m || +m[1] > 23 || +m[2] > 59) return null;
  return wall(c.y, c.mo, c.d, +m[1], +m[2]);
}

/** Instant → "HH:MM" on the shop clock ("" for none). */
export function shopClockOf(date) {
  if (!date) return "";
  const p = shopParts(new Date(date));
  return `${p.hour}:${p.minute}`;
}

/** Instant → its shop day "YYYY-MM-DD". */
export function shopDayKey(date) {
  const p = shopParts(new Date(date));
  return `${p.year}-${p.month}-${p.day}`;
}

export function shopToday(now = new Date()) {
  return shopDayKey(now);
}

/** First and last instant of a shop day, or null for a bad day. */
export function shopDayBounds(day) {
  const c = parseDay(day);
  if (!c) return null;
  return { start: wall(c.y, c.mo, c.d), end: wall(c.y, c.mo, c.d, 23, 59, 59, 999) };
}

/** First and last instant of a shop month (month 1–12). */
export function shopMonthBounds(year, month) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: wall(year, month, 1), end: wall(year, month, last, 23, 59, 59, 999) };
}

/** Days from `from` to `to` inclusive (0 when `to` is before `from` or either is invalid). */
export function shopDaysBetween(from, to) {
  const a = parseDay(from);
  const b = parseDay(to);
  if (!a || !b) return 0;
  const n = (Date.UTC(b.y, b.mo - 1, b.d) - Date.UTC(a.y, a.mo - 1, a.d)) / 86400000 + 1;
  return n > 0 ? n : 0;
}

/** Shop day `n` days after `day`. */
export function shopAddDays(day, n) {
  const c = parseDay(day);
  if (!c) return null;
  return new Date(Date.UTC(c.y, c.mo - 1, c.d + n)).toISOString().slice(0, 10);
}

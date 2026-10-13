// Pure helpers for the admin dashboard: date ranges, period change, sales totals, chart buckets.

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// "YYYY-MM-DD" → local midnight, or null when it isn't a real date.
function parseDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function rangeBounds(range, from, to, now = new Date()) {
  let start;
  let end = now;
  if (range === "today") {
    start = startOfDay(now);
  } else if (range === "week") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  } else if (range === "custom" && parseDay(from) && parseDay(to)) {
    start = parseDay(from);
    const last = parseDay(to);
    end = new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59, 59, 999);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const span = end.getTime() - start.getTime();
  return { start, end, prevStart: new Date(start.getTime() - span), prevEnd: start };
}

// Percent change against the previous period; null when there is nothing to compare with.
export function pctChange(current, prev) {
  if (!prev) return null;
  return Number((((current - prev) / prev) * 100).toFixed(1));
}

// rows: [{ source: "STORE" | "POS", total, count }]
export function summarizeSales(rows) {
  let store = 0;
  let pos = 0;
  let orders = 0;
  for (const r of rows) {
    if (r.source === "POS") pos += Number(r.total) || 0;
    else store += Number(r.total) || 0;
    orders += Number(r.count) || 0;
  }
  const revenue = store + pos;
  return { revenue, store, pos, orders, average: orders ? revenue / orders : 0 };
}

function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Monday of the week holding d (matches Postgres date_trunc('week')).
function weekStart(d) {
  const s = startOfDay(d);
  return new Date(s.getTime() - ((s.getDay() + 6) % 7) * DAY);
}

// rows: [{ bucket: Date (month or Monday-week start), source, total }] → 12 buckets, oldest first.
export function buildChart(rows, view, now = new Date()) {
  const starts = [];
  for (let i = 11; i >= 0; i--) {
    if (view === "weekly") {
      const w = weekStart(now);
      starts.push(new Date(w.getFullYear(), w.getMonth(), w.getDate() - i * 7));
    } else {
      starts.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }
  }
  const byKey = new Map(starts.map((start) => [dayKey(start), { start, store: 0, pos: 0, total: 0 }]));
  for (const r of rows) {
    const b = byKey.get(dayKey(r.bucket));
    if (!b) continue;
    const v = Number(r.total) || 0;
    if (r.source === "POS") b.pos += v;
    else b.store += v;
    b.total += v;
  }
  return [...byKey.values()];
}

# P0.1 Local Dev Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One command (`npm run setup:local`) gives a working local store + ERP on a local Postgres with realistic seed data, and the seed can never run against a non-local database.

**Architecture:** A shell script manages a user-owned Postgres cluster in `.dev/pg` (no Docker, no sudo; TCP only on port 55432). The seed is split from one 329-line file into focused modules under `prisma/seed/`, wipes data with a single guarded `TRUNCATE`, and creates two-level categories, 24 products, store settings, orders in every status, and reviews. CI seeds a fresh database on every PR so the seed cannot rot.

**Tech Stack:** Next.js 16, Prisma 7 (`@prisma/adapter-pg`), PostgreSQL 16–18 system binaries, Vitest 4, POSIX sh, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-03-app-rebuild-roadmap-design.md` (part P0.1; Data safety rules 1 and 4)

## Global Constraints

- Never connect to or write the production database. The seed must refuse any host other than `localhost`, `127.0.0.1`, `::1`, or a host listed in `SEED_ALLOWED_HOSTS`.
- Seed refuses when `NODE_ENV=production` or `VERCEL` is set, regardless of host.
- Local DB: port `55432`, user `postgres`, trust auth, databases `store_dev` (app) and `store_test` (tests), data dir `.dev/pg` (gitignored).
- Currency is SDG; shipping zone `governorates` must use names from `SUDAN_CITIES` in `src/lib/constants.js` (checkout matches on them).
- Payment method codes are `CASH_ON_DELIVERY` and `BANK_TRANSFER` (`src/lib/schemas/checkout.js`).
- Store names: `nameAr: "أعمال عصام الدين نصر للأدوات الكهربائية"`, `nameEn: "Essam El-Din Nasr Electrical Tools"` (same as `src/lib/settings.js` default).
- E2E credentials from `tests/e2e/global-setup.ts` must exist after seeding: `admin@test.local / Admin123!`, `customer@test.local / Customer123!`.
- Branch: `rebuild/p0-1-local-dev`. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Seed run with a production/remote `DATABASE_URL` (e.g. a Neon host) → must throw before any delete. Pinned in Task 1 tests.
- `DATABASE_URL` unset or not a valid URL → clear error, nothing deleted. Pinned in Task 1 tests.
- `npm run setup:local` run twice → second run must not overwrite `.env`, must not re-`initdb`, and the seed must succeed again. Pinned in Task 2 Step 6 and Task 3 Step 8.
- Postgres binaries missing or port 55432 taken → script exits non-zero with a readable message. Pinned in Task 2 Step 5.
- Seed data that breaks app assumptions (product in a top-level category, empty subcategory, duplicate SKU, zone governorate not in `SUDAN_CITIES`) → data test fails. Pinned in Task 3 Step 1.

## File Structure

| File | Responsibility |
|---|---|
| `prisma/seed/guard.js` (new) | `assertSafeSeedTarget()` — decide if the seed may touch this database |
| `prisma/seed/reset.js` (new) | `truncateAll(prisma)` — wipe every app table |
| `prisma/seed/users.js` (new) | staff, customers, e2e accounts, role permissions |
| `prisma/seed/store.js` (new) | store settings, shipping zones, payment methods, notification config |
| `prisma/seed/catalog-data.js` (new) | pure data: categories, subcategories, products |
| `prisma/seed/catalog.js` (new) | suppliers + writes catalog data to DB |
| `prisma/seed/orders.js` (new) | orders in every status + reviews |
| `prisma/seed/content.js` (new) | moved as-is from seed.js: transactions, coupon, banners, offer, FAQ, about features, legal pages |
| `prisma/seed.js` (rewrite) | entry: connect, guard, truncate, call modules in order, print logins |
| `scripts/dev-db.sh` (new) | start/stop/status/reset the local cluster |
| `scripts/setup-local.sh` (new) | one-command setup |
| `.env.example` (new) | documented env vars for local dev |
| `.gitignore`, `package.json`, `.github/workflows/ci.yml`, `README.md`, `docs/development.md` (new), `docs/rebuild/PROGRESS.md` | wiring + docs |
| `tests/unit/seed/guard.test.ts`, `tests/unit/seed/catalog-data.test.ts` (new) | tests |

---

### Task 1: Seed safety guard

**Files:**
- Create: `prisma/seed/guard.js`
- Test: `tests/unit/seed/guard.test.ts`

**Interfaces:**
- Produces: `assertSafeSeedTarget({ databaseUrl, env }): { host: string, database: string }` — throws `Error` whose message starts with `Refusing to seed:` when unsafe.

- [ ] **Step 1: Create branch**

```bash
# Branch from the roadmap branch so the spec and this plan ship with P0.1
git checkout rebuild/roadmap && git checkout -b rebuild/p0-1-local-dev
```

- [ ] **Step 2: Write the failing test**

`tests/unit/seed/guard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { assertSafeSeedTarget } from "../../../prisma/seed/guard.js";

const local = "postgresql://postgres@localhost:55432/store_dev?schema=public";

describe("assertSafeSeedTarget", () => {
  it("allows localhost, 127.0.0.1 and ::1", () => {
    expect(assertSafeSeedTarget({ databaseUrl: local, env: {} })).toEqual({ host: "localhost", database: "store_dev" });
    expect(assertSafeSeedTarget({ databaseUrl: "postgresql://u:p@127.0.0.1:5432/x", env: {} }).host).toBe("127.0.0.1");
    expect(assertSafeSeedTarget({ databaseUrl: "postgresql://u:p@[::1]:5432/x", env: {} }).host).toBe("::1");
  });

  it("refuses a remote host such as a Neon production database", () => {
    expect(() =>
      assertSafeSeedTarget({
        databaseUrl: "postgresql://user:secret@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=require",
        env: {},
      })
    ).toThrow(/^Refusing to seed: host "ep-cool-name-123\.us-east-2\.aws\.neon\.tech" is not local/);
  });

  it("does not leak the password in the error message", () => {
    try {
      assertSafeSeedTarget({ databaseUrl: "postgresql://user:secret@db.example.com/prod", env: {} });
      throw new Error("expected throw");
    } catch (e) {
      expect((e as Error).message).not.toContain("secret");
    }
  });

  it("allows a remote host only when listed in SEED_ALLOWED_HOSTS", () => {
    const url = "postgresql://u:p@db.staging.internal:5432/x";
    expect(() => assertSafeSeedTarget({ databaseUrl: url, env: {} })).toThrow(/not local/);
    expect(assertSafeSeedTarget({ databaseUrl: url, env: { SEED_ALLOWED_HOSTS: "other, db.staging.internal" } }).host).toBe(
      "db.staging.internal"
    );
  });

  it("refuses in production or on Vercel even for localhost", () => {
    expect(() => assertSafeSeedTarget({ databaseUrl: local, env: { NODE_ENV: "production" } })).toThrow(/NODE_ENV=production/);
    expect(() => assertSafeSeedTarget({ databaseUrl: local, env: { VERCEL: "1" } })).toThrow(/Vercel/);
  });

  it("refuses a missing or malformed DATABASE_URL", () => {
    expect(() => assertSafeSeedTarget({ databaseUrl: undefined, env: {} })).toThrow(/DATABASE_URL is not set/);
    expect(() => assertSafeSeedTarget({ databaseUrl: "not a url", env: {} })).toThrow(/not a valid URL/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/unit/seed/guard.test.ts`
Expected: FAIL — `Failed to resolve import "../../../prisma/seed/guard.js"`

- [ ] **Step 4: Write implementation**

`prisma/seed/guard.js`:

```js
// The seed wipes every table. This guard makes sure it can only ever run
// against a local database, never production.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function refuse(reason) {
  throw new Error(`Refusing to seed: ${reason}`);
}

export function assertSafeSeedTarget({ databaseUrl, env }) {
  if (env.NODE_ENV === "production") refuse("NODE_ENV=production.");
  if (env.VERCEL) refuse("running on Vercel.");
  if (!databaseUrl) refuse("DATABASE_URL is not set.");

  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    refuse("DATABASE_URL is not a valid URL.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const allowed = new Set([
    ...LOCAL_HOSTS,
    ...String(env.SEED_ALLOWED_HOSTS || "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean),
  ]);
  if (!allowed.has(host)) {
    refuse(`host "${host}" is not local. Add it to SEED_ALLOWED_HOSTS only if it is a disposable database.`);
  }

  return { host, database: url.pathname.replace(/^\//, "") };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/seed/guard.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 6: Commit**

```bash
git add prisma/seed/guard.js tests/unit/seed/guard.test.ts
git commit -m "feat(seed): add guard that refuses to seed non-local databases

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Local Postgres + one-command setup

**Files:**
- Create: `scripts/dev-db.sh`, `scripts/setup-local.sh`, `.env.example`
- Modify: `.gitignore`, `package.json` (scripts)

**Interfaces:**
- Produces: `npm run db:local -- <start|stop|status|reset>`, `npm run setup:local`; local URLs `postgresql://postgres@localhost:55432/store_dev?schema=public` and `.../store_test?schema=public`.

- [ ] **Step 1: Write `scripts/dev-db.sh`**

```sh
#!/usr/bin/env sh
# Local Postgres for development: a user-owned cluster in .dev/pg, TCP only.
# Usage: sh scripts/dev-db.sh start|stop|status|reset
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DATA="$ROOT/.dev/pg"
LOG="$ROOT/.dev/pg.log"
PORT="${DEV_DB_PORT:-55432}"
DBS="store_dev store_test"

find_bin() {
  if [ -n "${PG_BIN:-}" ]; then echo "$PG_BIN"; return; fi
  latest=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -t/ -k5 -n | tail -1 || true)
  if [ -n "$latest" ]; then echo "$latest"; return; fi
  if command -v pg_ctl >/dev/null 2>&1; then dirname "$(command -v pg_ctl)"; fi
}

BIN=$(find_bin)
if [ -z "$BIN" ] || [ ! -x "$BIN/pg_ctl" ] || [ ! -x "$BIN/initdb" ]; then
  echo "dev-db: PostgreSQL server binaries not found. Install them (e.g. 'sudo apt install postgresql') or set PG_BIN." >&2
  exit 1
fi
psql_q() { "$BIN/psql" -h localhost -p "$PORT" -U postgres -d postgres -tAc "$1"; }

is_running() { "$BIN/pg_ctl" -D "$DATA" status >/dev/null 2>&1; }

start() {
  mkdir -p "$ROOT/.dev"
  if [ ! -f "$DATA/PG_VERSION" ]; then
    "$BIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
    echo "dev-db: initialised cluster in .dev/pg"
  fi
  if is_running; then
    echo "dev-db: already running on port $PORT"
  else
    if "$BIN/pg_isready" -h localhost -p "$PORT" >/dev/null 2>&1; then
      echo "dev-db: port $PORT is used by another server. Stop it or set DEV_DB_PORT." >&2
      exit 1
    fi
    "$BIN/pg_ctl" -D "$DATA" -l "$LOG" -w -o "-p $PORT -k '' -c listen_addresses=localhost" start >/dev/null
    echo "dev-db: started on port $PORT"
  fi
  for db in $DBS; do
    if [ "$(psql_q "select 1 from pg_database where datname='$db'")" != "1" ]; then
      psql_q "create database $db" >/dev/null
      echo "dev-db: created database $db"
    fi
  done
}

stop() {
  if is_running; then "$BIN/pg_ctl" -D "$DATA" -m fast stop >/dev/null; echo "dev-db: stopped"; else echo "dev-db: not running"; fi
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  status) if is_running; then echo "dev-db: running on port $PORT"; else echo "dev-db: not running"; exit 1; fi ;;
  reset) stop; rm -rf "$DATA"; start ;;
  *) echo "usage: sh scripts/dev-db.sh start|stop|status|reset" >&2; exit 2 ;;
esac
```

- [ ] **Step 2: Write `.env.example`**

```dotenv
# Local development. Copy to .env (npm run setup:local does this for you).
# Never put production credentials in .env on a development machine.

# Database (local cluster from `npm run db:local -- start`)
DATABASE_URL="postgresql://postgres@localhost:55432/store_dev?schema=public"
DATABASE_TEST_URL="postgresql://postgres@localhost:55432/store_test?schema=public"

# Auth.js — setup:local replaces this with a random secret
AUTH_SECRET="replace-with-random-secret"
AUTH_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_URL="http://localhost:3000"

# Optional integrations (leave empty locally unless testing them)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
SMTP_HOST=""
SMTP_PORT=""
SMTP_SECURE=""
SMTP_USER=""
SMTP_APP_PASSWORD=""
```

- [ ] **Step 3: Write `scripts/setup-local.sh`**

```sh
#!/usr/bin/env sh
# One-command local setup: database, .env, migrations, seed.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

sh scripts/dev-db.sh start

if [ -f .env ]; then
  echo "setup: keeping existing .env"
else
  secret=$(node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))")
  sed "s|replace-with-random-secret|$secret|" .env.example > .env
  echo "setup: created .env from .env.example"
fi

npx prisma migrate deploy
npx prisma db seed
echo "setup: done. Run 'npm run dev' and open http://localhost:3000"
```

- [ ] **Step 4: Wire `.gitignore` and `package.json`**

Append to `.gitignore`:

```gitignore
!.env.example
.dev/
```

In `package.json` `"scripts"`, after `"db:migrate"`, add:

```json
    "db:local": "sh scripts/dev-db.sh",
    "setup:local": "sh scripts/setup-local.sh",
```

- [ ] **Step 5: Verify the failure paths**

Run: `PG_BIN=/nonexistent sh scripts/dev-db.sh start; echo "exit=$?"`
Expected: `dev-db: PostgreSQL server binaries not found. ...` and `exit=1`.

Run: `sh scripts/dev-db.sh bogus; echo "exit=$?"`
Expected: `usage: sh scripts/dev-db.sh start|stop|status|reset` and `exit=2`.

- [ ] **Step 6: Verify the happy path and idempotency**

Run: `sh scripts/dev-db.sh start && sh scripts/dev-db.sh start && sh scripts/dev-db.sh status`
Expected: first run prints `initialised cluster`, `started on port 55432`, `created database store_dev`, `created database store_test`; second run prints `already running on port 55432` only; status prints `running on port 55432`.

Run: `git status --short` — Expected: `.dev/` does not appear; `.env.example` appears.

(Do not run `setup:local` yet — the seed is rewritten in Task 3.)

- [ ] **Step 7: Commit**

```bash
git add scripts/dev-db.sh scripts/setup-local.sh .env.example .gitignore package.json
git commit -m "feat(dev): add local Postgres script and one-command setup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Modular, realistic, guarded seed

**Files:**
- Create: `prisma/seed/reset.js`, `prisma/seed/users.js`, `prisma/seed/store.js`, `prisma/seed/catalog-data.js`, `prisma/seed/catalog.js`, `prisma/seed/orders.js`, `prisma/seed/content.js`
- Rewrite: `prisma/seed.js`
- Test: `tests/unit/seed/catalog-data.test.ts`

**Interfaces:**
- Consumes: `assertSafeSeedTarget` (Task 1); local DB (Task 2).
- Produces:
  - `catalog-data.js`: `PARENT_CATEGORIES: {name, nameAr, description, image}[]`, `SUB_CATEGORIES: {name, nameAr, parent}[]`, `PRODUCTS: {sku, category, nameEn, nameAr, descriptionEn, descriptionAr, unit, purchasePrice, sellingPrice, stock, minStock, origin, countryOfOrigin, specs}[]`, `SHIPPING_ZONES: {zoneName, governorates, shippingCost, deliveryDaysEstimate}[]`
  - `truncateAll(prisma): Promise<void>`
  - `seedUsers(prisma): Promise<{ admin, customer }>`
  - `seedStore(prisma): Promise<void>`
  - `seedCatalog(prisma): Promise<Product[]>`
  - `seedOrders(prisma, { customer, products }): Promise<void>`
  - `seedContent(prisma): Promise<void>`

- [ ] **Step 1: Write the failing data test**

`tests/unit/seed/catalog-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PARENT_CATEGORIES, SUB_CATEGORIES, PRODUCTS, SHIPPING_ZONES } from "../../../prisma/seed/catalog-data.js";
import { SUDAN_CITIES } from "@/lib/constants";

const ARABIC = /[؀-ۿ]/;

describe("seed catalog data", () => {
  it("has unique category names and every subcategory points at a real parent", () => {
    const names = [...PARENT_CATEGORIES, ...SUB_CATEGORIES].map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    const parents = new Set(PARENT_CATEGORIES.map((c) => c.name));
    for (const sub of SUB_CATEGORIES) expect(parents.has(sub.parent), sub.name).toBe(true);
  });

  it("puts every product in a subcategory and leaves no subcategory empty", () => {
    const subs = new Set(SUB_CATEGORIES.map((c) => c.name));
    for (const p of PRODUCTS) expect(subs.has(p.category), `${p.sku} -> ${p.category}`).toBe(true);
    const used = new Set(PRODUCTS.map((p) => p.category));
    for (const s of subs) expect(used.has(s), `empty subcategory ${s}`).toBe(true);
  });

  it("has unique SKUs and sane prices and stock", () => {
    const skus = PRODUCTS.map((p) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
    for (const p of PRODUCTS) {
      expect(p.sellingPrice, p.sku).toBeGreaterThan(p.purchasePrice);
      expect(p.purchasePrice, p.sku).toBeGreaterThan(0);
      expect(p.stock, p.sku).toBeGreaterThanOrEqual(p.minStock);
    }
  });

  it("has complete Arabic and English text", () => {
    for (const c of [...PARENT_CATEGORIES, ...SUB_CATEGORIES]) expect(c.nameAr, c.name).toMatch(ARABIC);
    for (const p of PRODUCTS) {
      expect(p.nameAr, p.sku).toMatch(ARABIC);
      expect(p.descriptionAr, p.sku).toMatch(ARABIC);
      expect(p.nameEn.length, p.sku).toBeGreaterThan(3);
      expect(p.descriptionEn.length, p.sku).toBeGreaterThan(20);
    }
  });

  it("only uses governorates that checkout knows about", () => {
    const known = new Set(SUDAN_CITIES.map((c) => c.name));
    for (const z of SHIPPING_ZONES) for (const g of z.governorates) expect(known.has(g), `${z.zoneName}: ${g}`).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/seed/catalog-data.test.ts`
Expected: FAIL — `Failed to resolve import "../../../prisma/seed/catalog-data.js"`

- [ ] **Step 3: Write `prisma/seed/catalog-data.js`**

```js
// Development catalog. Placeholder taxonomy until P1.1 designs the real one
// from the store's actual products. Prices in SDG.

const IMG = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const PARENT_CATEGORIES = [
  { name: "Lighting", nameAr: "الإنارة", description: "LED bulbs, panels and floodlights", image: IMG("photo-1517999349371-c43520457b23") },
  { name: "Cables & Wires", nameAr: "الكابلات والأسلاك", description: "Power, network and coaxial cables", image: IMG("photo-1544724569-5f546fd6f2b5") },
  { name: "Switches & Sockets", nameAr: "المفاتيح والمقابس", description: "Wall switches, sockets and extension leads", image: IMG("photo-1621905251918-48416bd8575a") },
  { name: "Distribution & Protection", nameAr: "التوزيع والحماية", description: "Breakers, RCDs and distribution boards", image: IMG("photo-1581092921461-39b9d08a9b2b") },
  { name: "Power Systems", nameAr: "أنظمة الطاقة", description: "Solar, inverters and UPS", image: IMG("photo-1509391366360-2e959784a276") },
  { name: "Tools & Testers", nameAr: "العدد وأجهزة القياس", description: "Meters, testers and electrician hand tools", image: IMG("photo-1558618666-fcd25c85cd64") },
];

export const SUB_CATEGORIES = [
  { name: "LED Bulbs", nameAr: "لمبات LED", parent: "Lighting" },
  { name: "Panels & Floodlights", nameAr: "بانلات وكشافات", parent: "Lighting" },
  { name: "Power Cables", nameAr: "كابلات الكهرباء", parent: "Cables & Wires" },
  { name: "Network & Coaxial Cables", nameAr: "كابلات الشبكات والكواكسيال", parent: "Cables & Wires" },
  { name: "Wall Switches", nameAr: "مفاتيح الحائط", parent: "Switches & Sockets" },
  { name: "Sockets & Extensions", nameAr: "المقابس والتوصيلات", parent: "Switches & Sockets" },
  { name: "Circuit Breakers", nameAr: "القواطع", parent: "Distribution & Protection" },
  { name: "Distribution Boards", nameAr: "لوحات التوزيع", parent: "Distribution & Protection" },
  { name: "Solar Energy", nameAr: "الطاقة الشمسية", parent: "Power Systems" },
  { name: "Inverters & UPS", nameAr: "الانفرترات وأجهزة UPS", parent: "Power Systems" },
  { name: "Meters & Testers", nameAr: "أجهزة القياس والفحص", parent: "Tools & Testers" },
  { name: "Hand Tools", nameAr: "العدد اليدوية", parent: "Tools & Testers" },
];

const P = (sku, category, nameEn, nameAr, descriptionEn, descriptionAr, unit, purchasePrice, sellingPrice, stock, minStock, origin, countryOfOrigin, specs) => ({
  sku, category, nameEn, nameAr, descriptionEn, descriptionAr, unit, purchasePrice, sellingPrice, stock, minStock, origin, countryOfOrigin, specs,
});

export const PRODUCTS = [
  P("LED-BLB-12W", "LED Bulbs", "LED Bulb 12W E27 Daylight", "لمبة LED ‏12 واط E27 ضوء نهاري",
    "Energy-saving 12W LED bulb with a standard E27 base and bright 6500K daylight output.",
    "لمبة LED موفرة للطاقة بقدرة 12 واط وقاعدة E27 القياسية، بإضاءة نهارية ساطعة 6500 كلفن.",
    "pcs", 2200, 3500, 300, 40, "IMPORTED", "China", { Power: "12 W", Base: "E27", "Color temperature": "6500 K", Lifetime: "15,000 h" }),
  P("LED-BLB-SMART9", "LED Bulbs", "Smart LED Bulb 9W RGB Wi-Fi", "لمبة LED ذكية ‏9 واط RGB واي فاي",
    "Wi-Fi smart bulb with 16 million colours, dimming and schedules from a phone app.",
    "لمبة ذكية تعمل بالواي فاي بـ16 مليون لون، مع تعتيم وجدولة من تطبيق الهاتف.",
    "pcs", 4800, 7500, 80, 10, "IMPORTED", "China", { Power: "9 W", Base: "E27", Control: "Wi-Fi app" }),
  P("LED-PNL-6060", "Panels & Floodlights", "LED Panel 60×60 cm 48W", "بانل LED ‏60×60 سم 48 واط",
    "Slim recessed LED panel for false ceilings, 48W with even, glare-free light.",
    "بانل LED نحيف للأسقف المستعارة بقدرة 48 واط وإضاءة متجانسة بدون زغللة.",
    "pcs", 9000, 14500, 60, 10, "IMPORTED", "China", { Power: "48 W", Size: "60 × 60 cm", "Color temperature": "4000 K" }),
  P("LED-FLD-100W", "Panels & Floodlights", "LED Floodlight 100W IP65", "كشاف LED ‏100 واط IP65",
    "Outdoor 100W floodlight with an IP65 weatherproof aluminium body for yards and facades.",
    "كشاف خارجي 100 واط بهيكل ألمنيوم مقاوم للماء والغبار IP65 للأحواش والواجهات.",
    "pcs", 14000, 22000, 25, 5, "IMPORTED", "China", { Power: "100 W", Protection: "IP65", Lumens: "9,000 lm" }),
  P("CBL-CU-2.5-100", "Power Cables", "Copper Wire 2.5 mm² — 100 m Roll", "سلك نحاس 2.5 مم² — لفة 100 م",
    "Single-core PVC-insulated copper wire for sockets and general house wiring.",
    "سلك نحاس أحادي القلب معزول PVC لتوصيلات المقابس والتمديدات المنزلية العامة.",
    "roll", 38000, 52000, 40, 8, "LOCAL", "Sudan", { Conductor: "Copper", "Cross-section": "2.5 mm²", Length: "100 m" }),
  P("CBL-CU-3X4-50", "Power Cables", "Power Cable 3×4 mm² — 50 m Roll", "كابل كهرباء 3×4 مم² — لفة 50 م",
    "Three-core sheathed copper cable for air conditioners, pumps and sub-panels.",
    "كابل نحاس ثلاثي القلب مغلف للمكيفات والطلمبات واللوحات الفرعية.",
    "roll", 65000, 89000, 15, 3, "IMPORTED", "Egypt", { Cores: "3", "Cross-section": "4 mm²", Length: "50 m" }),
  P("CBL-CAT6-305", "Network & Coaxial Cables", "Cat6 UTP Network Cable — 305 m Box", "كابل شبكة Cat6 UTP — كرتونة 305 م",
    "Cat6 UTP cable for gigabit networks, solid copper conductors in a pull-box.",
    "كابل Cat6 UTP لشبكات الجيجابت بموصلات نحاس مصمتة في كرتونة سهلة السحب.",
    "box", 42000, 60000, 20, 4, "IMPORTED", "China", { Category: "Cat6", Shielding: "UTP", Length: "305 m" }),
  P("CBL-RG6-100", "Network & Coaxial Cables", "RG6 Coaxial Cable — 100 m Roll", "كابل كواكسيال RG6 — لفة 100 م",
    "RG6 coaxial cable for satellite dishes and CCTV with low signal loss.",
    "كابل كواكسيال RG6 للأطباق الفضائية وكاميرات المراقبة بفقد إشارة منخفض.",
    "roll", 18000, 27000, 25, 5, "IMPORTED", "China", { Type: "RG6", Impedance: "75 Ω", Length: "100 m" }),
  P("SW-1G-1W", "Wall Switches", "1-Gang 1-Way Wall Switch", "مفتاح حائط مفرد اتجاه واحد",
    "Classic white 1-gang switch rated 10A with a smooth, durable rocker.",
    "مفتاح حائط مفرد أبيض كلاسيكي بقدرة 10 أمبير ومفتاح ناعم ومتين.",
    "pcs", 900, 1500, 400, 50, "IMPORTED", "Turkey", { Rating: "10 A", Gangs: "1", Colour: "White" }),
  P("SW-TOUCH-3G", "Wall Switches", "Smart Touch Switch 3-Gang Wi-Fi", "مفتاح لمس ذكي 3 خطوط واي فاي",
    "Tempered-glass touch switch with three gangs, app control and timers.",
    "مفتاح لمس بزجاج مقوى بثلاثة خطوط مع تحكم من التطبيق ومؤقتات.",
    "pcs", 7500, 12000, 40, 8, "IMPORTED", "China", { Gangs: "3", Control: "Touch + Wi-Fi app", Panel: "Tempered glass" }),
  P("SK-13A-TWIN", "Sockets & Extensions", "13A Twin Wall Socket (UK Type)", "مقبس حائط مزدوج 13 أمبير (نوع بريطاني)",
    "Switched twin socket, UK three-pin type, rated 13A.",
    "مقبس مزدوج بمفاتيح، نوع بريطاني بثلاثة أطراف، بقدرة 13 أمبير.",
    "pcs", 1400, 2300, 300, 40, "IMPORTED", "Turkey", { Rating: "13 A", Type: "UK 3-pin", Outlets: "2" }),
  P("EXT-4W-3M", "Sockets & Extensions", "4-Way Extension Lead 3 m with Surge Protection", "توصيلة 4 مخارج 3 م مع حماية من الارتفاع المفاجئ",
    "Four-outlet extension lead with surge protection and an illuminated master switch.",
    "توصيلة بأربعة مخارج مع حماية من ارتفاع الجهد ومفتاح رئيسي مضيء.",
    "pcs", 4200, 6800, 70, 10, "IMPORTED", "China", { Outlets: "4", Length: "3 m", Protection: "Surge" }),
  P("CB-MCB-32A", "Circuit Breakers", "MCB Circuit Breaker 32A 1-Pole", "قاطع MCB ‏32 أمبير قطب واحد",
    "Miniature circuit breaker, C-curve, for protecting lighting and socket circuits.",
    "قاطع دائرة مصغر منحنى C لحماية دوائر الإنارة والمقابس.",
    "pcs", 1800, 2900, 200, 30, "IMPORTED", "China", { Rating: "32 A", Poles: "1", Curve: "C", "Breaking capacity": "6 kA" }),
  P("CB-RCD-40A", "Circuit Breakers", "RCD Earth Leakage Breaker 40A 30mA", "قاطع تسرب أرضي RCD ‏40 أمبير 30 مللي",
    "Residual-current device that cuts power on earth leakage to protect people from shock.",
    "جهاز تيار متبقٍ يفصل الكهرباء عند التسرب الأرضي لحماية الأشخاص من الصعق.",
    "pcs", 7000, 11000, 35, 6, "IMPORTED", "China", { Rating: "40 A", Sensitivity: "30 mA", Poles: "2" }),
  P("DB-12W-SURF", "Distribution Boards", "Distribution Board 12-Way Surface Mount", "لوحة توزيع 12 خط تركيب خارجي",
    "Surface-mount consumer unit with DIN rail, neutral and earth bars for 12 modules.",
    "لوحة توزيع للتركيب الخارجي مع قضيب DIN وقضبان للنيوترال والأرضي لـ12 وحدة.",
    "pcs", 9500, 15000, 20, 4, "IMPORTED", "Turkey", { Ways: "12", Mounting: "Surface", Rail: "DIN 35 mm" }),
  P("DB-BUSBAR-1P12", "Distribution Boards", "Pin-Type Busbar 1-Pole 12-Way", "قضيب توصيل (باسبار) قطب واحد 12 خط",
    "Copper pin busbar for fast, tidy linking of single-pole breakers.",
    "باسبار نحاسي بأطراف دبوسية لتوصيل القواطع أحادية القطب بسرعة وترتيب.",
    "pcs", 1500, 2500, 60, 10, "IMPORTED", "China", { Poles: "1", Ways: "12", Material: "Copper" }),
  P("SOL-PNL-550W", "Solar Energy", "Monocrystalline Solar Panel 550W", "لوح طاقة شمسية أحادي البلورة 550 واط",
    "High-efficiency 550W mono PERC panel for home and farm solar systems.",
    "لوح أحادي البلورة PERC عالي الكفاءة بقدرة 550 واط لأنظمة المنازل والمزارع.",
    "pcs", 95000, 135000, 18, 4, "IMPORTED", "China", { Power: "550 W", Type: "Mono PERC", Efficiency: "21%" }),
  P("SOL-MPPT-60A", "Solar Energy", "MPPT Solar Charge Controller 60A", "منظم شحن شمسي MPPT ‏60 أمبير",
    "MPPT charge controller for 12/24/48V battery banks with an LCD display.",
    "منظم شحن MPPT لبطاريات 12/24/48 فولت مع شاشة LCD.",
    "pcs", 48000, 72000, 12, 3, "IMPORTED", "China", { Current: "60 A", "Battery voltage": "12/24/48 V", Display: "LCD" }),
  P("INV-PSW-3KW", "Inverters & UPS", "Pure Sine Wave Inverter 3 kW 24 V", "انفرتر موجة جيبية نقية 3 كيلوواط 24 فولت",
    "3 kW pure sine wave inverter that safely runs fridges, pumps and electronics.",
    "انفرتر موجة جيبية نقية 3 كيلوواط يشغّل الثلاجات والطلمبات والأجهزة الإلكترونية بأمان.",
    "pcs", 180000, 255000, 8, 2, "IMPORTED", "China", { Power: "3 kW", Input: "24 V DC", Waveform: "Pure sine" }),
  P("UPS-1KVA-LI", "Inverters & UPS", "Line-Interactive UPS 1 kVA", "جهاز UPS ‏1 كيلو فولت أمبير",
    "1 kVA UPS with automatic voltage regulation to keep computers running through outages.",
    "جهاز UPS بقدرة 1 كيلو فولت أمبير مع منظم جهد تلقائي لإبقاء الحواسيب تعمل أثناء الانقطاع.",
    "pcs", 52000, 76000, 14, 3, "IMPORTED", "China", { Capacity: "1 kVA", Topology: "Line-interactive", Outlets: "4" }),
  P("TL-MM-AUTO", "Meters & Testers", "Digital Multimeter Auto-Range", "ملتيميتر رقمي تلقائي المدى",
    "Auto-ranging multimeter for voltage, current, resistance and continuity.",
    "ملتيميتر تلقائي المدى لقياس الجهد والتيار والمقاومة والاستمرارية.",
    "pcs", 9000, 14500, 30, 5, "IMPORTED", "China", { Functions: "V, A, Ω, continuity", Safety: "CAT III 600 V" }),
  P("TL-VT-PEN", "Meters & Testers", "Non-Contact Voltage Tester Pen", "قلم فحص الجهد بدون تلامس",
    "Pocket tester that beeps and lights near live wires, 12–1000V AC.",
    "قلم فحص جيبي يصدر صوتًا وضوءًا قرب الأسلاك الحية، من 12 إلى 1000 فولت.",
    "pcs", 2500, 4200, 90, 15, "IMPORTED", "China", { Range: "12–1000 V AC", Alert: "Sound + light" }),
  P("TL-PLR-SET3", "Hand Tools", "Insulated Pliers Set 3 pcs (1000 V)", "طقم زراديات معزولة 3 قطع (1000 فولت)",
    "Combination, long-nose and cutting pliers insulated to 1000V for live work.",
    "زرادية مشتركة وزرادية بوز طويل وقصافة، معزولة حتى 1000 فولت للعمل الآمن.",
    "set", 8500, 13500, 25, 5, "IMPORTED", "China", { Pieces: "3", Insulation: "1000 V VDE" }),
  P("TL-CRIMP-120", "Hand Tools", "Cable Lug Crimping Tool 10–120 mm²", "مكبس كوس كابلات 10–120 مم²",
    "Hexagonal crimping tool for copper lugs from 10 to 120 mm².",
    "مكبس سداسي لتركيب الكوس النحاسية من 10 إلى 120 مم².",
    "pcs", 15000, 23000, 10, 2, "IMPORTED", "China", { Range: "10–120 mm²", Die: "Hexagonal" }),
];

export const SHIPPING_ZONES = [
  {
    zoneName: "Khartoum State",
    governorates: ["Khartoum - Center", "Khartoum - East", "Khartoum - South", "Omdurman - Center", "Omdurman - North", "Bahri - Center", "Bahri - East", "Sharg Al-Neel"],
    shippingCost: 2000,
    deliveryDaysEstimate: "1-2",
  },
  { zoneName: "River Nile & Red Sea", governorates: ["Atbara", "Port Sudan"], shippingCost: 6000, deliveryDaysEstimate: "3-5" },
  { zoneName: "Gezira & Other States", governorates: ["Wad Madani", "Other States"], shippingCost: 6500, deliveryDaysEstimate: "3-7" },
];
```

- [ ] **Step 4: Run the data test**

Run: `npx vitest run tests/unit/seed/catalog-data.test.ts`
Expected: PASS, 5 tests

- [ ] **Step 5: Write the DB modules**

`prisma/seed/reset.js`:

```js
// Wipes every application table. Only call after assertSafeSeedTarget().
export async function truncateAll(prisma) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  );
  if (!rows.length) return;
  const tables = rows.map((r) => `"public"."${r.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}
```

`prisma/seed/users.js`:

```js
import bcrypt from "bcryptjs";
import { PERMISSION_MODULES, getDefaultPermissionFlags } from "../../src/lib/permission-defaults.js";

const USERS = [
  { email: "admin@powerstore.com", password: "admin123", firstName: "Ahmed", lastName: "Admin", phone: "+249900000001", role: "ADMIN", salary: 450000, hireDate: "2024-01-01", department: "Management" },
  { email: "manager@powerstore.com", password: "manager123", firstName: "Omar", lastName: "Ali", phone: "+249900000002", role: "MANAGER", salary: 300000, hireDate: "2024-03-01", department: "Operations" },
  { email: "cashier@powerstore.com", password: "cashier123", firstName: "Sara", lastName: "Hassan", phone: "+249900000003", role: "CASHIER", salary: 180000, hireDate: "2024-06-15", department: "Sales" },
  { email: "customer@example.com", password: "customer123", firstName: "Mohamed", lastName: "Khaled", phone: "+249900000004", role: "CUSTOMER" },
  // Accounts used by the Playwright suite (tests/e2e/global-setup.ts)
  { email: "admin@test.local", password: "Admin123!", firstName: "E2E", lastName: "Admin", phone: "+249900000005", role: "ADMIN" },
  { email: "customer@test.local", password: "Customer123!", firstName: "E2E", lastName: "Customer", phone: "+249900000006", role: "CUSTOMER" },
];

export async function seedUsers(prisma) {
  const created = {};
  for (const u of USERS) {
    const { password, hireDate, ...rest } = u;
    created[u.email] = await prisma.user.create({
      data: { ...rest, password: await bcrypt.hash(password, 10), hireDate: hireDate ? new Date(hireDate) : undefined },
    });
  }
  for (const role of ["ADMIN", "MANAGER", "CASHIER"]) {
    for (const mod of PERMISSION_MODULES) {
      await prisma.permission.create({ data: { role, module: mod, ...getDefaultPermissionFlags(role, mod) } });
    }
  }
  console.log(`   ✓ ${USERS.length} users, role permissions`);
  return { admin: created["admin@powerstore.com"], customer: created["customer@example.com"] };
}
```

`prisma/seed/store.js`:

```js
import { SHIPPING_ZONES } from "./catalog-data.js";

export async function seedStore(prisma) {
  await prisma.store.create({
    data: {
      nameAr: "أعمال عصام الدين نصر للأدوات الكهربائية",
      nameEn: "Essam El-Din Nasr Electrical Tools",
      contactPhone: "+249900000000",
      contactEmail: "info@example.com",
      addressAr: "الخرطوم، السوق العربي",
      addressEn: "Khartoum, Souq Al-Arabi",
      currency: "SDG",
      bankTransferBankNameEn: "Bank of Khartoum",
      bankTransferBankNameAr: "بنك الخرطوم",
      bankTransferAccountNumber: "0000000000",
      bankTransferAccountNameEn: "Essam El-Din Nasr Electrical Tools",
      bankTransferAccountNameAr: "أعمال عصام الدين نصر للأدوات الكهربائية",
      bankTransferProofWhatsapp: "+249900000000",
      shippingZones: { create: SHIPPING_ZONES },
      paymentMethods: {
        create: [
          { code: "CASH_ON_DELIVERY", labelAr: "الدفع عند الاستلام", labelEn: "Cash on Delivery", isEnabled: true },
          {
            code: "BANK_TRANSFER",
            labelAr: "تحويل بنكي",
            labelEn: "Bank Transfer",
            isEnabled: true,
            instructionsAr: "حوّل المبلغ إلى الحساب الموضح وأرسل صورة الإشعار.",
            instructionsEn: "Transfer the total to the account shown and send the receipt.",
          },
        ],
      },
      notificationConfig: { create: {} },
    },
  });
  console.log(`   ✓ store settings, ${SHIPPING_ZONES.length} shipping zones, 2 payment methods`);
}
```

`prisma/seed/catalog.js`:

```js
import { PARENT_CATEGORIES, SUB_CATEGORIES, PRODUCTS } from "./catalog-data.js";

export async function seedCatalog(prisma) {
  const local = await prisma.supplier.create({ data: { name: "Khartoum Electrical Wholesale", phone: "+249912345678" } });
  const importer = await prisma.supplier.create({ data: { name: "Red Sea Trading & Import", phone: "+249987654321" } });

  const byName = new Map();
  for (const c of PARENT_CATEGORIES) byName.set(c.name, await prisma.category.create({ data: c }));
  for (const s of SUB_CATEGORIES) {
    const parent = byName.get(s.parent);
    byName.set(s.name, await prisma.category.create({ data: { name: s.name, nameAr: s.nameAr, parentId: parent.id, image: parent.image } }));
  }

  const products = [];
  for (const [i, p] of PRODUCTS.entries()) {
    const category = byName.get(p.category);
    const parent = byName.get(SUB_CATEGORIES.find((s) => s.name === p.category).parent);
    products.push(
      await prisma.product.create({
        data: {
          sku: p.sku,
          barcode: `6290000000${String(i + 1).padStart(3, "0")}`,
          name: p.nameEn,
          nameEn: p.nameEn,
          nameAr: p.nameAr,
          description: p.descriptionEn,
          descriptionEn: p.descriptionEn,
          descriptionAr: p.descriptionAr,
          unit: p.unit,
          purchasePrice: p.purchasePrice,
          sellingPrice: p.sellingPrice,
          stock: p.stock,
          minStock: p.minStock,
          origin: p.origin,
          countryOfOrigin: p.countryOfOrigin,
          specs: p.specs,
          images: [parent.image],
          categoryId: category.id,
          supplierId: p.origin === "LOCAL" ? local.id : importer.id,
        },
      })
    );
  }
  console.log(`   ✓ 2 suppliers, ${PARENT_CATEGORIES.length} categories, ${SUB_CATEGORIES.length} subcategories, ${products.length} products`);
  return products;
}
```

`prisma/seed/orders.js`:

```js
const ORDERS = [
  { status: "DELIVERED", paymentMethod: "CASH_ON_DELIVERY", shipping: 2000, lines: [["LED-BLB-12W", 6], ["SW-1G-1W", 4]], daysAgo: 20 },
  { status: "SHIPPED", paymentMethod: "BANK_TRANSFER", shipping: 2000, lines: [["CB-MCB-32A", 8], ["DB-12W-SURF", 1]], daysAgo: 4, isVerified: true },
  { status: "PROCESSING", paymentMethod: "CASH_ON_DELIVERY", shipping: 2000, lines: [["CBL-CU-2.5-100", 2]], daysAgo: 2 },
  { status: "PENDING", paymentMethod: "CASH_ON_DELIVERY", shipping: 2000, lines: [["TL-MM-AUTO", 1], ["TL-VT-PEN", 2]], daysAgo: 0 },
  { status: "CANCELLED", paymentMethod: "CASH_ON_DELIVERY", shipping: 2000, lines: [["INV-PSW-3KW", 1]], daysAgo: 9 },
];

const daysAgo = (n) => new Date(Date.now() - n * 86400000);

export async function seedOrders(prisma, { customer, products }) {
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const build = (lines) => lines.map(([sku, quantity]) => ({ productId: bySku.get(sku).id, quantity, price: bySku.get(sku).sellingPrice }));
  const total = (items, shipping) => items.reduce((s, i) => s + Number(i.price) * i.quantity, 0) + shipping;

  for (const o of ORDERS) {
    const items = build(o.lines);
    await prisma.order.create({
      data: {
        userId: customer.id,
        status: o.status,
        paymentMethod: o.paymentMethod,
        isVerified: Boolean(o.isVerified),
        shippingCost: o.shipping,
        totalAmount: total(items, o.shipping),
        createdAt: daysAgo(o.daysAgo),
        items: { create: items },
      },
    });
  }

  const guestItems = build([["EXT-4W-3M", 2]]);
  await prisma.order.create({
    data: {
      guestName: "Hiba Osman",
      guestEmail: "hiba@example.com",
      guestPhone: "+249911111111",
      guestCity: "Omdurman - Center",
      guestAddress: "Al-Mulazmin, street 12",
      status: "PENDING",
      paymentMethod: "BANK_TRANSFER",
      shippingCost: 2000,
      totalAmount: total(guestItems, 2000),
      items: { create: guestItems },
    },
  });

  const reviews = [
    { sku: "LED-BLB-12W", rating: 5, title: "إضاءة ممتازة", body: "اللمبات قوية والإضاءة واضحة جداً، أنصح بها.", status: "APPROVED", userId: customer.id, verified: true },
    { sku: "SW-1G-1W", rating: 4, title: "Good quality switch", body: "Solid feel and easy to install. Would buy again.", status: "APPROVED", userId: customer.id, verified: true },
    { sku: "TL-VT-PEN", rating: 5, title: "مفيد جداً", body: "قلم الفحص سريع ودقيق ويغني عن أدوات كثيرة.", status: "APPROVED", guestName: "Yasir" },
    { sku: "CB-MCB-32A", rating: 3, title: "Okay", body: "Works fine, but the packaging was damaged on arrival.", status: "PENDING", guestName: "Tariq" },
  ];
  for (const { sku, ...r } of reviews) {
    await prisma.review.create({ data: { ...r, productId: bySku.get(sku).id } });
  }
  console.log(`   ✓ ${ORDERS.length + 1} orders (every status + guest), ${reviews.length} reviews`);
}
```

`prisma/seed/content.js` — move these blocks from the current `prisma/seed.js` **verbatim** into `export async function seedContent(prisma) { ... }`, in this order, keeping their `console.log` lines:
1. The `SAVE10` coupon `prisma.coupon.create(...)`.
2. Section `// === 7. CREATE SAMPLE TRANSACTIONS (Accounting) ===` (the `txnData` array and loop).
3. Section `// === 9. CREATE BANNERS & OFFERS ===` (banners `createMany` and the offer), but change the offer's `expiresAt` to `new Date(Date.now() + 30 * 86400000)` so the offer is live in dev.
4. The `prisma.faq.createMany(...)`, `prisma.aboutFeature.createMany(...)` and `prisma.legalPage.createMany(...)` calls, **removing** their `.catch(...)` fallbacks (all tables exist after migrations; failures must surface).

Its imports at the top of the file:

```js
import { HERO_BANNER_SEED_DATA } from "../../src/lib/hero-defaults.js";
import { DEFAULT_TERMS_AR, DEFAULT_TERMS_EN, DEFAULT_PRIVACY_AR, DEFAULT_PRIVACY_EN } from "../../src/lib/legal-defaults.js";
```

- [ ] **Step 6: Rewrite `prisma/seed.js`**

```js
// Seeds a LOCAL database with realistic development data.
// Run: npx prisma db seed  (or npm run setup:local)
// Refuses to run against anything but a local database — it wipes every table.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { assertSafeSeedTarget } from "./seed/guard.js";
import { truncateAll } from "./seed/reset.js";
import { seedUsers } from "./seed/users.js";
import { seedStore } from "./seed/store.js";
import { seedCatalog } from "./seed/catalog.js";
import { seedOrders } from "./seed/orders.js";
import { seedContent } from "./seed/content.js";

const target = assertSafeSeedTarget({ databaseUrl: process.env.DATABASE_URL, env: process.env });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log(`🌱 Seeding ${target.database} on ${target.host}...`);
  await truncateAll(prisma);
  console.log("   ✓ Cleared all tables");
  const { customer } = await seedUsers(prisma);
  await seedStore(prisma);
  const products = await seedCatalog(prisma);
  await seedOrders(prisma, { customer, products });
  await seedContent(prisma);
  console.log("\n✅ Seeded. Logins:");
  console.log("   admin@powerstore.com / admin123   (ADMIN)");
  console.log("   manager@powerstore.com / manager123   (MANAGER)");
  console.log("   cashier@powerstore.com / cashier123   (CASHIER)");
  console.log("   customer@example.com / customer123   (CUSTOMER)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
```

- [ ] **Step 7: Prove the guard protects a remote URL end to end**

Run: `DATABASE_URL="postgresql://u:p@ep-x.neon.tech/db" npx prisma db seed; echo "exit=$?"`
Expected: `Error: Refusing to seed: host "ep-x.neon.tech" is not local...` and non-zero exit. No connection is attempted (the guard runs before the pool is created).

- [ ] **Step 8: Run the full setup twice**

Run: `npm run setup:local` → Expected: ends with `setup: done.` and the seed summary lines (`6 users`, `3 shipping zones`, `6 categories, 12 subcategories, 24 products`, `6 orders`, `4 reviews`).
Run: `npm run setup:local` again → Expected: `setup: keeping existing .env`, `already running`, migrations `No pending migrations`, seed succeeds with the same counts.

- [ ] **Step 9: Smoke the app on seeded data**

Run: `npm run dev`, then open `http://localhost:3000` (Arabic home), `/products`, `/login` → sign in `admin@powerstore.com / admin123` → `/admin`, `/admin/inventory`, `/admin/orders`, `/pos`.
Expected: pages render with the seeded categories/products/orders; no server errors in the dev terminal. Create `docs/rebuild/parts/P0.1.md` with a `# P0.1 Local dev environment` heading and a `## Found while smoke testing` list of every page that errored or looked broken, with the error text (write "None" if clean). These feed P0.2; do not fix them here.

- [ ] **Step 10: Run the suites**

Run: `npm run lint && npx vitest run`
Expected: lint exit 0; all test files pass (previous 57 tests + 11 new).

- [ ] **Step 11: Commit**

```bash
git add prisma/seed.js prisma/seed tests/unit/seed/catalog-data.test.ts docs/rebuild/parts/P0.1.md
git commit -m "feat(seed): modular realistic seed with subcategories, store settings and orders

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: CI seeds a fresh database; docs; progress

**Files:**
- Modify: `.github/workflows/ci.yml`, `README.md`, `docs/rebuild/PROGRESS.md`
- Create: `docs/development.md`

- [ ] **Step 1: Add the CI step**

In `.github/workflows/ci.yml`, insert after the `Prisma generate` step:

```yaml
      - name: Migrate and seed fresh database
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ci_test?schema=public
        run: |
          npx prisma migrate deploy
          npx prisma db seed
```

- [ ] **Step 2: Write `docs/development.md`**

```markdown
# Local development

## First run

Requirements: Node 20+, PostgreSQL server binaries (`sudo apt install postgresql` on Debian/Kali; no service needs to run).

    npm ci --legacy-peer-deps
    npm run setup:local
    npm run dev

`setup:local` starts a private Postgres in `.dev/pg` on port 55432, creates `.env` from `.env.example` (with a random `AUTH_SECRET`), applies migrations, and seeds demo data. Running it again is safe.

## Logins (local only)

| Role | Email | Password |
|---|---|---|
| Admin | admin@powerstore.com | admin123 |
| Manager | manager@powerstore.com | manager123 |
| Cashier | cashier@powerstore.com | cashier123 |
| Customer | customer@example.com | customer123 |

## Database commands

    npm run db:local -- start | stop | status | reset
    npx prisma db seed        # wipe and reseed (local databases only)

The seed refuses to run against any non-local host, in production, or on Vercel. To seed a disposable remote database, list its host in `SEED_ALLOWED_HOSTS`.

## Tests

    npx vitest run            # unit + integration (uses DATABASE_TEST_URL → store_test)
    npm run test:e2e          # Playwright; needs `npm run dev` running
```

- [ ] **Step 3: Point README at it**

Replace the `## Getting Started` section of `README.md` (from that heading up to, not including, `## Quality & Production Commands`) with:

```markdown
## Getting Started

See [`docs/development.md`](docs/development.md): `npm ci --legacy-peer-deps && npm run setup:local && npm run dev`.
```

- [ ] **Step 4: Update progress**

In `docs/rebuild/PROGRESS.md`: set P0.1 status to `review` with branch `rebuild/p0-1-local-dev`; set **Now** to `Current part: P0.1`, `Step: 6 — PR open, waiting for CI`, `Next: merge P0.1 → start P0.2 whole-app audit`; add a log line `2026-10-03 — P0.1 built: local DB script, guarded modular seed, CI seeds fresh DB.`

- [ ] **Step 5: Verify everything CI will run**

Run: `npm ci --legacy-peer-deps && npm run lint && npm run build && npm run test:coverage && npm run audit:deps`
Expected: every command exits 0.

- [ ] **Step 6: Commit, push, PR**

```bash
git add .github/workflows/ci.yml docs/development.md README.md docs/rebuild/PROGRESS.md
git commit -m "ci: seed a fresh database on every PR; add local development guide

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin rebuild/p0-1-local-dev
gh pr create --base main --title "P0.1: local dev environment and guarded seed" --body "Local Postgres script, one-command setup, modular seed (subcategories, store settings, orders, reviews) that refuses non-local databases, CI seeds a fresh DB. Plan: docs/superpowers/plans/2026-10-03-p0-1-local-dev-environment.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Expected: PR URL printed; then `gh pr checks --watch` → all checks pass.

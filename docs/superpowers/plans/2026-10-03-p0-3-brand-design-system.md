# P0.3 Brand Refresh + Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved Himmat brand refresh — brand tokens, a palette remap of existing classes, contrast and glow fixes, refreshed logo and lockup, typography, restyled shared components, Arabic + light defaults, the Sarmadax footer credit and a preview-only style guide — without redesigning page layouts.

**Architecture:** Brand values live in two new CSS files imported by `globals.css`: `styles/tokens.css` (raw palette + semantic light/dark tokens, shadcn names kept) and `styles/palette.css` (Tailwind v4 `@theme` overriding `amber-*`, `emerald-*`, `slate-900/950` so the ~1,350 existing classes take brand values). A tested codemod fixes amber-text contrast and removes glows. New `src/components/brand/` holds `BoltMark`, `BrandLockup`, `Price`, `DeveloperCredit`; `src/components/ui/` keeps its exports and variant names.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4 (`@theme`, `@utility`), shadcn on `@base-ui/react`, `class-variance-authority`, `next-themes`, Vitest + Testing Library (jsdom), Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-03-p0-3-brand-design-system-design.md` (read it with this plan). Brand sheet: https://claude.ai/artifact/4RHEHcqGxih3z9BDEPAUuY

## Global Constraints

- Refine, do not redesign: page layouts, spacing and navigation stay as they are (P0.4/P2.x change them).
- No AI-template tells: no gradients on brand marks, no `shadow-amber-*` glows, no emoji, no new pill buttons.
- Brand values (exact): navy-950 `#0B1422`, navy-900 `#0E1A2B`, navy-800 `#17263B`, navy-700 `#22344D`, navy-600 `#3A4D68`; amber-100 `#FDF1D8`, amber-500 `#F2A20C`, amber-600 `#D9870A`, amber-700 `#9A5B00`, amber-800 `#6E4100`; paper `#F7F6F3`, surface `#FFFFFF`, line `#E4E1DA`, line-strong `#D5D1C8`, muted-ink `#5E636B`, ink-2 `#3B4049`, ink `#121821`; success `#1F7A4D`, danger `#C2362B`, info `#2F5F98`; dark bg `#0B1422`, surface `#121E30`, line `#23324A`, muted `#9AA6B6`, ink `#EEF1F5`.
- Every semantic text/background pair ≥ 4.5:1 in light and dark (enforced by test).
- Name: wordmark **همّت / HIMMAT** (in code); shop name label from store settings (`getStoreBranding()`); GM line "المدير العام: رياض همت" / "General Manager: Riyadh Himmat".
- Defaults: Arabic + light. Theme toggle light ↔ dark only.
- Footer credit: AR "تطوير: Sarmadax", EN "Built by Sarmadax" → `https://sarmadax.com`, store footer only.
- No database/schema change; never connect to production data.
- Western digits for prices (as today); currency after the number (`ج.س` / `SDG` from `translations.*.currency`).
- Radius 8px for controls, 10px for cards/dialogs; touch targets 44px (`h-11`) on store controls.
- Commit after every task; message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Store name missing in settings** (`getStoreBranding()` fails or returns empty names) → lockup falls back to the translation shop name, never renders an empty label. Test in Task 7.
2. **Amber text inside dark containers** (`text-amber-400` in an element with `bg-slate-900` or `dark:` pair) → codemod must leave it alone, otherwise dark-panel text turns brown. Tests in Task 4.
3. **Template literals with `${}`** in class strings → codemod must not corrupt interpolations. Test in Task 4.
4. **Price edge values** (0, negative, non-numeric string, decimals like 1250.5, compareAt ≤ amount) → no `NaN`, no discount badge unless compareAt > amount. Tests in Task 9.
5. **Stored legacy theme `system` / unknown** → toggle always lands on light or dark. Test in Task 1.

---

### Task 1: Defaults — Arabic + light

**Files:**
- Modify: `src/components/ThemeToggle.js`
- Modify: `src/components/Providers.js:28-34`
- Modify: `src/context/LanguageContext.js:11-24`
- Modify: `public/manifest.json`
- Test: `tests/unit/components/ThemeToggle.test.tsx`, `tests/unit/components/LanguageProvider.test.tsx`

**Interfaces:**
- Produces: `nextTheme(current)` exported from `src/components/ThemeToggle.js` → `"light" | "dark"`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/components/ThemeToggle.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { nextTheme } from "@/components/ThemeToggle";

describe("nextTheme", () => {
  it("toggles light and dark only", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });

  it("sends legacy or unknown values to dark from a light-looking page", () => {
    expect(nextTheme("system")).toBe("dark");
    expect(nextTheme(undefined)).toBe("dark");
  });
});
```

`tests/unit/components/LanguageProvider.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";

function Probe() {
  const { lang } = useLanguage();
  return <span data-testid="lang">{lang}</span>;
}

describe("LanguageProvider", () => {
  afterEach(() => localStorage.clear());

  it("defaults to Arabic", () => {
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId("lang")).toHaveTextContent("ar");
  });

  it("keeps the server language even if localStorage holds another one", () => {
    localStorage.setItem("lang", "en");
    render(<LanguageProvider initialLang="ar"><Probe /></LanguageProvider>);
    expect(screen.getByTestId("lang")).toHaveTextContent("ar");
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/unit/components/ThemeToggle.test.tsx tests/unit/components/LanguageProvider.test.tsx`
Expected: FAIL — `nextTheme` is not exported; second LanguageProvider test shows `en`.

- [ ] **Step 3: Implement**

In `src/components/ThemeToggle.js`, add above `export function ThemeToggle()`:
```js
// Light is the default; "system" is not offered (ThemeProvider has enableSystem={false}).
export function nextTheme(current) {
  return current === "dark" ? "light" : "dark";
}
```
Replace the `cycle` function body with:
```js
  const cycle = () => setTheme(nextTheme(theme));
```
Remove the `Monitor` import and any branch that renders it (the icon shows `Moon` when `resolvedTheme === "light"`, else `Sun`).

In `src/components/Providers.js` add `storageKey="himmat-theme"` to `<ThemeProvider …>`:
```jsx
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="himmat-theme"
        disableTransitionOnChange={false}
        enableColorScheme
      >
```

In `src/context/LanguageContext.js` delete the whole first `useEffect` (lines 11–24, the block reading `localStorage.getItem("lang")`). In `switchLanguage`, keep the cookie write and drop `localStorage.setItem("lang", next);`.

In `public/manifest.json` set `"background_color": "#F7F6F3"` (leave `theme_color` for Task 6).

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/components`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/ThemeToggle.js src/components/Providers.js src/context/LanguageContext.js public/manifest.json tests/unit/components/ThemeToggle.test.tsx tests/unit/components/LanguageProvider.test.tsx
git commit -m "feat(defaults): Arabic and light by default; toggle light/dark only"
```

---

### Task 2: Brand tokens + contrast test

**Files:**
- Create: `src/app/styles/tokens.css`
- Modify: `src/app/globals.css` (replace lines 61–201: the `@supports not (color: oklch…)` block, the `:root { color-scheme: light; …}` block and the `.dark { … }` block; rewrite the `.admin-shell` overrides lines 203–251)
- Create: `tests/unit/brand/tokens.ts` (parser helper), `tests/unit/brand/contrast.test.ts`

**Interfaces:**
- Produces CSS variables used by later tasks: `--background --foreground --card --card-foreground --popover --popover-foreground --primary --primary-foreground --secondary --secondary-foreground --muted --muted-foreground --accent --accent-foreground --destructive --destructive-foreground --success --success-foreground --info --info-foreground --warning --warning-foreground --brand --brand-foreground --accent-text --border --input --ring --radius`, and raw `--navy-* --amber-* --paper --surface --line --line-strong --muted-ink --ink-2 --ink`.
- Produces Tailwind colours (via `@theme inline` in globals.css): `bg-success text-success-foreground bg-info text-info-foreground bg-warning text-warning-foreground bg-brand text-brand-foreground text-accent-text text-destructive-foreground`.
- Produces test helper `readTokens(theme: "light" | "dark"): Record<string,string>` (resolved hex).

- [ ] **Step 1: Write the failing test**

`tests/unit/brand/tokens.ts`:
```ts
import fs from "node:fs";
import path from "node:path";

const TOKENS = path.resolve(__dirname, "../../../src/app/styles/tokens.css");

function block(css: string, selector: string) {
  const re = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "g");
  const vars: Record<string, string> = {};
  for (const m of css.matchAll(re)) {
    for (const d of m[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
  }
  return vars;
}

export function readTokens(theme: "light" | "dark") {
  const css = fs.readFileSync(TOKENS, "utf8");
  const vars = { ...block(css, ":root"), ...(theme === "dark" ? block(css, ".dark") : {}) };
  const resolve = (v: string, depth = 0): string => {
    const ref = v.match(/^var\(--([\w-]+)\)$/);
    if (!ref || depth > 5) return v;
    return resolve(vars[ref[1]], depth + 1);
  };
  return Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, resolve(v)]));
}

export function contrast(a: string, b: string) {
  const lum = (h: string) => {
    const c = [1, 3, 5]
      .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
```

`tests/unit/brand/contrast.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { contrast, readTokens } from "./tokens";

const PAIRS: [string, string][] = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["success-foreground", "success"],
  ["info-foreground", "info"],
  ["warning-foreground", "warning"],
  ["brand-foreground", "brand"],
  ["accent-text", "background"],
  ["accent-text", "card"],
  ["success", "card"],
  ["destructive", "card"],
  ["info", "card"],
];

describe.each(["light", "dark"] as const)("%s tokens", (theme) => {
  const t = readTokens(theme);

  it.each(PAIRS)("%s on %s is at least 4.5:1", (fg, bg) => {
    expect(t[fg], `missing --${fg}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(t[bg], `missing --${bg}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

it("uses the approved brand values", () => {
  const t = readTokens("light");
  expect(t["navy-900"]).toBe("#0E1A2B");
  expect(t["amber-500"]).toBe("#F2A20C");
  expect(t.primary).toBe("#F2A20C");
  expect(t["primary-foreground"]).toBe("#0E1A2B");
  expect(t.background).toBe("#F7F6F3");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/brand`
Expected: FAIL — `ENOENT … tokens.css`.

- [ ] **Step 3: Create `src/app/styles/tokens.css`**
```css
/* Himmat brand tokens — values from the approved brand sheet (P0.3 spec §1).
   Components use the semantic names; raw palette names are for this file and palette.css. */
:root {
  --navy-950: #0B1422;
  --navy-900: #0E1A2B;
  --navy-800: #17263B;
  --navy-700: #22344D;
  --navy-600: #3A4D68;
  --amber-100: #FDF1D8;
  --amber-500: #F2A20C;
  --amber-600: #D9870A;
  --amber-700: #9A5B00;
  --amber-800: #6E4100;
  --paper: #F7F6F3;
  --surface: #FFFFFF;
  --tint: #EFEDE8;
  --line: #E4E1DA;
  --line-strong: #D5D1C8;
  --muted-ink: #5E636B;
  --ink-2: #3B4049;
  --ink: #121821;
  --success-500: #1F7A4D;
  --danger-500: #C2362B;
  --info-500: #2F5F98;
}

:root {
  color-scheme: light;
  --background: var(--paper);
  --foreground: var(--ink);
  --card: var(--surface);
  --card-foreground: var(--ink);
  --popover: var(--surface);
  --popover-foreground: var(--ink);
  --primary: var(--amber-500);
  --primary-foreground: var(--navy-900);
  --secondary: var(--tint);
  --secondary-foreground: var(--ink-2);
  --muted: var(--tint);
  --muted-foreground: var(--muted-ink);
  --accent: var(--tint);
  --accent-foreground: var(--ink-2);
  --destructive: var(--danger-500);
  --destructive-foreground: #FFFFFF;
  --success: var(--success-500);
  --success-foreground: #FFFFFF;
  --info: var(--info-500);
  --info-foreground: #FFFFFF;
  --warning: var(--amber-100);
  --warning-foreground: var(--amber-800);
  --brand: var(--navy-900);
  --brand-foreground: var(--paper);
  --accent-text: var(--amber-700);
  --border: var(--line);
  --input: var(--line-strong);
  --ring: var(--amber-600);
  --chart-1: var(--navy-700);
  --chart-2: var(--amber-500);
  --chart-3: var(--success-500);
  --chart-4: var(--info-500);
  --chart-5: var(--muted-ink);
  --radius: 0.5rem;
  --sidebar: var(--surface);
  --sidebar-foreground: var(--ink);
  --sidebar-primary: var(--amber-500);
  --sidebar-primary-foreground: var(--navy-900);
  --sidebar-accent: var(--tint);
  --sidebar-accent-foreground: var(--ink-2);
  --sidebar-border: var(--line);
  --sidebar-ring: var(--amber-600);
}

.dark {
  color-scheme: dark;
  --background: #0B1422;
  --foreground: #EEF1F5;
  --card: #121E30;
  --card-foreground: #EEF1F5;
  --popover: #121E30;
  --popover-foreground: #EEF1F5;
  --primary: var(--amber-500);
  --primary-foreground: var(--navy-900);
  --secondary: #1A2840;
  --secondary-foreground: #DCE2EA;
  --muted: #1A2840;
  --muted-foreground: #9AA6B6;
  --accent: #1A2840;
  --accent-foreground: #DCE2EA;
  --destructive: #F07167;
  --destructive-foreground: #0B1422;
  --success: #4CC38A;
  --success-foreground: #0B1422;
  --info: #7FA8DD;
  --info-foreground: #0B1422;
  --warning: #3A2A0A;
  --warning-foreground: #F5C451;
  --brand: var(--navy-800);
  --brand-foreground: #EEF1F5;
  --accent-text: var(--amber-500);
  --border: #23324A;
  --input: #2C3D57;
  --ring: var(--amber-500);
  --chart-1: #7FA8DD;
  --chart-2: var(--amber-500);
  --chart-3: #4CC38A;
  --chart-4: #B5C4D8;
  --chart-5: #9AA6B6;
  --sidebar: #0E1A2B;
  --sidebar-foreground: #EEF1F5;
  --sidebar-primary: var(--amber-500);
  --sidebar-primary-foreground: var(--navy-900);
  --sidebar-accent: #1A2840;
  --sidebar-accent-foreground: #DCE2EA;
  --sidebar-border: #23324A;
  --sidebar-ring: var(--amber-500);
}
```

- [ ] **Step 4: Wire it into `globals.css`**

1. After `@import "tw-animate-css";` add `@import "./styles/tokens.css";`.
2. Delete the `@supports not (color: oklch(0.5 0 0)) { … }` block, the `:root { color-scheme: light; … }` block and the `.dark { … }` block (hex tokens now work everywhere, so no fallback is needed).
3. In `@theme inline { … }` add:
```css
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-brand: var(--brand);
  --color-brand-foreground: var(--brand-foreground);
  --color-accent-text: var(--accent-text);
```
4. Replace the light admin overrides (`:root:not(.dark) .admin-shell …` rules) with:
```css
:root:not(.dark) .admin-shell {
  background: var(--background);
}

:root:not(.dark) .admin-shell [class~="bg-black/20"],
:root:not(.dark) .admin-shell [class~="bg-black/30"],
:root:not(.dark) .admin-shell [class~="bg-black/40"] {
  background-color: var(--muted);
}

:root:not(.dark) .admin-shell [class~="text-gray-300"],
:root:not(.dark) .admin-shell [class~="text-gray-400"],
:root:not(.dark) .admin-shell [class~="text-gray-500"] {
  color: var(--muted-foreground) !important;
}

:root:not(.dark) .admin-shell [class~="text-amber-300"] {
  color: var(--accent-text) !important;
}

:root:not(.dark) .admin-shell .recharts-cartesian-grid line {
  stroke: var(--border) !important;
}

:root:not(.dark) .admin-shell .recharts-text {
  fill: var(--muted-foreground) !important;
}

:root:not(.dark) .admin-shell .recharts-default-tooltip {
  background-color: var(--popover) !important;
  border: 1px solid var(--border) !important;
  border-radius: 10px !important;
  box-shadow: none !important;
}

:root:not(.dark) .admin-shell .recharts-default-tooltip * {
  color: var(--popover-foreground) !important;
}
```
5. In `@layer utilities`, delete `.shadow-premium` and `.dark .shadow-premium`, then run `grep -rn "shadow-premium" src` and replace each use with `border border-border` (or remove if a border is already present).

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/unit/brand`
Expected: PASS (38 pair checks + brand values).

- [ ] **Step 6: Commit**
```bash
git add src/app/styles/tokens.css src/app/globals.css tests/unit/brand src/components src/app
git commit -m "feat(brand): Himmat colour tokens for light and dark with contrast test"
```

---

### Task 3: Palette remap of existing Tailwind classes

**Files:**
- Create: `src/app/styles/palette.css`
- Modify: `src/app/globals.css` (import)
- Test: `tests/unit/brand/palette.test.ts`

**Interfaces:**
- Consumes: `contrast()` from `tests/unit/brand/tokens.ts`.
- Produces: brand values behind `amber-50…950`, `emerald-50…950`, `slate-900`, `slate-950`.

- [ ] **Step 1: Write the failing test**

`tests/unit/brand/palette.test.ts`:
```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrast } from "./tokens";

const css = fs.readFileSync(path.resolve(__dirname, "../../../src/app/styles/palette.css"), "utf8");
const val = (name: string) => css.match(new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];

describe("palette remap", () => {
  it("puts brand values behind the classes the app already uses", () => {
    expect(val("amber-500")).toBe("#F2A20C");
    expect(val("amber-700")).toBe("#9A5B00");
    expect(val("emerald-600")).toBe("#1F7A4D");
    expect(val("slate-900")).toBe("#0E1A2B");
  });

  it("keeps the common pairs readable", () => {
    expect(contrast("#000000", val("amber-500")!)).toBeGreaterThanOrEqual(4.5); // bg-amber-500 text-black (131 uses)
    expect(contrast("#FFFFFF", val("emerald-500")!)).toBeGreaterThanOrEqual(4.5); // white on emerald badges
    expect(contrast("#FFFFFF", val("emerald-600")!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(val("emerald-400")!, "#0B1422")).toBeGreaterThanOrEqual(4.5); // green text on dark
    expect(contrast(val("amber-400")!, "#0B1422")).toBeGreaterThanOrEqual(4.5); // amber text on dark
    expect(contrast(val("amber-700")!, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });

  it("is imported by globals.css", () => {
    const globals = fs.readFileSync(path.resolve(__dirname, "../../../src/app/globals.css"), "utf8");
    expect(globals).toContain('@import "./styles/palette.css";');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/brand/palette.test.ts`
Expected: FAIL — `ENOENT … palette.css`.

- [ ] **Step 3: Create `src/app/styles/palette.css`**
```css
/* Remaps Tailwind's own scales to the Himmat brand so the ~1,350 existing
   amber/emerald/slate classes take brand values without touching 74 files (spec §2). */
@theme {
  --color-amber-50: #FFF8EB;
  --color-amber-100: #FDF1D8;
  --color-amber-200: #FBE0A8;
  --color-amber-300: #F8CB6B;
  --color-amber-400: #F5B532;
  --color-amber-500: #F2A20C;
  --color-amber-600: #D9870A;
  --color-amber-700: #9A5B00;
  --color-amber-800: #6E4100;
  --color-amber-900: #4F2F00;
  --color-amber-950: #2E1B00;

  --color-emerald-50: #EDF7F1;
  --color-emerald-100: #D3EEDD;
  --color-emerald-200: #A8DDBD;
  --color-emerald-300: #6FC497;
  --color-emerald-400: #3DA872;
  --color-emerald-500: #1B8352;
  --color-emerald-600: #1F7A4D;
  --color-emerald-700: #19623E;
  --color-emerald-800: #144D31;
  --color-emerald-900: #0F3A25;
  --color-emerald-950: #082215;

  --color-slate-900: #0E1A2B;
  --color-slate-950: #0B1422;
}
```
In `globals.css`, directly after `@import "./styles/tokens.css";` add `@import "./styles/palette.css";`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/brand`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/app/styles/palette.css src/app/globals.css tests/unit/brand/palette.test.ts
git commit -m "feat(brand): remap Tailwind amber/emerald/slate scales to brand values"
```

---

### Task 4: Class codemod (amber text contrast, glow removal)

**Files:**
- Create: `scripts/codemods/brand-classes.mjs`
- Test: `tests/unit/codemods/brand-classes.test.ts`

**Interfaces:**
- Produces: `transformClassString(str: string) → { value: string, changes: string[], skipped: string[] }` and `transformSource(src: string) → { code: string, changes: string[], skipped: string[] }`; CLI `node scripts/codemods/brand-classes.mjs [--write] <dir…>` prints a Markdown report.

Rules (spec §3–4):
- `shadow-amber-NNN` and `shadow-amber-NNN/NN` (any non-`dark:` variant prefix) → removed.
- `text-amber-400|500|600` (optionally with non-`dark:` variant prefixes like `hover:`, `group-hover:`, `md:`) → same prefixes + `text-accent-text`.
- Skip (report, don't change) the text rule when the same class string contains a `dark:text-…` token, or a dark/solid background token: `bg-black`, `bg-(slate|gray|zinc|neutral|stone)-(800|900|950)`, `bg-amber-(400|500|600)` (solid, no `/`), `bg-foreground`, `bg-brand`, `bg-primary`.
- Opacity forms (`text-amber-500/80`) are skipped and reported.
- Tokens containing `${` are never changed.

- [ ] **Step 1: Write the failing tests**

`tests/unit/codemods/brand-classes.test.ts`:
```ts
import { describe, expect, it } from "vitest";
// @ts-expect-error plain ESM script
import { transformClassString, transformSource } from "../../../scripts/codemods/brand-classes.mjs";

describe("transformClassString", () => {
  it("swaps amber text for the accessible accent token", () => {
    expect(transformClassString("text-sm text-amber-500 font-bold").value).toBe("text-sm text-accent-text font-bold");
    expect(transformClassString("hover:text-amber-600 underline").value).toBe("hover:text-accent-text underline");
  });

  it("removes amber glows", () => {
    expect(transformClassString("rounded-xl shadow-lg shadow-amber-500/30").value).toBe("rounded-xl shadow-lg");
    expect(transformClassString("group-hover:shadow-amber-500/50 p-2").value).toBe("p-2");
  });

  it("leaves amber text that already has a dark pair", () => {
    const r = transformClassString("text-amber-600 dark:text-amber-400");
    expect(r.value).toBe("text-amber-600 dark:text-amber-400");
    expect(r.skipped).toHaveLength(1);
  });

  it("leaves amber text on dark or solid amber backgrounds", () => {
    expect(transformClassString("bg-slate-900 text-amber-400").value).toBe("bg-slate-900 text-amber-400");
    expect(transformClassString("bg-amber-500 text-amber-950").value).toBe("bg-amber-500 text-amber-950");
  });

  it("converts amber text on light amber tints", () => {
    expect(transformClassString("bg-amber-500/10 text-amber-500").value).toBe("bg-amber-500/10 text-accent-text");
  });

  it("reports opacity forms instead of guessing", () => {
    const r = transformClassString("text-amber-500/80");
    expect(r.value).toBe("text-amber-500/80");
    expect(r.skipped).toEqual(["text-amber-500/80"]);
  });

  it("keeps whitespace and interpolations intact", () => {
    expect(transformClassString("a  text-amber-500\n  ${x ? 'b' : 'c'}").value).toBe("a  text-accent-text\n  ${x ? 'b' : 'c'}");
  });
});

describe("transformSource", () => {
  it("rewrites class strings in all quote styles and leaves other code alone", () => {
    const src = [
      `<p className="text-amber-500">x</p>`,
      `cn('shadow-amber-500/25 p-2', ok && "text-amber-400")`,
      "const s = `flex ${a} text-amber-600`;",
      `const label = "amber-500 is a colour";`,
    ].join("\n");
    const out = transformSource(src);
    expect(out.code).toBe(
      [
        `<p className="text-accent-text">x</p>`,
        `cn('p-2', ok && "text-accent-text")`,
        "const s = `flex ${a} text-accent-text`;",
        `const label = "amber-500 is a colour";`,
      ].join("\n")
    );
    expect(out.changes).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/codemods`
Expected: FAIL — cannot find module `brand-classes.mjs`.

- [ ] **Step 3: Implement `scripts/codemods/brand-classes.mjs`**
```js
#!/usr/bin/env node
// P0.3 codemod: amber text on light surfaces -> text-accent-text; remove amber glows.
// Usage: node scripts/codemods/brand-classes.mjs [--write] src/components src/app
import fs from "node:fs";
import path from "node:path";

const TEXT_AMBER = /^((?:(?!dark:)[\w-]+:)*)text-amber-(400|500|600)$/;
const TEXT_AMBER_OPACITY = /^(?:(?!dark:)[\w-]+:)*text-amber-(400|500|600)\/\d+$/;
const GLOW = /^(?:[\w-]+:)*shadow-amber-\d{2,3}(?:\/\d+)?$/;
const DARK_CONTEXT =
  /(?:^|\s)(?:[\w-]+:)*(?:dark:text-\S+|bg-black(?:\/\d+)?|bg-(?:slate|gray|zinc|neutral|stone)-(?:800|900|950)|bg-amber-(?:400|500|600)(?=\s|$)|bg-foreground|bg-brand|bg-primary)(?=\s|$)/;

export function transformClassString(str) {
  const changes = [];
  const skipped = [];
  const darkContext = DARK_CONTEXT.test(str);
  const parts = str.split(/(\s+)/);
  const out = [];
  for (const part of parts) {
    if (!part || /^\s+$/.test(part) || part.includes("${")) {
      out.push(part);
      continue;
    }
    if (GLOW.test(part)) {
      changes.push(`${part} → (removed)`);
      continue;
    }
    if (TEXT_AMBER_OPACITY.test(part)) {
      skipped.push(part);
      out.push(part);
      continue;
    }
    const m = part.match(TEXT_AMBER);
    if (m) {
      if (darkContext) {
        skipped.push(part);
        out.push(part);
        continue;
      }
      const next = `${m[1]}text-accent-text`;
      changes.push(`${part} → ${next}`);
      out.push(next);
      continue;
    }
    out.push(part);
  }
  // Collapse the double spaces a removed glow leaves between two classes; leave
  // newlines/indentation and untouched strings exactly as they were.
  const removed = changes.some((c) => c.endsWith("(removed)"));
  const joined = out.join("");
  const value = removed ? joined.replace(/(\S) {2,}(?=\S)/g, "$1 ").replace(/^ +| +$/g, "") : joined;
  return { value: changes.length ? value : str, changes, skipped };
}

const STRING = /"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g;
const TARGET = /(?:text|shadow)-amber-/;

export function transformSource(src) {
  const changes = [];
  const skipped = [];
  const code = src.replace(STRING, (whole, dq, sq, bt) => {
    const body = dq ?? sq ?? bt;
    if (!TARGET.test(body)) return whole;
    const r = transformClassString(body);
    changes.push(...r.changes);
    skipped.push(...r.skipped);
    const q = whole[0];
    return q + r.value + q;
  });
  return { code, changes, skipped };
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return /\.(jsx?|tsx?)$/.test(e.name) ? [full] : [];
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const write = process.argv.includes("--write");
  const dirs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const report = ["# P0.3 brand-classes codemod report", ""];
  let total = 0;
  const skippedAll = [];
  for (const file of dirs.flatMap(walk)) {
    const src = fs.readFileSync(file, "utf8");
    const { code, changes, skipped } = transformSource(src);
    if (skipped.length) skippedAll.push(`- \`${file}\`: ${skipped.join(", ")}`);
    if (!changes.length) continue;
    total += changes.length;
    report.push(`## ${file}`, ...changes.map((c) => `- ${c}`), "");
    if (write) fs.writeFileSync(file, code);
  }
  report.push(`**${total} changes.**`, "", "## Left for manual review", ...(skippedAll.length ? skippedAll : ["- none"]));
  console.log(report.join("\n"));
}
```
- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/codemods`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**
```bash
git add scripts/codemods/brand-classes.mjs tests/unit/codemods/brand-classes.test.ts
git commit -m "feat(codemod): amber text contrast and glow removal codemod with tests"
```

---

### Task 5: Apply the codemod

**Files:**
- Modify: files under `src/components/**` and `src/app/**` reported by the codemod
- Create: `docs/rebuild/parts/P0.3-codemod-report.md`

- [ ] **Step 1: Dry run and save the report**

Run: `node scripts/codemods/brand-classes.mjs src/components src/app > docs/rebuild/parts/P0.3-codemod-report.md && tail -20 docs/rebuild/parts/P0.3-codemod-report.md`
Expected: a change count (roughly 150–300) and a "Left for manual review" list.

- [ ] **Step 2: Apply**

Run: `node scripts/codemods/brand-classes.mjs --write src/components src/app > /dev/null && git diff --stat | tail -3`
Expected: ~60–74 files changed.

- [ ] **Step 3: Check nothing else changed**

Run: `git diff -U0 src | grep -E '^[-+]' | grep -vE '^(\+\+\+|---)' | grep -vE 'amber' | head`
Expected: no output (every changed line involved an amber class).
Run: `grep -rnE '(^|[ "'"'"'`])shadow-amber-' src | wc -l`
Expected: `0`.

- [ ] **Step 4: Review the manual list**

For each entry under "Left for manual review" in the report: if the element sits on a light background in light mode, change it to `text-accent-text` (keep any `dark:` token); otherwise leave it. Note the decision next to the entry in the report.

- [ ] **Step 5: Lint, unit tests, commit**

Run: `npx eslint src && npx vitest run tests/unit`
Expected: no errors; all tests pass.
```bash
git add src docs/rebuild/parts/P0.3-codemod-report.md
git commit -m "style(brand): readable amber text and no glow shadows across the app"
```

---

### Task 6: Bolt mark and app icons

**Files:**
- Create: `src/components/brand/BoltMark.js`
- Create: `scripts/brand/render-icons.mjs`
- Modify: `public/icons/icon-512.svg`, `public/icons/icon-192.svg`, `public/icons/icon-maskable-512.svg`, `src/app/icon.svg`
- Regenerate: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/favicon-48.png`, `public/favicon.png`, `public/favicon.ico`
- Modify: `public/manifest.json` (`theme_color`), `src/app/layout.js:30` (`viewport.themeColor`)
- Test: `tests/unit/brand/BoltMark.test.tsx`

**Interfaces:**
- Produces: `BOLT_PATH`, `BOLT_PATH_SMALL` (strings, 512 viewBox) and `export default function BoltMark({ size = 40, tone = "navy", title })` — `tone` `"navy"` (navy tile, amber bolt) or `"amber"` (amber tile, navy bolt); uses `BOLT_PATH_SMALL` when `size <= 32`; `title` → accessible name, else `aria-hidden`.

- [ ] **Step 1: Write the failing test**

`tests/unit/brand/BoltMark.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BoltMark, { BOLT_PATH, BOLT_PATH_SMALL } from "@/components/brand/BoltMark";

describe("BoltMark", () => {
  it("uses the heavier bolt at small sizes", () => {
    const { container } = render(<BoltMark size={24} />);
    expect(container.querySelector("path")?.getAttribute("d")).toBe(BOLT_PATH_SMALL);
  });

  it("uses the regular bolt at larger sizes and brand colours", () => {
    const { container } = render(<BoltMark size={56} />);
    expect(container.querySelector("path")?.getAttribute("d")).toBe(BOLT_PATH);
    expect(container.querySelector("rect")?.getAttribute("fill")).toBe("#0E1A2B");
    expect(container.querySelector("path")?.getAttribute("fill")).toBe("#F2A20C");
  });

  it("inverts for the amber tone", () => {
    const { container } = render(<BoltMark tone="amber" />);
    expect(container.querySelector("rect")?.getAttribute("fill")).toBe("#F2A20C");
    expect(container.querySelector("path")?.getAttribute("fill")).toBe("#0E1A2B");
  });

  it("is decorative unless titled", () => {
    const { container, rerender } = render(<BoltMark />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    rerender(<BoltMark title="همّت" />);
    expect(screen.getByRole("img", { name: "همّت" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/brand/BoltMark.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/components/brand/BoltMark.js`**
```js
// Himmat bolt mark (approved brand sheet). Paths are in a 512×512 box.
export const BOLT_PATH = "M282 52 L142 286 H244 L204 460 L374 214 H276 L326 52 Z";
export const BOLT_PATH_SMALL = "M290 40 L130 292 H246 L198 472 L386 208 H272 L330 40 Z";

const NAVY = "#0E1A2B";
const AMBER = "#F2A20C";

export default function BoltMark({ size = 40, tone = "navy", title, className }) {
  const [tile, bolt] = tone === "amber" ? [AMBER, NAVY] : [NAVY, AMBER];
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": "true" };
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} {...a11y}>
      <rect width="512" height="512" rx="104" fill={tile} />
      <path d={size <= 32 ? BOLT_PATH_SMALL : BOLT_PATH} fill={bolt} />
    </svg>
  );
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run tests/unit/brand/BoltMark.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the icon SVGs**

`public/icons/icon-512.svg` and `src/app/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="104" fill="#0E1A2B"/>
  <path d="M282 52 L142 286 H244 L204 460 L374 214 H276 L326 52 Z" fill="#F2A20C"/>
</svg>
```
`public/icons/icon-192.svg`: same content with `width="192" height="192"`.
`public/icons/icon-maskable-512.svg` (full-bleed, bolt inside the 80% safe zone):
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0E1A2B"/>
  <g transform="translate(51.2 51.2) scale(0.8)">
    <path d="M282 52 L142 286 H244 L204 460 L374 214 H276 L326 52 Z" fill="#F2A20C"/>
  </g>
</svg>
```

- [ ] **Step 6: Render PNG/ICO with `scripts/brand/render-icons.mjs`**
```js
#!/usr/bin/env node
// Renders the committed brand SVGs to PNG/ICO. Run by hand after changing an icon:
//   node scripts/brand/render-icons.mjs
// Uses the `sharp` that Next.js installs (no new dependency).
import fs from "node:fs";
import sharp from "sharp";

const SMALL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="104" fill="#0E1A2B"/><path d="M290 40 L130 292 H246 L198 472 L386 208 H272 L330 40 Z" fill="#F2A20C"/></svg>`;
const big = fs.readFileSync("public/icons/icon-512.svg");

const png = (svg, size) => sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toBuffer();

// ICO with a single embedded 48×48 PNG (valid for all current browsers).
function ico(pngBuf) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(48, 6);
  header.writeUInt8(48, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(pngBuf.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, pngBuf]);
}

const out = {
  "public/icons/icon-512.png": await png(big, 512),
  "public/icons/icon-192.png": await png(big, 192),
  "public/favicon.png": await png(big, 192),
  "public/favicon-48.png": await png(SMALL, 48),
};
for (const [file, buf] of Object.entries(out)) fs.writeFileSync(file, buf);
fs.writeFileSync("public/favicon.ico", ico(out["public/favicon-48.png"]));
console.log("rendered", Object.keys(out).length + 1, "files");
```
Run: `node scripts/brand/render-icons.mjs`
Expected: `rendered 5 files`. Open `public/icons/icon-512.png` with the Read tool to eyeball it: navy rounded tile, amber bolt.

- [ ] **Step 7: Theme colour**

`public/manifest.json`: `"theme_color": "#0E1A2B"`. `src/app/layout.js` `viewport.themeColor: "#0E1A2B"`.

- [ ] **Step 8: Commit**
```bash
git add src/components/brand/BoltMark.js scripts/brand/render-icons.mjs public/icons public/favicon.png public/favicon-48.png public/favicon.ico public/manifest.json src/app/icon.svg src/app/layout.js tests/unit/brand/BoltMark.test.tsx
git commit -m "feat(brand): refined bolt mark, app icons and navy theme colour"
```

---

### Task 7: BrandLockup, brand spots, metadata

**Files:**
- Create: `src/components/brand/BrandLockup.js`
- Modify: `src/lib/translations.js` (add `brandWordmark`, `brandGmLine` in `ar` and `en`)
- Modify: `src/components/Navbar.js:84-96` (mobile sheet) and `:313-338` (desktop logo)
- Modify: `src/components/Footer.js:40-51`
- Modify: `src/components/AdminSidebar.js:72-79`
- Modify: `src/app/layout.js:40-51` (title/template/siteName)
- Test: `tests/unit/brand/BrandLockup.test.tsx`

**Interfaces:**
- Consumes: `BoltMark` (Task 6); `useLanguage()` → `{ lang, isRTL, brandName }` (brandName = store shop name or translation fallback).
- Produces: `export default function BrandLockup({ variant = "compact", size, tone, className })` — `variant`: `"full"` (mark + wordmark + shop name + GM line), `"compact"` (mark + wordmark + shop name), `"mark"`; and `BRAND_WORDMARK = { ar: "همّت", en: "Himmat" }`.

- [ ] **Step 1: Translations**

In `src/lib/translations.js`, in the `ar` object next to `brandName` add:
```js
    brandWordmark: "همّت",
    brandGmLine: "المدير العام: رياض همت",
```
and in the `en` object:
```js
    brandWordmark: "Himmat",
    brandGmLine: "General Manager: Riyadh Himmat",
```

- [ ] **Step 2: Write the failing test**

`tests/unit/brand/BrandLockup.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const state = { lang: "ar", isRTL: true, brandName: "أعمال عصام الدين نصر للأدوات الكهربائية" };
vi.mock("@/context/LanguageContext", () => ({ useLanguage: () => state }));

import BrandLockup from "@/components/brand/BrandLockup";

describe("BrandLockup", () => {
  it("leads with همّت and shows the shop name and GM line in full", () => {
    render(<BrandLockup variant="full" />);
    expect(screen.getByText("همّت")).toBeInTheDocument();
    expect(screen.getByText("HIMMAT")).toBeInTheDocument();
    expect(screen.getByText(state.brandName)).toBeInTheDocument();
    expect(screen.getByText("المدير العام: رياض همت")).toBeInTheDocument();
  });

  it("drops the GM line in compact", () => {
    render(<BrandLockup variant="compact" />);
    expect(screen.queryByText("المدير العام: رياض همت")).not.toBeInTheDocument();
  });

  it("falls back to the translated shop name when settings give none", () => {
    state.brandName = "";
    render(<BrandLockup variant="compact" />);
    expect(screen.getByText("عصام الدين نصر للأدوات الكهربائية")).toBeInTheDocument();
    state.brandName = "أعمال عصام الدين نصر للأدوات الكهربائية";
  });

  it("uses the English wordmark in English", () => {
    Object.assign(state, { lang: "en", isRTL: false, brandName: "Essam El-Din Nasr Electrical Tools" });
    render(<BrandLockup variant="compact" />);
    expect(screen.getByText("Himmat")).toBeInTheDocument();
    Object.assign(state, { lang: "ar", isRTL: true, brandName: "أعمال عصام الدين نصر للأدوات الكهربائية" });
  });

  it("renders only the mark, labelled, in mark variant", () => {
    render(<BrandLockup variant="mark" />);
    expect(screen.getByRole("img", { name: "همّت" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run tests/unit/brand/BrandLockup.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/components/brand/BrandLockup.js`**
```js
"use client";

import BoltMark from "@/components/brand/BoltMark";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

export const BRAND_WORDMARK = { ar: "همّت", en: "Himmat" };
const FALLBACK_SHOP = { ar: "عصام الدين نصر للأدوات الكهربائية", en: "Essam El-Din Nasr Electrical Tools" };

export default function BrandLockup({ variant = "compact", size, tone = "navy", className }) {
  const { lang, brandName } = useLanguage();
  const l = lang === "en" ? "en" : "ar";
  const t = translations[l];
  const wordmark = t.brandWordmark || BRAND_WORDMARK[l];
  const shop = (brandName || "").trim() || FALLBACK_SHOP[l];

  if (variant === "mark") return <BoltMark size={size ?? 36} tone={tone} title={wordmark} className={className} />;

  const full = variant === "full";
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <BoltMark size={size ?? (full ? 48 : 36)} tone={tone} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="flex items-baseline gap-2">
          <span className={cn("font-extrabold text-foreground", full ? "text-3xl" : "text-xl")}>{wordmark}</span>
          {l === "ar" && (
            <span dir="ltr" className="text-[11px] font-bold tracking-[0.22em] text-accent-text">
              HIMMAT
            </span>
          )}
        </span>
        <span className="truncate text-xs font-semibold text-muted-foreground">{shop}</span>
        {full && <span className="text-[11px] text-muted-foreground">{t.brandGmLine}</span>}
      </span>
    </span>
  );
}
```
Note: `ar` shows "HIMMAT" in Latin as a secondary mark; `en` shows only "Himmat" (test 4 expects exactly one "Himmat").

- [ ] **Step 5: Run test**

Run: `npx vitest run tests/unit/brand/BrandLockup.test.tsx`
Expected: PASS.

- [ ] **Step 6: Replace brand spots (markup only, layout unchanged)**

`src/components/Navbar.js` desktop logo (`{/* === Logo === */}` link, lines ~313–338): keep the `<Link href="/" …>` element and its classes; replace its children (the gradient `<div>` with `<Zap>` and the name/tagline `<div>`) with:
```jsx
                        <BrandLockup variant="compact" className="min-w-0" />
```
Mobile sheet `SheetTitle` children (lines ~86–96): replace with `<BrandLockup variant="compact" />`.
`src/components/Footer.js` brand `<Link>` children (lines ~41–51): replace with `<BrandLockup variant="full" />`.
`src/components/AdminSidebar.js` (lines ~72–79, the `<Zap>` tile + `{brandName}`): replace with `<BrandLockup variant="compact" />`.
Add `import BrandLockup from "@/components/brand/BrandLockup";` to each file. Remove `Zap` from an import only if it is no longer used in that file (`grep -n "<Zap" <file>`).

- [ ] **Step 7: Metadata**

In `src/app/layout.js` `generateMetadata`, replace the title lines with:
```js
  const wordmark = t.brandWordmark;
  const title = `${wordmark} — ${b.brandName}`;
```
and use `template: \`%s — ${wordmark}\``, `siteName: \`${wordmark} — ${b.brandName}\``. Run `grep -rn "| \${b.brandName}\|template:" src/app` and apply the same `%s — ${t.brandWordmark}` template wherever a page-level layout sets its own template.

- [ ] **Step 8: Run tests and lint**

Run: `npx vitest run tests/unit && npx eslint src/components/Navbar.js src/components/Footer.js src/components/AdminSidebar.js src/components/brand src/app/layout.js`
Expected: PASS, no lint errors.

- [ ] **Step 9: Commit**
```bash
git add src/components/brand/BrandLockup.js src/lib/translations.js src/components/Navbar.js src/components/Footer.js src/components/AdminSidebar.js src/app/layout.js tests/unit/brand/BrandLockup.test.tsx
git commit -m "feat(brand): Himmat lockup in navbar, footer, admin sidebar and page titles"
```

---

### Task 8: Invoice header wordmark + footer developer credit

**Files:**
- Modify: `src/lib/receipt.js:437-452` (A4 invoice header)
- Create: `src/components/brand/DeveloperCredit.js`
- Modify: `src/components/Footer.js` bottom bar (~line 176)
- Modify: `src/lib/translations.js` (`developerCredit`)
- Test: `tests/unit/lib/receipt-brand.test.ts`, `tests/unit/brand/DeveloperCredit.test.tsx`

**Interfaces:**
- Consumes: `buildReceiptInnerHtml(data, { paper })` (existing), `BOLT_PATH` (Task 6).
- Produces: `DeveloperCredit` component; `SARMADAX_URL = "https://sarmadax.com"`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/lib/receipt-brand.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildReceiptInnerHtml } from "@/lib/receipt";

const base = {
  isRTL: true, lang: "ar", storeName: "أعمال عصام الدين نصر للأدوات الكهربائية", storeLogo: "",
  items: [], subtotal: 0, total: 0, tax: 0, discount: 0, shipping: 0,
};

describe("A4 invoice header", () => {
  it("shows the Himmat mark and wordmark when no custom logo is set", () => {
    const html = buildReceiptInnerHtml(base, { paper: "a4" });
    expect(html).toContain('class="inv-mark"');
    expect(html).toContain("همّت");
    expect(html).toContain(base.storeName);
  });

  it("keeps an uploaded logo instead of the mark", () => {
    const html = buildReceiptInnerHtml({ ...base, storeLogo: "https://res.cloudinary.com/x/logo.png" }, { paper: "a4" });
    expect(html).toContain("inv-logo");
    expect(html).not.toContain('class="inv-mark"');
  });
});
```
If `buildReceiptInnerHtml` throws on this minimal `data`, read `buildReceiptData` (line 125) and add the missing fields it requires to `base` — do not change the function's contract.

`tests/unit/brand/DeveloperCredit.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const state = { lang: "ar" };
vi.mock("@/context/LanguageContext", () => ({ useLanguage: () => state }));

import DeveloperCredit from "@/components/brand/DeveloperCredit";

describe("DeveloperCredit", () => {
  it("credits Sarmadax in Arabic and links to sarmadax.com in a new tab", () => {
    render(<DeveloperCredit />);
    const link = screen.getByRole("link", { name: /Sarmadax/ });
    expect(link).toHaveAttribute("href", "https://sarmadax.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByText(/تطوير:/)).toBeInTheDocument();
  });

  it("reads Built by Sarmadax in English", () => {
    state.lang = "en";
    render(<DeveloperCredit />);
    expect(screen.getByText(/Built by/)).toBeInTheDocument();
    state.lang = "ar";
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/unit/lib/receipt-brand.test.ts tests/unit/brand/DeveloperCredit.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the invoice mark**

In `src/lib/receipt.js`, add at the top: `import { BOLT_PATH } from "@/components/brand/BoltMark";` — if importing a component module from `lib` is awkward for the receipt bundle, instead copy the constant: `const BOLT_PATH = "M282 52 L142 286 H244 L204 460 L374 214 H276 L326 52 Z";` with a comment `// keep in sync with src/components/brand/BoltMark.js`.
Replace the `logoBlock` definition with:
```js
    const logoBlock = data.storeLogo
      ? `<div class="inv-logo"><img src="${escapeHtml(data.storeLogo)}" alt="" crossorigin="anonymous" /></div>`
      : `<div class="inv-mark"><svg width="44" height="44" viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="104" fill="#0E1A2B"/><path d="${BOLT_PATH}" fill="#F2A20C"/></svg><span class="inv-wordmark">${data.lang === "ar" ? "همّت" : "Himmat"}</span></div>`;
```
In the receipt stylesheet (`public/receipt-print.css`), add:
```css
.invoice-pro .inv-mark { display: flex; align-items: center; gap: 8px; }
.invoice-pro .inv-wordmark { font-weight: 800; font-size: 22px; color: #0E1A2B; }
```

- [ ] **Step 4: Implement the credit**

`src/lib/translations.js`: `ar` → `developerCredit: "تطوير:"`, `en` → `developerCredit: "Built by"`.

`src/components/brand/DeveloperCredit.js`:
```js
"use client";

import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

export const SARMADAX_URL = "https://sarmadax.com";

export default function DeveloperCredit({ className }) {
  const { lang } = useLanguage();
  const t = translations[lang === "en" ? "en" : "ar"];
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {t.developerCredit}{" "}
      <a
        href={SARMADAX_URL}
        target="_blank"
        rel="noopener"
        dir="ltr"
        className="font-semibold text-foreground underline-offset-4 hover:text-accent-text hover:underline"
      >
        Sarmadax
      </a>
    </p>
  );
}
```
In `src/components/Footer.js` bottom bar, directly after the copyright `<p>` add `<DeveloperCredit />` and import it.

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/unit`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add src/lib/receipt.js public/receipt-print.css src/components/brand/DeveloperCredit.js src/components/Footer.js src/lib/translations.js tests/unit/lib/receipt-brand.test.ts tests/unit/brand/DeveloperCredit.test.tsx
git commit -m "feat(brand): Himmat mark on invoices; Sarmadax credit in the store footer"
```

---

### Task 9: Typography, formatPrice and Price

**Files:**
- Modify: `src/app/layout.js:14-18` (Cairo weights)
- Create: `src/app/styles/typography.css`; import from `globals.css`
- Create: `src/lib/format.js`
- Create: `src/components/brand/Price.js`
- Test: `tests/unit/lib/format.test.ts`, `tests/unit/brand/Price.test.tsx`

**Interfaces:**
- Produces: `formatAmount(value) → string` ("1,250", "1,250.5" → "1,250.50", invalid → "0"); `discountPercent(amount, compareAt) → number | null`; `export default function Price({ amount, compareAt, size = "md", className })`; utilities `type-display type-h1 type-h2 type-h3 type-body type-small type-caption`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/lib/format.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { discountPercent, formatAmount } from "@/lib/format";

describe("formatAmount", () => {
  it("groups thousands with Western digits", () => {
    expect(formatAmount(1250)).toBe("1,250");
    expect(formatAmount(1250000)).toBe("1,250,000");
  });
  it("shows two decimals only when there are cents", () => {
    expect(formatAmount(1250.5)).toBe("1,250.50");
    expect(formatAmount("980.25")).toBe("980.25");
  });
  it("never prints NaN", () => {
    expect(formatAmount("abc")).toBe("0");
    expect(formatAmount(undefined)).toBe("0");
    expect(formatAmount(null)).toBe("0");
  });
  it("keeps the sign of negative amounts (refunds)", () => {
    expect(formatAmount(-300)).toBe("-300");
  });
});

describe("discountPercent", () => {
  it("rounds the saving", () => expect(discountPercent(1250, 1400)).toBe(11));
  it("is null when there is no real discount", () => {
    expect(discountPercent(1400, 1400)).toBeNull();
    expect(discountPercent(1500, 1400)).toBeNull();
    expect(discountPercent(1250, 0)).toBeNull();
    expect(discountPercent(1250, undefined)).toBeNull();
  });
});
```

`tests/unit/brand/Price.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const state = { lang: "ar" };
vi.mock("@/context/LanguageContext", () => ({ useLanguage: () => state }));

import Price from "@/components/brand/Price";

describe("Price", () => {
  it("prints amount then currency, with tabular digits", () => {
    const { container } = render(<Price amount={1250} />);
    expect(container.textContent).toContain("1,250");
    expect(container.textContent).toContain("ج.س");
    expect(container.firstChild).toHaveAttribute("data-numeric");
  });

  it("shows the compare price and discount only when cheaper", () => {
    render(<Price amount={1250} compareAt={1400} />);
    expect(screen.getByText("1,400")).toHaveClass("line-through");
    expect(screen.getByText("−11%")).toBeInTheDocument();
  });

  it("hides discount when compareAt is not higher", () => {
    render(<Price amount={1400} compareAt={1400} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("uses SDG in English", () => {
    state.lang = "en";
    const { container } = render(<Price amount={5} />);
    expect(container.textContent).toContain("SDG");
    state.lang = "ar";
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/unit/lib/format.test.ts tests/unit/brand/Price.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/lib/format.js`:
```js
const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const withCents = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Western digits, thousands grouped; two decimals only when the amount has cents. */
export function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(Math.round(n * 100) / 100) ? grouped.format(n) : withCents.format(n);
}

/** Whole-percent saving, or null when compareAt is missing or not higher than amount. */
export function discountPercent(amount, compareAt) {
  const a = Number(amount);
  const c = Number(compareAt);
  if (!Number.isFinite(a) || !Number.isFinite(c) || c <= 0 || c <= a) return null;
  return Math.round(((c - a) / c) * 100);
}
```

`src/components/brand/Price.js`:
```js
"use client";

import { useLanguage } from "@/context/LanguageContext";
import { discountPercent, formatAmount } from "@/lib/format";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

const SIZES = { sm: "text-base", md: "text-lg", lg: "text-2xl" };

export default function Price({ amount, compareAt, size = "md", className }) {
  const { lang } = useLanguage();
  const currency = translations[lang === "en" ? "en" : "ar"].currency;
  const off = discountPercent(amount, compareAt);
  return (
    <span data-numeric className={cn("inline-flex flex-wrap items-baseline gap-x-2 tabular-nums", className)}>
      <span className={cn("font-extrabold text-foreground", SIZES[size] || SIZES.md)}>
        {formatAmount(amount)}{" "}
        <span className="text-xs font-bold text-muted-foreground">{currency}</span>
      </span>
      {off !== null && (
        <>
          <span className="text-sm text-muted-foreground line-through">{formatAmount(compareAt)}</span>
          <span className="rounded-md bg-warning px-2 py-0.5 text-xs font-bold text-warning-foreground">−{off}%</span>
        </>
      )}
    </span>
  );
}
```

`src/app/styles/typography.css`:
```css
/* Type scale (spec §6). Pages adopt these as they are rebuilt. */
@utility type-display { font-size: 2.5rem; line-height: 3rem; font-weight: 800; }
@utility type-h1 { font-size: 1.875rem; line-height: 2.5rem; font-weight: 700; }
@utility type-h2 { font-size: 1.375rem; line-height: 2rem; font-weight: 700; }
@utility type-h3 { font-size: 1.125rem; line-height: 1.75rem; font-weight: 600; }
@utility type-body { font-size: 1rem; line-height: 1.75rem; font-weight: 400; }
@utility type-small { font-size: 0.875rem; line-height: 1.5rem; font-weight: 500; }
@utility type-caption { font-size: 0.75rem; line-height: 1.25rem; font-weight: 600; }

@layer base {
  body { line-height: 1.75; }
  :lang(en) body, body:lang(en) { line-height: 1.6; }
  table, [data-numeric], input[type="number"], input[inputmode="numeric"], input[type="tel"] {
    font-variant-numeric: tabular-nums;
  }
}
```
In `globals.css` add `@import "./styles/typography.css";` after the palette import.
In `src/app/layout.js` Cairo `weight: ["400", "500", "600", "700", "800"]`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/format.js src/components/brand/Price.js src/app/styles/typography.css src/app/globals.css src/app/layout.js tests/unit/lib/format.test.ts tests/unit/brand/Price.test.tsx
git commit -m "feat(brand): type scale, tabular numbers, formatAmount and Price"
```

---

### Task 10: Shared UI components on the tokens

**Files:**
- Modify: `src/components/ui/button.jsx`, `input.jsx`, `select.jsx`, `card.jsx`, `badge.jsx`, `tabs.jsx`, `dialog.jsx`, `sheet.jsx`
- Test: `tests/unit/components/ui-brand.test.tsx`

**Interfaces:**
- Consumes: Tailwind colours from Task 2 (`bg-brand`, `text-brand-foreground`, `bg-success`, `text-accent-text`, …).
- Produces: `buttonVariants` gains `variant: "brand"`; `badgeVariants` gains `success | info | neutral` (existing `warning`, `destructive` restyled); `Input` gains `numeric` prop. All existing exports, variant and size names stay.

- [ ] **Step 1: Write the failing test**

`tests/unit/components/ui-brand.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

describe("ui on brand tokens", () => {
  it("default buttons are 44px tall with navy text on amber", () => {
    const cls = buttonVariants();
    expect(cls).toContain("h-11");
    expect(cls).toContain("bg-primary");
    expect(cls).toContain("text-primary-foreground");
    expect(cls).not.toMatch(/rounded-(full|2xl|3xl)/);
  });

  it("offers a navy brand button and keeps old variants", () => {
    expect(buttonVariants({ variant: "brand" })).toContain("bg-brand");
    for (const v of ["outline", "secondary", "ghost", "destructive", "link"] as const) {
      expect(buttonVariants({ variant: v })).toBeTruthy();
    }
    expect(buttonVariants({ variant: "link" })).toContain("text-accent-text");
  });

  it("badges have status variants", () => {
    render(<Badge variant="success">متوفر</Badge>);
    expect(screen.getByText("متوفر").className).toContain("text-success");
  });

  it("numeric inputs are LTR with tabular digits and 16px text", () => {
    render(<Input numeric aria-label="phone" />);
    const input = screen.getByLabelText("phone");
    expect(input).toHaveAttribute("dir", "ltr");
    expect(input.className).toContain("tabular-nums");
    expect(input.className).toContain("h-11");
    expect(input.className).not.toContain("md:text-sm");
  });

  it("still renders a Button", () => {
    render(<Button>حفظ</Button>);
    expect(screen.getByRole("button", { name: "حفظ" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/components/ui-brand.test.tsx`
Expected: FAIL (`h-8` instead of `h-11`, no `brand` variant, etc.).

- [ ] **Step 3: Button**

In `src/components/ui/button.jsx` base string: replace `active:translate-y-px` with nothing, `text-sm font-medium` with `text-[15px] font-semibold`, and `focus-visible:ring-3 focus-visible:ring-ring/50` with `focus-visible:ring-3 focus-visible:ring-ring/40`. Variants:
```js
      variant: {
        default: "bg-primary text-primary-foreground font-bold hover:bg-amber-600",
        brand: "bg-brand text-brand-foreground hover:bg-navy-800",
        outline:
          "border-input bg-card text-foreground hover:bg-muted aria-expanded:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/30",
        link: "h-auto px-0 text-accent-text font-bold underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-2 px-5",
        xs: "h-7 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-3 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-6 text-base",
        icon: "size-11",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
```
`bg-navy-800` needs `--color-navy-800: var(--navy-800);` in the `@theme inline` block of `globals.css` (add `--color-navy-950/900/800/700/600` there).

- [ ] **Step 4: Input, Select**

`src/components/ui/input.jsx`: accept `numeric` prop; class base becomes
`"h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground"`
plus `numeric && "tabular-nums text-end"`; pass `dir={numeric ? "ltr" : props.dir}` and `inputMode={numeric ? "numeric" : props.inputMode}`. Remove `md:text-sm` (keeps 16px, no iOS zoom).
`src/components/ui/select.jsx` trigger: `data-[size=default]:h-8` → `data-[size=default]:h-11`, `data-[size=sm]:h-7` → `data-[size=sm]:h-9`, `text-sm` → `text-base`, `bg-transparent` → `bg-card`, `dark:bg-input/30 dark:hover:bg-input/50` removed. Popup `shadow-md ring-1 ring-foreground/10` → `border border-border`.

- [ ] **Step 5: Card, Badge, Tabs, Dialog, Sheet**

`card.jsx` root: `rounded-xl … ring-1 ring-foreground/10` → `rounded-[10px] border border-border` (remove `ring-*`); `*:[img:first-child]:rounded-t-xl` → `rounded-t-[10px]`, same for `rounded-b`; footer `rounded-b-xl bg-muted/50` → `rounded-b-[10px] bg-muted`.
`badge.jsx` base: `rounded-4xl` → `rounded-md`, `h-5` → `h-6`, `font-medium` → `font-semibold`. Variants (keep existing names, add three):
```js
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-transparent text-destructive before:size-2 before:rounded-full before:bg-current before:content-['']",
        success: "bg-transparent text-success before:size-2 before:rounded-full before:bg-current before:content-['']",
        info: "bg-transparent text-info before:size-2 before:rounded-full before:bg-current before:content-['']",
        warning: "bg-warning text-warning-foreground",
        neutral: "bg-muted text-muted-foreground",
        outline: "border-border text-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground",
        link: "text-accent-text underline-offset-4 hover:underline",
```
`tabs.jsx`: list `group-data-horizontal/tabs:h-8` → `h-11`, tab trigger `text-sm font-medium` → `text-[15px] font-semibold`, `data-active:shadow-sm` → `data-active:bg-card data-active:text-foreground`; line variant indicator `after:bg-foreground` → `after:bg-primary`.
`dialog.jsx` overlay `bg-black/10 … backdrop-blur-xs` → `bg-navy-950/60` (remove the backdrop-blur class); content `rounded-xl … ring-1 ring-foreground/10` → `rounded-[10px] border border-border`; footer `rounded-b-xl bg-muted/50` → `rounded-b-[10px] bg-muted`.
`sheet.jsx` overlay `bg-black/10 … backdrop-blur-xs` → `bg-navy-950/60`.

- [ ] **Step 6: Run tests, lint, commit**

Run: `npx vitest run tests/unit && npx eslint src/components/ui`
Expected: PASS, no lint errors.
```bash
git add src/components/ui src/app/globals.css tests/unit/components/ui-brand.test.tsx
git commit -m "feat(ui): shared components on Himmat tokens (44px controls, borders, status badges)"
```

---

### Task 11: Style guide page (preview only)

**Files:**
- Create: `src/app/styleguide/page.js`, `src/app/styleguide/StyleguideClient.js`
- Test: `tests/unit/app/styleguide.test.ts`

**Interfaces:**
- Consumes: `BrandLockup`, `BoltMark`, `Price`, `DeveloperCredit`, `Button`, `Badge`, `Input`, `Card`, `ThemeToggle`; `useLanguage().switchLanguage` (exists in `LanguageContext`).
- Produces: route `/styleguide` (404 when `VERCEL_ENV === "production"`).

- [ ] **Step 1: Write the failing test**

`tests/unit/app/styleguide.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", async (orig) => ({ ...(await orig<object>()), notFound }));

describe("/styleguide", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is hidden in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const { default: Page } = await import("@/app/styleguide/page");
    expect(() => Page()).toThrow("NEXT_NOT_FOUND");
  });

  it("renders on previews and locally", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const { default: Page } = await import("@/app/styleguide/page");
    expect(Page()).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/app/styleguide.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/app/styleguide/page.js`:
```js
import { notFound } from "next/navigation";
import StyleguideClient from "./StyleguideClient";

export const metadata = { title: "Style guide", robots: { index: false, follow: false } };

export default function StyleguidePage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <StyleguideClient />;
}
```
`src/app/styleguide/StyleguideClient.js` — sections, each a `<section className="space-y-4 border-t border-border py-8">` with a `type-h2` heading:
1. **Language + theme bar**: two `Button variant="outline" size="sm"` calling `switchLanguage("ar")` / `switchLanguage("en")`, plus `<ThemeToggle />`.
2. **Logo**: `BrandLockup` `full`, `compact`, `mark`, and `BoltMark` at 24/32/56 in both tones.
3. **Colour tokens**: a grid of swatches for `background card primary brand secondary muted success destructive info warning accent-text border`, each a `div` with `style={{ background: "var(--<name>)" }}` and its name in `text-xs`.
4. **Type**: one line per `type-display … type-caption` with sample Arabic text "قاطع كهربائي 32 أمبير".
5. **Buttons**: every `variant` × sizes `sm default lg icon` (icon buttons use a lucide `Plus` with `aria-label`).
6. **Inputs**: `Input` normal, `numeric` with value `0912345678`, disabled, and `aria-invalid`.
7. **Badges**: every variant.
8. **Card + Price**: a `Card` with product name, `Badge variant="success"`, `<Price amount={1250} compareAt={1400} />` and an icon button.
9. **Footer credit**: `<DeveloperCredit />`.
Wrap the page in `<main className="mx-auto max-w-5xl px-4 py-10">`.

- [ ] **Step 4: Run tests and lint**

Run: `npx vitest run tests/unit/app/styleguide.test.ts && npx eslint src/app/styleguide`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/app/styleguide tests/unit/app/styleguide.test.ts
git commit -m "feat(brand): preview-only style guide page"
```

---

### Task 12: Visual review screenshots (CI, on demand)

**Files:**
- Create: `scripts/visual/screens.mjs`
- Create: `.github/workflows/visual-review.yml`

**Interfaces:**
- Produces: artifact `visual-review` with `<page>-<lang>-<theme>-<device>.png`.

- [ ] **Step 1: Script `scripts/visual/screens.mjs`**
```js
#!/usr/bin/env node
// Screenshots key pages in AR/EN × light/dark × phone/desktop for visual review.
// BASE_URL=http://127.0.0.1:3000 OUT=screens node scripts/visual/screens.mjs
import fs from "node:fs";
import { chromium } from "playwright";

const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const out = process.env.OUT || "screens";
fs.mkdirSync(out, { recursive: true });

const pages = { home: "/", products: "/products", cart: "/cart", login: "/login", styleguide: "/styleguide" };
const devices = { phone: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };

const browser = await chromium.launch();
const html = await (await fetch(`${base}/products`)).text();
const product = html.match(/href="(\/products\/(?!compare)[^"?#]+)"/)?.[1];
if (product) pages.product = product;

for (const lang of ["ar", "en"]) {
  for (const theme of ["light", "dark"]) {
    for (const [device, viewport] of Object.entries(devices)) {
      const ctx = await browser.newContext({ viewport });
      await ctx.addCookies([{ name: "lang", value: lang, url: base }]);
      await ctx.addInitScript((t) => localStorage.setItem("himmat-theme", t), theme);
      const page = await ctx.newPage();
      for (const [name, path] of Object.entries(pages)) {
        await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
        await page.screenshot({ path: `${out}/${name}-${lang}-${theme}-${device}.png`, fullPage: device === "desktop" });
      }
      await ctx.close();
    }
  }
}
await browser.close();
console.log("screenshots in", out);
```

- [ ] **Step 2: Workflow `.github/workflows/visual-review.yml`**
```yaml
name: Visual Review

on:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  screens:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: visual
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U postgres"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/visual?schema=public
      AUTH_SECRET: visual-review-placeholder-secret-min-32-chars
      AUTH_TRUST_HOST: "true"
      NEXT_PUBLIC_URL: http://127.0.0.1:3000
      VERCEL_ENV: preview
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci --legacy-peer-deps
      - run: npx playwright install --with-deps chromium
      - run: |
          npx prisma migrate deploy
          npx prisma db seed
          npm run build
          nohup npm run start -- -H 127.0.0.1 -p 3000 > server.log 2>&1 &
          npx --yes wait-on@8 -t 120000 http://127.0.0.1:3000/api/health
      - run: node scripts/visual/screens.mjs
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: visual-review
          path: |
            screens
            server.log
```

- [ ] **Step 3: Lint and commit**

Run: `npx eslint scripts/visual/screens.mjs`
Expected: no errors.
```bash
git add scripts/visual/screens.mjs .github/workflows/visual-review.yml
git commit -m "ci(brand): on-demand screenshot review in AR/EN, light/dark, phone/desktop"
```

---

### Task 13: Verify, measure, open PR

**Files:**
- Modify: `docs/rebuild/PROGRESS.md`, `docs/rebuild/parts/P0.3.md` (create)

- [ ] **Step 1: Full local checks**

Run: `npx eslint src scripts tests && npx vitest run tests/unit`
Expected: no lint errors; all tests pass.

- [ ] **Step 2: Push and run CI + visual + perf**

```bash
git push -u origin rebuild/p0-3-brand
gh workflow run visual-review.yml --ref rebuild/p0-3-brand
gh workflow run perf-baseline.yml --ref rebuild/p0-3-brand
```
Wait for both (`gh run list --workflow visual-review.yml --limit 1`). Download: `gh run download <id> -n visual-review -D <scratchpad>/visual` and `-n perf-baseline-report`.
Expected: Lighthouse accessibility ≥ 90 on `/` and `/products`; performance not lower than `docs/rebuild/audit/perf-baseline.md` by more than 3 points.

- [ ] **Step 3: Look at the screenshots**

Read a sample with the Read tool (`home-ar-light-phone.png`, `home-ar-dark-desktop.png`, `products-en-light-phone.png`, `styleguide-ar-light-desktop.png`). Fix anything clearly broken (unreadable text, missing logo, misplaced credit) in a new commit and re-run the visual workflow.

- [ ] **Step 4: Part notes and progress**

Create `docs/rebuild/parts/P0.3.md` with: what shipped, Lighthouse before/after table (accessibility and performance for the 5 pages), link to the visual-review run, codemod report link, deferred items (page-level radii/pills → P2.x; navbar/footer layout → P0.4).
Update `docs/rebuild/PROGRESS.md`: P0.3 status `review`, Step 6, Next "user reviews screenshots and merges PR".

- [ ] **Step 5: Open PR**
```bash
git add docs/rebuild
git commit -m "docs(rebuild): P0.3 notes and progress"
git push
gh pr create --base main --title "P0.3: Himmat brand refresh and design system" --body-file <scratchpad>/p0-3-pr.md
```
PR body: summary of each task, before/after Lighthouse table, link to the visual-review artifact, codemod change count and the manual-review list, and "Merging deploys production."

---

## Self-review notes

- Spec §1 tokens → Task 2; §2 remap → Task 3; §3 contrast → Tasks 4–5; §4 glow → Tasks 4–5; §5 logo → Tasks 6–8; §6 typography/Price → Task 9; §7 components → Task 10; §8 style guide → Task 11; §9 defaults → Task 1; §10 credit → Task 8; Testing (screenshots, Lighthouse) → Tasks 12–13.
- Names used across tasks: `BOLT_PATH`, `BOLT_PATH_SMALL`, `BoltMark`, `BrandLockup`, `BRAND_WORDMARK`, `DeveloperCredit`, `SARMADAX_URL`, `formatAmount`, `discountPercent`, `Price`, `nextTheme`, token names in Task 2, Tailwind colours `navy-*` (added to `@theme inline` in Task 10 Step 3).

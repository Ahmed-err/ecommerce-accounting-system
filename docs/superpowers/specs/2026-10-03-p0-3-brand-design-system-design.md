# P0.3 Brand refresh + design system — Design

Date: 2026-10-03 · Part: P0.3 · Branch: `rebuild/p0-3-brand`
Status: brand sheet approved by user (2026-10-03); this spec awaits review.
Brand sheet (before/after): https://claude.ai/artifact/4RHEHcqGxih3z9BDEPAUuY

## Goal

Make the existing look consistent, readable and clearly *Himmat* — without redesigning it. Same navy + amber + bolt + Cairo; tuned values, one token system, a refreshed logo lockup, shared components that agree with each other, and none of the "AI template" tells (glow shadows, pill-everything, random radii, low-contrast amber text).

## Decisions (user)

| Topic | Decision |
|---|---|
| Direction | Refine, don't redesign. Must not look AI-made. |
| Name | **Himmat / همّت** is the main name. Small labels: the shop name ("عصام الدين نصر للأدوات الكهربائية" / "Essam El-Din Nasr Electrical Tools") and "المدير العام: رياض همت". |
| Audience | Trade pros and households equally. |
| Look | As on the approved brand sheet: tokens, type scale, components. |

## Scope

In P0.3:

1. **Design tokens** in `src/app/globals.css` (light + dark), exposed to Tailwind v4 via `@theme inline`.
2. **Global colour remap** so the ~1,350 hard-coded `amber-*` / `emerald-*` classes take brand values immediately.
3. **Contrast fix**: amber text on light surfaces → a semantic accent-text token.
4. **Glow removal**: the 27 `shadow-amber-*` glows → none (borders already present).
5. **Logo**: refreshed bolt mark + lockup component; app icons, favicons, manifest, theme colour.
6. **Typography**: Cairo weights 400–800, Arabic line height, type scale utilities, tabular numbers, one price format component.
7. **Shared components** in `src/components/ui/` restyled on the tokens.
8. **Style guide page** (dev/preview only) to review everything in AR/EN, light/dark.

Not in P0.3 (later parts use these tokens): navbar/footer/layout changes (P0.4), page redesigns (P2.x, P3.x), per-file migration of page-level radii and pill buttons (done as each page is rebuilt).

## 1. Tokens

Raw palette (CSS custom properties on `:root`, never used directly in components):

| Group | Tokens |
|---|---|
| Navy | `--navy-950 #0B1422` · `--navy-900 #0E1A2B` · `--navy-800 #17263B` · `--navy-700 #22344D` · `--navy-600 #3A4D68` |
| Amber | `--amber-100 #FDF1D8` · `--amber-500 #F2A20C` · `--amber-600 #D9870A` · `--amber-700 #9A5B00` · `--amber-800 #6E4100` |
| Neutral (warm) | `--paper #F7F6F3` · `--surface #FFFFFF` · `--line #E4E1DA` · `--line-strong #D5D1C8` · `--muted-ink #5E636B` · `--ink-2 #3B4049` · `--ink #121821` |
| Status | `--success #1F7A4D` · `--danger #C2362B` · `--info #2F5F98` (warning uses amber) |
| Dark neutrals | `--d-bg #0B1422` · `--d-surface #121E30` · `--d-line #23324A` · `--d-muted #9AA6B6` · `--d-ink #EEF1F5` |

Semantic tokens (what components use; the existing shadcn names are kept so current code keeps working):

| Semantic | Light | Dark |
|---|---|---|
| `--background` | paper | d-bg |
| `--card`, `--popover` | surface | d-surface |
| `--foreground` | ink | d-ink |
| `--muted-foreground` | muted-ink | d-muted |
| `--border`, `--input` | line / line-strong | d-line |
| `--primary` (main action fill) | amber-500 | amber-500 |
| `--primary-foreground` | navy-900 | navy-900 |
| `--brand` / `--brand-foreground` (new) | navy-900 / paper | navy-800 / d-ink |
| `--accent-text` (new; amber used as text) | amber-700 | amber-500 |
| `--success`, `--danger` (=`--destructive`), `--info` (new) | as palette | lightened for dark (≥4.5:1 on d-surface) |
| `--ring` | amber-600 | amber-500 |
| `--radius` | 8px | 8px |

Every text/background pair used by the semantic tokens must be ≥ 4.5:1 (≥ 3:1 for 24px+ bold). This is enforced by a unit test (Testing).

The `.admin-shell` light-mode overrides in `globals.css` (lines ~203–252) are rewritten onto the tokens.

## 2. Global colour remap (no 74-file rewrite)

Tailwind v4 lets the theme redefine its own scales. In `@theme`:

- `--color-amber-50…950` → a brand amber scale built around `#F2A20C` (500) with the same lightness steps as Tailwind's, so `bg-amber-500 text-black` etc. keep their meaning but use the brand hue.
- `--color-emerald-*` → a scale around `--success` (`#1F7A4D` at 700; 500 adjusted so white text on `bg-emerald-500/600` reaches 4.5:1).
- `--color-slate-900/950` → navy-900/950.

Result: every existing amber/emerald/slate-900 class takes the brand values in one change. Contrast-sensitive *text* uses are handled in step 3, not by the remap.

## 3. Contrast fix

Amber used as text on light backgrounds fails today (`amber-500` 2.15:1, `amber-400` 1.67:1, `amber-600` 3.19:1 on white).

- Add utility `text-accent-text` → `var(--accent-text)` (amber-700 light / amber-500 dark). (`text-accent` is already shadcn's grey accent, so the name differs.)
- Codemod (script committed in `scripts/codemods/`), run once and reviewed: in `src/components/**` and `src/app/**`, a class token `text-amber-400|500|600` **without** an accompanying `dark:` text class becomes `text-accent-text`. Tokens already paired with `dark:text-…`, or inside elements whose background is navy/black/amber (detected by `bg-(slate|gray|zinc|neutral|black|amber)-(8|9)\d\d|bg-black|bg-amber` in the same `className`), are left as they are and listed in the PR for manual check.
- The codemod prints every change; the PR includes the list.

## 4. Glow removal

Remove `shadow-amber-*` classes (27). Where a glow was the only edge of an element, add `border border-border`. Same codemod script, separate commit.

## 5. Logo

- Mark: the refined bolt from the sheet (same silhouette, straighter cuts) on navy-900, radius 104/512. Small-size variant (≤32 px) with a heavier bolt. Files: `public/icons/icon-{192,512}.svg|png`, `icon-maskable-512.svg`, `favicon.ico`, `favicon-48.png`, `src/app/icon.svg`. PNGs generated from the SVGs by a committed script (`scripts/brand/render-icons.mjs`, using the `sharp` that Next.js installs; run by hand, outputs committed, so no new dependency).
- `manifest.json` `theme_color` / `background_color` and `layout.js` `viewport.themeColor` → navy-900 (`#0E1A2B`), amber stays the accent.
- Component `src/components/brand/BrandLockup.js`:
  - `variant`: `full` (mark + "همّت"/"Himmat" + shop name + GM line), `compact` (mark + wordmark + shop name), `mark` (icon only).
  - The wordmark "همّت" / "HIMMAT" is part of the logo (code). The shop-name label comes from store settings (`getStoreBranding()` → `nameAr`/`nameEn`), so the owner can still edit it in Admin → Settings; no production data change is needed.
  - The GM line comes from a new translation key (`brandGmLine`: "المدير العام: رياض همت" / "General Manager: Riyadh Himmat").
- P0.3 swaps the Zap-in-a-circle in `Navbar.js`, the footer, and the invoice/receipt header for `BrandLockup` (one-line replacements; layout untouched — layout is P0.4).
- Metadata: default `<title>` template becomes "%s — همّت" / "%s — Himmat"; site name "همّت — عصام الدين نصر للأدوات الكهربائية".

## 6. Typography

- Cairo weights loaded: 400, 500, 600, 700, 800 (drop 300; it is unused at body sizes and costs a font file).
- Base: `body` 16px / 1.75 (Arabic) and 1.6 when `lang="en"`.
- Type scale utilities (`@layer components`): `type-display` 40/48·800, `type-h1` 30/40·700, `type-h2` 22/32·700, `type-h3` 18/28·600, `type-body` 16/28·400, `type-small` 14/24·500, `type-caption` 12/20·600. Pages adopt them as they are rebuilt.
- `tabular-nums` on all prices, quantities, tables and the POS (global rule for `table`, `[data-numeric]`, and the `Price` component).
- `src/components/brand/Price.js`: `<Price amount={1250} compareAt={1400} />` → "1,250 ج.س" (Western digits, as today; currency after the number, smaller), optional struck-through compare price and discount badge (amber-100 / amber-800). There is no shared price formatter today, so add `formatPrice(amount, lang)` in `src/lib/format.js` (with tests); pages switch to it as they are rebuilt.

## 7. Shared components (`src/components/ui/`)

| Component | Change |
|---|---|
| `button` | Variants: `default` (amber fill, navy text), `brand` (navy fill), `outline` (line-strong border), `ghost`, `link` (accent-text, underline offset 4), `destructive` (danger fill, white text). Sizes: `default` h-11 (44px), `sm` h-9 (dense admin tables only), `lg` h-12, `icon` 44px. Radius 8px everywhere; no `active:translate-y`. |
| `input`, `select` | h-11, 16px text (prevents iOS zoom), line-strong border, focus ring amber; `dir="ltr"` + `tabular-nums` for phone/number inputs via a `numeric` prop. |
| `card` | surface + 1px border, radius 10px, no shadow by default. |
| `badge` | Status variants (`success`, `danger`, `info`, `warning`, `neutral`): dot + text style as on the sheet; filled variant for counts. |
| `tabs`, `dialog`, `sheet`, `separator` | Token colours, 8–10px radius, focus styles; dialog/sheet overlays use navy at 60% instead of black. |

Existing call sites keep working (same exports and variant names; `default` changes look, not API). No variant or size is removed; `xs`/`icon-xs`/`icon-sm` stay for dense admin UI.

## 8. Style guide page

`src/app/styleguide/page.js`: tokens with contrast ratios, type scale, buttons/inputs/cards/badges in all variants, `BrandLockup` variants, `Price` examples; language and theme toggles. Returns `notFound()` when `VERCEL_ENV === "production"`, so it exists on previews and locally only.

## 9. Defaults: Arabic + light (user request, 2026-10-03)

Already the first-visit defaults in code (`normalizeAppLang` → `ar`; `ThemeProvider defaultTheme="light" enableSystem={false}`). Fixes so nobody ends up elsewhere by accident:
- `ThemeToggle` switches light ↔ dark only (today it cycles into an unsupported "system" state).
- `ThemeProvider storageKey="himmat-theme"`: stored theme choices reset once at launch, so everyone starts in light; later choices persist.
- `LanguageProvider`: the `lang` cookie (read by the server) is the only source; the localStorage override on mount is removed (it caused a flash and a server/client mismatch). Explicit language choices are kept.
- `manifest.json` `background_color` → paper (`#F7F6F3`) so the PWA splash is light.

## 10. Developer credit (user request, 2026-10-03)

Store footer bottom bar, next to the copyright: Arabic "تطوير: Sarmadax", English "Built by Sarmadax", linking to `https://sarmadax.com` (`target="_blank" rel="noopener"`), muted small text, accent colour on hover. Store footer only (not admin, login or invoices). Must survive P0.4's footer redesign.

## Testing

- **Contrast test** (`tests/unit/brand/contrast.test.ts`): parses the token values from `globals.css` (light and dark blocks) and asserts every semantic text/background pair ≥ 4.5:1 (3:1 for the display size). Fails if a token change breaks readability.
- **Remap test**: asserts the `@theme` defines brand values for `amber-500`, `emerald-600`, `slate-900`.
- **Codemod tests** (`tests/unit/codemods/`): input/output fixtures for the text-amber → text-accent rule, the skip rules (dark pairs, dark backgrounds) and glow removal.
- **Component tests**: `Price` / `formatPrice` (grouping, compare price, discount %), `BrandLockup` (falls back to translation shop name when settings are missing; RTL/LTR order).
- **Visual review**: Playwright screenshot job (CI, on demand) of `/`, `/products`, a product page, `/cart`, `/login`, `/admin`, `/styleguide` in AR/EN × light/dark × phone/desktop, uploaded as an artifact for the user to compare with the current site.
- **Lighthouse**: re-run `perf-baseline.yml`; accessibility scores must not drop; target ≥ 90 on `/` and `/products` (baseline 79/82) from the contrast fix alone.
- Defaults: `ThemeToggle` toggles light ↔ dark only; `LanguageProvider` keeps the server language when localStorage holds another value.
- Footer credit renders with the right text per language and links to `https://sarmadax.com`.
- `npm run lint`, `npm run build`, unit and e2e suites green.

## Rollout and risk

- One PR, commits split: tokens + remap · contrast codemod · glow codemod · logo assets + lockup · typography + Price · ui components · style guide · tests.
- Biggest risk is an amber or emerald shade changing meaning somewhere (e.g. text that now sits on a slightly different background). Mitigated by the screenshot job and the codemod change list in the PR.
- No database or schema change. Reverting is a single PR revert.

## Done when

- Approved sheet values are the tokens; the contrast test passes in both themes.
- No `shadow-amber-*` and no `text-amber-400|500|600` on light surfaces left (codemod report empty).
- New icons/favicons/manifest live; navbar, footer and invoice show the Himmat lockup.
- `ui/` components match the sheet; the style guide shows every variant in AR/EN, light/dark.
- Screenshots reviewed by the user; Lighthouse accessibility ≥ 90 on `/` and `/products`; CI green.

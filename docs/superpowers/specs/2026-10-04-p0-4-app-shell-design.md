# P0.4 App shell — Design

Date: 2026-10-04 · Part: P0.4 · Branch: `rebuild/p0-4-app-shell`
Status: design approved in conversation (structure, lighter pages, navbar/footer mockups); this spec awaits review.
Audit: `docs/rebuild/parts/P0.4.md` (S-01…S-09). Mockups: https://claude.ai/artifact/4RHEHcqGxih3z9BDEPAUuY boards 5 (Navbar) and 6 (Footer).

## Goal

One shared, accessible, lighter shell for every store page — same look, refined — so later store parts (P2.x) only build page content.

## Decisions (user)

| Topic | Decision |
|---|---|
| Scope | "Shell + lighter pages": shared store layout, a11y, loading/error/not-found, footer links, steady navbar, and send only the current language's text to the browser. |
| Look | Refine, don't redesign (boards 5–6 approved). |
| Kept | Arabic + light defaults, Himmat lockup, Sarmadax credit in the footer bottom bar. |
| Out of scope | Admin and POS shells (P3.1 / P3.4); page content redesigns (P2.x). |

## 1. Store route group and layout

- New route group `src/app/(store)/` (URLs unchanged). Moved into it: `page.js` (home), `products/**` (incl. `[slug]`, `compare`, `loading.js`), `cart`, `checkout`, `order-confirmation/[id]`, `track-order`, `account/**`, `about`, `contact`, `privacy`, `terms`, `login`, `register`, `forgot-password`, `reset-password`.
- Stay where they are: `admin/**`, `pos/**`, `api/**`, `actions/**`, `orders/[id]/invoice` (print page), `offline` (PWA fallback, no network), `styleguide`, and the redirect-only `settings`, `my-orders`.
- `src/app/(store)/layout.js` (server component) renders:
  ```
  <a href="#content" class="skip-link">تخطَّ إلى المحتوى / Skip to content</a>
  <SiteHeader />            // was Navbar
  <main id="content" tabIndex={-1}>{children}</main>
  <SiteFooter />            // was Footer
  ```
- Every moved page drops its own `<Navbar />`, `<Footer />`, outer `<main>`, `dir=` and `min-h-screen` wrapper (direction already comes from `<html dir>`). Pages keep their own content containers.
- `NotFoundClient` and `OrderConfirmationClient` stop rendering Navbar/Footer.
- The header is `position: sticky; top: 0` inside the layout (not `fixed`), so pages need no top padding hacks; existing `pt-*` offsets for the fixed header are removed.

## 2. Page states

- **Loading:** delete `src/app/loading.js` (it covered admin/POS, read branding from the DB, and forced streaming before `notFound()`). Add `src/app/(store)/loading.js`: static skeleton (no data fetching, no cookies), header and footer stay visible because it renders inside the layout. Keep `products/loading.js`.
- **Not found:** `src/app/(store)/not-found.js` renders the existing NotFound content inside the shell and returns HTTP 404. Root `src/app/not-found.js` stays for non-store paths (minimal, no shell).
- **`/styleguide` on production:** with the root `loading.js` gone, `notFound()` returns a real 404; its `generateMetadata` also calls `notFound()` so the "Style guide" title never renders on production.
- **Error:** `src/app/(store)/error.js` (client): message + "Try again" (`reset`) + "Home" link + "Report a problem" link to `/contact?subject=TECH`; no framer-motion, no Navbar/Footer (the layout still shows them). Root `src/app/error.js` becomes the same minimal page without the shell. New `src/app/global-error.js` (own `<html><body>`) for errors in the root layout: plain HTML, bilingual text, reload button.

## 3. Header (SiteHeader) — board 5

Rename `src/components/Navbar.js` → `src/components/shell/SiteHeader.js` and split while touching it (file is 514 lines): `SiteHeader.js` (layout), `HeaderNav.js` (desktop links + categories menu), `HeaderActions.js` (theme, language, cart, account/login), `MobileMenu.js` (sheet). Behaviour and data stay as today.

- Fixed height 64px (`h-16`), no height animation on scroll; on scroll only the background gains `bg-card/95` + bottom border.
- Lockup: `BrandLockup variant="compact"` (wordmark row "همّت" + "HIMMAT" on one baseline, shop name on line 2 with ellipsis); in dark mode `tone="amber"` so the tile stays visible.
- Nav links 15px/600, 40px tall, 8px radius; current route marked with `aria-current="page"` and `bg-muted`.
- Search: 40px, 8px radius, `flex-1 min-w-0 max-w-[360px]` — the only item that shrinks; every other item is `shrink-0 whitespace-nowrap`.
- Cart: a single `<Link href="/cart">` styled as a 40×40 icon button with `aria-label` = "السلة، N منتج" / "Cart, N items" (count announced; badge navy, `aria-hidden`). No `<Button>` inside `<Link>` anywhere in the shell.
- Login: a single `<Link>` styled as the default (amber) button, person icon + "تسجيل الدخول", no glow.
- Language: text button "EN" / "ع" with `aria-label` "English" / "العربية".
- Theme: 40×40 ghost button, `aria-label` names the mode it switches to.
- Mobile (<lg): lockup (no "HIMMAT"), cart, menu button (44×44 each); search, theme, language and links live in the menu sheet.
- Logical properties only (`ms-/me-/ps-/pe-/start-/end-`), no `isRTL ? "flex-row-reverse"` branches.

## 4. Footer (SiteFooter) — board 6

Move `src/components/Footer.js` → `src/components/shell/SiteFooter.js`.

- Columns: brand (lockup `full`, short description, social links) · **المتجر / Shop**: all products, cart, about · **المساعدة / Help**: track your order, contact us, privacy, terms · **تواصل معنا / Contact**: phone, email, address from store settings (hidden when empty).
- Removed: duplicate "Contact us", "FAQ" and "Shipping policy" (both pointed at `/contact`), duplicate privacy/terms in the bottom bar.
- Social links come from store settings: `facebookUrl`, `instagramUrl`, `whatsappUrl`, `tiktokUrl` — added to `getStoreBranding()` and the language context; only non-empty ones render; each has an `aria-label` (فيسبوك / Facebook …), `target="_blank" rel="noopener"`. Placeholder `facebook.com/twitter.com/linkedin.com` links are deleted.
- Text 15px regular (no uppercase / `tracking-widest` / 10px black).
- Bottom bar: "© {year} همّت — {shop name}. جميع الحقوق محفوظة." + `<DeveloperCredit />` (unchanged).
- Also fixes P0.3 minor: store names are trimmed in `fetchStoreBranding` (`store.nameAr?.trim() || …`).

## 5. Lighter pages — current language only

- Split `src/lib/translations.js` into `src/lib/i18n/ar.js` and `src/lib/i18n/en.js` (default-exported objects, same keys). `src/lib/translations.js` keeps `export const translations = { ar, en }` for **server** code (layouts, metadata, actions, receipts, sitemap) — unchanged call sites there.
- `src/app/layout.js` (server) passes the current language's dictionary to `<Providers dictionary={dict}>` → `LanguageProvider`, which exposes `useT()` (the dictionary) next to `useLanguage()`. Switching language already calls `router.refresh()`, which re-renders the layout with the other dictionary.
- Every client module stops importing `@/lib/translations`: `const t = translations[lang] || translations.x` → `const t = useT()`. Done by a tested codemod (`scripts/codemods/use-t.mjs`) plus manual fixes for non-standard uses (e.g. `translations.en.brandName` inside client code, components that read the other language on purpose). Components that render bilingual text on purpose receive it as props from a server parent.
- Guard: `scripts/check-client-bundle.mjs`, run in CI after `next build`, fails if any `.next/static/chunks/**/*.js` contains sample strings from either dictionary (10 distinctive values from each language, store and admin). Unit guard: no file containing `"use client"` imports `@/lib/translations`.
- Trade-off (accepted): the current language's strings travel in the page's server payload on full page loads instead of a cached JS chunk; half the size, cheaper to parse than JS, and not re-sent on client navigations.

## Testing

- **Unit:** `useT()` returns the provider dictionary; `LanguageProvider` default; codemod fixtures (standard pattern, `|| translations.ar` fallback, aliased lang variable, file with other `@/lib/translations` named imports); `SiteHeader` — cart link has accessible name with count and no nested interactive elements; login is one link; `aria-current` on the active link; `SiteFooter` — social links render only when configured, with labels; no placeholder hosts; links point to existing routes (`/products`, `/cart`, `/about`, `/track-order`, `/contact`, `/privacy`, `/terms`); credit present. Guard tests: no `"use client"` file imports `@/lib/translations`; no `<Navbar`/`<Footer` usage left in `src/app/(store)/**` pages.
- **Route check:** every moved route resolves at the same URL (Playwright smoke in CI on the seeded build: `/`, `/products`, a product, `/cart`, `/login`, `/track-order`, `/about`, a missing page → 404 status, `/styleguide` → 200 on preview).
- **Bundle:** `check-client-bundle.mjs` passes after build.
- **Visual review:** screenshots (existing workflow) for the store pages in AR/EN × light/dark × phone/desktop.
- **Lighthouse:** re-run; targets — accessibility ≥ 90 on `/`, `/products`, `/cart`, `/login` (shell-caused `button-name`/`link-name` gone; remaining page-content audits belong to P2.x and are listed if still failing); total transfer on `/login` lower than baseline (449 KB).

## Rollout and risk

- One PR, commits per section: i18n split + `useT` + codemod · route group move + layout · page states · header · footer · guards/CI.
- Risk: moving ~20 route folders — mitigated by the route smoke test and visual review; URLs do not change.
- Risk: a client component misses `useT()` and breaks at runtime — mitigated by the guard test, build, e2e and screenshots.
- No database or schema change.

## Done when

- All store pages render inside `(store)/layout.js`; no page imports Navbar/Footer.
- `/styleguide` and unknown URLs return HTTP 404 on production builds; store loading/error states render inside the shell; `global-error.js` exists.
- Header and footer match boards 5–6 in AR/EN, light/dark, phone/desktop; social links come from settings.
- No client chunk contains dictionary text; Lighthouse accessibility ≥ 90 on `/`, `/products`, `/cart`, `/login`, or remaining failures are page-content items recorded for P2.x.
- CI green; visual review checked by the user.
